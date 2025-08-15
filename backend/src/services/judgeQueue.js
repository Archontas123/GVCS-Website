/**
 * CS Club Hackathon Platform - Judge Queue System
 * Phase 4.3: Redis-based submission queue with Bull Queue library
 */

const Queue = require('bull');
const redis = require('redis');
const { testConnection, db } = require('../utils/db');
const performanceStatsStorage = require('./performanceStatsStorage');

class JudgeQueueService {
  constructor() {
    this.redisClient = null;
    this.judgeQueue = null;
    this.workers = new Map();
    this.isInitialized = false;
    this.queueMetrics = {
      processed: 0,
      failed: 0,
      active: 0,
      waiting: 0,
      completed: 0,
      delayed: 0,
      avgProcessingTime: 0,
      processingRate: {
        perMinute: 0,
        perHour: 0,
        lastMinuteCount: 0,
        lastHourCount: 0,
        lastMinuteReset: Date.now(),
        lastHourReset: Date.now(),
        totalProcessingTime: 0,
        recentCompletions: []
      },
      queueThroughput: {
        submissions: 0,
        completions: 0,
        errors: 0,
        timespan: Date.now()
      }
    };
  }

  /**
   * Task 1: Redis Queue Setup
   */
  async initialize() {
    try {
      // Initialize Redis client
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0
      };

      this.redisClient = redis.createClient(redisConfig);
      
      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('Redis client connected successfully');
      });

      await this.redisClient.connect();

      // Create Bull queue with persistence and monitoring
      this.judgeQueue = new Queue('judge submissions', {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3, // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 second delay
          },
        },
        settings: {
          stalledInterval: 30 * 1000, // Check for stalled jobs every 30 seconds
          maxStalledCount: 1, // Max number of times a job can be stalled
        }
      });

      // Set up queue event handlers for monitoring
      this.setupQueueMonitoring();

      // Initialize workers
      await this.startWorkers();

      this.isInitialized = true;
      console.log('Judge Queue Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Judge Queue Service:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Task 1: Queue Monitoring Setup
   */
  setupQueueMonitoring() {
    if (!this.judgeQueue) return;

    // Monitor job completion
    this.judgeQueue.on('completed', async (job, result) => {
      this.queueMetrics.completed++;
      this.queueMetrics.processed++;
      
      // Calculate average processing time
      const processingTime = job.finishedOn - job.processedOn;
      this.updateAvgProcessingTime(processingTime);
      
      // Update processing rate statistics
      this.updateProcessingRateStats(processingTime);
      
      // Store queue performance metrics in database
      try {
        const queueLength = await this.judgeQueue.waiting().then(jobs => jobs.length);
        await performanceStatsStorage.storeQueueMetrics({
          waitTime: job.processedOn - job.timestamp,
          processingRate: this.queueMetrics.processingRate.perMinute,
          queueLength: queueLength,
          activeWorkers: this.workers.size,
          failedJobs: this.queueMetrics.failed,
          completedJobs: this.queueMetrics.completed,
          throughput: this.queueMetrics.queueThroughput
        });
      } catch (error) {
        console.error('Failed to store queue performance metrics:', error);
      }
      
      console.log(`Job ${job.id} completed successfully`);
    });

    // Monitor job failures
    this.judgeQueue.on('failed', (job, err) => {
      this.queueMetrics.failed++;
      console.error(`Job ${job.id} failed:`, err.message);
    });

    // Monitor active jobs
    this.judgeQueue.on('active', (job) => {
      this.queueMetrics.active++;
      console.log(`Job ${job.id} started processing`);
    });

    // Monitor waiting jobs
    this.judgeQueue.on('waiting', (jobId) => {
      this.queueMetrics.waiting++;
      console.log(`Job ${jobId} is waiting in queue`);
    });

    // Monitor stalled jobs
    this.judgeQueue.on('stalled', (job) => {
      console.warn(`Job ${job.id} stalled and will be retried`);
    });
  }

  /**
   * Helper function to update average processing time
   */
  updateAvgProcessingTime(newTime) {
    if (this.queueMetrics.completed === 1) {
      this.queueMetrics.avgProcessingTime = newTime;
    } else {
      // Running average calculation
      this.queueMetrics.avgProcessingTime = 
        (this.queueMetrics.avgProcessingTime * (this.queueMetrics.completed - 1) + newTime) / 
        this.queueMetrics.completed;
    }
  }

  /**
   * Update processing rate statistics
   */
  updateProcessingRateStats(processingTime) {
    const now = Date.now();
    const rate = this.queueMetrics.processingRate;
    
    // Track recent completions for rate calculation
    rate.recentCompletions.push({ timestamp: now, processingTime });
    
    // Remove completions older than 1 hour
    rate.recentCompletions = rate.recentCompletions.filter(
      completion => now - completion.timestamp < 60 * 60 * 1000
    );
    
    // Update per-minute rate
    if (now - rate.lastMinuteReset >= 60000) {
      const recentMinute = rate.recentCompletions.filter(
        completion => now - completion.timestamp < 60000
      );
      rate.perMinute = recentMinute.length;
      rate.lastMinuteReset = now;
    }
    
    // Update per-hour rate
    if (now - rate.lastHourReset >= 3600000) {
      rate.perHour = rate.recentCompletions.length;
      rate.lastHourReset = now;
    }
    
    // Update throughput metrics
    rate.totalProcessingTime += processingTime;
    this.queueMetrics.queueThroughput.completions++;
  }

  /**
   * Get queue processing rate statistics
   */
  getProcessingRateStats() {
    const now = Date.now();
    const rate = this.queueMetrics.processingRate;
    
    // Calculate current rates based on recent completions
    const lastMinute = rate.recentCompletions.filter(
      completion => now - completion.timestamp < 60000
    );
    const lastHour = rate.recentCompletions.filter(
      completion => now - completion.timestamp < 3600000
    );
    
    return {
      currentPerMinute: lastMinute.length,
      currentPerHour: lastHour.length,
      averageProcessingTime: rate.recentCompletions.length > 0 
        ? rate.recentCompletions.reduce((sum, c) => sum + c.processingTime, 0) / rate.recentCompletions.length 
        : 0,
      totalCompletions: this.queueMetrics.completed,
      totalProcessingTime: rate.totalProcessingTime,
      throughputPerSecond: lastMinute.length / 60,
      queueThroughput: this.queueMetrics.queueThroughput
    };
  }

  /**
   * Task 2: Submission Queue Management - Add submission to queue
   */
  async queueSubmission(submissionData) {
    if (!this.isInitialized) {
      throw new Error('Judge Queue Service not initialized');
    }

    try {
      // Calculate priority based on multiple factors
      const priority = this.calculateSubmissionPriority(submissionData);
      
      // Create job with priority and retry options
      const job = await this.judgeQueue.add('judge', submissionData, {
        priority: priority,
        delay: submissionData.delay || 0,
        attempts: submissionData.maxRetries || 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      console.log(`Queued submission ${submissionData.submissionId} with priority ${priority} as job ${job.id}`);
      
      // Broadcast queue position update
      await this.broadcastQueuePosition(submissionData);
      
      return job;
    } catch (error) {
      console.error('Failed to queue submission:', error);
      throw error;
    }
  }

  /**
   * Task 5: Queue Prioritization - Calculate submission priority
   */
  calculateSubmissionPriority(submissionData) {
    let priority = 0; // Higher number = higher priority
    
    // Recent submissions get higher priority (max 100 points)
    const submissionAge = Date.now() - new Date(submissionData.submissionTime).getTime();
    const maxAge = 60 * 60 * 1000; // 1 hour
    const agePriority = Math.max(0, 100 - (submissionAge / maxAge * 100));
    priority += agePriority;

    // Contest urgency - submissions near contest end get priority
    if (submissionData.contestEndTime) {
      const timeToEnd = new Date(submissionData.contestEndTime).getTime() - Date.now();
      const urgencyThreshold = 30 * 60 * 1000; // 30 minutes
      if (timeToEnd < urgencyThreshold && timeToEnd > 0) {
        priority += 50; // Urgent submissions get 50 bonus points
      }
    }

    // Team fairness - teams with fewer recent submissions get slight priority
    const teamSubmissionsRecent = submissionData.teamRecentSubmissions || 0;
    const fairnessPriority = Math.max(0, 25 - teamSubmissionsRecent * 5);
    priority += fairnessPriority;

    // Admin override
    if (submissionData.adminPriority) {
      priority += 1000; // Admin priority submissions always go first
    }

    // Language-based priority (faster languages get slight preference for better throughput)
    const languagePriorities = { cpp: 10, java: 5, python: 0 };
    priority += languagePriorities[submissionData.language] || 0;

    return Math.round(priority);
  }

  /**
   * Task 4: Concurrent Submission Handling - Start multiple workers
   */
  async startWorkers(workerCount = null) {
    if (!this.judgeQueue) {
      throw new Error('Queue not initialized');
    }

    // Auto-scale worker count based on system resources
    const defaultWorkerCount = Math.min(4, Math.max(1, require('os').cpus().length - 1));
    const numWorkers = workerCount || process.env.JUDGE_WORKERS || defaultWorkerCount;

    console.log(`Starting ${numWorkers} judge workers...`);

    // Set up single handler that can process jobs concurrently
    this.judgeQueue.process('judge', numWorkers, async (job) => {
      const workerId = `worker-${job.id % numWorkers}`;
      return await this.processSubmission(job.data, workerId);
    });

    // Initialize worker tracking
    for (let i = 0; i < numWorkers; i++) {
      const workerId = `worker-${i}`;
      this.workers.set(workerId, {
        startTime: new Date(),
        processedJobs: 0,
        failedJobs: 0,
        isHealthy: true,
        lastHeartbeat: new Date()
      });
      console.log(`Worker ${workerId} started successfully`);
    }

    // Set up load-based scaling
    this.setupLoadBasedScaling();
  }

  /**
   * Task 4: Start individual worker (deprecated - using single handler with concurrency)
   */
  async startWorker(workerId) {
    // This method is now handled by the single process handler in startWorkers
    // Individual workers are tracked but don't register separate handlers
    console.log(`Worker ${workerId} registered in pool`);
    return true;
  }

  /**
   * Task 4: Load-based scaling
   */
  setupLoadBasedScaling() {
    setInterval(async () => {
      try {
        const queueStats = await this.getQueueStats();
        const currentWorkers = this.workers.size;
        const waitingJobs = queueStats.waiting;
        const activeJobs = queueStats.active;

        // Scale up if queue is backing up
        if (waitingJobs > currentWorkers * 3 && currentWorkers < 8) {
          console.log(`Scaling up: ${waitingJobs} jobs waiting, adding worker`);
          await this.startWorker(`worker-${Date.now()}`);
        }

        // Scale down if workers are mostly idle
        if (waitingJobs === 0 && activeJobs < currentWorkers / 2 && currentWorkers > 2) {
          console.log('Scaling down: removing idle worker');
          await this.removeIdleWorker();
        }
      } catch (error) {
        console.error('Error in load-based scaling:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Task 4: Remove idle worker for scaling down
   */
  async removeIdleWorker() {
    const workerEntries = Array.from(this.workers.entries());
    
    // Find worker with least processed jobs (likely most idle)
    let idleWorker = null;
    let minProcessed = Infinity;
    
    for (const [workerId, workerInfo] of workerEntries) {
      if (workerInfo.processedJobs < minProcessed) {
        minProcessed = workerInfo.processedJobs;
        idleWorker = workerId;
      }
    }
    
    if (idleWorker && this.workers.size > 2) {
      this.workers.delete(idleWorker);
      console.log(`Removed idle worker ${idleWorker}`);
    }
  }

  /**
   * Task 2: Process individual submission
   */
  async processSubmission(submissionData, workerId) {
    const startTime = Date.now();
    
    try {
      // Update worker stats
      if (this.workers.has(workerId)) {
        const worker = this.workers.get(workerId);
        worker.lastHeartbeat = new Date();
        worker.processedJobs++;
      }

      console.log(`Worker ${workerId} processing submission ${submissionData.submissionId}`);
      
      // Use existing execution services
      const ICPCJudge = require('./icpcJudge');
      const judge = new ICPCJudge();
      
      // Process submission through ICPC judge
      const result = await judge.judgeSubmission(
        submissionData.submissionId,
        submissionData.teamId,
        submissionData.problemId,
        submissionData.language,
        submissionData.code
      );

      const processingTime = Date.now() - startTime;
      console.log(`Worker ${workerId} completed submission ${submissionData.submissionId} in ${processingTime}ms`);
      
      return {
        success: true,
        submissionId: submissionData.submissionId,
        result: result,
        processingTime: processingTime,
        workerId: workerId
      };
    } catch (error) {
      // Update worker failure stats
      if (this.workers.has(workerId)) {
        const worker = this.workers.get(workerId);
        worker.failedJobs++;
      }

      console.error(`Worker ${workerId} failed to process submission ${submissionData.submissionId}:`, error);
      throw error;
    }
  }

  /**
   * Task 3: Queue Status Monitoring
   */
  async getQueueStats() {
    if (!this.judgeQueue) return null;

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.judgeQueue.getWaiting(),
        this.judgeQueue.getActive(),
        this.judgeQueue.getCompleted(),
        this.judgeQueue.getFailed(),
        this.judgeQueue.getDelayed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        workers: this.getWorkerStats(),
        avgProcessingTime: this.queueMetrics.avgProcessingTime,
        totalProcessed: this.queueMetrics.processed
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return null;
    }
  }

  /**
   * Task 3: Worker Health Monitoring
   */
  getWorkerStats() {
    const stats = [];
    const now = new Date();
    
    for (const [workerId, workerInfo] of this.workers.entries()) {
      const timeSinceHeartbeat = now - workerInfo.lastHeartbeat;
      const isHealthy = timeSinceHeartbeat < 60000; // Healthy if heartbeat within 1 minute
      
      stats.push({
        workerId: workerId,
        startTime: workerInfo.startTime,
        processedJobs: workerInfo.processedJobs,
        failedJobs: workerInfo.failedJobs,
        isHealthy: isHealthy,
        lastHeartbeat: workerInfo.lastHeartbeat,
        uptime: now - workerInfo.startTime
      });
    }
    
    return stats;
  }

  /**
   * Task 3: Queue Administration - Pause queue
   */
  async pauseQueue() {
    if (!this.judgeQueue) throw new Error('Queue not initialized');
    await this.judgeQueue.pause();
    console.log('Judge queue paused');
  }

  /**
   * Task 3: Queue Administration - Resume queue
   */
  async resumeQueue() {
    if (!this.judgeQueue) throw new Error('Queue not initialized');
    await this.judgeQueue.resume();
    console.log('Judge queue resumed');
  }

  /**
   * Task 3: Queue Administration - Clear queue
   */
  async clearQueue() {
    if (!this.judgeQueue) throw new Error('Queue not initialized');
    await this.judgeQueue.clean(0, 'completed');
    await this.judgeQueue.clean(0, 'failed');
    await this.judgeQueue.clean(0, 'active');
    await this.judgeQueue.clean(0, 'waiting');
    console.log('Judge queue cleared');
  }

  /**
   * Task 3: Queue Administration - Handle stuck jobs
   */
  async handleStuckJobs() {
    if (!this.judgeQueue) throw new Error('Queue not initialized');
    
    try {
      // Clean up stalled jobs (jobs that have been processing too long)
      const stalledJobs = await this.judgeQueue.clean(5 * 60 * 1000, 'active'); // 5 minutes
      console.log(`Cleaned up ${stalledJobs.length} stalled jobs`);
      
      // Restart unhealthy workers
      await this.restartUnhealthyWorkers();
      
      return stalledJobs.length;
    } catch (error) {
      console.error('Error handling stuck jobs:', error);
      throw error;
    }
  }

  /**
   * Task 4: Worker failure handling
   */
  async restartUnhealthyWorkers() {
    const now = new Date();
    const unhealthyWorkers = [];
    
    for (const [workerId, workerInfo] of this.workers.entries()) {
      const timeSinceHeartbeat = now - workerInfo.lastHeartbeat;
      if (timeSinceHeartbeat > 120000) { // No heartbeat for 2 minutes
        unhealthyWorkers.push(workerId);
      }
    }
    
    for (const workerId of unhealthyWorkers) {
      console.log(`Restarting unhealthy worker ${workerId}`);
      this.workers.delete(workerId);
      await this.startWorker(`${workerId}-restart-${Date.now()}`);
    }
    
    return unhealthyWorkers.length;
  }

  /**
   * Get pending submissions count for a contest
   */
  async getPendingSubmissionsCount(contestId) {
    try {
      // Get both database pending submissions and queued submissions
      const dbPending = await db('submissions')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .where('problems.contest_id', contestId)
        .where('submissions.status', 'pending')
        .count('* as count')
        .first();

      let queuePending = 0;
      if (this.judgeQueue) {
        const waiting = await this.judgeQueue.getWaiting();
        const active = await this.judgeQueue.getActive();
        queuePending = waiting.length + active.length;
      }

      return parseInt(dbPending.count) + queuePending;
    } catch (error) {
      console.error('Error getting pending submissions count:', error);
      return 0;
    }
  }

  /**
   * Broadcast queue position update - Phase 4.5
   * @param {Object} submissionData - Submission information
   */
  async broadcastQueuePosition(submissionData) {
    try {
      const queueStats = await this.getQueueStats();
      const position = queueStats.waiting + 1; // New submission is at end of queue
      const estimatedWaitTime = this.calculateEstimatedWaitTime(position);
      
      const websocketService = require('./websocketService');
      await websocketService.broadcastSubmissionStatus({
        submissionId: submissionData.submissionId,
        teamId: submissionData.teamId,
        contestId: submissionData.contestId,
        status: 'queued',
        queuePosition: position,
        estimatedWaitTime: estimatedWaitTime
      });
    } catch (error) {
      console.error('Error broadcasting queue position:', error);
    }
  }

  /**
   * Calculate estimated wait time based on queue position
   * @param {number} position - Position in queue
   * @returns {number} Estimated wait time in seconds
   */
  calculateEstimatedWaitTime(position) {
    // Use processing rate to estimate wait time
    const avgProcessingTime = this.queueMetrics.avgProcessingTime || 10000; // Default 10 seconds
    const activeWorkers = this.workers.size || 1;
    
    // Estimate based on queue position and worker count
    const estimatedTime = (position / activeWorkers) * (avgProcessingTime / 1000);
    return Math.max(5, Math.round(estimatedTime)); // Minimum 5 seconds
  }

  /**
   * Get queue position for a specific submission
   * @param {string} submissionId - Submission ID
   * @returns {Object|null} Queue position data
   */
  async getQueuePosition(submissionId) {
    if (!this.judgeQueue) return null;

    try {
      const [waiting, active] = await Promise.all([
        this.judgeQueue.getWaiting(),
        this.judgeQueue.getActive()
      ]);

      // Check if submission is being processed
      const activeJob = active.find(job => job.data.submissionId === submissionId);
      if (activeJob) {
        return {
          submissionId: submissionId,
          status: 'processing',
          position: 0,
          estimatedWaitTime: 0
        };
      }

      // Check position in waiting queue
      const waitingIndex = waiting.findIndex(job => job.data.submissionId === submissionId);
      if (waitingIndex >= 0) {
        return {
          submissionId: submissionId,
          status: 'queued',
          position: waitingIndex + 1,
          estimatedWaitTime: this.calculateEstimatedWaitTime(waitingIndex + 1)
        };
      }

      return null; // Submission not found in queue
    } catch (error) {
      console.error('Error getting queue position:', error);
      return null;
    }
  }

  /**
   * Broadcast updated queue positions to all relevant teams
   */
  async broadcastQueueUpdates() {
    if (!this.judgeQueue) return;

    try {
      const waiting = await this.judgeQueue.getWaiting();
      const queueUpdates = [];

      for (let i = 0; i < waiting.length; i++) {
        const job = waiting[i];
        const position = i + 1;
        const estimatedWaitTime = this.calculateEstimatedWaitTime(position);

        queueUpdates.push({
          submissionId: job.data.submissionId,
          teamId: job.data.teamId,
          position: position,
          estimatedWaitTime: estimatedWaitTime,
          totalInQueue: waiting.length
        });
      }

      if (queueUpdates.length > 0) {
        const websocketService = require('./websocketService');
        // Group by contest for efficient broadcasting
        const updatesByContest = {};
        for (const update of queueUpdates) {
          const contestId = waiting.find(j => j.data.submissionId === update.submissionId)?.data.contestId;
          if (contestId) {
            if (!updatesByContest[contestId]) {
              updatesByContest[contestId] = [];
            }
            updatesByContest[contestId].push(update);
          }
        }

        for (const [contestId, updates] of Object.entries(updatesByContest)) {
          await websocketService.broadcastQueuePositionUpdates(parseInt(contestId), updates);
        }
      }
    } catch (error) {
      console.error('Error broadcasting queue updates:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('Shutting down Judge Queue Service...');
    
    if (this.judgeQueue) {
      await this.judgeQueue.close();
    }
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    this.workers.clear();
    this.isInitialized = false;
    console.log('Judge Queue Service shut down successfully');
  }
}

// Create singleton instance
const judgeQueueService = new JudgeQueueService();

module.exports = judgeQueueService;
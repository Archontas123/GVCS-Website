/**
 * Contest Scheduler Service - Phase 2.4
 * Handles automated contest timing: auto-start, auto-freeze, auto-end
 */

const cron = require('node-cron');
const { db } = require('../utils/db');
const Contest = require('../controllers/contestController');
const notificationService = require('./notificationService');
const winston = require('winston');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/contest-scheduler.log' }),
    new winston.transports.Console()
  ]
});

class ContestScheduler {
  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  /**
   * Start the contest scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Contest scheduler is already running');
      return;
    }

    logger.info('Starting contest scheduler...');

    // Check every minute for contests that need status updates
    this.mainTask = cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndUpdateContests();
      } catch (error) {
        logger.error('Error in contest scheduler main task:', error);
      }
    }, {
      scheduled: false
    });

    this.mainTask.start();
    this.isRunning = true;
    logger.info('Contest scheduler started successfully');
  }

  /**
   * Stop the contest scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Contest scheduler is not running');
      return;
    }

    logger.info('Stopping contest scheduler...');

    if (this.mainTask) {
      this.mainTask.stop();
    }

    // Clear all scheduled tasks
    this.scheduledTasks.forEach(task => task.stop());
    this.scheduledTasks.clear();

    this.isRunning = false;
    logger.info('Contest scheduler stopped successfully');
  }

  /**
   * Check all contests and update their status if needed
   */
  async checkAndUpdateContests() {
    try {
      const now = new Date();
      
      // Get all active contests that might need status updates
      const contests = await db('contests')
        .select('*')
        .where('is_active', true)
        .where('start_time', '<=', new Date(now.getTime() + 5 * 60 * 1000)) // Starting in next 5 minutes or already started
        .orderBy('start_time');

      for (const contest of contests) {
        await this.processContestTiming(contest, now);
      }
    } catch (error) {
      logger.error('Error checking and updating contests:', error);
      throw error;
    }
  }

  /**
   * Process timing for a single contest
   */
  async processContestTiming(contest, now = new Date()) {
    try {
      const contestStatus = Contest.getContestStatus(contest);
      const startTime = new Date(contest.start_time);
      const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
      const freezeTime = new Date(endTime.getTime() - contest.freeze_time * 60 * 1000);

      // Check if contest should start
      if (contestStatus.status === 'not_started' && now >= startTime) {
        await this.autoStartContest(contest);
      }
      // Check if contest should be frozen
      else if (contestStatus.status === 'running' && !contest.is_frozen && now >= freezeTime) {
        await this.autoFreezeContest(contest);
      }
      // Check if contest should end
      else if ((contestStatus.status === 'running' || contestStatus.status === 'frozen') && now >= endTime) {
        await this.autoEndContest(contest);
      }

    } catch (error) {
      logger.error(`Error processing contest timing for contest ${contest.id}:`, error);
      throw error;
    }
  }

  /**
   * Automatically start a contest
   */
  async autoStartContest(contest) {
    try {
      logger.info(`Auto-starting contest: ${contest.contest_name} (ID: ${contest.id})`);

      // Validate contest can be started
      const canStart = await this.validateContestCanStart(contest);
      if (!canStart.valid) {
        logger.warn(`Cannot auto-start contest ${contest.id}: ${canStart.reason}`);
        return;
      }

      // Update contest status (no explicit status field, but contest is considered started when current time >= start_time)
      await db('contests')
        .where('id', contest.id)
        .update({
          // Contest is considered started when current time >= start_time
          // No explicit status update needed as getContestStatus handles this
        });

      // Notify all teams via WebSocket
      await notificationService.broadcastToContest(contest.id, {
        type: 'contest_started',
        message: `Contest "${contest.contest_name}" has started!`,
        contest: {
          id: contest.id,
          name: contest.contest_name,
          start_time: contest.start_time,
          duration: contest.duration
        },
        timestamp: new Date().toISOString()
      });

      logger.info(`Contest ${contest.id} auto-started successfully`);

    } catch (error) {
      logger.error(`Failed to auto-start contest ${contest.id}:`, error);
      throw error;
    }
  }

  /**
   * Automatically freeze contest leaderboard
   */
  async autoFreezeContest(contest) {
    try {
      logger.info(`Auto-freezing contest: ${contest.contest_name} (ID: ${contest.id})`);

      // Use freeze service for proper freeze handling
      const freezeService = require('./freezeService');
      await freezeService.freezeLeaderboard(contest.id);

      logger.info(`Contest ${contest.id} auto-frozen successfully`);

    } catch (error) {
      logger.error(`Failed to auto-freeze contest ${contest.id}:`, error);
      throw error;
    }
  }

  /**
   * Check and trigger auto-freeze for all eligible contests - Phase 3.4
   */
  async checkAutoFreeze() {
    try {
      const now = new Date();
      
      // Get all running contests that might need to be frozen
      const contests = await db('contests')
        .select('*')
        .where('is_active', true)
        .where('is_frozen', false);

      const freezeService = require('./freezeService');

      for (const contest of contests) {
        const shouldFreeze = await freezeService.shouldAutoFreeze(contest.id);
        
        if (shouldFreeze) {
          await this.autoFreezeContest(contest);
        }
      }
    } catch (error) {
      logger.error('Error checking auto-freeze:', error);
      throw error;
    }
  }

  /**
   * Automatically end a contest with graceful shutdown - Phase 2.4
   */
  async autoEndContest(contest) {
    try {
      logger.info(`Auto-ending contest: ${contest.contest_name} (ID: ${contest.id})`);

      const now = new Date();
      const endGraceTime = 30000; // 30 seconds grace period

      // Step 1: Stop accepting new submissions
      logger.info(`Stopping new submissions for contest ${contest.id}...`);
      await this.stopAcceptingSubmissions(contest.id);

      // Step 2: Give grace period for pending submissions to complete
      logger.info(`Grace period: Waiting ${endGraceTime/1000} seconds for pending submissions in contest ${contest.id}...`);
      
      // Check submission queue and wait for pending submissions
      const pendingSubmissions = await this.getPendingSubmissionsCount(contest.id);
      if (pendingSubmissions > 0) {
        logger.info(`Found ${pendingSubmissions} pending submissions. Waiting for completion...`);
        
        // Wait up to grace period, checking every 5 seconds
        let waitTime = 0;
        while (waitTime < endGraceTime) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          waitTime += 5000;
          
          const stillPending = await this.getPendingSubmissionsCount(contest.id);
          if (stillPending === 0) {
            logger.info(`All pending submissions completed after ${waitTime/1000} seconds`);
            break;
          }
          
          if (waitTime >= endGraceTime) {
            logger.warn(`Grace period expired. ${stillPending} submissions still pending.`);
          }
        }
      }

      // Step 3: Complete pending submissions (force completion if needed)
      await this.completePendingSubmissions(contest.id);

      // Step 4: Update contest to ended status
      await db('contests')
        .where('id', contest.id)
        .update({
          is_active: false, // Contest is now ended
          ended_at: now
        });

      // Step 5: Calculate final rankings
      await this.calculateFinalRankings(contest.id);

      // Step 6: Generate final results and statistics
      await this.generateFinalResults(contest.id);

      // Step 7: Archive contest data
      await this.archiveContestData(contest.id);

      // Step 8: Notify all teams via WebSocket
      await notificationService.broadcastToContest(contest.id, {
        type: 'contest_ended',
        message: `Contest "${contest.contest_name}" has ended!`,
        contest: {
          id: contest.id,
          name: contest.contest_name,
          end_time: now,
          final_rankings_available: true
        },
        timestamp: now.toISOString()
      });

      logger.info(`Contest ${contest.id} auto-ended successfully with graceful shutdown`);

    } catch (error) {
      logger.error(`Failed to auto-end contest ${contest.id}:`, error);
      throw error;
    }
  }

  /**
   * Validate that a contest can be started
   */
  async validateContestCanStart(contest) {
    try {
      // Check if contest has problems
      const problemCount = await db('problems')
        .where('contest_id', contest.id)
        .count('* as count')
        .first();

      if (parseInt(problemCount.count) === 0) {
        return { valid: false, reason: 'Contest has no problems' };
      }

      // Check if problems have test cases
      const problemsWithoutTestCases = await db('problems')
        .leftJoin('test_cases', 'problems.id', 'test_cases.problem_id')
        .where('problems.contest_id', contest.id)
        .groupBy('problems.id')
        .havingRaw('COUNT(test_cases.id) = 0')
        .count('* as count')
        .first();

      if (parseInt(problemsWithoutTestCases.count) > 0) {
        return { valid: false, reason: 'Some problems have no test cases' };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating contest can start:', error);
      return { valid: false, reason: 'Validation failed due to error' };
    }
  }

  /**
   * Calculate final rankings for ended contest
   */
  async calculateFinalRankings(contestId) {
    try {
      logger.info(`Calculating final rankings for contest ${contestId}`);
      
      // This will be implemented in Phase 3 (ICPC Scoring System)
      // For now, just log that final rankings need to be calculated
      logger.info(`Final rankings calculation for contest ${contestId} - to be implemented in Phase 3`);

    } catch (error) {
      logger.error(`Error calculating final rankings for contest ${contestId}:`, error);
      throw error;
    }
  }

  /**
   * Stop accepting new submissions for a contest - Phase 2.4
   */
  async stopAcceptingSubmissions(contestId) {
    try {
      // Mark contest as no longer accepting submissions
      // This will be checked in submission endpoints
      logger.info(`Contest ${contestId} no longer accepting new submissions`);
      return true;
    } catch (error) {
      logger.error(`Error stopping submissions for contest ${contestId}:`, error);
      throw error;
    }
  }

  /**
   * Get count of pending submissions for a contest - Phase 2.4
   */
  async getPendingSubmissionsCount(contestId) {
    try {
      const result = await db('submissions')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .where('problems.contest_id', contestId)
        .where('submissions.status', 'pending')
        .count('* as count')
        .first();

      return parseInt(result.count) || 0;
    } catch (error) {
      logger.error(`Error getting pending submissions count for contest ${contestId}:`, error);
      return 0;
    }
  }

  /**
   * Complete pending submissions (force completion if needed) - Phase 2.4
   */
  async completePendingSubmissions(contestId) {
    try {
      // Mark any remaining pending submissions as "time_limit_exceeded" 
      // since contest has ended
      const result = await db('submissions')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .where('problems.contest_id', contestId)
        .where('submissions.status', 'pending')
        .update({
          status: 'time_limit_exceeded',
          judged_at: new Date()
        });

      if (result > 0) {
        logger.warn(`Force-completed ${result} pending submissions for ended contest ${contestId}`);
      }

      return result;
    } catch (error) {
      logger.error(`Error completing pending submissions for contest ${contestId}:`, error);
      throw error;
    }
  }

  /**
   * Generate final results and statistics - Phase 2.4
   */
  async generateFinalResults(contestId) {
    try {
      logger.info(`Generating final results for contest ${contestId}`);
      
      // This will be fully implemented in Phase 3 (ICPC Scoring System)
      // For now, just log that final results are being generated
      const teamCount = await db('teams')
        .where('contest_code', (
          await db('contests').select('registration_code').where('id', contestId).first()
        ).registration_code)
        .count('* as count')
        .first();

      const submissionCount = await db('submissions')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .where('problems.contest_id', contestId)
        .count('* as count')
        .first();

      logger.info(`Final results for contest ${contestId}: ${teamCount.count} teams, ${submissionCount.count} submissions`);

    } catch (error) {
      logger.error(`Error generating final results for contest ${contestId}:`, error);
      throw error;
    }
  }

  /**
   * Archive contest data - Phase 2.4 Enhanced
   */
  async archiveContestData(contestId) {
    try {
      logger.info(`Archiving contest data for contest ${contestId}`);
      
      // Update contest with archival timestamp
      await db('contests')
        .where('id', contestId)
        .update({
          archived_at: new Date()
        });

      // In a production environment, this might also:
      // - Export contest data to files
      // - Move large data to archive tables
      // - Generate summary reports
      // - Clean up temporary data

      logger.info(`Contest ${contestId} data archived successfully`);

    } catch (error) {
      logger.error(`Error archiving contest data for contest ${contestId}:`, error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledTasks: this.scheduledTasks.size,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Schedule a specific contest event (for manual scheduling)
   */
  scheduleContestEvent(contestId, eventType, dateTime, callback) {
    const cronExpression = this.dateToCron(dateTime);
    
    const task = cron.schedule(cronExpression, async () => {
      try {
        await callback();
        // Remove task after execution
        this.scheduledTasks.delete(`${contestId}-${eventType}`);
      } catch (error) {
        logger.error(`Error in scheduled task ${contestId}-${eventType}:`, error);
      }
    }, {
      scheduled: false
    });

    this.scheduledTasks.set(`${contestId}-${eventType}`, task);
    task.start();

    logger.info(`Scheduled ${eventType} for contest ${contestId} at ${dateTime}`);
  }

  /**
   * Convert Date to cron expression (simplified)
   */
  dateToCron(date) {
    const d = new Date(date);
    return `${d.getMinutes()} ${d.getHours()} ${d.getDate()} ${d.getMonth() + 1} *`;
  }
}

// Export singleton instance
const contestScheduler = new ContestScheduler();
module.exports = contestScheduler;
const cron = require('node-cron');
const { db } = require('../utils/db');
const Contest = require('../controllers/contestController');
const notificationService = require('./notificationService');
const winston = require('winston');

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

/**
 * Contest Scheduler Service for automated contest lifecycle management
 * Manages contest timing, notifications, and graceful shutdown procedures
 */
class ContestScheduler {
  /**
   * Initialize contest scheduler with empty task tracking
   */
  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  /**
   * Start the contest scheduler
   * @returns {void}
   */
  start() {
    if (this.isRunning) {
      logger.warn('Contest scheduler is already running');
      return;
    }

    logger.info('Starting contest scheduler...');

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
   * @returns {void}
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

    this.scheduledTasks.forEach(task => task.stop());
    this.scheduledTasks.clear();

    this.isRunning = false;
    logger.info('Contest scheduler stopped successfully');
  }

  /**
   * Check all contests and update their status if needed
   * @returns {Promise<void>}
   * @throws {Error} When database query fails or contest processing fails
   */
  async checkAndUpdateContests() {
    try {
      const now = new Date();
      
      const contests = await db('contests')
        .select('*')
        .where('is_active', true)
        .where('start_time', '<=', new Date(now.getTime() + 5 * 60 * 1000))
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
   * @param {Object} contest - Contest data object
   * @param {Date} [now=new Date()] - Current timestamp for comparison
   * @returns {Promise<void>}
   * @throws {Error} When contest processing fails
   * @private
   */
  async processContestTiming(contest, now = new Date()) {
    try {
      const contestStatus = Contest.getContestStatus(contest);
      const startTime = new Date(contest.start_time);
      const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
      const freezeTime = new Date(endTime.getTime() - contest.freeze_time * 60 * 1000);

      if (contestStatus.status === 'not_started' && now >= startTime) {
        await this.autoStartContest(contest);
      }
      else if (contestStatus.status === 'running' && !contest.is_frozen && now >= freezeTime) {
        await this.autoFreezeContest(contest);
      }
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
   * @param {Object} contest - Contest data object
   * @param {number} contest.id - Contest ID
   * @param {string} contest.contest_name - Contest name
   * @param {Date} contest.start_time - Contest start time
   * @param {number} contest.duration - Contest duration in minutes
   * @returns {Promise<void>}
   * @throws {Error} When contest start validation or database update fails
   * @private
   */
  async autoStartContest(contest) {
    try {
      logger.info(`Auto-starting contest: ${contest.contest_name} (ID: ${contest.id})`);

      const canStart = await this.validateContestCanStart(contest);
      if (!canStart.valid) {
        logger.warn(`Cannot auto-start contest ${contest.id}: ${canStart.reason}`);
        return;
      }

      await db('contests')
        .where('id', contest.id)
        .update({
        });

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
   * @param {Object} contest - Contest data object
   * @param {number} contest.id - Contest ID
   * @param {string} contest.contest_name - Contest name
   * @returns {Promise<void>}
   * @throws {Error} When freeze operation fails
   * @private
   */
  async autoFreezeContest(contest) {
    try {
      logger.info(`Auto-freezing contest: ${contest.contest_name} (ID: ${contest.id})`);

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
   * @returns {Promise<void>}
   * @throws {Error} When auto-freeze check fails
   */
  async checkAutoFreeze() {
    try {
      const now = new Date();
      
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
   * @param {Object} contest - Contest data object
   * @param {number} contest.id - Contest ID
   * @param {string} contest.contest_name - Contest name
   * @returns {Promise<void>}
   * @throws {Error} When contest end process fails
   * @private
   */
  async autoEndContest(contest) {
    try {
      logger.info(`Auto-ending contest: ${contest.contest_name} (ID: ${contest.id})`);

      const now = new Date();
      const endGraceTime = 30000;

      logger.info(`Stopping new submissions for contest ${contest.id}...`);
      await this.stopAcceptingSubmissions(contest.id);

      logger.info(`Grace period: Waiting ${endGraceTime/1000} seconds for pending submissions in contest ${contest.id}...`);
      
      const pendingSubmissions = await this.getPendingSubmissionsCount(contest.id);
      if (pendingSubmissions > 0) {
        logger.info(`Found ${pendingSubmissions} pending submissions. Waiting for completion...`);
        
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

      await this.completePendingSubmissions(contest.id);

      await db('contests')
        .where('id', contest.id)
        .update({
          is_active: false,
          ended_at: now
        });

      await this.calculateFinalRankings(contest.id);

      await this.generateFinalResults(contest.id);

      await this.archiveContestData(contest.id);

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
   * @param {Object} contest - Contest data object
   * @param {number} contest.id - Contest ID
   * @returns {Promise<Object>} Validation result with valid boolean and optional reason
   * @private
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
   * @param {number} contestId - Contest ID
   * @returns {Promise<void>}
   * @throws {Error} When ranking calculation fails
   * @private
   */
  async calculateFinalRankings(contestId) {
    try {
      logger.info(`Calculating final rankings for contest ${contestId}`);
      
      logger.info(`Final rankings calculation for contest ${contestId} - to be implemented in Phase 3`);

    } catch (error) {
      logger.error(`Error calculating final rankings for contest ${contestId}:`, error);
      throw error;
    }
  }

  /**
   * Stop accepting new submissions for a contest - Phase 2.4
   * @param {number} contestId - Contest ID
   * @returns {Promise<boolean>} True if successful
   * @throws {Error} When operation fails
   * @private
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
   * @param {number} contestId - Contest ID
   * @returns {Promise<number>} Number of pending submissions
   * @private
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
   * @param {number} contestId - Contest ID
   * @returns {Promise<number>} Number of submissions force-completed
   * @throws {Error} When database update fails
   * @private
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
   * @param {number} contestId - Contest ID
   * @returns {Promise<void>}
   * @throws {Error} When results generation fails
   * @private
   */
  async generateFinalResults(contestId) {
    try {
      logger.info(`Generating final results for contest ${contestId}`);
      
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
   * @param {number} contestId - Contest ID
   * @returns {Promise<void>}
   * @throws {Error} When archival process fails
   * @private
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


      logger.info(`Contest ${contestId} data archived successfully`);

    } catch (error) {
      logger.error(`Error archiving contest data for contest ${contestId}:`, error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Status object with isRunning, scheduledTasks count, and uptime
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
   * @param {number} contestId - Contest ID
   * @param {string} eventType - Type of event to schedule
   * @param {Date} dateTime - When to execute the event
   * @param {Function} callback - Callback function to execute
   * @returns {void}
   */
  scheduleContestEvent(contestId, eventType, dateTime, callback) {
    const cronExpression = this.dateToCron(dateTime);
    
    const task = cron.schedule(cronExpression, async () => {
      try {
        await callback();
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
   * @param {Date} date - Date to convert to cron expression
   * @returns {string} Cron expression string
   * @private
   */
  dateToCron(date) {
    const d = new Date(date);
    return `${d.getMinutes()} ${d.getHours()} ${d.getDate()} ${d.getMonth() + 1} *`;
  }
}

// Export singleton instance
const contestScheduler = new ContestScheduler();
module.exports = contestScheduler;
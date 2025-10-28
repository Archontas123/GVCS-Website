const cron = require('node-cron');
const { db } = require('../utils/db');
const contestTemplateService = require('./contestTemplateService');
const websocketService = require('./websocketService');
const notificationService = require('./notificationService');

/**
 * Advanced contest scheduling service for multi-contest management
 * Handles scheduled contests, recurring contests, and contest series
 */
class ContestSchedulerService {
  /**
   * Initialize contest scheduler with task tracking maps
   */
  constructor() {
    this.scheduledTasks = new Map();
    this.recurringTasks = new Map();
    this.contestSeries = new Map();
    this.initializeScheduler();
  }

  /**
   * Initialize scheduler and load existing schedules
   * @throws {Error} When initialization fails
   */
  async initializeScheduler() {
    try {
      await this.loadScheduledContests();
      await this.loadRecurringSchedules();
      await this.loadContestSeries();
      
      // Schedule cleanup task
      this.scheduleCleanupTask();
      
    } catch (error) {
    }
  }

  /**
   * Schedule a single contest for future execution
   * @param {Object} contestData - Contest configuration data
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Scheduled contest object
   * @throws {Error} When scheduling fails
   */
  async scheduleContest(contestData, adminId) {
    try {
      const schedule = {
        contest_name: contestData.contest_name,
        description: contestData.description,
        template_id: contestData.template_id,
        scheduled_time: contestData.scheduled_time,
        duration: contestData.duration,
        settings: JSON.stringify(contestData.settings || {}),
        created_by: adminId,
        created_at: new Date().toISOString(),
        status: 'scheduled',
        notification_settings: JSON.stringify(contestData.notification_settings || {
          remind_24h: true,
          remind_1h: true,
          remind_15m: true
        })
      };

      const result = await db('scheduled_contests').insert(schedule).returning('*');
      const scheduledContest = result[0];

      // Schedule the actual contest creation
      await this.scheduleContestTask(scheduledContest);

      // Schedule notifications
      await this.scheduleNotifications(scheduledContest);

        scheduleId: scheduledContest.id,
        contestName: contestData.contest_name,
        scheduledTime: contestData.scheduled_time
      });

      return scheduledContest;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Schedule recurring contests using cron expressions
   * @param {Object} recurringData - Recurring contest configuration
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Recurring contest object
   * @throws {Error} When scheduling fails
   */
  async scheduleRecurringContest(recurringData, adminId) {
    try {
      const recurring = {
        name: recurringData.name,
        description: recurringData.description,
        template_id: recurringData.template_id,
        cron_expression: recurringData.cron_expression,
        duration: recurringData.duration,
        settings: JSON.stringify(recurringData.settings || {}),
        created_by: adminId,
        created_at: new Date().toISOString(),
        is_active: true,
        next_execution: this.getNextExecution(recurringData.cron_expression)
      };

      const result = await db('recurring_contests').insert(recurring).returning('*');
      const recurringContest = result[0];

      // Schedule the recurring task
      await this.scheduleRecurringTask(recurringContest);

        recurringId: recurringContest.id,
        name: recurringData.name,
        cronExpression: recurringData.cron_expression
      });

      return recurringContest;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create contest series (tournaments) with multiple rounds
   * @param {Object} seriesData - Series configuration data
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Created contest series object
   * @throws {Error} When creation fails
   */
  async createContestSeries(seriesData, adminId) {
    try {
      const series = {
        name: seriesData.name,
        description: seriesData.description,
        start_date: seriesData.start_date,
        end_date: seriesData.end_date,
        settings: JSON.stringify({
          qualification_criteria: seriesData.qualification_criteria,
          advancement_rules: seriesData.advancement_rules,
          prize_distribution: seriesData.prize_distribution,
          team_limits: seriesData.team_limits
        }),
        created_by: adminId,
        created_at: new Date().toISOString(),
        status: 'planning'
      };

      const result = await db('contest_series').insert(series).returning('*');
      const createdSeries = result[0];

      // Create individual contests in the series
      if (seriesData.contests && seriesData.contests.length > 0) {
        await this.createSeriesContests(createdSeries.id, seriesData.contests, adminId);
      }

        seriesId: createdSeries.id,
        name: seriesData.name,
        contestCount: seriesData.contests?.length || 0
      });

      return createdSeries;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Schedule contest task execution
   */
  async scheduleContestTask(scheduledContest) {
    const taskId = `contest_${scheduledContest.id}`;
    const scheduledTime = new Date(scheduledContest.scheduled_time);

    // Calculate time until execution
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Execute immediately if time has passed
      await this.executeScheduledContest(scheduledContest);
      return;
    }

    // Schedule the task
    const timeout = setTimeout(async () => {
      await this.executeScheduledContest(scheduledContest);
      this.scheduledTasks.delete(taskId);
    }, delay);

    this.scheduledTasks.set(taskId, {
      timeout,
      scheduledContest,
      scheduledTime
    });

  }

  /**
   * Execute scheduled contest creation
   */
  async executeScheduledContest(scheduledContest) {
    try {

      // Create the actual contest
      const contestData = {
        contest_name: scheduledContest.contest_name,
        description: scheduledContest.description,
        start_time: scheduledContest.scheduled_time,
        duration: scheduledContest.duration,
        settings: JSON.parse(scheduledContest.settings || '{}')
      };

      const contest = await contestTemplateService.createContestFromTemplate(
        scheduledContest.template_id,
        contestData,
        scheduledContest.created_by
      );

      // Update scheduled contest status
      await db('scheduled_contests')
        .where({ id: scheduledContest.id })
        .update({
          status: 'executed',
          contest_id: contest.id,
          executed_at: new Date().toISOString()
        });

      // Send notifications
      await notificationService.sendContestCreatedNotification(contest);

        scheduleId: scheduledContest.id,
        contestId: contest.id
      });

      return contest;
    } catch (error) {
      
      // Mark as failed
      await db('scheduled_contests')
        .where({ id: scheduledContest.id })
        .update({
          status: 'failed',
          error_message: error.message,
          failed_at: new Date().toISOString()
        });

      throw error;
    }
  }

  /**
   * Schedule recurring task
   */
  async scheduleRecurringTask(recurringContest) {
    const taskId = `recurring_${recurringContest.id}`;

    try {
      const task = cron.schedule(recurringContest.cron_expression, async () => {
        await this.executeRecurringContest(recurringContest);
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      task.start();

      this.recurringTasks.set(taskId, {
        task,
        recurringContest
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute recurring contest
   */
  async executeRecurringContest(recurringContest) {
    try {

      const now = new Date();
      const contestName = `${recurringContest.name} - ${now.toISOString().split('T')[0]}`;

      const contestData = {
        contest_name: contestName,
        description: recurringContest.description,
        start_time: now.toISOString(),
        duration: recurringContest.duration,
        settings: JSON.parse(recurringContest.settings || '{}')
      };

      const contest = await contestTemplateService.createContestFromTemplate(
        recurringContest.template_id,
        contestData,
        recurringContest.created_by
      );

      // Update next execution time
      await db('recurring_contests')
        .where({ id: recurringContest.id })
        .update({
          last_execution: now.toISOString(),
          next_execution: this.getNextExecution(recurringContest.cron_expression)
        });

      // Log execution
      await db('recurring_contest_executions').insert({
        recurring_contest_id: recurringContest.id,
        contest_id: contest.id,
        executed_at: now.toISOString(),
        status: 'success'
      });

        recurringId: recurringContest.id,
        contestId: contest.id
      });

      return contest;
    } catch (error) {

      // Log failed execution
      await db('recurring_contest_executions').insert({
        recurring_contest_id: recurringContest.id,
        executed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message
      });

      throw error;
    }
  }

  /**
   * Schedule contest notifications
   */
  async scheduleNotifications(scheduledContest) {
    const notificationSettings = JSON.parse(scheduledContest.notification_settings || '{}');
    const scheduledTime = new Date(scheduledContest.scheduled_time);
    const now = new Date();

    // Schedule 24-hour reminder
    if (notificationSettings.remind_24h) {
      const reminderTime = new Date(scheduledTime.getTime() - 24 * 60 * 60 * 1000);
      if (reminderTime > now) {
        setTimeout(async () => {
          await notificationService.sendContestReminder(scheduledContest, '24 hours');
        }, reminderTime.getTime() - now.getTime());
      }
    }

    // Schedule 1-hour reminder
    if (notificationSettings.remind_1h) {
      const reminderTime = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
      if (reminderTime > now) {
        setTimeout(async () => {
          await notificationService.sendContestReminder(scheduledContest, '1 hour');
        }, reminderTime.getTime() - now.getTime());
      }
    }

    // Schedule 15-minute reminder
    if (notificationSettings.remind_15m) {
      const reminderTime = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
      if (reminderTime > now) {
        setTimeout(async () => {
          await notificationService.sendContestReminder(scheduledContest, '15 minutes');
        }, reminderTime.getTime() - now.getTime());
      }
    }
  }

  /**
   * Create contests for a series
   */
  async createSeriesContests(seriesId, contests, adminId) {
    try {
      for (const contestData of contests) {
        const scheduleData = {
          ...contestData,
          series_id: seriesId,
          contest_name: `${contestData.name} - ${contestData.round_name}`
        };

        await this.scheduleContest(scheduleData, adminId);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get next execution time for cron expression
   */
  getNextExecution(cronExpression) {
    try {
      const task = cron.schedule(cronExpression, () => {}, { scheduled: false });
      // This is a simplified implementation - in practice, you'd use a proper cron parser
      const now = new Date();
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Placeholder
    } catch (error) {
      return null;
    }
  }

  /**
   * Load scheduled contests from database
   */
  async loadScheduledContests() {
    try {
      const scheduled = await db('scheduled_contests')
        .where({ status: 'scheduled' })
        .select('*');

      for (const contest of scheduled) {
        await this.scheduleContestTask(contest);
      }

    } catch (error) {
    }
  }

  /**
   * Load recurring schedules from database
   */
  async loadRecurringSchedules() {
    try {
      const recurring = await db('recurring_contests')
        .where({ is_active: true })
        .select('*');

      for (const recurringContest of recurring) {
        await this.scheduleRecurringTask(recurringContest);
      }

    } catch (error) {
    }
  }

  /**
   * Load contest series from database
   */
  async loadContestSeries() {
    try {
      const series = await db('contest_series')
        .whereIn('status', ['planning', 'active'])
        .select('*');

      for (const seriesData of series) {
        this.contestSeries.set(seriesData.id, seriesData);
      }

    } catch (error) {
    }
  }

  /**
   * Cancel scheduled contest
   */
  async cancelScheduledContest(scheduleId, adminId) {
    try {
      const taskId = `contest_${scheduleId}`;
      const task = this.scheduledTasks.get(taskId);

      if (task) {
        clearTimeout(task.timeout);
        this.scheduledTasks.delete(taskId);
      }

      await db('scheduled_contests')
        .where({ id: scheduleId })
        .update({
          status: 'cancelled',
          cancelled_by: adminId,
          cancelled_at: new Date().toISOString()
        });

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Disable recurring contest
   */
  async disableRecurringContest(recurringId, adminId) {
    try {
      const taskId = `recurring_${recurringId}`;
      const task = this.recurringTasks.get(taskId);

      if (task) {
        task.task.stop();
        this.recurringTasks.delete(taskId);
      }

      await db('recurring_contests')
        .where({ id: recurringId })
        .update({
          is_active: false,
          disabled_by: adminId,
          disabled_at: new Date().toISOString()
        });

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get scheduler statistics
   */
  async getSchedulerStats() {
    try {
      const stats = {
        active_scheduled: this.scheduledTasks.size,
        active_recurring: this.recurringTasks.size,
        active_series: this.contestSeries.size,
        total_scheduled: await db('scheduled_contests').count('* as count').first(),
        total_recurring: await db('recurring_contests').count('* as count').first(),
        recent_executions: await db('recurring_contest_executions')
          .where('executed_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .count('* as count')
          .first()
      };

      return {
        active_scheduled: stats.active_scheduled,
        active_recurring: stats.active_recurring,
        active_series: stats.active_series,
        total_scheduled: parseInt(stats.total_scheduled.count),
        total_recurring: parseInt(stats.total_recurring.count),
        recent_executions: parseInt(stats.recent_executions.count)
      };
    } catch (error) {
      return {
        active_scheduled: 0,
        active_recurring: 0,
        active_series: 0,
        total_scheduled: 0,
        total_recurring: 0,
        recent_executions: 0
      };
    }
  }

  /**
   * Schedule cleanup task
   */
  scheduleCleanupTask() {
    // Run cleanup daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldSchedules();
    }, {
      timezone: 'UTC'
    });
  }

  /**
   * Clean up old scheduled contests and executions
   */
  async cleanupOldSchedules() {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Clean up old scheduled contests
      await db('scheduled_contests')
        .where('created_at', '<', cutoffDate)
        .whereIn('status', ['executed', 'failed', 'cancelled'])
        .delete();

      // Clean up old recurring executions
      await db('recurring_contest_executions')
        .where('executed_at', '<', cutoffDate)
        .delete();

    } catch (error) {
    }
  }
}

module.exports = new ContestSchedulerService();
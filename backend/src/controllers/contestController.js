const { db } = require('../utils/db');
const { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  ConflictError,
  DatabaseError 
} = require('../utils/errors');
const notificationService = require('../services/notificationService');


/**
 * Contest Model Class - Handles contest creation, management, and control operations
 * Provides methods for managing contest lifecycle, timing, and participant access
 */
class Contest {
  constructor(data) {
    this.id = data.id;
    this.contest_name = data.contest_name;
    this.description = data.description;
    this.registration_code = data.registration_code;
    this.start_time = data.start_time;
    this.duration = data.duration;
    this.freeze_time = data.freeze_time;
    this.created_by = data.created_by;
    this.is_active = data.is_active;
    this.manual_control = data.manual_control ?? true;
    this.is_registration_open = data.is_registration_open;
    this.is_frozen = data.is_frozen;
    this.frozen_at = data.frozen_at;
    this.ended_at = data.ended_at;
    this.archived_at = data.archived_at;
    this.created_at = data.created_at;
  }

  /**
   * Generates a unique 8-character registration code for contest access
   * @returns {string} An 8-character alphanumeric code (excluding ambiguous chars)
   */
  static generateRegistrationCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generates a URL-friendly slug from contest name
   * @param {string} contestName - The contest name to convert
   * @returns {string} A lowercase, dash-separated slug
   */
  static generateSlug(contestName) {
    return contestName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validates contest data with comprehensive validation rules
   * @param {Object} data - The contest data to validate
   * @param {string} data.contest_name - Contest name (3-255 chars)
   * @param {string} [data.description] - Contest description (max 5000 chars)
   * @param {Date} [data.start_time] - Contest start time for scheduled contests (min 5 minutes from now)
   * @param {number} [data.duration] - Contest duration in minutes (15-1440)
   * @param {number} [data.freeze_time] - Leaderboard freeze time in minutes
   * @param {boolean} [data.manual_control] - Flag to bypass scheduling and control contest manually
   * @param {boolean} [isUpdate=false] - Whether this is an update operation
   * @throws {ValidationError} When validation fails
   */
  static validateContestData(data, isUpdate = false) {
    const errors = [];

    if (!data.contest_name || data.contest_name.trim().length < 3) {
      errors.push('Contest name must be at least 3 characters long');
    }
    if (data.contest_name && data.contest_name.length > 255) {
      errors.push('Contest name must not exceed 255 characters');
    }
    if (data.description && data.description.length > 5000) {
      errors.push('Description must not exceed 5000 characters');
    }

    // Default to manual control - scheduled contests are opt-in
    const manualControl = data.manual_control !== undefined
      ? Boolean(data.manual_control)
      : true;
    const hasDuration = data.duration !== undefined && data.duration !== null;

    // Start time validation: required only for scheduled contests
    if (!manualControl) {
      if (!isUpdate && !data.start_time) {
        errors.push('Start time is required for scheduled contests');
      }
    }

    if (data.start_time) {
      const startTime = new Date(data.start_time);
      if (isNaN(startTime.getTime())) {
        errors.push('Invalid start time format');
      } else if (!manualControl) {
        const now = new Date();
        const minStartTime = new Date(now.getTime() + 5 * 60 * 1000); // At least 5 minutes from now

        if (!isUpdate && startTime < minStartTime) {
          errors.push('Contest start time must be at least 5 minutes from now');
        }

        const maxStartTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Within 1 year
        if (startTime > maxStartTime) {
          errors.push('Contest start time cannot be more than 1 year in the future');
        }
      }
    }

    // Duration validation with flexible ranges
    if (!manualControl && !isUpdate && !hasDuration) {
      errors.push('Duration is required for scheduled contests');
    }

    if (hasDuration) {
      if (typeof data.duration !== 'number' || Number.isNaN(data.duration)) {
        errors.push('Duration must be a number of minutes');
      } else if (data.duration < 15) {
        errors.push('Duration must be at least 15 minutes');
      } else if (data.duration > 1440) { // 24 hours
        errors.push('Duration must not exceed 24 hours (1440 minutes)');
      } else {
        const standardDurations = [60, 90, 120, 180, 240, 300]; // Common contest lengths
        if (!standardDurations.includes(data.duration) && data.duration < 480) {
          console.warn(`Non-standard contest duration: ${data.duration} minutes. Recommended: ${standardDurations.join(', ')} minutes`);
        }
      }
    }

    // Freeze time validation
    if (data.freeze_time !== undefined) {
      if (typeof data.freeze_time !== 'number' || Number.isNaN(data.freeze_time) || data.freeze_time < 0) {
        errors.push('Freeze time must be 0 or positive');
      } else if (hasDuration && data.freeze_time > data.duration) {
        errors.push('Freeze time must not exceed contest duration');
      } else if (data.freeze_time > 180) {
        errors.push('Freeze time should not exceed 3 hours (180 minutes)');
      }

      if (hasDuration && data.freeze_time > data.duration * 0.5) {
        console.warn(`Long freeze time (${data.freeze_time} min) for contest duration (${data.duration} min)`);
      }
    }

    if (!manualControl && data.start_time && hasDuration) {
      const startTime = new Date(data.start_time);
      const endTime = new Date(startTime.getTime() + data.duration * 60 * 1000);

      const startHour = startTime.getHours();
      const endHour = endTime.getHours();

      if (startHour < 6 && startHour > 2) {
        console.warn(`Contest starts at ${startHour}:00 - early morning start might be inconvenient`);
      }
      if (endHour > 23 || (endHour < 6 && endHour > 2)) {
        console.warn(`Contest ends at ${endHour}:00 - late night end might be inconvenient`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Contest validation failed', errors.map(msg => ({ message: msg })));
    }
  }

  /**
   * Gets predefined duration recommendations for different contest types
   * @returns {Object} Object containing contest type configurations
   */
  static getDurationRecommendations() {
    return {
      'practice': {
        duration: 60,
        freeze_time: 0,
        description: 'Practice session - 1 hour, no freeze'
      },
      'beginner': {
        duration: 90,
        freeze_time: 15,
        description: 'Beginner contest - 1.5 hours with 15min freeze'
      },
      'standard': {
        duration: 180,
        freeze_time: 60,
        description: 'Standard programming contest - 3 hours with 1hr freeze'
      },
      'advanced': {
        duration: 300,
        freeze_time: 60,
        description: 'Advanced contest - 5 hours with 1hr freeze'
      },
      'marathon': {
        duration: 480,
        freeze_time: 120,
        description: 'Marathon contest - 8 hours with 2hr freeze'
      }
    };
  }

  /**
   * Calculates optimal freeze time based on contest duration
   * @param {number} duration - Contest duration in minutes
   * @returns {number} Recommended freeze time in minutes
   */
  static calculateOptimalFreezeTime(duration) {
    if (duration <= 60) return 10; // 10 minutes for short contests
    if (duration <= 120) return 30; // 30 minutes for 2-hour contests
    if (duration <= 180) return 60; // 1 hour for 3-hour contests
    if (duration <= 300) return 90; // 1.5 hours for 5-hour contests
    return Math.min(120, Math.floor(duration * 0.25)); // 25% of duration, max 2 hours
  }

  /**
   * Creates a new contest with validation and unique registration code
   * @param {Object} contestData - The contest data
   * @param {number} adminId - The ID of the admin creating the contest
   * @returns {Promise<Contest>} The created contest instance
   * @throws {ValidationError} When contest data is invalid
   * @throws {DatabaseError} When database operation fails
   */
  static async create(contestData, adminId) {
    this.validateContestData(contestData);

    let registrationCode = this.generateRegistrationCode();

    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      registrationCode = this.generateRegistrationCode();
      const existing = await db('contests').where('registration_code', registrationCode).first();
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new DatabaseError('Failed to generate unique registration code');
    }

    // All contests default to manual control
    // Admins must manually start and end contests via the API
    const manualControl = contestData.manual_control !== undefined
      ? Boolean(contestData.manual_control)
      : true;

    const hasDuration = contestData.duration !== undefined && contestData.duration !== null;
    const startTime = contestData.start_time ? new Date(contestData.start_time) : null;
    const endTime = (!manualControl && startTime && hasDuration)
      ? new Date(startTime.getTime() + contestData.duration * 60 * 1000)
      : null;
    const normalizedDuration = hasDuration ? contestData.duration : null;

    const [result] = await db('contests').insert({
      contest_name: contestData.contest_name.trim(),
      description: contestData.description ? contestData.description.trim() : null,
      registration_code: registrationCode,
      start_time: startTime,
      end_time: endTime,
      duration: normalizedDuration,
      freeze_time: contestData.freeze_time ?? 0,
      created_by: adminId,
      is_active: false,
      manual_control: manualControl
    }).returning('id');

    const createdContest = await this.findById(result.id);
    return createdContest;
  }

  /**
   * Finds a contest by its ID
   * @param {number} contestId - The contest ID
   * @returns {Promise<Contest>} The contest instance
   * @throws {NotFoundError} When contest is not found
   * @throws {DatabaseError} When database operation fails
   */
  static async findById(contestId) {
    try {
      const contest = await db('contests')
        .select('*')
        .where('id', contestId)
        .first();

      if (!contest) {
        throw new NotFoundError('Contest not found');
      }

      return new Contest(contest);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to fetch contest', error);
    }
  }

  /**
   * Finds a contest by its registration code
   * @param {string} registrationCode - The registration code
   * @returns {Promise<Contest>} The contest instance
   * @throws {NotFoundError} When contest is not found
   * @throws {DatabaseError} When database operation fails
   */
  static async findByRegistrationCode(registrationCode, options = {}) {
    const { includeInactive = false } = options;

    try {
      const normalizedCode = (registrationCode || '').toString().toUpperCase();

      const query = db('contests')
        .select('*')
        .where('registration_code', normalizedCode);

      if (!includeInactive) {
        query.andWhere('is_active', true);
      }

      const contest = await query.first();

      if (!contest) {
        throw new NotFoundError('Contest not found');
      }

      return new Contest(contest);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to fetch contest by registration code', error);
    }
  }

  /**
   * Finds a contest by its URL slug generated from the name
   * @param {string} slug - The contest slug
   * @returns {Promise<Contest>} The contest instance
   * @throws {NotFoundError} When contest is not found
   * @throws {DatabaseError} When database operation fails
   */
  static async findBySlug(slug) {
    try {
      const contests = await db('contests').select('*');
      
      for (const contest of contests) {
        const generatedSlug = Contest.generateSlug(contest.contest_name);
        if (generatedSlug === slug) {
          return new Contest(contest);
        }
      }

      throw new NotFoundError('Contest not found');
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to fetch contest by slug', error);
    }
  }

  /**
   * Gets all contests with optional filtering
   * @param {Object} [filters={}] - Optional filters
   * @param {number} [filters.adminId] - Filter by admin ID
   * @param {boolean} [filters.isActive] - Filter by active status
   * @returns {Promise<Contest[]>} Array of contest instances
   * @throws {DatabaseError} When database operation fails
   */
  static async findAll(filters = {}) {
    try {
      let query = db('contests').select('*');

      if (filters.adminId) {
        query = query.where('created_by', filters.adminId);
      }
      if (filters.isActive !== undefined) {
        query = query.where('is_active', filters.isActive);
      }

      const contests = await query.orderBy('created_at', 'desc');
      return contests.map(contest => new Contest(contest));
    } catch (error) {
      throw new DatabaseError('Failed to fetch contests', error);
    }
  }

  /**
   * Updates contest data with authorization checks and running contest restrictions
   * @param {number} contestId - The contest ID to update
   * @param {Object} updateData - The data to update
   * @param {number} adminId - The admin ID performing the update
   * @returns {Promise<Contest>} The updated contest instance
   * @throws {AuthenticationError} When admin is not authorized
   * @throws {ValidationError} When trying to update restricted fields during contest
   * @throws {DatabaseError} When database operation fails
   */
  static async update(contestId, updateData, adminId) {
    // Validate that contest exists
    const existingContest = await this.findById(contestId);

    const now = new Date();
    const startTime = existingContest.start_time ? new Date(existingContest.start_time) : null;
    const existingDuration = existingContest.duration ?? null;
    const endTime = (startTime && existingDuration !== null && existingDuration !== undefined)
      ? new Date(startTime.getTime() + existingDuration * 60 * 1000)
      : null;
    const isRunning = Boolean(existingContest.is_active);

    if (isRunning) {
      const allowedFields = ['description', 'freeze_time'];
      const attemptedFields = Object.keys(updateData);
      const disallowedFields = attemptedFields.filter(field => !allowedFields.includes(field));
      
      if (disallowedFields.length > 0) {
        throw new ValidationError(`Cannot update ${disallowedFields.join(', ')} while contest is running`);
      }
    }

    const nextManualControl = updateData.manual_control !== undefined
      ? Boolean(updateData.manual_control)
      : existingContest.manual_control;

    const contestHasStarted = existingContest.is_active || (startTime ? now >= startTime : false);

    if (contestHasStarted && !existingContest.ended_at) {
      const restrictedFieldsAfterStart = ['start_time', 'manual_control'];
      const attemptedRestricted = Object.keys(updateData).filter(field => restrictedFieldsAfterStart.includes(field));
      if (attemptedRestricted.length > 0) {
        throw new ValidationError(`Cannot update ${attemptedRestricted.join(', ')} after contest has started`);
      }
    }

    // Validate update data
    if (updateData.contest_name || updateData.start_time !== undefined || updateData.duration !== undefined || updateData.manual_control !== undefined) {
      this.validateContestData({ ...existingContest, ...updateData, manual_control: nextManualControl }, true);
    }

    // Auto-calculate end_time if start_time or duration changes for scheduled contests
    if (!nextManualControl && (updateData.start_time || updateData.duration !== undefined)) {
      const baseStart = updateData.start_time
        ? new Date(updateData.start_time)
        : (existingContest.start_time ? new Date(existingContest.start_time) : null);
      const baseDuration = updateData.duration !== undefined ? updateData.duration : existingContest.duration;

      if (baseStart && baseDuration !== undefined && baseDuration !== null) {
        updateData.end_time = new Date(baseStart.getTime() + baseDuration * 60 * 1000);
      }
    } else if (nextManualControl && (updateData.start_time !== undefined || updateData.duration !== undefined || updateData.manual_control !== undefined)) {
      updateData.end_time = null;

      if (updateData.manual_control === true && updateData.start_time === undefined && !contestHasStarted) {
        updateData.start_time = null;
      }
    }

    try {
      const winston = require('winston');
      const logger = winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [
          new winston.transports.File({ filename: 'logs/audit.log' })
        ]
      });

      logger.info('Contest updated', {
        contestId,
        adminId,
        changes: updateData,
        timestamp: new Date().toISOString(),
        action: 'contest_update'
      });

      await db('contests')
        .where('id', contestId)
        .update(updateData);

      return await this.findById(contestId);
    } catch (error) {
      console.error('Database update error:', error);
      throw new DatabaseError('Failed to update contest', error);
    }
  }

  /**
   * Deletes contest by marking as inactive (soft delete)
   * @param {number} contestId - The contest ID to delete
   * @param {number} adminId - The admin ID performing the deletion
   * @returns {Promise<Object>} Success message object
   * @throws {AuthenticationError} When admin is not authorized
   * @throws {ConflictError} When contest has registered teams
   * @throws {DatabaseError} When database operation fails
   */
  static async delete(contestId, adminId) {
    const existingContest = await this.findById(contestId);
    
    if (existingContest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to delete this contest');
    }

    // Get contest registration code to check for teams
    const contest = await db('contests')
      .where('id', contestId)
      .first('registration_code');

    const teamsCount = await db('teams')
      .where('contest_code', contest.registration_code)
      .count('* as count')
      .first();

    if (parseInt(teamsCount.count) > 0) {
      throw new ConflictError('Cannot delete contest with registered teams. Set as inactive instead.');
    }

    try {
      await db('contests')
        .where('id', contestId)
        .update({ is_active: false });

      return { success: true, message: 'Contest marked as inactive' };
    } catch (error) {
      throw new DatabaseError('Failed to delete contest', error);
    }
  }

  /**
   * Gets comprehensive contest timing and status information
   * @param {Contest} contest - The contest instance
   * @returns {Object} Object containing detailed timing and status information
   */
  static getContestStatus(contest) {
    const now = new Date();
    const manualControl = contest.manual_control ?? true;
    const startTime = contest.start_time ? new Date(contest.start_time) : null;
    const storedEndTime = contest.end_time ? new Date(contest.end_time) : null;
    const hasDuration = contest.duration !== undefined && contest.duration !== null;
    const calculatedEndTime = (startTime && hasDuration)
      ? new Date(startTime.getTime() + contest.duration * 60 * 1000)
      : null;
    const effectiveEndTime = storedEndTime || calculatedEndTime;
    const freezeTime = (effectiveEndTime && contest.freeze_time !== undefined && contest.freeze_time !== null)
      ? new Date(effectiveEndTime.getTime() - contest.freeze_time * 60 * 1000)
      : null;

    let status = 'not_started';
    let timeRemaining = null;
    let timeUntilStart = null;
    let timeUntilFreeze = null;
    let timeElapsed = null;
    let progress = 0;

    if (manualControl) {
      if (contest.is_active) {
        status = contest.is_frozen ? 'frozen' : 'running';
        if (startTime) {
          timeElapsed = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
        }
        if (hasDuration && timeElapsed !== null) {
          progress = Math.min(100, Math.max(0, (timeElapsed / (contest.duration * 60)) * 100));
        }
      } else if (contest.ended_at || effectiveEndTime) {
        status = 'ended';
        const finishTime = contest.ended_at ? new Date(contest.ended_at) : effectiveEndTime;
        if (startTime && finishTime) {
          timeElapsed = Math.max(0, Math.floor((finishTime.getTime() - startTime.getTime()) / 1000));
        }
        progress = 100;
      } else {
        status = 'pending_manual';
        if (startTime && now < startTime) {
          timeUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 1000);
        }
      }
    } else {
      if (!startTime || now < startTime) {
        status = 'not_started';
        if (startTime) {
          timeUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 1000);
        }
      } else if (effectiveEndTime && now < effectiveEndTime) {
        status = contest.is_frozen ? 'frozen' : 'running';
        timeRemaining = Math.floor((effectiveEndTime.getTime() - now.getTime()) / 1000);
        timeElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        if (hasDuration) {
          progress = Math.min(100, Math.max(0, (timeElapsed / (contest.duration * 60)) * 100));
        }
        if (freezeTime && !contest.is_frozen && now < freezeTime) {
          timeUntilFreeze = Math.floor((freezeTime.getTime() - now.getTime()) / 1000);
        }
      } else {
        status = 'ended';
        if (hasDuration) {
          timeElapsed = contest.duration * 60;
        } else if (startTime && effectiveEndTime) {
          timeElapsed = Math.floor((effectiveEndTime.getTime() - startTime.getTime()) / 1000);
        }
        progress = 100;
      }
    }

    return {
      status,
      manual_control: manualControl,
      start_time: startTime ? startTime.toISOString() : null,
      end_time: effectiveEndTime ? effectiveEndTime.toISOString() : null,
      freeze_time: freezeTime ? freezeTime.toISOString() : null,
      time_remaining_seconds: timeRemaining,
      time_until_start_seconds: timeUntilStart,
      time_until_freeze_seconds: timeUntilFreeze,
      time_elapsed_seconds: timeElapsed,
      progress_percentage: Math.round(progress * 100) / 100,
      is_frozen: contest.is_frozen || false,
      frozen_at: contest.frozen_at,
      ended_at: contest.ended_at,
      archived_at: contest.archived_at,
      duration_minutes: contest.duration,
      freeze_time_minutes: contest.freeze_time,
      current_server_time: now.toISOString()
    };
  }

  /**
   * Gets statistical information about a contest
   * @param {number} contestId - The contest ID
   * @returns {Promise<Object>} Object containing contest statistics
   * @throws {DatabaseError} When database operation fails
   */
  static async getStatistics(contestId) {
    try {
      // First get the contest registration_code to query teams properly
      const contest = await db('contests').where('id', contestId).select('registration_code').first();
      if (!contest) {
        throw new DatabaseError('Contest not found');
      }

      const [teamsCount, problemsCount, submissionsCount] = await Promise.all([
        db('teams').where('contest_code', contest.registration_code).count('* as count').first(),
        db('problems').where('contest_id', contestId).count('* as count').first(),
        db('submissions')
          .join('problems', 'submissions.problem_id', 'problems.id')
          .where('problems.contest_id', contestId)
          .count('* as count')
          .first()
      ]);

      return {
        teams_registered: parseInt(teamsCount.count),
        problems_count: parseInt(problemsCount.count),
        submissions_count: parseInt(submissionsCount.count)
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch contest statistics', error);
    }
  }

  /**
   * Check if contest can be started
   */
  static async canStartContest(contestId) {
    const contest = await this.findById(contestId);
    const errors = [];

    if (contest.is_active) {
      errors.push('Contest is already running');
    }

    // Note: Contest end state is determined by is_active flag, not ended_at field

    // Check if contest has problems
    const problemsCount = await db('problems').where('contest_id', contestId).count('* as count').first();
    if (parseInt(problemsCount.count) === 0) {
      errors.push('Contest must have at least one problem');
    }

    const problemsWithoutTestCases = await db('problems')
      .leftJoin('test_cases', 'problems.id', 'test_cases.problem_id')
      .where('problems.contest_id', contestId)
      .groupBy('problems.id')
      .having(db.raw('COUNT(test_cases.id) = 0'))
      .count('problems.id as count')
      .first();

    if (parseInt(problemsWithoutTestCases?.count) > 0) {
      errors.push('All problems must have at least one test case');
    }

    // Removed the end time validation - force start should always work if problems are configured

    return {
      canStart: errors.length === 0,
      errors
    };
  }

  /**
   * Start contest (force start) - any admin can start any contest
   */
  static async startContest(contestId, adminId) {
    const contest = await this.findById(contestId);

    // Allow any admin to start any contest
    // Authorization is already checked by verifyAdminToken middleware

    const validation = await this.canStartContest(contestId);
    if (!validation.canStart) {
      throw new ValidationError(`Contest cannot be started: ${validation.errors.join(', ')}`);
    }

    const now = new Date();
    const manualControl = contest.manual_control ?? true;
    const hasDuration = contest.duration !== undefined && contest.duration !== null;
    const newEndTime = (!manualControl && hasDuration)
      ? new Date(now.getTime() + contest.duration * 60 * 1000)
      : null;

    try {
      console.log(`[START CONTEST] Starting contest ${contestId} with data:`, {
        now: now.toISOString(),
        newEndTime: newEndTime ? newEndTime.toISOString() : null,
        manualControl
      });

      // Force start: set start_time to now and recalculate end_time
      await db('contests')
        .where('id', contestId)
        .update({
          start_time: now,
          end_time: newEndTime,
          is_active: true,
          is_frozen: false,
          manual_control: manualControl
        });

      console.log(`[START CONTEST] Database update successful for contest ${contestId}`);

      const updatedContest = await this.findById(contestId);
      console.log(`[START CONTEST] Retrieved updated contest ${contestId}`);

      // Send notifications (don't let notification errors crash the request)
      try {
        notificationService.notifyContestStart(contestId, updatedContest);
        console.log(`[START CONTEST] Notification sent successfully for contest ${contestId}`);
      } catch (notifError) {
        console.warn('[START CONTEST] Failed to send contest start notification:', notifError);
      }

      return updatedContest;
    } catch (error) {
      console.error('[START CONTEST] Error starting contest:', {
        contestId,
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.constructor.name
      });
      throw new DatabaseError('Failed to start contest', error);
    }
  }

  /**
   * Freeze contest leaderboard - any admin can freeze any contest
   */
  static async freezeContest(contestId, adminId) {
    const contest = await this.findById(contestId);

    if (!contest.is_active) {
      throw new ConflictError('Contest is not currently running');
    }

    if (contest.is_frozen) {
      throw new ConflictError('Contest leaderboard is already frozen');
    }

    try {
      await db('contests')
        .where('id', contestId)
        .update({
          is_frozen: true
        });

      const updatedContest = await this.findById(contestId);

      notificationService.notifyContestFreeze(contestId, updatedContest);

      return updatedContest;
    } catch (error) {
      throw new DatabaseError('Failed to freeze contest', error);
    }
  }

  /**
   * Unfreeze contest leaderboard - any admin can unfreeze any contest
   */
  static async unfreezeContest(contestId, adminId) {
    const contest = await this.findById(contestId);

    if (!contest.is_active) {
      throw new ConflictError('Contest is not currently running');
    }

    if (!contest.is_frozen) {
      throw new ConflictError('Contest leaderboard is not currently frozen');
    }

    try {
      await db('contests')
        .where('id', contestId)
        .update({
          is_frozen: false
        });

      const updatedContest = await this.findById(contestId);

      notificationService.notifyContestUnfreeze(contestId, updatedContest);

      return updatedContest;
    } catch (error) {
      throw new DatabaseError('Failed to unfreeze contest', error);
    }
  }

  /**
   * End contest - any admin can end any contest
   */
  static async endContest(contestId, adminId) {
    const contest = await this.findById(contestId);

    if (!contest.is_active) {
      throw new ConflictError('Contest is not currently active');
    }

    if (!contest.start_time) {
      throw new ConflictError('Contest has not started yet');
    }

    const now = new Date();
    const startTime = new Date(contest.start_time);
    const actualDuration = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / (60 * 1000)));

    try {
      await db('contests')
        .where('id', contestId)
        .update({
          duration: actualDuration,
          is_active: false,
          is_registration_open: false,
          end_time: now,
          is_frozen: false
        });

      const updatedContest = await this.findById(contestId);

      notificationService.notifyContestEnd(contestId, updatedContest);

      return updatedContest;
    } catch (error) {
      throw new DatabaseError('Failed to end contest', error);
    }
  }

  /**
   * Get team statistics for a contest - Phase 2.4
   */
  static async getTeamStatistics(contestId, teamId) {
    try {
      const submissionsCount = await db('submissions')
        .where('team_id', teamId)
        .join('problems', 'submissions.problem_id', 'problems.id')
        .where('problems.contest_id', contestId)
        .count('* as count')
        .first();

      const acceptedCount = await db('submissions')
        .where('team_id', teamId)
        .where('status', 'accepted')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .where('problems.contest_id', contestId)
        .count('* as count')
        .first();

      return {
        total_submissions: parseInt(submissionsCount.count) || 0,
        problems_solved: parseInt(acceptedCount.count) || 0,
        total_points: 0,
        rank: null
      };
    } catch (error) {
      throw new DatabaseError('Failed to get team statistics', error);
    }
  }

  /**
   * Update team activity timestamp - Phase 2.4
   */
  static async updateTeamActivity(teamId) {
    try {
      await db('teams')
        .where('id', teamId)
        .update({ last_activity: new Date() });

      return true;
    } catch (error) {
      throw new DatabaseError('Failed to update team activity', error);
    }
  }

  /**
   * Find all active contests - Phase 2.4
   */
  static async findActiveContests() {
    try {
      const contests = await db('contests')
        .select('*')
        .where('is_active', true)
        .orderBy('start_time', 'desc');

      return contests.map(contest => new Contest(contest));
    } catch (error) {
      throw new DatabaseError('Failed to fetch active contests', error);
    }
  }

}

module.exports = Contest;

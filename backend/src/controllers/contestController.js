/**
 * Contest Controller - Phase 2.1
 * Handles contest creation, management, and control operations
 */

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
 * Contest Model Class
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
    this.is_frozen = data.is_frozen;
    this.frozen_at = data.frozen_at;
    this.ended_at = data.ended_at;
    this.archived_at = data.archived_at;
    this.created_at = data.created_at;
  }

  /**
   * Generate unique registration code
   */
  static generateRegistrationCode() {
    // Generate 8-character code with letters and numbers (no ambiguous chars)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generate URL-friendly slug from contest name
   * Matches frontend logic in contestUtils.ts
   */
  static generateSlug(contestName) {
    return contestName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validate contest data - Phase 2.4 Enhanced Duration Management
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
    
    // Start time validation
    if (!isUpdate && !data.start_time) {
      errors.push('Start time is required');
    } else if (data.start_time) {
      const startTime = new Date(data.start_time);
      if (isNaN(startTime.getTime())) {
        errors.push('Invalid start time format');
      } else {
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
    if (!isUpdate && !data.duration) {
      errors.push('Duration is required');
    } else if (data.duration !== undefined) {
      if (typeof data.duration !== 'number' || data.duration < 15) {
        errors.push('Duration must be at least 15 minutes');
      } else if (data.duration > 1440) { // 24 hours
        errors.push('Duration must not exceed 24 hours (1440 minutes)');
      } else {
        // Recommend standard contest durations
        const standardDurations = [60, 90, 120, 180, 240, 300]; // Common contest lengths
        if (!standardDurations.includes(data.duration) && data.duration < 480) {
          // Just a warning, not an error
          console.warn(`Non-standard contest duration: ${data.duration} minutes. Recommended: ${standardDurations.join(', ')} minutes`);
        }
      }
    }
    
    // Freeze time validation
    if (data.freeze_time !== undefined) {
      if (typeof data.freeze_time !== 'number' || data.freeze_time < 0) {
        errors.push('Freeze time must be 0 or positive');
      } else if (data.duration && data.freeze_time > data.duration) {
        errors.push('Freeze time must not exceed contest duration');
      } else if (data.freeze_time > 180) {
        errors.push('Freeze time should not exceed 3 hours (180 minutes)');
      }
      
      // Validate freeze time makes sense for contest duration
      if (data.duration && data.freeze_time > data.duration * 0.5) {
        console.warn(`Long freeze time (${data.freeze_time} min) for contest duration (${data.duration} min)`);
      }
    }

    // Additional validation for contest scheduling conflicts
    if (data.start_time && data.duration) {
      const startTime = new Date(data.start_time);
      const endTime = new Date(startTime.getTime() + data.duration * 60 * 1000);
      
      // Validate the contest doesn't run too long into unusual hours
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
   * Get duration recommendations based on contest type - Phase 2.4
   */
  static getDurationRecommendations(contestType = 'standard') {
    const recommendations = {
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
        description: 'Standard hackathon contest - 3 hours with 1hr freeze'
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

    return recommendations[contestType] || recommendations['standard'];
  }

  /**
   * Calculate optimal freeze time based on duration - Phase 2.4
   */
  static calculateOptimalFreezeTime(duration) {
    if (duration <= 60) return 10; // 10 minutes for short contests
    if (duration <= 120) return 30; // 30 minutes for 2-hour contests
    if (duration <= 180) return 60; // 1 hour for 3-hour contests
    if (duration <= 300) return 90; // 1.5 hours for 5-hour contests
    return Math.min(120, Math.floor(duration * 0.25)); // 25% of duration, max 2 hours
  }

  /**
   * Create a new contest
   */
  static async create(contestData, adminId) {
    this.validateContestData(contestData);

    let registrationCode = this.generateRegistrationCode();

    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique registration code
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

    const [result] = await db('contests').insert({
      contest_name: contestData.contest_name.trim(),
      description: contestData.description ? contestData.description.trim() : null,
      registration_code: registrationCode,
      start_time: new Date(contestData.start_time),
      duration: contestData.duration,
      freeze_time: contestData.freeze_time || 60,
      created_by: adminId,
      is_active: contestData.is_active !== undefined ? contestData.is_active : true,
    }).returning('id');

    const createdContest = await this.findById(result.id);
    return createdContest;
  }

  /**
   * Find contest by ID
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
   * Find contest by registration code
   */
  static async findByRegistrationCode(registrationCode) {
    try {
      const contest = await db('contests')
        .select('*')
        .where('registration_code', registrationCode.toUpperCase())
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
   * Find contest by name slug
   */
  static async findBySlug(slug) {
    try {
      // First try to match by generating slug from contest names
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
   * Get all contests with optional filtering
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
   * Update contest
   */
  static async update(contestId, updateData, adminId) {
    // Validate that contest exists and admin has permission
    const existingContest = await this.findById(contestId);
    
    if (existingContest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to update this contest');
    }

    // Check if contest is running (prevent certain updates)
    const now = new Date();
    const startTime = new Date(existingContest.start_time);
    const endTime = new Date(startTime.getTime() + existingContest.duration * 60 * 1000);
    const isRunning = now >= startTime && now <= endTime;

    if (isRunning) {
      // Only allow certain updates during running contest
      const allowedFields = ['description', 'freeze_time'];
      const attemptedFields = Object.keys(updateData);
      const disallowedFields = attemptedFields.filter(field => !allowedFields.includes(field));
      
      if (disallowedFields.length > 0) {
        throw new ValidationError(`Cannot update ${disallowedFields.join(', ')} while contest is running`);
      }
    }

    // Validate update data
    if (updateData.contest_name || updateData.start_time || updateData.duration) {
      this.validateContestData({ ...existingContest, ...updateData }, true);
    }

    try {
      // Log the changes for audit purposes
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
   * Delete contest (soft delete by marking inactive)
   */
  static async delete(contestId, adminId) {
    const existingContest = await this.findById(contestId);
    
    if (existingContest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to delete this contest');
    }

    // Check if contest has teams registered
    const teamsCount = await db('team_contests')
      .where('contest_id', contestId)
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
   * Get contest timing and status information - Phase 2.4 Enhanced
   */
  static getContestStatus(contest) {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
    const freezeTime = new Date(endTime.getTime() - contest.freeze_time * 60 * 1000);

    let status = 'not_started';
    let timeRemaining = null;
    let timeUntilStart = null;
    let timeUntilFreeze = null;
    let timeElapsed = null;
    let progress = 0;

    if (now < startTime) {
      status = 'not_started';
      timeUntilStart = Math.floor((startTime - now) / 1000);
    } else if (now >= startTime && now < endTime) {
      status = 'running';
      timeRemaining = Math.floor((endTime - now) / 1000);
      timeElapsed = Math.floor((now - startTime) / 1000);
      progress = Math.min(100, Math.max(0, (timeElapsed / (contest.duration * 60)) * 100));
      
      if (now < freezeTime && !contest.is_frozen) {
        timeUntilFreeze = Math.floor((freezeTime - now) / 1000);
      }
      
      if (contest.is_frozen) {
        status = 'frozen';
      }
    } else {
      status = 'ended';
      timeElapsed = contest.duration * 60; // Full duration
      progress = 100;
    }

    return {
      status,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      freeze_time: freezeTime.toISOString(),
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
   * Get contest statistics
   */
  static async getStatistics(contestId) {
    try {
      const [teamsCount, problemsCount, submissionsCount] = await Promise.all([
        db('team_contests').where('contest_id', contestId).count('* as count').first(),
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

    // Check if contest has problems
    const problemsCount = await db('problems').where('contest_id', contestId).count('* as count').first();
    if (parseInt(problemsCount.count) === 0) {
      errors.push('Contest must have at least one problem');
    }

    // Check if problems have test cases
    const problemsWithoutTestCases = await db('problems')
      .leftJoin('test_cases', 'problems.id', 'test_cases.problem_id')
      .where('problems.contest_id', contestId)
      .groupBy('problems.id')
      .having(db.raw('COUNT(test_cases.id) = 0'))
      .count('problems.id as count')
      .first();

    if (parseInt(problemsWithoutTestCases.count) > 0) {
      errors.push('All problems must have at least one test case');
    }

    // Check contest timing
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);

    if (now >= endTime) {
      errors.push('Contest end time has already passed');
    }

    return {
      canStart: errors.length === 0,
      errors
    };
  }

  /**
   * Start contest
   */
  static async startContest(contestId, adminId) {
    const contest = await this.findById(contestId);
    
    if (contest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to start this contest');
    }

    // Validate contest can be started
    const validation = await this.canStartContest(contestId);
    if (!validation.canStart) {
      throw new ValidationError(`Contest cannot be started: ${validation.errors.join(', ')}`);
    }

    // Check if contest is already started
    const now = new Date();
    const startTime = new Date(contest.start_time);
    
    if (now >= startTime) {
      throw new ConflictError('Contest has already started');
    }

    // Update start time to now
    try {
      await db('contests')
        .where('id', contestId)
        .update({ start_time: now });

      const updatedContest = await this.findById(contestId);
      
      // Notify all teams about contest start
      notificationService.notifyContestStart(contestId, updatedContest);

      return updatedContest;
    } catch (error) {
      throw new DatabaseError('Failed to start contest', error);
    }
  }

  /**
   * Freeze contest leaderboard
   */
  static async freezeContest(contestId, adminId) {
    const contest = await this.findById(contestId);
    
    if (contest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to freeze this contest');
    }

    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);

    if (now < startTime) {
      throw new ConflictError('Contest has not started yet');
    }

    if (now >= endTime) {
      throw new ConflictError('Contest has already ended');
    }

    if (contest.is_frozen) {
      throw new ConflictError('Contest leaderboard is already frozen');
    }

    try {
      await db('contests')
        .where('id', contestId)
        .update({ 
          is_frozen: true,
          frozen_at: now
        });

      const updatedContest = await this.findById(contestId);
      
      // Notify all teams about contest freeze
      notificationService.notifyContestFreeze(contestId, updatedContest);

      return updatedContest;
    } catch (error) {
      throw new DatabaseError('Failed to freeze contest', error);
    }
  }

  /**
   * End contest
   */
  static async endContest(contestId, adminId) {
    const contest = await this.findById(contestId);
    
    if (contest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to end this contest');
    }

    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);

    if (now >= endTime) {
      throw new ConflictError('Contest has already ended');
    }

    if (now < startTime) {
      throw new ConflictError('Contest has not started yet');
    }

    // Calculate new duration based on current time
    const actualDuration = Math.floor((now - startTime) / (60 * 1000));

    try {
      await db('contests')
        .where('id', contestId)
        .update({ 
          duration: actualDuration
        });

      const updatedContest = await this.findById(contestId);
      
      // Notify all teams about contest end
      notificationService.notifyContestEnd(contestId, updatedContest);

      return updatedContest;
    } catch (error) {
      throw new DatabaseError('Failed to end contest', error);
    }
  }

  /**
   * Find contest by registration code - Phase 2.4
   */
  static async findByRegistrationCode(registrationCode) {
    try {
      const contest = await db('contests')
        .select('*')
        .where('registration_code', registrationCode)
        .where('is_active', true)
        .first();

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
   * Get team statistics for a contest - Phase 2.4
   */
  static async getTeamStatistics(contestId, teamId) {
    try {
      // This will be fully implemented in Phase 3 (Hackathon Scoring)
      // For now, return basic placeholder statistics
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
        total_points: 0, // To be calculated by hackathon scoring
        rank: null // To be calculated in Phase 3
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

  /**
   * Freeze contest leaderboard - Phase 3.4
   */
  static async freezeContest(req, res) {
    try {
      const contestId = parseInt(req.params.id);
      const adminId = req.user.id;
      
      const freezeService = require('../services/freezeService');
      const updatedContest = await freezeService.freezeLeaderboard(contestId, adminId);
      
      res.json({
        success: true,
        message: 'Contest leaderboard frozen successfully',
        data: updatedContest
      });
    } catch (error) {
      console.error('Error freezing contest:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Contest not found'
        });
      }
      
      if (error.message.includes('already frozen')) {
        return res.status(409).json({
          success: false,
          error: 'Contest is already frozen'
        });
      }
      
      if (error.message.includes('already ended')) {
        return res.status(400).json({
          success: false,
          error: 'Cannot freeze contest that has already ended'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to freeze contest'
      });
    }
  }

  /**
   * Unfreeze contest leaderboard - Phase 3.4
   */
  static async unfreezeContest(req, res) {
    try {
      const contestId = parseInt(req.params.id);
      const adminId = req.user.id;
      
      const freezeService = require('../services/freezeService');
      const updatedContest = await freezeService.unfreezeLeaderboard(contestId, adminId);
      
      res.json({
        success: true,
        message: 'Contest leaderboard unfrozen successfully',
        data: updatedContest
      });
    } catch (error) {
      console.error('Error unfreezing contest:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Contest not found'
        });
      }
      
      if (error.message.includes('not currently frozen')) {
        return res.status(400).json({
          success: false,
          error: 'Contest is not currently frozen'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to unfreeze contest'
      });
    }
  }
}

module.exports = Contest;
/**
 * Admin Routes - Phase 2.1
 * Handles admin authentication and management endpoints
 */

const express = require('express');
const router = express.Router();
const Admin = require('../controllers/adminController');
const Contest = require('../controllers/contestController');
const { verifyAdminToken, requireSuperAdmin, requireContestAccess } = require('../middleware/adminAuth');
const { validate } = require('../utils/validation');
const Joi = require('joi');

// Admin authentication schemas
const adminLoginSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 50 characters',
      'any.required': 'Username is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required'
    })
});

const adminRegistrationSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 50 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Valid email address is required',
      'string.max': 'Email must not exceed 255 characters',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required'
    }),
  
  role: Joi.string()
    .valid('super_admin', 'judge')
    .default('judge')
    .messages({
      'any.only': 'Role must be either super_admin or judge'
    })
});

const contestCreateSchema = Joi.object({
  contest_name: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.min': 'Contest name must be at least 3 characters long',
      'string.max': 'Contest name must not exceed 255 characters',
      'any.required': 'Contest name is required'
    }),
  
  description: Joi.string()
    .max(5000)
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 5000 characters'
    }),
  
  start_time: Joi.date()
    .iso()
    .greater('now')
    .required()
    .messages({
      'date.greater': 'Start time must be in the future',
      'any.required': 'Start time is required'
    }),
  
  duration: Joi.number()
    .integer()
    .min(30)
    .max(720)
    .required()
    .messages({
      'number.min': 'Duration must be at least 30 minutes',
      'number.max': 'Duration must not exceed 12 hours (720 minutes)',
      'any.required': 'Duration is required'
    }),
  
  freeze_time: Joi.number()
    .integer()
    .min(0)
    .max(Joi.ref('duration'))
    .default(60)
    .messages({
      'number.min': 'Freeze time must be 0 or greater',
      'number.max': 'Freeze time cannot exceed contest duration'
    }),
  
  is_registration_open: Joi.boolean().default(true),
  is_active: Joi.boolean().default(true)
});

const contestUpdateSchema = Joi.object({
  contest_name: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .messages({
      'string.min': 'Contest name must be at least 3 characters long',
      'string.max': 'Contest name must not exceed 255 characters'
    }),
  
  description: Joi.string()
    .max(5000)
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 5000 characters'
    }),
  
  start_time: Joi.date()
    .iso()
    .messages({
      'date.base': 'Invalid start time format'
    }),
  
  duration: Joi.number()
    .integer()
    .min(30)
    .max(720)
    .messages({
      'number.min': 'Duration must be at least 30 minutes',
      'number.max': 'Duration must not exceed 12 hours (720 minutes)'
    }),
  
  freeze_time: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.min': 'Freeze time must be 0 or greater'
    }),
  
  is_registration_open: Joi.boolean(),
  is_active: Joi.boolean()
});

// =============================================================================
// ADMIN AUTHENTICATION ROUTES
// =============================================================================

/**
 * POST /api/admin/login
 * Admin login endpoint
 */
router.post('/login', validate(adminLoginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await Admin.authenticate(username, password);
    
    res.success(result, 'Login successful');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/register
 * Admin registration (super admin only)
 */
router.post('/register', verifyAdminToken, requireSuperAdmin, validate(adminRegistrationSchema), async (req, res, next) => {
  try {
    const admin = await Admin.create(req.body);
    
    res.created({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      created_at: admin.created_at
    }, 'Admin account created successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/profile
 * Get current admin profile
 */
router.get('/profile', verifyAdminToken, async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    const statistics = await Admin.getStatistics(req.admin.id);
    
    res.success({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      created_at: admin.created_at,
      statistics
    }, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/profile
 * Update admin profile
 */
router.put('/profile', verifyAdminToken, async (req, res, next) => {
  try {
    const updatedAdmin = await Admin.updateProfile(req.admin.id, req.body);
    
    res.success({
      id: updatedAdmin.id,
      username: updatedAdmin.username,
      email: updatedAdmin.email,
      role: updatedAdmin.role,
      created_at: updatedAdmin.created_at
    }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/password
 * Change admin password
 */
router.put('/password', verifyAdminToken, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const result = await Admin.changePassword(req.admin.id, current_password, new_password);
    
    res.success(result, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// CONTEST MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /api/admin/contests
 * Get all contests for admin
 */
router.get('/contests', verifyAdminToken, async (req, res, next) => {
  try {
    const filters = {};
    
    // Super admin can see all contests, others only their own
    if (req.admin.role !== 'super_admin') {
      filters.adminId = req.admin.id;
    }
    
    if (req.query.active !== undefined) {
      filters.isActive = req.query.active === 'true';
    }
    
    const contests = await Contest.findAll(filters);
    
    // Get statistics for each contest
    const contestsWithStats = await Promise.all(
      contests.map(async (contest) => {
        const stats = await Contest.getStatistics(contest.id);
        return {
          ...contest,
          statistics: stats
        };
      })
    );
    
    res.success(contestsWithStats, 'Contests retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/contests
 * Create new contest
 */
router.post('/contests', verifyAdminToken, validate(contestCreateSchema), async (req, res, next) => {
  try {
    const contest = await Contest.create(req.body, req.admin.id);
    const statistics = await Contest.getStatistics(contest.id);
    
    res.created({
      ...contest,
      statistics
    }, 'Contest created successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/contests/:id
 * Get contest details
 */
router.get('/contests/:id', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.id);
    const statistics = await Contest.getStatistics(contest.id);
    const status = Contest.getContestStatus(contest);
    
    res.success({
      ...contest,
      statistics,
      status
    }, 'Contest details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/contests/:id
 * Update contest
 */
router.put('/contests/:id', verifyAdminToken, requireContestAccess, validate(contestUpdateSchema), async (req, res, next) => {
  try {
    const updatedContest = await Contest.update(req.params.id, req.body, req.admin.id);
    const statistics = await Contest.getStatistics(updatedContest.id);
    
    res.success({
      ...updatedContest,
      statistics
    }, 'Contest updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/contests/:id
 * Delete contest (soft delete)
 */
router.delete('/contests/:id', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const result = await Contest.delete(req.params.id, req.admin.id);
    res.success(result, 'Contest deleted successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/contests/:id/can-start
 * Check if contest can be started
 */
router.get('/contests/:id/can-start', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const validation = await Contest.canStartContest(req.params.id);
    
    res.success(validation, 'Contest start validation completed');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/contests/:id/start
 * Start contest immediately
 */
router.post('/contests/:id/start', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const startedContest = await Contest.startContest(req.params.id, req.admin.id);
    
    res.success(startedContest, 'Contest started successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/contests/:id/freeze
 * Freeze contest leaderboard
 */
router.post('/contests/:id/freeze', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const frozenContest = await Contest.freezeContest(req.params.id, req.admin.id);
    
    res.success(frozenContest, 'Contest leaderboard frozen successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/contests/:id/unfreeze
 * Unfreeze contest leaderboard
 */
router.post('/contests/:id/unfreeze', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const unfrozenContest = await Contest.unfreezeContest(req, res);
    return;
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/contests/:id/end
 * End contest early
 */
router.post('/contests/:id/end', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const endedContest = await Contest.endContest(req.params.id, req.admin.id);
    
    res.success(endedContest, 'Contest ended successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/admins
 * Get all admins (super admin only)
 */
router.get('/admins', verifyAdminToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const admins = await Admin.findAll();
    res.success(admins, 'Admins retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// DASHBOARD STATS ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/dashboard/stats
 * Get overall dashboard statistics
 */
router.get('/dashboard/stats', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    
    // Get overall statistics
    const [totalSubmissions, totalContests, totalTeams, totalProblems] = await Promise.all([
      db('submissions').count('* as count').first(),
      db('contests').count('* as count').first(),
      db('teams').count('* as count').first(),
      db('problems').count('* as count').first()
    ]);

    // Get active contests
    const activeContests = await db('contests')
      .where('is_active', true)
      .count('* as count')
      .first();

    // Get pending submissions (judge queue)
    const pendingSubmissions = await db('submissions')
      .where('verdict', 'PE') // Pending
      .count('* as count')
      .first();

    const stats = {
      totalSubmissions: parseInt(totalSubmissions.count) || 0,
      totalContests: parseInt(totalContests.count) || 0,
      activeContests: parseInt(activeContests.count) || 0,
      totalTeams: parseInt(totalTeams.count) || 0,
      totalProblems: parseInt(totalProblems.count) || 0,
      pendingJudging: parseInt(pendingSubmissions.count) || 0,
      systemHealth: 'healthy' // Will be enhanced with real health checks
    };

    res.success(stats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/system/health
 * Get system health status
 */
router.get('/system/health', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    
    // Test database connection
    let dbHealth = 'healthy';
    let dbResponseTime = 0;
    
    try {
      const start = Date.now();
      await db.raw('SELECT 1');
      dbResponseTime = Date.now() - start;
      
      if (dbResponseTime > 1000) {
        dbHealth = 'slow';
      }
    } catch (dbError) {
      dbHealth = 'error';
    }

    // Get system metrics (mock for now, can be enhanced with real system monitoring)
    const health = {
      overall: dbHealth === 'error' ? 'critical' : dbHealth === 'slow' ? 'warning' : 'healthy',
      database: {
        status: dbHealth,
        responseTime: dbResponseTime
      },
      services: {
        api: 'healthy',
        judge: 'healthy',
        websocket: 'healthy'
      },
      timestamp: new Date().toISOString()
    };

    res.success(health, 'System health retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/judge/queue
 * Get judge queue status
 */
router.get('/judge/queue', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    
    // Get queue statistics
    const [pending, processing, completed, failed] = await Promise.all([
      db('submissions').where('verdict', 'PE').count('* as count').first(),
      db('submissions').where('verdict', 'RU').count('* as count').first(), // Running
      db('submissions').whereNot('verdict', 'PE').whereNot('verdict', 'RU').count('* as count').first(),
      db('submissions').where('verdict', 'CE').count('* as count').first() // Compilation Error as failed example
    ]);

    // Get recent average processing time
    const avgTime = await db('submissions')
      .whereNotNull('judged_at')
      .where('submitted_at', '>', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .select(db.raw('AVG(EXTRACT(epoch FROM (judged_at - submitted_at))) as avg_time'))
      .first();

    const queueStatus = {
      pending: parseInt(pending.count) || 0,
      processing: parseInt(processing.count) || 0,
      completed: parseInt(completed.count) || 0,
      failed: parseInt(failed.count) || 0,
      workers_active: 5, // Mock - can be enhanced with real worker monitoring
      workers_total: 8,
      avg_processing_time_seconds: parseFloat(avgTime?.avg_time) || 1.8
    };

    res.success(queueStatus, 'Judge queue status retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// CONTEST LIVE STATS ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/contests/:id/live-stats
 * Get real-time contest statistics
 */
router.get('/contests/:id/live-stats', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const contestId = req.params.id;

    // Get contest details
    const contest = await db('contests').where('id', contestId).first();
    if (!contest) {
      return res.notFound('Contest not found');
    }

    // Calculate time statistics
    const startTime = new Date(contest.start_time);
    const now = new Date();
    const durationMs = contest.duration * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);
    
    const timeElapsed = Math.max(0, now.getTime() - startTime.getTime());
    const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
    const progressPercentage = Math.min(100, (timeElapsed / durationMs) * 100);

    // Get live statistics
    const [teamsCount, submissionsCount, problemsSolved, totalSubmissions] = await Promise.all([
      db('teams').where('contest_id', contestId).count('* as count').first(),
      db('submissions').where('contest_id', contestId).count('* as count').first(),
      db('submissions').where('contest_id', contestId).where('verdict', 'AC').countDistinct('problem_id as count').first(),
      db('submissions').where('contest_id', contestId).count('* as count').first()
    ]);

    // Get team participation rate
    const activeTeams = await db('submissions')
      .where('contest_id', contestId)
      .countDistinct('team_id as count')
      .first();

    const participationRate = teamsCount.count > 0 
      ? ((parseInt(activeTeams.count) || 0) / parseInt(teamsCount.count)) * 100 
      : 0;

    // Get average solve time
    const avgSolveTime = await db('submissions')
      .where('contest_id', contestId)
      .where('verdict', 'AC')
      .select(db.raw('AVG(EXTRACT(epoch FROM (submitted_at - ?::timestamp)) / 60) as avg_minutes', [contest.start_time]))
      .first();

    const liveStats = {
      contest_id: parseInt(contestId),
      time_remaining_seconds: Math.floor(timeRemaining / 1000),
      time_elapsed_seconds: Math.floor(timeElapsed / 1000),
      progress_percentage: Math.round(progressPercentage * 10) / 10,
      teams_count: parseInt(teamsCount.count) || 0,
      submissions_count: parseInt(submissionsCount.count) || 0,
      stats: {
        total_submissions: parseInt(totalSubmissions.count) || 0,
        problems_solved: parseInt(problemsSolved.count) || 0,
        team_participation_rate: Math.round(participationRate * 10) / 10,
        average_solve_time: parseFloat(avgSolveTime?.avg_minutes) || 0
      }
    };

    res.success(liveStats, 'Live contest statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/contests/:id/progress
 * Get contest progress and timing information
 */
router.get('/contests/:id/progress', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const contestId = req.params.id;

    const contest = await db('contests').where('id', contestId).first();
    if (!contest) {
      return res.notFound('Contest not found');
    }

    const startTime = new Date(contest.start_time);
    const now = new Date();
    const durationMs = contest.duration * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);
    const freezeTime = contest.freeze_time ? new Date(endTime.getTime() - (contest.freeze_time * 60 * 1000)) : null;

    // Determine current status
    let status = 'not_started';
    if (now >= startTime && now < endTime) {
      status = freezeTime && now >= freezeTime ? 'frozen' : 'running';
    } else if (now >= endTime) {
      status = 'ended';
    }

    const progress = {
      contest_id: parseInt(contestId),
      status,
      start_time: contest.start_time,
      end_time: endTime.toISOString(),
      duration_minutes: contest.duration,
      freeze_time: freezeTime?.toISOString() || null,
      time_remaining_seconds: Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000)),
      time_elapsed_seconds: Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000)),
      progress_percentage: Math.min(100, Math.max(0, ((now.getTime() - startTime.getTime()) / durationMs) * 100)),
      is_frozen: status === 'frozen'
    };

    res.success(progress, 'Contest progress retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// TEAM REGISTRATION ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/teams/registrations
 * Get team registration data with filtering
 */
router.get('/teams/registrations', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const { status, contest_id, limit = 50 } = req.query;
    
    let query = db('teams')
      .join('contests', 'teams.contest_id', 'contests.id')
      .select(
        'teams.*',
        'contests.contest_name',
        'contests.registration_code as contest_code'
      )
      .orderBy('teams.created_at', 'desc')
      .limit(parseInt(limit));

    if (status) {
      query = query.where('teams.status', status);
    }
    
    if (contest_id) {
      query = query.where('teams.contest_id', contest_id);
    }

    const registrations = await query;

    // Get last activity for each team (last submission)
    const teamsWithActivity = await Promise.all(
      registrations.map(async (team) => {
        const lastSubmission = await db('submissions')
          .where('team_id', team.id)
          .orderBy('submitted_at', 'desc')
          .first();

        return {
          id: team.id,
          team_name: team.team_name,
          contest_code: team.contest_code,
          contest_name: team.contest_name,
          registered_at: team.created_at,
          last_activity: lastSubmission?.submitted_at || team.created_at,
          is_active: team.status === 'active',
          status: team.status || 'active',
          validation_errors: team.validation_errors ? JSON.parse(team.validation_errors) : []
        };
      })
    );

    res.success(teamsWithActivity, 'Team registrations retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/teams/stats
 * Get team registration statistics
 */
router.get('/teams/stats', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    
    const [totalRegistrations, pendingApprovals, activeTeams, todayRegistrations, recentActivity] = await Promise.all([
      db('teams').count('* as count').first(),
      db('teams').where('status', 'pending').count('* as count').first(),
      db('teams').where('status', 'active').count('* as count').first(),
      db('teams')
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .count('* as count')
        .first(),
      db('submissions')
        .where('submitted_at', '>', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .countDistinct('team_id as count')
        .first()
    ]);

    const stats = {
      total_registrations: parseInt(totalRegistrations.count) || 0,
      pending_approvals: parseInt(pendingApprovals.count) || 0,
      active_teams: parseInt(activeTeams.count) || 0,
      registrations_today: parseInt(todayRegistrations.count) || 0,
      recent_activity: parseInt(recentActivity.count) || 0
    };

    res.success(stats, 'Team statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/teams/:id/approve
 * Approve team registration
 */
router.post('/teams/:id/approve', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const teamId = req.params.id;

    const team = await db('teams').where('id', teamId).first();
    if (!team) {
      return res.notFound('Team not found');
    }

    await db('teams')
      .where('id', teamId)
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
        approved_by: req.admin.id
      });

    const updatedTeam = await db('teams').where('id', teamId).first();
    res.success(updatedTeam, 'Team approved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/teams/:id/reject
 * Reject team registration
 */
router.post('/teams/:id/reject', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const teamId = req.params.id;
    const { reason } = req.body;

    const team = await db('teams').where('id', teamId).first();
    if (!team) {
      return res.notFound('Team not found');
    }

    await db('teams')
      .where('id', teamId)
      .update({
        status: 'rejected',
        rejection_reason: reason || 'Rejected by admin',
        rejected_at: new Date().toISOString(),
        rejected_by: req.admin.id
      });

    const updatedTeam = await db('teams').where('id', teamId).first();
    res.success(updatedTeam, 'Team rejected successfully');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// SUBMISSION ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/submissions/live
 * Get live submission feed
 */
router.get('/submissions/live', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const { contest_id, language, status, limit = 50 } = req.query;

    let query = db('submissions')
      .join('teams', 'submissions.team_id', 'teams.id')
      .join('problems', 'submissions.problem_id', 'problems.id')
      .join('contests', 'submissions.contest_id', 'contests.id')
      .select(
        'submissions.*',
        'teams.team_name',
        'problems.problem_letter',
        'problems.title as problem_title',
        'contests.contest_name'
      )
      .orderBy('submissions.submitted_at', 'desc')
      .limit(parseInt(limit));

    if (contest_id) {
      query = query.where('submissions.contest_id', contest_id);
    }
    
    if (language) {
      query = query.where('submissions.language', language);
    }
    
    if (status) {
      query = query.where('submissions.verdict', status);
    }

    const submissions = await query;

    const formattedSubmissions = submissions.map(submission => ({
      id: submission.id,
      team_name: submission.team_name,
      problem_letter: submission.problem_letter,
      problem_title: submission.problem_title,
      language: submission.language,
      status: submission.verdict?.toLowerCase().replace('_', ' ') || 'pending',
      submission_time: submission.submitted_at,
      judged_at: submission.judged_at,
      execution_time: submission.execution_time_ms,
      memory_used: submission.memory_used_kb,
      contest_name: submission.contest_name,
      verdict_details: submission.error_message
    }));

    res.success(formattedSubmissions, 'Live submissions retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/submissions/stats
 * Get submission statistics
 */
router.get('/submissions/stats', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const { contest_id } = req.query;

    let baseQuery = db('submissions');
    if (contest_id) {
      baseQuery = baseQuery.where('contest_id', contest_id);
    }

    // Get submissions per minute (last hour)
    const submissionsLastHour = await baseQuery.clone()
      .where('submitted_at', '>', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .count('* as count')
      .first();

    const submissionsPerMinute = (parseInt(submissionsLastHour.count) || 0) / 60;

    // Get total submissions today
    const submissionsToday = await baseQuery.clone()
      .where('submitted_at', '>', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
      .count('* as count')
      .first();

    // Get pending count
    const pendingCount = await baseQuery.clone()
      .where('verdict', 'PE')
      .count('* as count')
      .first();

    // Get average judging time
    const avgJudgingTime = await baseQuery.clone()
      .whereNotNull('judged_at')
      .where('submitted_at', '>', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .select(db.raw('AVG(EXTRACT(epoch FROM (judged_at - submitted_at))) as avg_time'))
      .first();

    const stats = {
      submissions_per_minute: Math.round(submissionsPerMinute * 10) / 10,
      total_submissions_today: parseInt(submissionsToday.count) || 0,
      pending_count: parseInt(pendingCount.count) || 0,
      average_judging_time: parseFloat(avgJudgingTime?.avg_time) || 0
    };

    res.success(stats, 'Submission statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/submissions/analytics
 * Get submission analytics (language usage, verdict distribution)
 */
router.get('/submissions/analytics', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const { contest_id } = req.query;

    let baseQuery = db('submissions');
    if (contest_id) {
      baseQuery = baseQuery.where('contest_id', contest_id);
    }

    // Get language usage
    const languageUsage = await baseQuery.clone()
      .select('language')
      .count('* as count')
      .groupBy('language')
      .orderBy('count', 'desc');

    const totalSubmissions = languageUsage.reduce((sum, lang) => sum + parseInt(lang.count), 0);
    
    const languageStats = {};
    languageUsage.forEach(lang => {
      languageStats[lang.language] = Math.round((parseInt(lang.count) / totalSubmissions) * 100);
    });

    // Get verdict distribution
    const verdictDistribution = await baseQuery.clone()
      .select('verdict')
      .count('* as count')
      .whereNotNull('verdict')
      .groupBy('verdict')
      .orderBy('count', 'desc');

    const totalJudged = verdictDistribution.reduce((sum, verdict) => sum + parseInt(verdict.count), 0);
    
    const verdictStats = {};
    verdictDistribution.forEach(verdict => {
      const verdictName = verdict.verdict.toLowerCase().replace('_', ' ');
      verdictStats[verdictName] = Math.round((parseInt(verdict.count) / totalJudged) * 100);
    });

    const analytics = {
      language_usage: languageStats,
      verdict_distribution: verdictStats
    };

    res.success(analytics, 'Submission analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// SYSTEM MONITORING ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/system/status
 * Get complete system status
 */
router.get('/system/status', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const os = require('os');

    // Database status
    let dbStatus = 'connected';
    let dbResponseTime = 0;
    try {
      const start = Date.now();
      await db.raw('SELECT 1');
      dbResponseTime = Date.now() - start;
      if (dbResponseTime > 1000) dbStatus = 'slow';
    } catch (error) {
      dbStatus = 'disconnected';
    }

    // Get database connection info
    const dbConnections = await db.raw('SELECT count(*) as count FROM pg_stat_activity').catch(() => ({ rows: [{ count: 0 }] }));

    // Judge queue status
    const [pending, processing] = await Promise.all([
      db('submissions').where('verdict', 'PE').count('* as count').first(),
      db('submissions').where('verdict', 'RU').count('* as count').first()
    ]);

    const systemStatus = {
      judge_queue: {
        pending: parseInt(pending.count) || 0,
        processing: parseInt(processing.count) || 0,
        workers_active: 5, // Mock - enhance with real worker monitoring
        avg_processing_time: 1.8
      },
      database: {
        status: dbStatus,
        connections: parseInt(dbConnections.rows[0].count) || 0,
        response_time: dbResponseTime
      },
      server: {
        cpu_usage: Math.round((os.loadavg()[0] / os.cpus().length) * 100),
        memory_usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
        disk_usage: 42, // Mock - enhance with real disk monitoring
        uptime: Math.floor(os.uptime())
      },
      contests_scheduler: {
        status: 'running',
        last_check: new Date().toISOString(),
        scheduled_tasks: 3 // Mock - enhance with real scheduler monitoring
      }
    };

    res.success(systemStatus, 'System status retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/system/metrics
 * Get detailed system metrics
 */
router.get('/system/metrics', verifyAdminToken, async (req, res, next) => {
  try {
    const os = require('os');

    const metrics = {
      cpu: {
        usage_percent: Math.round((os.loadavg()[0] / os.cpus().length) * 100),
        load_average: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total_mb: Math.round(os.totalmem() / 1024 / 1024),
        used_mb: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
        free_mb: Math.round(os.freemem() / 1024 / 1024),
        usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      disk: {
        total_gb: 500, // Mock - enhance with real disk monitoring
        used_gb: 210,
        free_gb: 290,
        usage_percent: 42
      },
      network: {
        bytes_sent: 1024000000, // Mock - enhance with real network monitoring
        bytes_received: 2048000000,
        connections_active: 45
      },
      processes: {
        total: 156, // Mock
        running: 3,
        sleeping: 153
      },
      uptime_seconds: Math.floor(os.uptime())
    };

    res.success(metrics, 'System metrics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/system/logs
 * Get system logs
 */
router.get('/system/logs', verifyAdminToken, async (req, res, next) => {
  try {
    const { level = 'all', limit = 100, service } = req.query;

    // Mock system logs - in real implementation, this would read from log files or logging service
    const mockLogs = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 30000).toISOString(),
        level: 'info',
        service: 'contest-scheduler',
        message: 'Contest auto-started successfully',
        details: { contest_id: 1, contest_name: 'ICPC Practice Round' }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'warning',
        service: 'judge-queue',
        message: 'High queue backlog detected',
        details: { pending_submissions: 25 }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'error',
        service: 'docker-executor',
        message: 'Container execution failed',
        details: { submission_id: 1245, error: 'timeout' }
      }
    ];

    let filteredLogs = mockLogs;
    
    if (level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (service) {
      filteredLogs = filteredLogs.filter(log => log.service === service);
    }
    
    filteredLogs = filteredLogs.slice(0, parseInt(limit));

    res.success(filteredLogs, 'System logs retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// PROJECT SUBMISSION ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/contests/:id/projects
 * Get all project submissions for a contest
 */
router.get('/contests/:id/projects', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const contestId = parseInt(req.params.id);

    const projects = await db('project_submissions as ps')
      .join('teams as t', 'ps.team_id', 't.id')
      .where('ps.contest_id', contestId)
      .select(
        'ps.*',
        't.team_name'
      )
      .orderBy('ps.submitted_at', 'desc');

    res.success(projects, 'Project submissions retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/projects/:id/download
 * Download a project submission file
 */
router.get('/projects/:id/download', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const fs = require('fs');
    const path = require('path');
    const submissionId = parseInt(req.params.id);

    const submission = await db('project_submissions').where('id', submissionId).first();
    
    if (!submission) {
      return res.notFound('Project submission not found');
    }

    const filePath = path.resolve(submission.file_path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.notFound('Project file not found on disk');
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${submission.original_filename}"`);
    res.setHeader('Content-Type', submission.mime_type || 'application/zip');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
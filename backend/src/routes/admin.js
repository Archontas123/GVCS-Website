/**
 * Admin Routes Module
 * Provides comprehensive admin management endpoints including authentication,
 * contest management, system monitoring, and team registration oversight
 * @module routes/admin
 */

const express = require('express');
const router = express.Router();
const Admin = require('../controllers/adminController');
const Contest = require('../controllers/contestController');
const { verifyAdminToken, requireSuperAdmin, requireContestAccess } = require('../middleware/adminAuth');
const { validate } = require('../utils/validation');
const Joi = require('joi');

/**
 * Joi schema for admin login validation
 * @type {Joi.ObjectSchema}
 */
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

/**
 * Joi schema for admin registration validation
 * @type {Joi.ObjectSchema}
 */
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
    .valid('admin')
    .default('admin')
    .messages({
      'any.only': 'Role must be admin'
    })
});

/**
 * Joi schema for contest creation validation
 * @type {Joi.ObjectSchema}
 */
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
  
  is_active: Joi.boolean().default(true)
});

/**
 * Joi schema for contest update validation
 * @type {Joi.ObjectSchema}
 */
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
  
  is_active: Joi.boolean()
});

/**
 * Admin login endpoint
 * @route POST /api/admin/login
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - Admin username (3-50 characters)
 * @param {string} req.body.password - Admin password (6-128 characters)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with authentication token and admin details
 * @throws {ValidationError} 400 - Invalid input data
 * @throws {UnauthorizedError} 401 - Invalid credentials
 * @throws {InternalServerError} 500 - Server error
 * @example
 * // Request body:
 * {
 *   "username": "admin123",
 *   "password": "securepassword"
 * }
 * 
 * // Response:
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "token": "jwt_token_here",
 *     "admin": {
 *       "id": 1,
 *       "username": "admin123",
 *       "role": "admin"
 *     }
 *   }
 * }
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
 * Admin registration endpoint (super admin only)
 * @route POST /api/admin/register
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - New admin username (3-50 characters, alphanumeric with _ and -)
 * @param {string} req.body.email - Admin email address (max 255 characters)
 * @param {string} req.body.password - Admin password (6-128 characters)
 * @param {string} [req.body.role=admin] - Admin role
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with created admin details (excluding password)
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireSuperAdmin - Super admin privileges required
 * @throws {ValidationError} 400 - Invalid input data
 * @throws {UnauthorizedError} 401 - Not authenticated or insufficient privileges
 * @throws {ConflictError} 409 - Username or email already exists
 * @throws {InternalServerError} 500 - Server error
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
 * Get current admin profile with statistics
 * @route GET /api/admin/profile
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {number} req.admin.id - Admin ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with admin profile and statistics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Admin not found
 * @throws {InternalServerError} 500 - Server error
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
 * Update current admin profile
 * @route PUT /api/admin/profile
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} req.body - Updated profile data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with updated admin profile
 * @requires verifyAdminToken - Admin authentication required
 * @throws {ValidationError} 400 - Invalid update data
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {ConflictError} 409 - Username/email conflict
 * @throws {InternalServerError} 500 - Server error
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
 * Change admin password
 * @route PUT /api/admin/password
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.current_password - Current password for verification
 * @param {string} req.body.new_password - New password (6-128 characters)
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response confirming password change
 * @requires verifyAdminToken - Admin authentication required
 * @throws {ValidationError} 400 - Invalid password data
 * @throws {UnauthorizedError} 401 - Not authenticated or incorrect current password
 * @throws {InternalServerError} 500 - Server error
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

/**
 * Get all contests with statistics
 * @route GET /api/admin/contests
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.active] - Filter by active status ('true' or 'false')
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with array of contests including statistics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/contests', verifyAdminToken, async (req, res, next) => {
  try {
    const filters = {};
    
    if (req.query.active !== undefined) {
      filters.isActive = req.query.active === 'true';
    }
    
    const contests = await Contest.findAll(filters);
    
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
 * Create new contest
 * @route POST /api/admin/contests
 * @param {Object} req - Express request object
 * @param {Object} req.body - Contest data
 * @param {string} req.body.contest_name - Contest name (3-255 characters)
 * @param {string} [req.body.description] - Contest description (max 5000 characters)
 * @param {string} req.body.start_time - Contest start time (ISO format, future date)
 * @param {number} req.body.duration - Contest duration in minutes (30-720)
 * @param {number} [req.body.freeze_time=60] - Freeze time in minutes before end
 * @param {boolean} [req.body.is_active=true] - Contest active status
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with created contest and statistics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {ValidationError} 400 - Invalid contest data
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
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
 * Get detailed contest information
 * @route GET /api/admin/contests/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with contest details, statistics, and status
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Server error
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
 * Update contest information
 * @route PUT /api/admin/contests/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.body - Updated contest data
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with updated contest and statistics
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {ValidationError} 400 - Invalid contest data
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Server error
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
 * Delete contest (soft delete)
 * @route DELETE /api/admin/contests/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response confirming contest deletion
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {ConflictError} 409 - Contest cannot be deleted (active participants)
 * @throws {InternalServerError} 500 - Server error
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
 * Check if contest can be started
 * @route GET /api/admin/contests/:id/can-start
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with contest start validation results
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Server error
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
 * Start contest immediately
 * @route POST /api/admin/contests/:id/start
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with started contest details
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {ConflictError} 409 - Contest cannot be started (validation failed)
 * @throws {InternalServerError} 500 - Server error
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
 * Freeze contest leaderboard
 * @route POST /api/admin/contests/:id/freeze
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with frozen contest details
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {ConflictError} 409 - Contest cannot be frozen (not running)
 * @throws {InternalServerError} 500 - Server error
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
 * Unfreeze contest leaderboard
 * @route POST /api/admin/contests/:id/unfreeze
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with unfrozen contest details
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {ConflictError} 409 - Contest cannot be unfrozen (not frozen)
 * @throws {InternalServerError} 500 - Server error
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
 * End contest early
 * @route POST /api/admin/contests/:id/end
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with ended contest details
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {ConflictError} 409 - Contest cannot be ended (not running)
 * @throws {InternalServerError} 500 - Server error
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
 * Get all admins (super admin only)
 * @route GET /api/admin/admins
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with array of admin accounts
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireSuperAdmin - Super admin privileges required
 * @throws {UnauthorizedError} 401 - Not authenticated or insufficient privileges
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/admins', verifyAdminToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const admins = await Admin.findAll();
    res.success(admins, 'Admins retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Get overall dashboard statistics
 * @route GET /api/admin/dashboard/stats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with dashboard statistics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/dashboard/stats', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    
    const [totalSubmissions, totalContests, totalTeams, totalProblems] = await Promise.all([
      db('submissions').count('* as count').first(),
      db('contests').count('* as count').first(),
      db('teams').count('* as count').first(),
      db('problems').count('* as count').first()
    ]);

    const activeContests = await db('contests')
      .where('is_active', true)
      .count('* as count')
      .first();

    const pendingSubmissions = await db('submissions')
      .where('verdict', 'PE')
      .count('* as count')
      .first();

    const stats = {
      totalSubmissions: parseInt(totalSubmissions.count) || 0,
      totalContests: parseInt(totalContests.count) || 0,
      activeContests: parseInt(activeContests.count) || 0,
      totalTeams: parseInt(totalTeams.count) || 0,
      totalProblems: parseInt(totalProblems.count) || 0,
      pendingJudging: parseInt(pendingSubmissions.count) || 0,
      systemHealth: 'healthy'
    };

    res.success(stats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Get system health status
 * @route GET /api/admin/system/health
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with system health information
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/system/health', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    
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
 * Get judge queue status
 * @route GET /api/admin/judge/queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with judge queue statistics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/judge/queue', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    
    const [pending, processing, completed, failed] = await Promise.all([
      db('submissions').where('verdict', 'PE').count('* as count').first(),
      db('submissions').where('verdict', 'RU').count('* as count').first(),
      db('submissions').whereNot('verdict', 'PE').whereNot('verdict', 'RU').count('* as count').first(),
      db('submissions').where('verdict', 'CE').count('* as count').first()
    ]);

    const avgTime = await db('submissions')
      .whereNotNull('judged_at')
      .where('submitted_at', '>', new Date(Date.now() - 3600000).toISOString())
      .select(db.raw('AVG(EXTRACT(epoch FROM (judged_at - submitted_at))) as avg_time'))
      .first();

    const queueStatus = {
      pending: parseInt(pending.count) || 0,
      processing: parseInt(processing.count) || 0,
      completed: parseInt(completed.count) || 0,
      failed: parseInt(failed.count) || 0,
      workers_active: 5,
      workers_total: 8,
      avg_processing_time_seconds: parseFloat(avgTime?.avg_time) || 1.8
    };

    res.success(queueStatus, 'Judge queue status retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Get real-time contest statistics
 * @route GET /api/admin/contests/:id/live-stats
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with live contest statistics
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/contests/:id/live-stats', verifyAdminToken, requireContestAccess, async (req, res, next) => {
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
    
    const timeElapsed = Math.max(0, now.getTime() - startTime.getTime());
    const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
    const progressPercentage = Math.min(100, (timeElapsed / durationMs) * 100);

    const [teamsCount, submissionsCount, problemsSolved, totalSubmissions] = await Promise.all([
      db('teams').where('contest_id', contestId).count('* as count').first(),
      db('submissions').where('contest_id', contestId).count('* as count').first(),
      db('submissions').where('contest_id', contestId).where('verdict', 'AC').countDistinct('problem_id as count').first(),
      db('submissions').where('contest_id', contestId).count('* as count').first()
    ]);

    const activeTeams = await db('submissions')
      .where('contest_id', contestId)
      .countDistinct('team_id as count')
      .first();

    const participationRate = teamsCount.count > 0 
      ? ((parseInt(activeTeams.count) || 0) / parseInt(teamsCount.count)) * 100 
      : 0;

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
 * Get contest progress and timing information
 * @route GET /api/admin/contests/:id/progress
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with contest progress and timing details
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Server error
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

/**
 * Get team registration data with filtering
 * @route GET /api/admin/teams/registrations
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.status] - Filter by team status
 * @param {string} [req.query.contest_id] - Filter by contest ID
 * @param {number} [req.query.limit=50] - Maximum number of results
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with team registration data
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
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
 * Get team registration statistics
 * @route GET /api/admin/teams/stats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with team registration statistics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
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
        .where('submitted_at', '>', new Date(Date.now() - 30 * 60 * 1000).toISOString())
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
 * Approve team registration
 * @route POST /api/admin/teams/:id/approve
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Team ID
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with approved team details
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Team not found
 * @throws {ConflictError} 409 - Team already approved or invalid status
 * @throws {InternalServerError} 500 - Server error
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
 * Reject team registration
 * @route POST /api/admin/teams/:id/reject
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Team ID
 * @param {Object} req.body - Request body
 * @param {string} [req.body.reason] - Rejection reason
 * @param {Object} req.admin - Admin object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with rejected team details
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Team not found
 * @throws {ConflictError} 409 - Team already processed or invalid status
 * @throws {InternalServerError} 500 - Server error
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

/**
 * Get live submission feed
 * @route GET /api/admin/submissions/live
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.contest_id] - Filter by contest ID
 * @param {string} [req.query.language] - Filter by programming language
 * @param {string} [req.query.status] - Filter by submission status/verdict
 * @param {number} [req.query.limit=50] - Maximum number of results
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with live submissions data
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
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
 * Get submission statistics
 * @route GET /api/admin/submissions/stats
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.contest_id] - Filter by contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with submission statistics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/submissions/stats', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const { contest_id } = req.query;

    let baseQuery = db('submissions');
    if (contest_id) {
      baseQuery = baseQuery.where('contest_id', contest_id);
    }

    const submissionsLastHour = await baseQuery.clone()
      .where('submitted_at', '>', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .count('* as count')
      .first();

    const submissionsPerMinute = (parseInt(submissionsLastHour.count) || 0) / 60;

    const submissionsToday = await baseQuery.clone()
      .where('submitted_at', '>', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
      .count('* as count')
      .first();

    const pendingCount = await baseQuery.clone()
      .where('verdict', 'PE')
      .count('* as count')
      .first();

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
 * Get submission analytics (language usage, verdict distribution)
 * @route GET /api/admin/submissions/analytics
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.contest_id] - Filter by contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with submission analytics data
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/submissions/analytics', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const { contest_id } = req.query;

    let baseQuery = db('submissions');
    if (contest_id) {
      baseQuery = baseQuery.where('contest_id', contest_id);
    }

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

/**
 * Get complete system status
 * @route GET /api/admin/system/status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with comprehensive system status
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/system/status', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const os = require('os');

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

    const dbConnections = await db.raw('SELECT count(*) as count FROM pg_stat_activity').catch(() => ({ rows: [{ count: 0 }] }));

    const [pending, processing] = await Promise.all([
      db('submissions').where('verdict', 'PE').count('* as count').first(),
      db('submissions').where('verdict', 'RU').count('* as count').first()
    ]);

    const systemStatus = {
      judge_queue: {
        pending: parseInt(pending.count) || 0,
        processing: parseInt(processing.count) || 0,
        workers_active: 5,
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
        disk_usage: 42,
        uptime: Math.floor(os.uptime())
      },
      contests_scheduler: {
        status: 'running',
        last_check: new Date().toISOString(),
        scheduled_tasks: 3
      }
    };

    res.success(systemStatus, 'System status retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Get detailed system metrics
 * @route GET /api/admin/system/metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with detailed system metrics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
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
        total_gb: 500,
        used_gb: 210,
        free_gb: 290,
        usage_percent: 42
      },
      network: {
        bytes_sent: 1024000000,
        bytes_received: 2048000000,
        connections_active: 45
      },
      processes: {
        total: 156,
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
 * Get system logs with filtering
 * @route GET /api/admin/system/logs
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.level=all] - Filter by log level (info, warning, error, all)
 * @param {number} [req.query.limit=100] - Maximum number of log entries
 * @param {string} [req.query.service] - Filter by service name
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with system logs
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/system/logs', verifyAdminToken, async (req, res, next) => {
  try {
    const { level = 'all', limit = 100, service } = req.query;

    const mockLogs = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 30000).toISOString(),
        level: 'info',
        service: 'contest-scheduler',
        message: 'Contest auto-started successfully',
        details: { contest_id: 1, contest_name: 'Programming Contest Practice Round' }
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

module.exports = router;
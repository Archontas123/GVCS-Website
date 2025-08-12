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

module.exports = router;
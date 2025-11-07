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
const Problem = require('../controllers/problemController');
const TestCase = require('../controllers/testCaseController');
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
    .allow(null)
    .empty('')
    .optional()
    .messages({
      'date.greater': 'Start time must be in the future'
    }),
  
  duration: Joi.number()
    .integer()
    .min(15)
    .max(1440)
    .allow(null)
    .empty('')
    .optional()
    .messages({
      'number.min': 'Duration must be at least 15 minutes',
      'number.max': 'Duration must not exceed 24 hours (1440 minutes)'
    }),
  
  freeze_time: Joi.number()
    .integer()
    .min(0)
    .max(720)
    .default(0)
    .messages({
      'number.min': 'Freeze time must be 0 or greater',
      'number.max': 'Freeze time must not exceed 12 hours (720 minutes)'
    }),

  // All contests default to manual control
  // Set to false explicitly to enable automatic scheduling (not recommended)
  manual_control: Joi.boolean().default(true)
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
    .allow(null)
    .empty('')
    .messages({
      'date.base': 'Invalid start time format'
    }),
  
  duration: Joi.number()
    .integer()
    .min(15)
    .max(1440)
    .allow(null)
    .empty('')
    .messages({
      'number.min': 'Duration must be at least 15 minutes',
      'number.max': 'Duration must not exceed 24 hours (1440 minutes)'
    }),
  
  freeze_time: Joi.number()
    .integer()
    .min(0)
    .max(720)
    .messages({
      'number.min': 'Freeze time must be 0 or greater',
      'number.max': 'Freeze time must not exceed 12 hours (720 minutes)'
    }),

  manual_control: Joi.boolean(),
  
  is_active: Joi.boolean()
});

/**
 * Joi schema for problem creation validation
 * @type {Joi.ObjectSchema}
 */
const problemCreateSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.min': 'Problem title must be at least 3 characters long',
      'string.max': 'Problem title must not exceed 255 characters',
      'any.required': 'Problem title is required'
    }),

  description: Joi.string()
    .max(10000)
    .required()
    .messages({
      'string.max': 'Description must not exceed 10000 characters',
      'any.required': 'Problem description is required'
    }),

  input_format: Joi.string()
    .min(5)
    .max(2000)
    .allow('')
    .messages({
      'string.min': 'Input format must be at least 5 characters long',
      'string.max': 'Input format must not exceed 2000 characters'
    }),

  output_format: Joi.string()
    .max(2000)
    .required()
    .messages({
      'string.max': 'Output format must not exceed 2000 characters',
      'any.required': 'Output format is required'
    }),

  constraints: Joi.string()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Constraints must not exceed 2000 characters'
    }),

  sample_input: Joi.string()
    .max(5000)
    .allow('')
    .messages({
      'string.max': 'Sample input must not exceed 5000 characters'
    }),

  sample_output: Joi.string()
    .max(5000)
    .allow('')
    .messages({
      'string.max': 'Sample output must not exceed 5000 characters'
    }),

  time_limit: Joi.number()
    .integer()
    .min(100)
    .max(30000)
    .default(1000)
    .messages({
      'number.min': 'Time limit must be at least 100ms',
      'number.max': 'Time limit must not exceed 30000ms'
    }),

  memory_limit: Joi.number()
    .integer()
    .min(16)
    .max(2048)
    .default(256)
    .messages({
      'number.min': 'Memory limit must be at least 16MB',
      'number.max': 'Memory limit must not exceed 2048MB'
    }),

  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard')
    .default('medium')
    .messages({
      'any.only': 'Difficulty must be one of: easy, medium, hard'
    }),

  max_points: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100)
    .messages({
      'number.min': 'Maximum points must be at least 1',
      'number.max': 'Maximum points must not exceed 1000'
    }),

  problem_letter: Joi.string()
    .length(1)
    .pattern(/^[A-Z]$/)
    .messages({
      'string.length': 'Problem letter must be exactly 1 character',
      'string.pattern.base': 'Problem letter must be a single uppercase letter (A-Z)'
    }),

  // LeetCode-style fields
  uses_leetcode_style: Joi.boolean()
    .default(false),

  function_name: Joi.string()
    .max(255)
    .allow('')
    .messages({
      'string.max': 'Function name must not exceed 255 characters'
    }),

  function_parameters: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array(),
      Joi.object()
    )
    .allow(null, '')
    .messages({
      'alternatives.types': 'Function parameters must be a valid JSON string, array, or object'
    }),

  return_type: Joi.string()
    .max(255)
    .allow('')
    .messages({
      'string.max': 'Return type must not exceed 255 characters'
    }),

  // Function signatures
  function_signature_cpp: Joi.string()
    .max(10000)
    .allow('', null)
    .messages({
      'string.max': 'C++ function signature must not exceed 10000 characters'
    }),

  function_signature_java: Joi.string()
    .max(10000)
    .allow('', null)
    .messages({
      'string.max': 'Java function signature must not exceed 10000 characters'
    }),

  function_signature_python: Joi.string()
    .max(10000)
    .allow('', null)
    .messages({
      'string.max': 'Python function signature must not exceed 10000 characters'
    }),

  function_signature_javascript: Joi.string()
    .max(10000)
    .allow('', null)
    .messages({
      'string.max': 'JavaScript function signature must not exceed 10000 characters'
    }),

  // IO wrappers
  io_wrapper_cpp: Joi.string()
    .max(50000)
    .allow('', null)
    .messages({
      'string.max': 'C++ IO wrapper must not exceed 50000 characters'
    }),

  io_wrapper_java: Joi.string()
    .max(50000)
    .allow('', null)
    .messages({
      'string.max': 'Java IO wrapper must not exceed 50000 characters'
    }),

  io_wrapper_python: Joi.string()
    .max(50000)
    .allow('', null)
    .messages({
      'string.max': 'Python IO wrapper must not exceed 50000 characters'
    }),

  io_wrapper_javascript: Joi.string()
    .max(50000)
    .allow('', null)
    .messages({
      'string.max': 'JavaScript IO wrapper must not exceed 50000 characters'
    }),

  // Default solutions
  default_solution_cpp: Joi.string()
    .max(50000)
    .allow('', null)
    .messages({
      'string.max': 'C++ default solution must not exceed 50000 characters'
    }),

  default_solution_java: Joi.string()
    .max(50000)
    .allow('', null)
    .messages({
      'string.max': 'Java default solution must not exceed 50000 characters'
    }),

  default_solution_python: Joi.string()
    .max(50000)
    .allow('', null)
    .messages({
      'string.max': 'Python default solution must not exceed 50000 characters'
    }),

  default_solution_javascript: Joi.string()
    .max(50000)
    .allow('', null)
    .messages({
      'string.max': 'JavaScript default solution must not exceed 50000 characters'
    })
});

/**
 * Joi schema for problem update validation
 * @type {Joi.ObjectSchema}
 */
const problemUpdateSchema = problemCreateSchema.fork(
  ['title', 'description', 'output_format'],
  (schema) => schema.optional()
);

/**
 * Joi schema for test case creation validation
 * @type {Joi.ObjectSchema}
 */
const testCaseCreateSchema = Joi.object({
  test_case_name: Joi.string()
    .max(200)
    .required()
    .messages({
      'string.max': 'Test case name must not exceed 200 characters',
      'any.required': 'Test case name is required'
    }),

  input_parameters: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.object(),
      Joi.array()
    )
    .required()
    .messages({
      'alternatives.types': 'Input parameters must be a valid JSON string, object, or array',
      'any.required': 'Input parameters are required'
    }),

  expected_return: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.object(),
      Joi.array()
    )
    .required()
    .messages({
      'alternatives.types': 'Expected return must be a valid value',
      'any.required': 'Expected return is required'
    }),

  parameter_types: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array().items(Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required()
      }))
    )
    .required()
    .messages({
      'alternatives.types': 'Parameter types must be a valid JSON string or array of type definitions',
      'any.required': 'Parameter types are required'
    }),

  explanation: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Explanation must not exceed 1000 characters'
    }),

  is_sample: Joi.boolean()
    .default(false)
});

/**
 * Joi schema for bulk test case creation validation
 * @type {Joi.ObjectSchema}
 */
const testCaseBulkCreateSchema = Joi.object({
  test_cases: Joi.array()
    .items(testCaseCreateSchema)
    .min(1)
    .max(100)
    .messages({
      'array.min': 'At least one test case is required',
      'array.max': 'Cannot create more than 100 test cases at once'
    }),

  csv_data: Joi.string()
    .max(100000)
    .messages({
      'string.max': 'CSV data must not exceed 100000 characters'
    })
}).xor('test_cases', 'csv_data')
  .messages({
    'object.xor': 'Either test_cases array or csv_data must be provided, but not both'
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
        const statusInfo = Contest.getContestStatus(contest);
        return {
          ...contest,
          status: statusInfo.status,
          teams_count: stats.teams_registered,
          problems_count: stats.problems_count,
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
 * Delete contest (hard delete with cascading)
 * Any admin can delete any contest
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
 * @throws {InternalServerError} 500 - Server error
 */
router.delete('/contests/:id', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const result = await Contest.delete(req.params.id);
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
    const unfrozenContest = await Contest.unfreezeContest(req.params.id, req.admin.id);

    res.success(unfrozenContest, 'Contest leaderboard unfrozen successfully');
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
      .where('status', 'PE')
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
      db('submissions').where('status', 'PE').count('* as count').first(),
      db('submissions').where('status', 'RU').count('* as count').first(),
      db('submissions').whereNot('status', 'PE').whereNot('status', 'RU').count('* as count').first(),
      db('submissions').where('status', 'CE').count('* as count').first()
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

    const statusSnapshot = Contest.getContestStatus(contest);
    const timeElapsedSeconds = statusSnapshot.time_elapsed_seconds ?? 0;
    const timeRemainingSeconds = statusSnapshot.time_remaining_seconds;
    const progressPercentage = statusSnapshot.progress_percentage ?? 0;

    const [teamsCount, submissionsCount, problemsSolved, totalSubmissions] = await Promise.all([
      db('teams').where('contest_id', contestId).count('* as count').first(),
      db('submissions').where('contest_id', contestId).count('* as count').first(),
      db('submissions').where('contest_id', contestId).where('status', 'AC').countDistinct('problem_id as count').first(),
      db('submissions').where('contest_id', contestId).count('* as count').first()
    ]);

    const activeTeams = await db('submissions')
      .where('contest_id', contestId)
      .countDistinct('team_id as count')
      .first();

    const participationRate = teamsCount.count > 0 
      ? ((parseInt(activeTeams.count) || 0) / parseInt(teamsCount.count)) * 100 
      : 0;

    const avgSolveTime = contest.start_time
      ? await db('submissions')
          .where('contest_id', contestId)
          .where('status', 'AC')
          .select(db.raw('AVG(EXTRACT(epoch FROM (submitted_at - ?::timestamp)) / 60) as avg_minutes', [contest.start_time]))
          .first()
      : { avg_minutes: null };

    const liveStats = {
      contest_id: parseInt(contestId),
      time_remaining_seconds: timeRemainingSeconds !== null && timeRemainingSeconds !== undefined
        ? Math.max(0, Math.floor(timeRemainingSeconds))
        : null,
      time_elapsed_seconds: Math.max(0, Math.floor(timeElapsedSeconds)),
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

    const statusSnapshot = Contest.getContestStatus(contest);

    const progress = {
      contest_id: parseInt(contestId),
      status: statusSnapshot.status,
      start_time: statusSnapshot.start_time,
      end_time: statusSnapshot.end_time,
      duration_minutes: contest.duration,
      freeze_time: statusSnapshot.freeze_time,
      time_remaining_seconds: statusSnapshot.time_remaining_seconds,
      time_elapsed_seconds: statusSnapshot.time_elapsed_seconds,
      progress_percentage: statusSnapshot.progress_percentage,
      is_frozen: statusSnapshot.is_frozen
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
      .join('contests', 'teams.contest_code', 'contests.registration_code')
      .select(
        'teams.*',
        'contests.contest_name',
        'contests.id as contest_id'
      )
      .orderBy('teams.created_at', 'desc')
      .limit(parseInt(limit));

    if (status) {
      query = query.where('teams.status', status);
    }

    if (contest_id) {
      query = query.where('contests.id', contest_id);
    }

    const registrations = await query;

    const teamsWithActivity = await Promise.all(
      registrations.map(async (team) => {
        const lastSubmission = await db('submissions')
          .where('team_id', team.id)
          .orderBy('submitted_at', 'desc')
          .first();

        // Parse member_names from JSON (backward compatibility)
        let memberNames = [];
        try {
          memberNames = team.member_names ? JSON.parse(team.member_names) : [];
        } catch (e) {
          memberNames = [];
        }

        // Build members array with first and last names
        const members = [];
        if (team.member1_first_name || team.member1_last_name) {
          members.push({
            firstName: team.member1_first_name || '',
            lastName: team.member1_last_name || ''
          });
        }
        if (team.member2_first_name || team.member2_last_name) {
          members.push({
            firstName: team.member2_first_name || '',
            lastName: team.member2_last_name || ''
          });
        }
        if (team.member3_first_name || team.member3_last_name) {
          members.push({
            firstName: team.member3_first_name || '',
            lastName: team.member3_last_name || ''
          });
        }

        return {
          id: team.id,
          team_name: team.team_name,
          team_lead_name: memberNames[0] || 'Unknown',
          team_lead_email: team.email || 'Unknown',
          contest_code: team.contest_code,
          contest_name: team.contest_name,
          registration_time: team.created_at,
          registered_at: team.created_at,
          members: members,
          members_count: members.length,
          last_activity: lastSubmission?.submitted_at || team.created_at,
          is_active: team.is_active,
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
 * Get team details with all submissions for a specific contest
 * @route GET /api/admin/contests/:contestId/teams/:teamId/submissions
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestId - Contest ID
 * @param {string} req.params.teamId - Team ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with team details and all submissions with source code
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Team or contest not found
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/contests/:contestId/teams/:teamId/submissions', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const contestId = parseInt(req.params.contestId);
    const teamId = parseInt(req.params.teamId);

    // Verify team exists and belongs to contest
    const team = await db('teams')
      .select('teams.*', 'contests.contest_name', 'contests.id as contest_id')
      .join('contests', 'teams.contest_code', 'contests.registration_code')
      .where('teams.id', teamId)
      .where('contests.id', contestId)
      .first();

    if (!team) {
      return res.notFound('Team not found in this contest');
    }

    // Get all submissions for this team in this contest, ordered by submission time
    const submissions = await db('submissions')
      .select(
        'submissions.*',
        'problems.title as problem_title',
        'problems.problem_letter',
        'problems.difficulty',
        'problems.max_points'
      )
      .join('problems', 'submissions.problem_id', 'problems.id')
      .where('submissions.team_id', teamId)
      .where('submissions.contest_id', contestId)
      .orderBy('submissions.submitted_at', 'desc');

    // Format submissions with all details including source code
    const formattedSubmissions = submissions.map(sub => ({
      id: sub.id,
      problem_id: sub.problem_id,
      problem_title: sub.problem_title,
      problem_letter: sub.problem_letter,
      problem_difficulty: sub.difficulty,
      problem_max_points: sub.max_points,
      language: sub.language,
      source_code: sub.source_code,
      status: sub.status,
      submitted_at: sub.submitted_at,
      judged_at: sub.judged_at,
      execution_time_ms: sub.execution_time_ms,
      memory_used_kb: sub.memory_used_kb,
      test_cases_passed: sub.test_cases_passed,
      total_test_cases: sub.total_test_cases,
      points_earned: sub.points_earned,
      error_message: sub.error_message,
      judge_output: sub.judge_output
    }));

    // Calculate team statistics
    const totalSubmissions = formattedSubmissions.length;
    const acceptedSubmissions = formattedSubmissions.filter(s => s.status === 'accepted' || s.status === 'AC').length;
    const uniqueProblemsAttempted = new Set(formattedSubmissions.map(s => s.problem_id)).size;
    const uniqueProblemsSolved = new Set(
      formattedSubmissions
        .filter(s => s.status === 'accepted' || s.status === 'AC')
        .map(s => s.problem_id)
    ).size;
    const totalPoints = formattedSubmissions.reduce((sum, s) => sum + (s.points_earned || 0), 0);

    // Parse member names from JSON
    let memberNames = [];
    try {
      memberNames = team.member_names ? JSON.parse(team.member_names) : [];
    } catch (e) {
      memberNames = [];
    }

    // Build members array with first and last names
    const members = [];
    if (team.member1_first_name || team.member1_last_name) {
      members.push({
        firstName: team.member1_first_name || '',
        lastName: team.member1_last_name || ''
      });
    }
    if (team.member2_first_name || team.member2_last_name) {
      members.push({
        firstName: team.member2_first_name || '',
        lastName: team.member2_last_name || ''
      });
    }
    if (team.member3_first_name || team.member3_last_name) {
      members.push({
        firstName: team.member3_first_name || '',
        lastName: team.member3_last_name || ''
      });
    }

    const response = {
      team: {
        id: team.id,
        team_name: team.team_name,
        school_name: team.school_name,
        contest_name: team.contest_name,
        contest_id: team.contest_id,
        registration_time: team.created_at,
        members: members,
        members_count: members.length
      },
      statistics: {
        total_submissions: totalSubmissions,
        accepted_submissions: acceptedSubmissions,
        unique_problems_attempted: uniqueProblemsAttempted,
        unique_problems_solved: uniqueProblemsSolved,
        total_points: totalPoints,
        acceptance_rate: totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0
      },
      submissions: formattedSubmissions
    };

    res.success(response, 'Team submissions retrieved successfully');
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
      query = query.where('submissions.status', status);
    }

    const submissions = await query;

    const formattedSubmissions = submissions.map(submission => ({
      id: submission.id,
      team_name: submission.team_name,
      problem_letter: submission.problem_letter,
      problem_title: submission.problem_title,
      language: submission.language,
      status: submission.status?.toLowerCase().replace('_', ' ') || 'pending',
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
      .where('status', 'PE')
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
      .select('status')
      .count('* as count')
      .whereNotNull('status')
      .groupBy('status')
      .orderBy('count', 'desc');

    const totalJudged = verdictDistribution.reduce((sum, verdict) => sum + parseInt(verdict.count), 0);

    const verdictStats = {};
    verdictDistribution.forEach(verdict => {
      const verdictName = verdict.status.toLowerCase().replace('_', ' ');
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
      db('submissions').where('status', 'PE').count('* as count').first(),
      db('submissions').where('status', 'RU').count('* as count').first()
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

// ============================================================================
// PROBLEM MANAGEMENT ROUTES
// ============================================================================

/**
 * Get all problems (admin overview)
 * @route GET /api/admin/problems
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with array of problems
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/problems', verifyAdminToken, async (req, res, next) => {
  try {
    const problems = await Problem.findAll();
    res.success(problems, 'Problems retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Create problem in contest
 * @route POST /api/admin/contests/:id/problems
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.body - Problem data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with created problem
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {ValidationError} 400 - Invalid input data
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {ConflictError} 409 - Problem letter already exists
 * @throws {InternalServerError} 500 - Server error
 */
router.post('/contests/:id/problems', verifyAdminToken, requireContestAccess, validate(problemCreateSchema), async (req, res, next) => {
  try {
    const contestId = req.params.id;
    const problem = await Problem.create(req.body, contestId, req.admin.id);

    // Get problem with statistics
    const problemWithStats = await Problem.findById(problem.id);
    const { db } = require('../utils/db');
    const testCasesCount = await db('test_cases').where('problem_id', problem.id).count('* as count').first();

    const response = {
      ...problemWithStats,
      statistics: {
        test_cases_count: parseInt(testCasesCount.count) || 0
      }
    };

    res.created(response, 'Problem created successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Get all problems for a contest
 * @route GET /api/admin/contests/:id/problems
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.query - Query parameters
 * @param {boolean} [req.query.statistics] - Include statistics
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with array of contest problems
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/contests/:id/problems', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const contestId = req.params.id;
    const includeStatistics = req.query.statistics === 'true';

    const problems = await Problem.findByContestId(contestId, includeStatistics);
    res.success(problems, 'Contest problems retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Get specific problem details
 * @route GET /api/admin/problems/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Problem ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with problem details
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Problem not found
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/problems/:id', verifyAdminToken, async (req, res, next) => {
  try {
    const problem = await Problem.findById(req.params.id);

    // Add statistics to the problem
    const [statistics, testCaseStats] = await Promise.all([
      Problem.getStatistics(req.params.id),
      // Get test case statistics
      (async () => {
        const { db } = require('../utils/db');
        const [totalCount, sampleCount] = await Promise.all([
          db('test_cases').where('problem_id', req.params.id).count('* as count').first(),
          db('test_cases').where('problem_id', req.params.id).where('is_sample', true).count('* as count').first()
        ]);

        return {
          total_test_cases: parseInt(totalCount.count) || 0,
          sample_test_cases: parseInt(sampleCount.count) || 0,
          hidden_test_cases: (parseInt(totalCount.count) || 0) - (parseInt(sampleCount.count) || 0)
        };
      })()
    ]);

    const response = {
      ...problem,
      statistics,
      test_case_statistics: testCaseStats
    };

    res.success(response, 'Problem retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Update problem
 * @route PUT /api/admin/problems/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Problem ID
 * @param {Object} req.body - Problem update data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with updated problem
 * @requires verifyAdminToken - Admin authentication required
 * @throws {ValidationError} 400 - Invalid input data
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Problem not found
 * @throws {ConflictError} 409 - Contest is running, cannot modify
 * @throws {InternalServerError} 500 - Server error
 */
router.put('/problems/:id', verifyAdminToken, validate(problemUpdateSchema), async (req, res, next) => {
  try {
    const updatedProblem = await Problem.update(req.params.id, req.body, req.admin.id);
    res.success(updatedProblem, 'Problem updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Delete problem from contest
 * @route DELETE /api/admin/problems/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Problem ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response confirming deletion
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated or not authorized
 * @throws {NotFoundError} 404 - Problem not found
 * @throws {ConflictError} 409 - Problem has submissions, cannot delete
 * @throws {InternalServerError} 500 - Server error
 */
router.delete('/problems/:id', verifyAdminToken, async (req, res, next) => {
  try {
    const result = await Problem.delete(req.params.id, req.admin.id);
    res.success(result, 'Problem deleted successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Copy problem to contest
 * @route POST /api/admin/contests/:id/problems/copy
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Contest ID
 * @param {Object} req.body - Request body
 * @param {string} req.body.problemId - Problem ID to copy
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with copied problem
 * @requires verifyAdminToken - Admin authentication required
 * @requires requireContestAccess - Contest access permission required
 * @throws {ValidationError} 400 - Invalid problem ID
 * @throws {UnauthorizedError} 401 - Not authenticated or no contest access
 * @throws {NotFoundError} 404 - Contest or problem not found
 * @throws {InternalServerError} 500 - Server error
 */
router.post('/contests/:id/problems/copy', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const contestId = req.params.id;
    const { problemId } = req.body;

    if (!problemId) {
      return res.badRequest('Problem ID is required');
    }

    // Get the original problem
    const originalProblem = await Problem.findById(problemId);

    // Create copy with new contest ID
    const problemData = {
      title: originalProblem.title,
      description: originalProblem.description,
      input_format: originalProblem.input_format,
      output_format: originalProblem.output_format,
      constraints: originalProblem.constraints,
      sample_input: originalProblem.sample_input,
      sample_output: originalProblem.sample_output,
      time_limit: originalProblem.time_limit,
      memory_limit: originalProblem.memory_limit,
      difficulty: originalProblem.difficulty,
      max_points: originalProblem.max_points
    };

    const copiedProblem = await Problem.create(problemData, contestId, req.admin.id);

    // Copy all test cases from the original problem using direct database insert
    // This bypasses validation and copies test cases exactly as they are
    const { db } = require('../utils/db');
    const originalTestCases = await db('test_cases')
      .where('problem_id', problemId)
      .select('*');

    if (originalTestCases && originalTestCases.length > 0) {
      const serializeJsonField = (value) => {
        if (value === null || value === undefined) {
          return null;
        }
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed.length === 0 ? null : trimmed;
        }
        try {
          return JSON.stringify(value);
        } catch (serializationError) {
          console.warn('Failed to serialize JSON field during problem copy:', serializationError);
          return null;
        }
      };

      const jsonColumns = ['input_parameters', 'expected_return', 'parameter_types'];

      const testCaseCopyPromises = originalTestCases.map(async (testCase) => {
        // Create a copy of the test case for the new problem
        const { id, problem_id, ...testCaseData } = testCase;
        const normalizedData = { ...testCaseData };

        jsonColumns.forEach(column => {
          if (Object.prototype.hasOwnProperty.call(normalizedData, column)) {
            normalizedData[column] = serializeJsonField(normalizedData[column]);
          }
        });

        return db('test_cases').insert({
          ...normalizedData,
          problem_id: copiedProblem.id,
          created_at: testCase.created_at || new Date()
        });
      });

      await Promise.all(testCaseCopyPromises);
    }

    // Get the copied problem with test case count
    const testCasesCount = await db('test_cases').where('problem_id', copiedProblem.id).count('* as count').first();

    const response = {
      ...copiedProblem,
      test_cases_count: parseInt(testCasesCount.count) || 0
    };

    res.created(response, `Problem copied successfully with ${response.test_cases_count} test cases`);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TEST CASE MANAGEMENT ROUTES
// ============================================================================

/**
 * Create test case for problem
 * @route POST /api/admin/problems/:id/testcases
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Problem ID
 * @param {Object} req.body - Test case data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with created test case
 * @requires verifyAdminToken - Admin authentication required
 * @throws {ValidationError} 400 - Invalid input data
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Problem not found
 * @throws {ConflictError} 409 - Contest is running, cannot modify
 * @throws {InternalServerError} 500 - Server error
 */
router.post('/problems/:id/testcases', verifyAdminToken, validate(testCaseCreateSchema), async (req, res, next) => {
  try {
    const problemId = req.params.id;
    const testCase = await TestCase.create(req.body, problemId, req.admin.id);
    res.created(testCase, 'Test case created successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Get all test cases for a problem
 * @route GET /api/admin/problems/:id/testcases
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Problem ID
 * @param {Object} req.query - Query parameters
 * @param {boolean} [req.query.sample_only] - Only return sample test cases
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with array of test cases
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Problem not found
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/problems/:id/testcases', verifyAdminToken, async (req, res, next) => {
  try {
    const problemId = req.params.id;
    const sampleOnly = req.query.sample_only === 'true';

    const testCases = await TestCase.findByProblemId(problemId, sampleOnly);
    res.success(testCases, 'Test cases retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Update test case
 * @route PUT /api/admin/testcases/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Test case ID
 * @param {Object} req.body - Test case update data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with updated test case
 * @requires verifyAdminToken - Admin authentication required
 * @throws {ValidationError} 400 - Invalid input data
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Test case not found
 * @throws {ConflictError} 409 - Contest is running, cannot modify
 * @throws {InternalServerError} 500 - Server error
 */
router.put('/testcases/:id', verifyAdminToken, validate(testCaseCreateSchema), async (req, res, next) => {
  try {
    const updatedTestCase = await TestCase.update(req.params.id, req.body, req.admin.id);
    res.success(updatedTestCase, 'Test case updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Delete test case
 * @route DELETE /api/admin/testcases/:id
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Test case ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response confirming deletion
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Test case not found
 * @throws {ConflictError} 409 - Contest is running, cannot modify
 * @throws {InternalServerError} 500 - Server error
 */
router.delete('/testcases/:id', verifyAdminToken, async (req, res, next) => {
  try {
    await TestCase.delete(req.params.id, req.admin.id);
    res.success({ deleted: true }, 'Test case deleted successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Create bulk test cases for problem
 * @route POST /api/admin/problems/:id/testcases/bulk
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Problem ID
 * @param {Object} req.body - Bulk test case data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with created test cases
 * @requires verifyAdminToken - Admin authentication required
 * @throws {ValidationError} 400 - Invalid input data
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Problem not found
 * @throws {ConflictError} 409 - Contest is running, cannot modify
 * @throws {InternalServerError} 500 - Server error
 */
router.post('/problems/:id/testcases/bulk', verifyAdminToken, validate(testCaseBulkCreateSchema), async (req, res, next) => {
  try {
    const problemId = req.params.id;
    const result = await TestCase.createBulk(req.body, problemId, req.admin.id);
    res.created(result, 'Bulk test cases created successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Get test case statistics for problem
 * @route GET /api/admin/problems/:id/testcases/statistics
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Problem ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with test case statistics
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Problem not found
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/problems/:id/testcases/statistics', verifyAdminToken, async (req, res, next) => {
  try {
    const { db } = require('../utils/db');
    const problemId = req.params.id;

    const [totalCount, sampleCount] = await Promise.all([
      db('test_cases').where('problem_id', problemId).count('* as count').first(),
      db('test_cases').where('problem_id', problemId).where('is_sample', true).count('* as count').first()
    ]);

    const statistics = {
      total_test_cases: parseInt(totalCount.count) || 0,
      sample_test_cases: parseInt(sampleCount.count) || 0,
      hidden_test_cases: (parseInt(totalCount.count) || 0) - (parseInt(sampleCount.count) || 0)
    };

    res.success(statistics, 'Test case statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * Validate test case format
 * @route POST /api/admin/testcases/:id/validate
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Test case ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with validation result
 * @requires verifyAdminToken - Admin authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Test case not found
 * @throws {InternalServerError} 500 - Server error
 */
router.post('/testcases/:id/validate', verifyAdminToken, async (req, res, next) => {
  try {
    const testCase = await TestCase.findById(req.params.id);

    // Basic validation checks
    const validation = {
      is_valid: true,
      errors: [],
      warnings: []
    };

    if (!testCase.input_parameters && !testCase.expected_return) {
      validation.warnings.push('Both input parameters and expected return are empty');
    }

    const inputParamsStr = typeof testCase.input_parameters === 'string' ?
      testCase.input_parameters : JSON.stringify(testCase.input_parameters || {});
    const expectedReturnStr = typeof testCase.expected_return === 'string' ?
      testCase.expected_return : JSON.stringify(testCase.expected_return || '');

    if (inputParamsStr.length > 10000) {
      validation.errors.push('Input parameters exceed maximum length of 10000 characters');
      validation.is_valid = false;
    }

    if (expectedReturnStr.length > 10000) {
      validation.errors.push('Expected return exceeds maximum length of 10000 characters');
      validation.is_valid = false;
    }

    res.success(validation, 'Test case validation completed');
  } catch (error) {
    next(error);
  }
});

module.exports = router;

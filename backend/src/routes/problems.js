/**
 * Problem Routes - Phase 2.2
 * Handles problem and test case management endpoints
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const Problem = require('../controllers/problemController');
const TestCase = require('../controllers/testCaseController');
const { verifyAdminToken, requireContestAccess } = require('../middleware/adminAuth');
const { validate } = require('../utils/validation');
const Joi = require('joi');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Problem validation schemas
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
    .trim()
    .min(10)
    .max(10000)
    .required()
    .messages({
      'string.min': 'Problem description must be at least 10 characters long',
      'string.max': 'Problem description must not exceed 10000 characters',
      'any.required': 'Problem description is required'
    }),

  input_format: Joi.string()
    .trim()
    .min(5)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Input format must be at least 5 characters long',
      'string.max': 'Input format must not exceed 2000 characters',
      'any.required': 'Input format is required'
    }),

  output_format: Joi.string()
    .trim()
    .min(5)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Output format must be at least 5 characters long',
      'string.max': 'Output format must not exceed 2000 characters',
      'any.required': 'Output format is required'
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

  constraints: Joi.string()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Constraints must not exceed 2000 characters'
    }),

  time_limit: Joi.number()
    .integer()
    .min(100)
    .max(30000)
    .default(2000)
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
      'any.only': 'Difficulty must be easy, medium, or hard'
    }),

  problem_letter: Joi.string()
    .length(1)
    .pattern(/^[A-Z]$/)
    .messages({
      'string.length': 'Problem letter must be exactly 1 character',
      'string.pattern.base': 'Problem letter must be a single uppercase letter'
    })
});

const problemUpdateSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .messages({
      'string.min': 'Problem title must be at least 3 characters long',
      'string.max': 'Problem title must not exceed 255 characters'
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(10000)
    .messages({
      'string.min': 'Problem description must be at least 10 characters long',
      'string.max': 'Problem description must not exceed 10000 characters'
    }),

  input_format: Joi.string()
    .trim()
    .min(5)
    .max(2000)
    .messages({
      'string.min': 'Input format must be at least 5 characters long',
      'string.max': 'Input format must not exceed 2000 characters'
    }),

  output_format: Joi.string()
    .trim()
    .min(5)
    .max(2000)
    .messages({
      'string.min': 'Output format must be at least 5 characters long',
      'string.max': 'Output format must not exceed 2000 characters'
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

  constraints: Joi.string()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Constraints must not exceed 2000 characters'
    }),

  time_limit: Joi.number()
    .integer()
    .min(100)
    .max(30000)
    .messages({
      'number.min': 'Time limit must be at least 100ms',
      'number.max': 'Time limit must not exceed 30000ms'
    }),

  memory_limit: Joi.number()
    .integer()
    .min(16)
    .max(2048)
    .messages({
      'number.min': 'Memory limit must be at least 16MB',
      'number.max': 'Memory limit must not exceed 2048MB'
    }),

  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard')
    .messages({
      'any.only': 'Difficulty must be easy, medium, or hard'
    }),

  problem_letter: Joi.string()
    .length(1)
    .pattern(/^[A-Z]$/)
    .messages({
      'string.length': 'Problem letter must be exactly 1 character',
      'string.pattern.base': 'Problem letter must be a single uppercase letter'
    })
});

const testCaseCreateSchema = Joi.object({
  input: Joi.string()
    .max(10000)
    .required()
    .messages({
      'string.max': 'Input must not exceed 10000 characters',
      'any.required': 'Input is required'
    }),

  expected_output: Joi.string()
    .max(10000)
    .required()
    .messages({
      'string.max': 'Expected output must not exceed 10000 characters',
      'any.required': 'Expected output is required'
    }),

  is_sample: Joi.boolean()
    .default(false)
});

const testCaseUpdateSchema = Joi.object({
  input: Joi.string()
    .max(10000)
    .messages({
      'string.max': 'Input must not exceed 10000 characters'
    }),

  expected_output: Joi.string()
    .max(10000)
    .messages({
      'string.max': 'Expected output must not exceed 10000 characters'
    }),

  is_sample: Joi.boolean()
});

// =============================================================================
// PROBLEM MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /api/admin/problems
 * Get all problems created by the authenticated admin
 */
router.get('/problems', verifyAdminToken, async (req, res, next) => {
  try {
    const problems = await Problem.findByAdminId(req.admin.id);
    
    res.success(problems, 'Admin problems retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/contests/:contestId/problems
 * Get all problems for a contest
 */
router.get('/contests/:contestId/problems', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const includeStatistics = req.query.statistics === 'true';
    const problems = await Problem.findByContestId(req.params.contestId, includeStatistics);
    
    res.success(problems, 'Problems retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/contests/:contestId/problems
 * Create a new problem
 */
router.post('/contests/:contestId/problems', verifyAdminToken, requireContestAccess, validate(problemCreateSchema), async (req, res, next) => {
  try {
    const problem = await Problem.create(req.body, req.params.contestId, req.admin.id);
    const statistics = await Problem.getStatistics(problem.id);
    
    res.created({
      ...problem,
      statistics
    }, 'Problem created successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/contests/:contestId/problems/copy
 * Copy an existing problem to this contest
 */
router.post('/contests/:contestId/problems/copy', verifyAdminToken, requireContestAccess, async (req, res, next) => {
  try {
    const { problemId } = req.body;
    
    if (!problemId) {
      return res.validationError(['Problem ID is required']);
    }

    const copiedProblem = await Problem.copyToContest(problemId, req.params.contestId, req.admin.id);
    const statistics = await Problem.getStatistics(copiedProblem.id);
    
    res.created({
      ...copiedProblem,
      statistics
    }, 'Problem copied to contest successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/problems/:id
 * Get problem details
 */
router.get('/problems/:id', verifyAdminToken, async (req, res, next) => {
  try {
    const problem = await Problem.findById(req.params.id);
    
    // Check admin access to this problem's contest
    const Contest = require('../controllers/contestController');
    const contest = await Contest.findById(problem.contest_id);
    if (contest.created_by !== req.admin.id && req.admin.role !== 'super_admin') {
      return res.forbidden('Access denied to this problem');
    }

    const statistics = await Problem.getStatistics(problem.id);
    const testCaseStats = await TestCase.getStatistics(problem.id);
    
    res.success({
      ...problem,
      statistics,
      test_case_statistics: testCaseStats
    }, 'Problem details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/problems/:id
 * Update problem
 */
router.put('/problems/:id', verifyAdminToken, validate(problemUpdateSchema), async (req, res, next) => {
  try {
    const updatedProblem = await Problem.update(req.params.id, req.body, req.admin.id);
    const statistics = await Problem.getStatistics(updatedProblem.id);
    
    res.success({
      ...updatedProblem,
      statistics
    }, 'Problem updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/problems/:id
 * Delete problem
 */
router.delete('/problems/:id', verifyAdminToken, async (req, res, next) => {
  try {
    const result = await Problem.delete(req.params.id, req.admin.id);
    res.success(result, 'Problem deleted successfully');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// TEST CASE MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /api/admin/problems/:problemId/testcases
 * Get all test cases for a problem
 */
router.get('/problems/:problemId/testcases', verifyAdminToken, async (req, res, next) => {
  try {
    const includeSampleOnly = req.query.sample_only === 'true';
    const testCases = await TestCase.findByProblemId(req.params.problemId, includeSampleOnly);
    
    res.success(testCases, 'Test cases retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/problems/:problemId/testcases
 * Create a new test case
 */
router.post('/problems/:problemId/testcases', verifyAdminToken, validate(testCaseCreateSchema), async (req, res, next) => {
  try {
    const testCase = await TestCase.create(req.body, req.params.problemId, req.admin.id);
    
    res.created(testCase, 'Test case created successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/problems/:problemId/testcases/bulk
 * Create multiple test cases from array, CSV text, or CSV file upload
 */
router.post('/problems/:problemId/testcases/bulk', verifyAdminToken, upload.single('csv_file'), async (req, res, next) => {
  try {
    let testCasesData;

    if (req.file) {
      // Handle CSV file upload
      const csvContent = req.file.buffer.toString('utf8');
      testCasesData = TestCase.parseCSVData(csvContent);
    } else if (req.body.csv_data) {
      // Parse CSV data from text field
      testCasesData = TestCase.parseCSVData(req.body.csv_data);
    } else if (req.body.test_cases && Array.isArray(req.body.test_cases)) {
      // Use provided array
      testCasesData = req.body.test_cases;
    } else {
      return res.validationError(['Either csv_file upload, csv_data text, or test_cases array is required']);
    }

    const result = await TestCase.createBulk(testCasesData, req.params.problemId, req.admin.id);
    
    res.created(result, 'Test cases created successfully');
  } catch (error) {
    // Handle multer errors specifically
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.validationError(['File size too large. Maximum allowed size is 5MB']);
    }
    if (error.message === 'Only CSV files are allowed') {
      return res.validationError(['Only CSV files are allowed']);
    }
    next(error);
  }
});

/**
 * GET /api/admin/testcases/:id
 * Get test case details
 */
router.get('/testcases/:id', verifyAdminToken, async (req, res, next) => {
  try {
    const testCase = await TestCase.findById(req.params.id);
    
    // Check admin access
    await TestCase.checkAdminAccess(testCase.problem_id, req.admin.id);
    
    res.success(testCase, 'Test case details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/testcases/:id
 * Update test case
 */
router.put('/testcases/:id', verifyAdminToken, validate(testCaseUpdateSchema), async (req, res, next) => {
  try {
    const updatedTestCase = await TestCase.update(req.params.id, req.body, req.admin.id);
    
    res.success(updatedTestCase, 'Test case updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/testcases/:id
 * Delete test case
 */
router.delete('/testcases/:id', verifyAdminToken, async (req, res, next) => {
  try {
    const result = await TestCase.delete(req.params.id, req.admin.id);
    res.success(result, 'Test case deleted successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/problems/:problemId/testcases/statistics
 * Get test case statistics for a problem
 */
router.get('/problems/:problemId/testcases/statistics', verifyAdminToken, async (req, res, next) => {
  try {
    const statistics = await TestCase.getStatistics(req.params.problemId);
    
    res.success(statistics, 'Test case statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/testcases/:id/validate
 * Validate test case format and provide suggestions
 */
router.post('/testcases/:id/validate', verifyAdminToken, async (req, res, next) => {
  try {
    const testCase = await TestCase.findById(req.params.id);
    
    // Check admin access
    await TestCase.checkAdminAccess(testCase.problem_id, req.admin.id);
    
    const validation = TestCase.validateTestCaseFormat(
      testCase.input, 
      testCase.expected_output,
      req.body.constraints || {}
    );
    
    res.success(validation, 'Test case validation completed');
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// PUBLIC PROBLEM ROUTES (FOR CONTESTANTS)
// =============================================================================

/**
 * GET /api/problems/:id/public
 * Get problem details for contestants (includes sample test cases only)
 */
router.get('/problems/:id/public', async (req, res, next) => {
  try {
    const problem = await Problem.findById(req.params.id);
    
    // Get only sample test cases (visible to contestants)
    const sampleTestCases = await TestCase.findByProblemId(req.params.id, true);
    
    // Return problem with sample test cases
    res.success({
      id: problem.id,
      contest_id: problem.contest_id,
      problem_letter: problem.problem_letter,
      title: problem.title,
      description: problem.description,
      input_format: problem.input_format,
      output_format: problem.output_format,
      constraints: problem.constraints,
      time_limit: problem.time_limit,
      memory_limit: problem.memory_limit,
      difficulty: problem.difficulty,
      sample_test_cases: sampleTestCases.map(tc => ({
        input: tc.input,
        expected_output: tc.expected_output
      }))
    }, 'Problem details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contests/:contestId/problems/public
 * Get all problems for a contest (public view for contestants)
 * Supports both contest ID and contest slug/registration code
 */
router.get('/contests/:contestId/problems/public', async (req, res, next) => {
  try {
    let contestId = req.params.contestId;
    
    // If not a number, try to find contest by slug or registration code
    if (isNaN(parseInt(contestId))) {
      const Contest = require('../controllers/contestController');
      let contest;
      
      try {
        // First try to find by slug (generated from name)
        contest = await Contest.findBySlug(contestId);
      } catch (error) {
        try {
          // If not found by slug, try registration code
          contest = await Contest.findByRegistrationCode(contestId);
        } catch (secondError) {
          return res.notFound('Contest not found');
        }
      }
      
      contestId = contest.id;
    }
    
    const problems = await Problem.findByContestId(contestId);
    
    // For each problem, get only sample test cases
    const problemsWithSamples = await Promise.all(
      problems.map(async (problem) => {
        const sampleTestCases = await TestCase.findByProblemId(problem.id, true);
        
        return {
          id: problem.id,
          contest_id: problem.contest_id,
          problem_letter: problem.problem_letter,
          title: problem.title,
          description: problem.description,
          input_format: problem.input_format,
          output_format: problem.output_format,
          constraints: problem.constraints,
          time_limit: problem.time_limit,
          memory_limit: problem.memory_limit,
          difficulty: problem.difficulty,
          sample_test_cases: sampleTestCases.map(tc => ({
            input: tc.input,
            expected_output: tc.expected_output
          }))
        };
      })
    );
    
    res.success(problemsWithSamples, 'Contest problems retrieved successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
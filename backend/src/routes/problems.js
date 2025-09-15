/**
 * @module ProblemRoutes
 * @description Problem API Routes for Code Template and Function Signature Management
 * 
 * This module provides comprehensive problem code management functionality:
 * - Function signature retrieval for multiple programming languages
 * - User code implementation storage and retrieval
 * - Code testing and validation with sample inputs
 * - Administrative template and signature management
 * - Multi-language support (C++, Java, Python)
 * - Code auto-saving and persistence
 * - Integration with code execution and testing services
 * 
 * Supports both team-facing endpoints for code development and administrative
 * endpoints for problem template management and submission monitoring.
 */

const express = require('express');
const router = express.Router();
const codeTemplateService = require('../services/codeTemplateService');
const { db } = require('../utils/db');
const { authenticateTeam } = require('../middleware/auth');
const { verifyAdminToken, requireAdmin } = require('../middleware/adminAuth');
const { handleResponse, handleError } = require('../utils/response');


/**
 * @route GET /api/problems/problems/:problemId/signature/:language
 * @description Get function signature for a problem in a specific programming language
 * 
 * Retrieves the function signature template that teams use as a starting point
 * for their solution. The signature includes function declaration, parameter types,
 * return type, and basic structure specific to the programming language.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.problemId - Problem ID to get signature for
 * @param {string} req.params.language - Programming language (cpp|java|python)
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with function signature
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Function signature data
 * @returns {string} returns.data.language - Programming language
 * @returns {string} returns.data.signature - Function signature template
 * @returns {string} returns.data.message - Success message
 * 
 * @throws {400} Invalid language parameter (not cpp, java, or python)
 * @throws {500} Code template service errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * @example
 * GET /api/problems/problems/123/signature/python
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "language": "python",
 *     "signature": "def solve(n, arr):\n    # Your solution here\n    pass",
 *     "message": "Function signature retrieved successfully"
 *   }
 * }
 */
router.get('/problems/:problemId/signature/:language', authenticateTeam, async (req, res) => {
  try {
    const { problemId, language } = req.params;
    
    // Validate language
    if (!['cpp', 'java', 'python'].includes(language)) {
      return handleError(res, 'Invalid language', 400);
    }
    
    // Get function signature
    const signature = await codeTemplateService.getFunctionSignature(problemId, language);
    
    handleResponse(res, {
      language,
      signature,
      message: 'Function signature retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error getting function signature:', error);
    handleError(res, 'Failed to get function signature');
  }
});

/**
 * @route GET /api/problems/problems/:problemId/code/:language
 * @description Get team's saved code implementation for a problem
 * 
 * Retrieves the team's previously saved code implementation for a specific
 * problem and language. If no implementation exists, returns the default
 * function signature template.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.problemId - Problem ID to get code for
 * @param {string} req.params.language - Programming language (cpp|java|python)
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with saved code
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Saved code data
 * @returns {number} returns.data.problemId - Problem identifier
 * @returns {number} returns.data.teamId - Team identifier
 * @returns {string} returns.data.language - Programming language
 * @returns {string} returns.data.code - Saved code implementation or template
 * @returns {string} returns.data.message - Success message
 * 
 * @throws {400} Invalid language parameter
 * @throws {500} Code template service errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * @example
 * GET /api/problems/problems/123/code/java
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "problemId": 123,
 *     "teamId": 456,
 *     "language": "java",
 *     "code": "public int solve(int n, int[] arr) {\n    // Your solution\n    return 0;\n}",
 *     "message": "User code retrieved successfully"
 *   }
 * }
 */
router.get('/problems/:problemId/code/:language', authenticateTeam, async (req, res) => {
  try {
    const { problemId, language } = req.params;
    const teamId = req.team.id;
    
    // Validate language
    if (!['cpp', 'java', 'python'].includes(language)) {
      return handleError(res, 'Invalid language', 400);
    }
    
    // Get user's implementation or default
    const code = await codeTemplateService.getUserImplementation(teamId, problemId, language);
    
    handleResponse(res, {
      problemId: parseInt(problemId),
      teamId,
      language,
      code,
      message: 'User code retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error getting user code:', error);
    handleError(res, 'Failed to get user code');
  }
});

/**
 * @route POST /api/problems/problems/:problemId/code/:language
 * @description Save team's code implementation for a problem
 * 
 * Stores the team's code implementation for a specific problem and language.
 * Includes validation for code length and content. Code is persisted for
 * later retrieval and submission.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.problemId - Problem ID to save code for
 * @param {string} req.params.language - Programming language (cpp|java|python)
 * @param {Object} req.body - Request body
 * @param {string} req.body.code - Code implementation to save
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with save confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Save operation data
 * @returns {number} returns.data.problemId - Problem identifier
 * @returns {number} returns.data.teamId - Team identifier
 * @returns {string} returns.data.language - Programming language
 * @returns {string} returns.data.message - Success message
 * 
 * @throws {400} Invalid language parameter or empty/oversized code
 * @throws {500} Code template service errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * Code Validation:
 * - Code cannot be empty or only whitespace
 * - Maximum code size: 50KB (50,000 characters)
 * - Must be valid string content
 * 
 * @example
 * POST /api/problems/problems/123/code/cpp
 * Authorization: Bearer <team-jwt-token>
 * Content-Type: application/json
 * 
 * {
 *   "code": "#include <iostream>\nint solve(int n, vector<int>& arr) {\n    return arr[0];\n}"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "problemId": 123,
 *     "teamId": 456,
 *     "language": "cpp",
 *     "message": "Code saved successfully"
 *   }
 * }
 */
router.post('/problems/:problemId/code/:language', authenticateTeam, async (req, res) => {
  try {
    const { problemId, language } = req.params;
    const { code } = req.body;
    const teamId = req.team.id;
    
    // Validate language
    if (!['cpp', 'java', 'python'].includes(language)) {
      return handleError(res, 'Invalid language', 400);
    }
    
    // Validate code
    if (!code || code.trim().length === 0) {
      return handleError(res, 'Code cannot be empty', 400);
    }
    
    if (code.length > 50000) { // 50KB limit
      return handleError(res, 'Code too large (max 50KB)', 400);
    }
    
    // Save user's implementation
    await codeTemplateService.saveUserImplementation(teamId, problemId, language, code);
    
    handleResponse(res, {
      problemId: parseInt(problemId),
      teamId,
      language,
      message: 'Code saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving user code:', error);
    handleError(res, 'Failed to save code');
  }
});

/**
 * @route POST /api/problems/problems/:problemId/test/:language
 * @description Test team's code implementation with sample input
 * 
 * Executes the team's code implementation with provided input and returns
 * the execution results. Includes compilation, execution, and output capture.
 * Automatically saves code if execution is successful.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.problemId - Problem ID to test code for
 * @param {string} req.params.language - Programming language (cpp|java|python)
 * @param {Object} req.body - Request body
 * @param {string} req.body.code - Code implementation to test
 * @param {string} [req.body.input=''] - Input data for testing
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with execution results
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Test execution data
 * @returns {number} returns.data.problemId - Problem identifier
 * @returns {string} returns.data.language - Programming language
 * @returns {Object} returns.data.execution - Execution results
 * @returns {boolean} returns.data.execution.success - Execution success status
 * @returns {string} returns.data.execution.output - Program output
 * @returns {string} [returns.data.execution.error] - Error message if failed
 * @returns {number} returns.data.execution.executionTime - Execution time (ms)
 * @returns {number} returns.data.execution.memoryUsed - Memory used (MB)
 * @returns {string} returns.data.message - Success message
 * 
 * @throws {400} Invalid language parameter or empty code
 * @throws {500} Code execution service errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * Execution Limits:
 * - Time limit: 5 seconds
 * - Memory limit: 256 MB
 * - Auto-save on successful execution
 * 
 * @example
 * POST /api/problems/problems/123/test/python
 * Authorization: Bearer <team-jwt-token>
 * Content-Type: application/json
 * 
 * {
 *   "code": "def solve(n, arr):\n    return sum(arr)",
 *   "input": "3\n1 2 3"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "problemId": 123,
 *     "language": "python",
 *     "execution": {
 *       "success": true,
 *       "output": "6",
 *       "executionTime": 150,
 *       "memoryUsed": 12.5
 *     },
 *     "message": "Code tested successfully"
 *   }
 * }
 */
router.post('/problems/:problemId/test/:language', authenticateTeam, async (req, res) => {
  try {
    const { problemId, language } = req.params;
    const { code, input } = req.body;
    const teamId = req.team.id;
    
    // Validate language
    if (!['cpp', 'java', 'python'].includes(language)) {
      return handleError(res, 'Invalid language', 400);
    }
    
    // Validate code
    if (!code || code.trim().length === 0) {
      return handleError(res, 'Code cannot be empty', 400);
    }
    
    // Execute code
    const multiLangExecutor = require('../services/multiLangExecutor');
    
    const result = await multiLangExecutor.executeLeetCodeStyle(
      problemId,
      code,
      language,
      input || '',
      {
        timeLimit: 5000, // 5 seconds
        memoryLimit: 256 // 256 MB
      }
    );
    
    // Save code if execution was successful (auto-save on test)
    if (result.success) {
      await codeTemplateService.saveUserImplementation(teamId, problemId, language, code);
    }
    
    handleResponse(res, {
      problemId: parseInt(problemId),
      language,
      execution: {
        success: result.success,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed
      },
      message: 'Code tested successfully'
    });
    
  } catch (error) {
    console.error('Error testing code:', error);
    handleError(res, 'Failed to test code');
  }
});


/**
 * @route GET /api/problems/admin/problems/:problemId/templates
 * @description Get all function signatures and templates for a problem (admin only)
 * 
 * Retrieves comprehensive template data for a problem including function signatures,
 * I/O wrappers, default solutions, and input/output format specifications for
 * all supported programming languages.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.problemId - Problem ID to get templates for
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with complete template data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Template data
 * @returns {Object} returns.data.signatures - Function signatures by language
 * @returns {string} returns.data.signatures.cpp - C++ function signature
 * @returns {string} returns.data.signatures.java - Java function signature
 * @returns {string} returns.data.signatures.python - Python function signature
 * @returns {Object} returns.data.wrappers - I/O wrappers by language (hidden from teams)
 * @returns {string} returns.data.wrappers.cpp - C++ I/O wrapper code
 * @returns {string} returns.data.wrappers.java - Java I/O wrapper code
 * @returns {string} returns.data.wrappers.python - Python I/O wrapper code
 * @returns {Object} returns.data.defaults - Default solution templates
 * @returns {string} returns.data.defaults.cpp - C++ default solution
 * @returns {string} returns.data.defaults.java - Java default solution
 * @returns {string} returns.data.defaults.python - Python default solution
 * @returns {Object} returns.data.formats - Input/output format descriptions
 * @returns {string} returns.data.formats.input - Input format specification
 * @returns {string} returns.data.formats.output - Output format specification
 * @returns {string} returns.data.message - Success message
 * 
 * @throws {404} Problem not found
 * @throws {500} Database query errors
 * 
 * @requires Admin authentication via verifyAdminToken and requireAdmin middleware
 * 
 * @example
 * GET /api/problems/admin/problems/123/templates
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "signatures": {
 *       "cpp": "int solve(int n, vector<int>& arr) {",
 *       "java": "public int solve(int n, int[] arr) {",
 *       "python": "def solve(n, arr):"
 *     },
 *     "wrappers": {
 *       "cpp": "#include <iostream>\n// I/O handling code",
 *       "java": "import java.util.*;\n// I/O handling code",
 *       "python": "# I/O handling code"
 *     },
 *     "formats": {
 *       "input": "First line: n\nSecond line: n integers",
 *       "output": "Single integer result"
 *     }
 *   }
 * }
 */
router.get('/admin/problems/:problemId/templates', verifyAdminToken, requireAdmin, async (req, res) => {
  try {
    const { problemId } = req.params;
    
    // Get problem with all template data
    const problem = await db('problems')
      .where('id', problemId)
      .first(
        'function_signature_cpp',
        'function_signature_java', 
        'function_signature_python',
        'io_wrapper_cpp',
        'io_wrapper_java',
        'io_wrapper_python',
        'input_format',
        'output_format',
        'default_solution_cpp',
        'default_solution_java',
        'default_solution_python'
      );
      
    if (!problem) {
      return handleError(res, 'Problem not found', 404);
    }
    
    handleResponse(res, {
      signatures: {
        cpp: problem.function_signature_cpp,
        java: problem.function_signature_java,
        python: problem.function_signature_python
      },
      wrappers: {
        cpp: problem.io_wrapper_cpp,
        java: problem.io_wrapper_java,
        python: problem.io_wrapper_python
      },
      defaults: {
        cpp: problem.default_solution_cpp,
        java: problem.default_solution_java,
        python: problem.default_solution_python
      },
      formats: {
        input: problem.input_format,
        output: problem.output_format
      },
      message: 'Templates retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error getting templates:', error);
    handleError(res, 'Failed to get templates');
  }
});

/**
 * @route PUT /api/problems/admin/problems/:problemId/templates
 * @description Update function signatures and templates for a problem (admin only)
 * 
 * Updates the complete template configuration for a problem including function
 * signatures, I/O wrappers, default solutions, and format specifications.
 * Supports partial updates - only provided fields will be updated.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.problemId - Problem ID to update templates for
 * @param {Object} req.body - Request body with template updates
 * @param {Object} req.body.signatures - Function signatures to update
 * @param {string} [req.body.signatures.cpp] - C++ function signature
 * @param {string} [req.body.signatures.java] - Java function signature
 * @param {string} [req.body.signatures.python] - Python function signature
 * @param {Object} req.body.wrappers - I/O wrappers to update
 * @param {string} [req.body.wrappers.cpp] - C++ I/O wrapper code
 * @param {string} [req.body.wrappers.java] - Java I/O wrapper code
 * @param {string} [req.body.wrappers.python] - Python I/O wrapper code
 * @param {Object} [req.body.defaults] - Default solution templates
 * @param {string} [req.body.defaults.cpp] - C++ default solution
 * @param {string} [req.body.defaults.java] - Java default solution
 * @param {string} [req.body.defaults.python] - Python default solution
 * @param {Object} [req.body.formats] - Input/output format specifications
 * @param {string} [req.body.formats.input] - Input format description
 * @param {string} [req.body.formats.output] - Output format description
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with update confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Update operation data
 * @returns {number} returns.data.problemId - Problem identifier
 * @returns {Array} returns.data.updated - List of fields that were updated
 * @returns {string} returns.data.message - Success message
 * 
 * @throws {400} Missing required signatures or wrappers
 * @throws {404} Problem not found
 * @throws {500} Database update errors
 * 
 * @requires Admin authentication via verifyAdminToken and requireAdmin middleware
 * 
 * @example
 * PUT /api/problems/admin/problems/123/templates
 * Authorization: Bearer <admin-jwt-token>
 * Content-Type: application/json
 * 
 * {
 *   "signatures": {
 *     "python": "def solve(n, arr):\n    # Updated signature"
 *   },
 *   "wrappers": {
 *     "python": "# Updated I/O wrapper"
 *   },
 *   "formats": {
 *     "input": "Updated input format"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "problemId": 123,
 *     "updated": ["function_signature_python", "io_wrapper_python", "input_format"],
 *     "message": "Templates updated successfully"
 *   }
 * }
 */
router.put('/admin/problems/:problemId/templates', verifyAdminToken, requireAdmin, async (req, res) => {
  try {
    const { problemId } = req.params;
    const { signatures, wrappers, defaults, formats } = req.body;
    
    // Validate required fields
    if (!signatures || !wrappers) {
      return handleError(res, 'Signatures and wrappers are required', 400);
    }
    
    // Build update object
    const updateData = {};
    
    // Function signatures (what users see)
    if (signatures.cpp) updateData.function_signature_cpp = signatures.cpp;
    if (signatures.java) updateData.function_signature_java = signatures.java;
    if (signatures.python) updateData.function_signature_python = signatures.python;
    
    // I/O wrappers (hidden from users)
    if (wrappers.cpp) updateData.io_wrapper_cpp = wrappers.cpp;
    if (wrappers.java) updateData.io_wrapper_java = wrappers.java;
    if (wrappers.python) updateData.io_wrapper_python = wrappers.python;
    
    // Default implementations
    if (defaults?.cpp) updateData.default_solution_cpp = defaults.cpp;
    if (defaults?.java) updateData.default_solution_java = defaults.java;  
    if (defaults?.python) updateData.default_solution_python = defaults.python;
    
    // Input/output formats
    if (formats?.input) updateData.input_format = formats.input;
    if (formats?.output) updateData.output_format = formats.output;
    
    // Update problem
    const updated = await db('problems')
      .where('id', problemId)
      .update(updateData);
      
    if (!updated) {
      return handleError(res, 'Problem not found', 404);
    }
    
    handleResponse(res, {
      problemId: parseInt(problemId),
      updated: Object.keys(updateData),
      message: 'Templates updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating templates:', error);
    handleError(res, 'Failed to update templates');
  }
});

/**
 * @route GET /api/problems/admin/problems/:problemId/submissions
 * @description Get all team code implementations for a problem (admin only)
 * 
 * Retrieves all saved code implementations from teams for a specific problem
 * across all supported programming languages. Includes team information,
 * save timestamps, and complete code content.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.problemId - Problem ID to get submissions for
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with team submissions
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Submissions data
 * @returns {number} returns.data.problemId - Problem identifier
 * @returns {Array} returns.data.submissions - Team code implementations
 * @returns {number} returns.data.submissions[].id - Implementation record ID
 * @returns {number} returns.data.submissions[].team_id - Team identifier
 * @returns {string} returns.data.submissions[].team_name - Team name
 * @returns {string} returns.data.submissions[].language - Programming language
 * @returns {string} returns.data.submissions[].code - Complete code implementation
 * @returns {string} returns.data.submissions[].saved_at - Last save timestamp
 * @returns {string} returns.data.submissions[].created_at - First save timestamp
 * @returns {number} returns.data.count - Total number of submissions
 * @returns {string} returns.data.message - Success message
 * 
 * @throws {500} Database query errors
 * 
 * @requires Admin authentication via verifyAdminToken and requireAdmin middleware
 * 
 * @example
 * GET /api/problems/admin/problems/123/submissions
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "problemId": 123,
 *     "submissions": [
 *       {
 *         "id": 1,
 *         "team_id": 456,
 *         "team_name": "CodeMasters",
 *         "language": "python",
 *         "code": "def solve(n, arr):\n    return sum(arr)",
 *         "saved_at": "2025-01-15T10:30:00.000Z",
 *         "created_at": "2025-01-15T09:00:00.000Z"
 *       }
 *     ],
 *     "count": 1,
 *     "message": "Submissions retrieved successfully"
 *   }
 * }
 */
router.get('/admin/problems/:problemId/submissions', verifyAdminToken, requireAdmin, async (req, res) => {
  try {
    const { problemId } = req.params;
    
    // Get all saved implementations for this problem
    const submissions = await db('team_problem_code as tpc')
      .join('teams as t', 't.id', 'tpc.team_id')
      .where('tpc.problem_id', problemId)
      .select(
        'tpc.id',
        'tpc.team_id',
        't.team_name',
        'tpc.language',
        'tpc.code',
        'tpc.saved_at',
        'tpc.created_at'
      )
      .orderBy('tpc.saved_at', 'desc');
    
    handleResponse(res, {
      problemId: parseInt(problemId),
      submissions,
      count: submissions.length,
      message: 'Submissions retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error getting submissions:', error);
    handleError(res, 'Failed to get submissions');
  }
});

module.exports = router;
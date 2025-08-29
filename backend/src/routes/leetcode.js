/**
 * LeetCode-style API Routes
 * Handles function signatures, templates, and user code management
 */

const express = require('express');
const router = express.Router();
const codeTemplateService = require('../services/codeTemplateService');
const { db } = require('../utils/db');
const { authenticateTeam } = require('../middleware/auth');
const { verifyAdminToken, requireAdmin } = require('../middleware/adminAuth');
const { handleResponse, handleError } = require('../utils/response');

// ===================================================================
// USER ENDPOINTS (Team access)
// ===================================================================

/**
 * GET /api/leetcode/problems/:problemId/signature/:language
 * Get function signature for a problem in a specific language
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
 * GET /api/leetcode/problems/:problemId/code/:language
 * Get user's saved code implementation for a problem
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
 * POST /api/leetcode/problems/:problemId/code/:language
 * Save user's code implementation for a problem
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
 * POST /api/leetcode/problems/:problemId/test/:language
 * Test user's code implementation with sample input
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
    
    // Execute LeetCode-style code
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

// ===================================================================
// ADMIN ENDPOINTS
// ===================================================================

/**
 * GET /api/leetcode/admin/problems/:problemId/templates
 * Get all function signatures and wrappers for a problem (admin only)
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
 * PUT /api/leetcode/admin/problems/:problemId/templates
 * Update function signatures and wrappers for a problem (admin only)
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
 * GET /api/leetcode/admin/problems/:problemId/submissions
 * Get all team submissions for a LeetCode-style problem (admin only)
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
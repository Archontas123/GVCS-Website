/**
 * @module TestRoutes
 * @description Test API routes for development and debugging
 *
 * This module provides testing endpoints that bypass authentication
 * and contest timing restrictions for development purposes.
 * Should only be enabled in development environments.
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { testConnection, db } = require('../utils/db');
const judgeQueueService = require('../services/judgeQueue');

/**
 * @description Joi schema for test submission validation
 */
const testSubmissionSchema = Joi.object({
    problemId: Joi.number().integer().positive().required(),
    language: Joi.string().valid('cpp', 'java', 'python').required(),
    code: Joi.string().min(1).max(50000).required()
});

/**
 * @route POST /api/test/submit
 * @description Submit code for testing without authentication
 *
 * This endpoint allows submitting code to any problem without authentication
 * or contest timing restrictions. Designed for development testing.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body with submission data
 * @param {number} req.body.problemId - Problem ID to submit solution for
 * @param {string} req.body.language - Programming language (cpp|java|python)
 * @param {string} req.body.code - Source code implementation (max 50KB)
 * @param {Object} res - Express response object
 *
 * @returns {Object} Response object with execution results
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Execution result data
 * @returns {string} returns.data.verdict - Execution verdict
 * @returns {number} returns.data.exitCode - Process exit code
 * @returns {string} returns.data.output - Program output
 * @returns {string} returns.data.error - Error output if any
 * @returns {number} returns.data.executionTime - Execution time in milliseconds
 * @returns {number} returns.data.memoryUsed - Memory used in bytes
 * @returns {Array} [returns.data.testCaseResults] - Test case results if available
 *
 * @throws {400} Invalid input data
 * @throws {404} Problem not found
 * @throws {500} Execution or database errors
 */
router.post('/submit', async (req, res) => {
    try {
        const { error, value } = testSubmissionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid input',
                details: error.details[0].message
            });
        }

        const { problemId, language, code } = value;

        // Verify problem exists and get test cases
        const problem = await db('problems')
            .select('problems.*', 'contests.contest_name')
            .join('contests', 'problems.contest_id', 'contests.id')
            .where('problems.id', problemId)
            .first();

        if (!problem) {
            return res.status(404).json({
                success: false,
                error: 'Problem not found'
            });
        }

        // Get test cases for the problem
        const testCases = await db('test_cases')
            .where('problem_id', problemId)
            .orderBy('id');

        console.log(`Test submission for problem ${problemId} (${problem.title}) in ${language}`);

        // If we have test cases, run them and provide detailed results
        let testCaseResults = null;
        let executionResult = null;

        if (testCases && testCases.length > 0) {
            testCaseResults = await runTestCases(code, language, testCases, problem);

            // Calculate overall verdict based on test case results
            const passedTests = testCaseResults.filter(tc => tc.passed).length;
            const totalTests = testCaseResults.length;

            executionResult = {
                verdict: passedTests === totalTests ? 'accepted' : 'wrong_answer',
                exitCode: passedTests === totalTests ? 0 : 1,
                output: `${passedTests}/${totalTests} test cases passed`,
                error: passedTests === totalTests ? '' : 'Some test cases failed',
                executionTime: Math.max(...testCaseResults.map(tc => tc.executionTime || 0)),
                memoryUsed: Math.max(...testCaseResults.map(tc => tc.memoryUsed || 0))
            };
        } else {
            // Execute the code directly if no test cases
            const multiLangExecutor = require('../services/multiLangExecutor');

            executionResult = await multiLangExecutor.executeCode(
                code,
                language,
                '', // empty input
                {
                    timeLimit: problem.time_limit || 5000,
                    memoryLimit: problem.memory_limit || 256
                }
            );
        }

        res.json({
            success: true,
            data: {
                ...executionResult,
                testCaseResults: testCaseResults,
                problemTitle: problem.title,
                contestName: problem.contest_name
            }
        });
    } catch (error) {
        console.error('Test submission failed:', error);

        res.status(500).json({
            success: false,
            error: 'Test submission failed',
            details: error.message
        });
    }
});

/**
 * @function runTestCases
 * @description Run test cases against submitted code
 *
 * @param {string} code - Source code to test
 * @param {string} language - Programming language
 * @param {Array} testCases - Array of test case objects
 * @param {Object} problem - Problem details
 * @returns {Array} Test case results
 */
async function runTestCases(code, language, testCases, problem) {
    const results = [];
    const multiLangExecutor = require('../services/multiLangExecutor');

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];

        try {
            let finalCode = code;
            let input = '';

            // Check if this is a LeetCode-style problem with IO wrapper
            if (problem.uses_leetcode_style && problem[`io_wrapper_${language}`]) {
                // Use IO wrapper - replace {USER_FUNCTION} placeholder with user's function
                finalCode = problem[`io_wrapper_${language}`].replace('{USER_FUNCTION}', code);

                // Prepare JSON input for LeetCode-style problems
                if (typeof testCase.input_parameters === 'object') {
                    input = JSON.stringify(testCase.input_parameters);
                } else {
                    input = testCase.input_parameters || '';
                }
            } else {
                // For simple problems, prepare input as before
                if (typeof testCase.input_parameters === 'object') {
                    input = JSON.stringify(testCase.input_parameters);
                } else {
                    input = testCase.input_parameters || '';
                }
            }

            console.log(`Running test case ${i + 1} for ${language}:`);
            console.log(`Input: ${input}`);
            console.log(`Code length: ${finalCode.length} chars`);

            // Execute code with this specific test case
            const result = await multiLangExecutor.executeCode(
                finalCode,
                language,
                input,
                {
                    timeLimit: problem.time_limit || 5000,
                    memoryLimit: problem.memory_limit || 256
                }
            );

            console.log(`Result: ${JSON.stringify(result)}`);

            // Compare output with expected result
            let expected = testCase.expected_return;
            let actualOutput = result.output?.trim() || '';

            // For LeetCode-style problems, parse JSON output
            if (problem.uses_leetcode_style) {
                try {
                    // Try to parse JSON output
                    const parsedOutput = JSON.parse(actualOutput);
                    actualOutput = JSON.stringify(parsedOutput);
                    expected = JSON.stringify(expected);
                } catch (e) {
                    // If JSON parsing fails, compare as strings
                    expected = JSON.stringify(expected);
                }
            } else {
                if (typeof expected === 'object') {
                    expected = JSON.stringify(expected);
                }
                expected = expected?.toString().trim() || '';
            }

            const passed = actualOutput === expected && result.exitCode === 0;

            results.push({
                testCaseId: testCase.id,
                testCaseName: testCase.test_case_name || `Test Case ${i + 1}`,
                passed: passed,
                input: testCase.input_parameters,
                expected: testCase.expected_return,
                actual: actualOutput,
                executionTime: result.executionTime,
                memoryUsed: result.memoryUsed,
                error: result.stderr || null,
                explanation: testCase.explanation || null
            });

        } catch (error) {
            console.error(`Error running test case ${i + 1}:`, error);
            results.push({
                testCaseId: testCase.id,
                testCaseName: testCase.test_case_name || `Test Case ${i + 1}`,
                passed: false,
                input: testCase.input_parameters,
                expected: testCase.expected_return,
                actual: null,
                error: error.message,
                explanation: testCase.explanation || null
            });
        }
    }

    return results;
}

/**
 * @route GET /api/test/problems
 * @description Get all problems from all contests for testing
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Object} Response object with all problems
 * @returns {boolean} returns.success - Operation success status
 * @returns {Array} returns.data - Array of problem objects
 */
router.get('/problems', async (req, res) => {
    try {
        const problems = await db('problems')
            .select('problems.*', 'contests.contest_name')
            .join('contests', 'problems.contest_id', 'contests.id')
            .orderBy('contests.id', 'problems.id');

        res.json({
            success: true,
            data: problems
        });
    } catch (error) {
        console.error('Error fetching problems:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch problems',
            details: error.message
        });
    }
});

/**
 * @route GET /api/test/problem/:problemId
 * @description Get detailed problem information for testing
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.problemId - Problem ID
 * @param {Object} res - Express response object
 *
 * @returns {Object} Response object with problem details
 */
router.get('/problem/:problemId', async (req, res) => {
    try {
        const problemId = parseInt(req.params.problemId);

        const problem = await db('problems')
            .select('problems.*', 'contests.contest_name')
            .join('contests', 'problems.contest_id', 'contests.id')
            .where('problems.id', problemId)
            .first();

        if (!problem) {
            return res.status(404).json({
                success: false,
                error: 'Problem not found'
            });
        }

        // Get test cases
        const testCases = await db('test_cases')
            .where('problem_id', problemId)
            .orderBy('id');

        res.json({
            success: true,
            data: {
                ...problem,
                testCases: testCases
            }
        });
    } catch (error) {
        console.error('Error fetching problem:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch problem',
            details: error.message
        });
    }
});

module.exports = router;
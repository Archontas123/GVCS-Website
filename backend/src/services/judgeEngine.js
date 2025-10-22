const multiLangExecutor = require('./multiLangExecutor');
const ExecutionMonitor = require('./executionMonitor');
const { db } = require('../utils/db');
const fs = require('fs').promises;
const path = require('path');
const redis = require('../config/redis');
const pushNotificationService = require('./pushNotificationService');

/**
 * Judge Engine Service for executing and evaluating code submissions
 * Manages test case execution, verdict determination, and performance monitoring
 */
class JudgeEngine {
  /**
   * Initialize judge engine with performance monitoring and scoring configuration
   */
  constructor() {
    this.performanceMonitor = new ExecutionMonitor();
    
    this.verdicts = {
      AC: 'Accepted',
      WA: 'Wrong Answer',
      TLE: 'Time Limit Exceeded',
      RTE: 'Runtime Error',
      CE: 'Compilation Error',
      SE: 'System Error',
      PE: 'Presentation Error'
    };
    
    this.scoring = {
      AC_POINTS: 1,
      FIRST_SOLVE_BONUS: true
    };
  }

  /**
   * Judge a submission with partial credit evaluation
   * @param {Object} submission - Submission details
   * @param {Array} testCases - Array of test cases
   * @param {Object} problem - Problem configuration
   * @returns {Promise<Object>} Judging result
   */
  async judgeSubmission(submission, testCases, problem = {}) {
    const {
      code,
      language,
      problemId,
      teamId,
      contestId,
      submissionId
    } = submission;

    const timeLimit = problem.timeLimit || 5000; // ms

    let judgeResult = {
      submissionId,
      verdict: this.verdicts.SE,
      totalTime: 0,
      maxMemory: 0,
      testCasesRun: 0,
      testCasesPassed: 0,
      compilationTime: 0,
      details: [],
      score: 0,
      accepted: false,
      performanceMetrics: {
        language: language,
        netExecutionTime: 0,
        containerOverhead: 0,
        actualCpuTime: 0,
        ioOperations: 0,
        systemCalls: 0
      }
    };

    try {
      // Step 1: Compile code if necessary (for LeetCode-style, use template)
      const compileResult = await this.compileLeetCodeStyle(problemId, code, language, timeLimit);
      if (!compileResult.success) {
        judgeResult.verdict = this.verdicts.CE;
        judgeResult.compilationTime = compileResult.executionTime || 0;
        judgeResult.details.push({
          error: compileResult.error,
          stage: 'compilation'
        });

        // CE doesn't count as attempt
        await this.updateSubmissionResult(submissionId, judgeResult, false);
        return judgeResult;
      }

      judgeResult.compilationTime = compileResult.executionTime || 0;

      // Step 2: Run all test cases (LeetCode-style function execution)
      const testResult = await this.runAllTestCasesLeetCodeStyle(
        code, language, testCases, timeLimit, problemId
      );
      
      judgeResult = { ...judgeResult, ...testResult };

      // Step 3: Determine final verdict and score
      if (judgeResult.verdict === this.verdicts.AC) {
        judgeResult.accepted = true;
        judgeResult.score = this.scoring.AC_POINTS;
        
        
        await this.updateTeamScore(contestId, teamId, problemId, judgeResult);
      } else {
        await this.addPenalty(contestId, teamId, problemId);
      }

      await this.updateSubmissionResult(submissionId, judgeResult, true);

      // Clear Redis cache for this submission
      await this.clearSubmissionCache(submissionId);

      // Send push notification
      await this.notifySubmissionComplete({
        submissionId,
        teamId,
        contestId,
        problemId,
        problemLetter: problem?.problemLetter,
        verdict: judgeResult.verdict,
        result: judgeResult.verdict,
        status: judgeResult.verdict === 'Accepted' ? 'accepted' : judgeResult.verdict.toLowerCase().replace(/ /g, '_'),
        executionTime: judgeResult.executionTime
      });

      return judgeResult;

    } catch (error) {
      console.error('Judge error:', error);
      judgeResult.verdict = this.verdicts.SE;
      judgeResult.details.push({
        error: error.message,
        stage: 'system'
      });
      
      await this.updateSubmissionResult(submissionId, judgeResult, false);
      return judgeResult;
    }
  }

  /**
   * Compile code using multi-language executor
   * @param {string} code - Source code to compile
   * @param {string} language - Programming language
   * @param {number} timeLimit - Maximum compilation time in milliseconds
   * @returns {Promise<Object>} Compilation result with success status and error details
   * @throws {Error} If compilation system error occurs
   */
  async compileCode(code, language, timeLimit) {
    try {
      return await multiLangExecutor.compileCode(code, language, {
        timeLimit: Math.min(timeLimit, 30000) // Max 30s compile time
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: 0
      };
    }
  }

  /**
   * Compile LeetCode-style code with template wrapper
   * @param {number} problemId - Problem ID for template lookup
   * @param {string} userCode - User's function implementation
   * @param {string} language - Programming language
   * @param {number} timeLimit - Maximum compilation time in milliseconds
   * @returns {Promise<Object>} Compilation result with success status and error details
   */
  async compileLeetCodeStyle(problemId, userCode, language, timeLimit) {
    try {
      const codeTemplateService = require('./codeTemplateService');

      // Generate complete executable code with template wrapper
      const executableCode = await codeTemplateService.generateExecutableCode(
        problemId,
        language,
        userCode
      );

      // Now compile the complete code with template
      return await multiLangExecutor.compileCode(executableCode, language, {
        timeLimit: Math.min(timeLimit, 30000) // Max 30s compile time
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: 0
      };
    }
  }

  /**
   * Run all test cases using LeetCode-style function execution
   * @param {string} userCode - User's function implementation only
   * @param {string} language - Programming language
   * @param {Array} testCases - Array of test case objects with input_parameters/expected_return
   * @param {number} timeLimit - Maximum execution time per test case in milliseconds
   * @param {number} problemId - Problem ID for template lookup
   * @returns {Promise<Object>} Test execution result with verdict and performance data
   * @throws {Error} If system error occurs during testing
   */
  async runAllTestCasesLeetCodeStyle(userCode, language, testCases, timeLimit, problemId) {
    let result = {
      verdict: this.verdicts.AC,
      totalTime: 0,
      maxMemory: 0,
      testCasesRun: 0,
      testCasesPassed: 0,
      details: []
    };

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      result.testCasesRun++;

      try {
        // Use LeetCode-style execution with function signature
        let inputData, expectedOutput;

        // Use new parameter-based format
        inputData = JSON.stringify(testCase.input_parameters);
        expectedOutput = typeof testCase.expected_return === 'string' ?
          testCase.expected_return : JSON.stringify(testCase.expected_return);

        const executeResult = await multiLangExecutor.executeLeetCodeStyle(
          problemId,
          userCode,
          language,
          inputData,
          {
            timeLimit,
            usePerformanceMonitor: true
          }
        );

        result.totalTime += executeResult.executionTime || 0;
        result.maxMemory = Math.max(result.maxMemory, executeResult.memoryUsed || 0);

        if (executeResult.monitoring) {
          result.performanceMetrics = result.performanceMetrics || {};
          result.performanceMetrics.netExecutionTime += executeResult.netExecutionTime || 0;
          result.performanceMetrics.containerOverhead += executeResult.monitoring.containerOverhead || 0;
          result.performanceMetrics.actualCpuTime += executeResult.monitoring.actualCpuTime || 0;
          result.performanceMetrics.ioOperations += executeResult.monitoring.ioOperations || 0;
          result.performanceMetrics.systemCalls += executeResult.monitoring.systemCalls || 0;
        }

        const testVerdict = this.analyzeExecution(
          executeResult,
          {
            input: inputData,
            output: expectedOutput
          },
          timeLimit
        );

        const isHidden =
          typeof testCase.is_hidden === 'boolean'
            ? testCase.is_hidden
            : testCase.is_sample === true
              ? false
              : true;

        const detail = {
          testCase: i + 1,
          testCaseName: isHidden
            ? 'Hidden Test Case'
            : testCase.test_case_name || `Test Case ${i + 1}`,
          verdict: testVerdict,
          time: executeResult.executionTime || 0,
          netTime: executeResult.netExecutionTime || 0,
          memory: executeResult.memoryUsed || 0,
          isHidden,
          performanceData: executeResult.monitoring
        };

        if (!isHidden) {
          detail.inputParameters = testCase.input_parameters || inputData;
          detail.expectedReturn = testCase.expected_return || expectedOutput;
          detail.actualOutput = executeResult.output || '';

          if (executeResult.error) {
            detail.error = executeResult.error;
          }

          if (testCase.explanation) {
            detail.explanation = testCase.explanation;
          }
        }

        result.details.push(detail);

        if (testVerdict === this.verdicts.AC) {
          result.testCasesPassed++;
        } else {
          // Set verdict to first failure encountered, but continue running all tests
          if (result.verdict === this.verdicts.AC) {
            result.verdict = testVerdict;
          }
        }

      } catch (error) {
        // Set verdict to SE on first error, but continue running remaining tests
        if (result.verdict === this.verdicts.AC) {
          result.verdict = this.verdicts.SE;
        }
        const isHidden =
          typeof testCase.is_hidden === 'boolean'
            ? testCase.is_hidden
            : testCase.is_sample === true
              ? false
              : true;

        const detail = {
          testCase: i + 1,
          testCaseName: isHidden
            ? 'Hidden Test Case'
            : testCase.test_case_name || `Test Case ${i + 1}`,
          verdict: this.verdicts.SE,
          isHidden
        };

        if (!isHidden) {
          detail.error = error.message;
        }

        result.details.push(detail);
      }
    }

    return result;
  }

  /**
   * Run all test cases with all-or-nothing evaluation (Legacy STDIN/STDOUT method)
   * @param {string} code - Source code to execute
   * @param {string} language - Programming language
   * @param {Array} testCases - Array of test case objects with input/output
   * @param {number} timeLimit - Maximum execution time per test case in milliseconds
   * @returns {Promise<Object>} Test execution result with verdict and performance data
   * @throws {Error} If system error occurs during testing
   */
  async runAllTestCases(code, language, testCases, timeLimit) {
    let result = {
      verdict: this.verdicts.AC,
      totalTime: 0,
      maxMemory: 0,
      testCasesRun: 0,
      testCasesPassed: 0,
      details: []
    };

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      result.testCasesRun++;

      try {
        const executeResult = await multiLangExecutor.executeCode(
          code,
          language,
          testCase.input,
          {
            timeLimit,
            language: language, // Pass language for performance tracking
            usePerformanceMonitor: true
          }
        );

        result.totalTime += executeResult.executionTime || 0;
        result.maxMemory = Math.max(result.maxMemory, executeResult.memoryUsed || 0);

        if (executeResult.monitoring) {
          judgeResult.performanceMetrics.netExecutionTime += executeResult.netExecutionTime || 0;
          judgeResult.performanceMetrics.containerOverhead += executeResult.monitoring.containerOverhead || 0;
          judgeResult.performanceMetrics.actualCpuTime += executeResult.monitoring.actualCpuTime || 0;
          judgeResult.performanceMetrics.ioOperations += executeResult.monitoring.ioOperations || 0;
          judgeResult.performanceMetrics.systemCalls += executeResult.monitoring.systemCalls || 0;
        }

        const testVerdict = this.analyzeExecution(
          executeResult,
          testCase,
          timeLimit
        );

        const isHidden =
          typeof testCase.is_hidden === 'boolean'
            ? testCase.is_hidden
            : testCase.is_sample === true
              ? false
              : true;

        const detail = {
          testCase: i + 1,
          verdict: testVerdict,
          time: executeResult.executionTime || 0,
          netTime: executeResult.netExecutionTime || 0,
          memory: executeResult.memoryUsed || 0,
          isHidden,
          performanceData: executeResult.monitoring
        };

        if (!isHidden) {
          detail.input = testCase.input;
          detail.expectedOutput = testCase.output;
          detail.actualOutput = executeResult.output || '';

          if (executeResult.error) {
            detail.error = executeResult.error;
          }
        }

        result.details.push(detail);

        if (testVerdict === this.verdicts.AC) {
          result.testCasesPassed++;
        } else {
          // Set verdict to first failure encountered, but continue running all tests
          if (result.verdict === this.verdicts.AC) {
            result.verdict = testVerdict;
          }
        }

      } catch (error) {
        // Set verdict to SE on first error, but continue running remaining tests
        if (result.verdict === this.verdicts.AC) {
          result.verdict = this.verdicts.SE;
        }
        const isHidden =
          typeof testCase.is_hidden === 'boolean'
            ? testCase.is_hidden
            : testCase.is_sample === true
              ? false
              : true;

        const detail = {
          testCase: i + 1,
          verdict: this.verdicts.SE,
          isHidden
        };

        if (!isHidden) {
          detail.error = error.message;
        }

        result.details.push(detail);
      }
    }

    return result;
  }

  /**
   * Analyze execution result and determine verdict
   * @param {Object} executeResult - Result from code execution
   * @param {Object} testCase - Test case with expected output
   * @param {number} timeLimit - Time limit in milliseconds
   * @returns {string} Verdict code (AC, WA, TLE, RTE, etc.)
   */
  analyzeExecution(executeResult, testCase, timeLimit) {
    if (executeResult.verdict === 'Compilation Error') {
      return this.verdicts.CE;
    }

    if (executeResult.executionTime > timeLimit ||
        executeResult.verdict === 'Time Limit Exceeded' ||
        executeResult.error.includes('Time limit exceeded')) {
      return this.verdicts.TLE;
    }

    if (executeResult.exitCode !== 0 ||
        executeResult.verdict === 'Runtime Error' ||
        executeResult.error.includes('Segmentation fault') ||
        executeResult.error.includes('core dumped') ||
        executeResult.error.includes('Exception')) {
      return this.verdicts.RTE;
    }

    if (!executeResult.success && executeResult.verdict === 'System Error') {
      return this.verdicts.SE;
    }

    const outputMatch = this.compareOutputs(
      executeResult.output || '',
      testCase.output
    );

    return outputMatch ? this.verdicts.AC : this.verdicts.WA;
  }

  /**
   * Compare program output with expected output using semantic JSON comparison
   * Falls back to string matching for non-JSON outputs
   * @param {string} actualOutput - Program's actual output
   * @param {string} expectedOutput - Expected output from test case
   * @returns {boolean} True if outputs match after normalization
   */
  compareOutputs(actualOutput, expectedOutput) {
    const normalizedActual = this.normalizeOutput(actualOutput);
    const normalizedExpected = this.normalizeOutput(expectedOutput);

    // Try JSON comparison first (for LeetCode-style problems)
    try {
      const actualJson = JSON.parse(normalizedActual);
      const expectedJson = JSON.parse(normalizedExpected);

      // Deep equality check for JSON values
      return this.deepEqual(actualJson, expectedJson);
    } catch (e) {
      // Not valid JSON, fall back to string comparison
      return normalizedActual === normalizedExpected;
    }
  }

  /**
   * Deep equality check for JSON values
   * @param {any} a - First value
   * @param {any} b - Second value
   * @returns {boolean} True if values are deeply equal
   * @private
   */
  deepEqual(a, b) {
    // Handle null and undefined
    if (a === b) return true;
    if (a == null || b == null) return false;

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, index) => this.deepEqual(val, b[index]));
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }

    // Handle primitives (including NaN)
    if (typeof a === 'number' && typeof b === 'number') {
      if (isNaN(a) && isNaN(b)) return true;
      return a === b;
    }

    return a === b;
  }

  /**
   * Normalize output for comparison by removing trailing whitespace and newlines
   * @param {string} output - Raw output string
   * @returns {string} Normalized output string
   */
  normalizeOutput(output) {
    if (!output) return '';
    
    return output
      .toString()
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n+$/, '')
      .replace(/^\n+/, '');
  }

  /**
   * Compare floating point numbers with tolerance for future extensibility
   * @param {string|number} actual - Actual floating point value
   * @param {string|number} expected - Expected floating point value
   * @param {number} tolerance - Comparison tolerance (default: 1e-6)
   * @returns {boolean} True if values are within tolerance
   */
  compareFloatingPoint(actual, expected, tolerance = 1e-6) {
    const actualNum = parseFloat(actual);
    const expectedNum = parseFloat(expected);
    
    if (isNaN(actualNum) || isNaN(expectedNum)) {
      return actual.trim() === expected.trim();
    }
    
    const diff = Math.abs(actualNum - expectedNum);
    const relativeTolerance = tolerance * Math.max(Math.abs(actualNum), Math.abs(expectedNum));
    
    return diff <= Math.max(tolerance, relativeTolerance);
  }



  /**
   * Update team score after accepted submission
   * @param {number} contestId - Contest identifier
   * @param {number} teamId - Team identifier
   * @param {number} problemId - Problem identifier
   * @param {Object} judgeResult - Judge result with score and timing data
   * @returns {Promise<void>}
   * @throws {Error} If database update fails
   */
  async updateTeamScore(contestId, teamId, problemId, judgeResult) {
    try {
      const contest = await db('contests').where('id', contestId).first();
      if (!contest) return;

      const solveTime = new Date();
      if (!contest.start_time) {
        console.warn(`Contest ${contestId} has no start time; skipping score update.`);
        return;
      }
      const contestStart = new Date(contest.start_time);
      if (Number.isNaN(contestStart.getTime())) {
        console.warn(`Contest ${contestId} has invalid start time; skipping score update.`);
        return;
      }
      const minutesFromStart = Math.floor((solveTime - contestStart) / (1000 * 60));

      const wrongAttempts = await db('submissions')
        .where({
          contest_id: contestId,
          team_id: teamId,
          problem_id: problemId
        })
        .whereNot('status', 'accepted')
        .whereNot('status', 'compilation_error')
        .count('* as count')
        .first();

      const penalty = wrongAttempts ? wrongAttempts.count * this.scoring.PENALTY_MINUTES : 0;
      const totalTime = minutesFromStart + penalty;

      await db('team_scores')
        .insert({
          contest_id: contestId,
          team_id: teamId,
          problem_id: problemId,
          solved: true,
          attempts: (wrongAttempts?.count || 0) + 1,
          solve_time: totalTime,
          penalty: penalty,
          first_solve: judgeResult.firstSolve || false,
          created_at: solveTime,
          updated_at: solveTime
        })
        .onConflict(['contest_id', 'team_id', 'problem_id'])
        .merge({
          solved: true,
          solve_time: totalTime,
          penalty: penalty,
          first_solve: judgeResult.firstSolve || false,
          updated_at: solveTime
        });

    } catch (error) {
      console.error('Error updating team score:', error);
    }
  }

  /**
   * Add penalty for wrong submission
   * @param {number} contestId - Contest identifier
   * @param {number} teamId - Team identifier
   * @param {number} problemId - Problem identifier
   * @returns {Promise<void>}
   * @throws {Error} If database update fails
   */
  async addPenalty(contestId, teamId, problemId) {
    try {
      await db('team_scores')
        .insert({
          contest_id: contestId,
          team_id: teamId,
          problem_id: problemId,
          solved: false,
          attempts: 1,
          solve_time: 0,
          penalty: 0,
          first_solve: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .onConflict(['contest_id', 'team_id', 'problem_id'])
        .merge({
          attempts: db.raw('attempts + 1'),
          updated_at: new Date()
        });
    } catch (error) {
      console.error('Error adding penalty:', error);
    }
  }

  /**
   * Update submission result in database
   * @param {number} submissionId - Submission identifier
   * @param {Object} judgeResult - Complete judging result
   * @param {boolean} countAsAttempt - Whether to count this as an attempt
   * @returns {Promise<void>}
   * @throws {Error} If database update fails
   */
  async updateSubmissionResult(submissionId, judgeResult, countAsAttempt) {
    try {
      await db('submissions')
        .where('id', submissionId)
        .update({
          status: judgeResult.verdict.toLowerCase().replace(/ /g, '_'), // Convert "Accepted" to "accepted"
          execution_time: judgeResult.totalTime || 0,
          memory_used: judgeResult.maxMemory || 0,
          points_earned: judgeResult.score || 0,
          test_cases_passed: judgeResult.testCasesPassed || 0,
          total_test_cases: judgeResult.testCasesRun || 0,
          judged_at: new Date(),
          judge_output: JSON.stringify({
            testCases: judgeResult.details,
            compilationTime: judgeResult.compilationTime,
            testCasesRun: judgeResult.testCasesRun,
            testCasesPassed: judgeResult.testCasesPassed,
            verdict: judgeResult.verdict
          })
        });

      console.log(`✅ Updated submission ${submissionId} with status: ${judgeResult.verdict}`);
    } catch (error) {
      console.error('❌ Error updating submission:', error);
      console.error('Submission ID:', submissionId);
      console.error('Judge Result:', judgeResult);
      throw error;
    }
  }

  /**
   * Get judging statistics for contest or all contests
   * @param {number|null} contestId - Optional contest identifier to filter by
   * @returns {Promise<Object>} Verdict statistics with counts
   * @throws {Error} If database error occurs
   */
  async getJudgingStats(contestId = null) {
    try {
      let query = db('submissions')
        .select('status')
        .count('* as count')
        .groupBy('status');

      if (contestId) {
        query = query.where('contest_id', contestId);
      }

      const results = await query;

      const stats = {};
      results.forEach(row => {
        stats[row.status] = parseInt(row.count);
      });

      return stats;
    } catch (error) {
      console.error('Error getting judging stats:', error);
      return {};
    }
  }

  /**
   * Get detailed judging result for a specific submission
   * @param {number} submissionId - Submission identifier
   * @returns {Promise<Object|null>} Detailed judging result or null if not found
   * @throws {Error} If database error occurs
   */
  async getJudgingResult(submissionId) {
    try {
      const submission = await db('submissions')
        .where('id', submissionId)
        .first();

      if (!submission) {
        throw new Error('Submission not found');
      }

      let judgeDetails = {};
      try {
        judgeDetails = JSON.parse(submission.judge_details || '{}');
      } catch (e) {
        judgeDetails = {};
      }

      return {
        submissionId: submission.submission_id,
        verdict: submission.status,
        executionTime: submission.execution_time,
        memoryUsed: submission.memory_used,
        score: submission.score,
        judgedAt: submission.judged_at,
        details: judgeDetails
      };
    } catch (error) {
      console.error('Error getting judging result:', error);
      return null;
    }
  }

  /**
   * Re-judge submission with current test cases (admin function)
   * @param {number} submissionId - Submission identifier
   * @returns {Promise<Object>} Re-judging result
   * @throws {Error} If submission not found or re-judging fails
   */
  async reJudgeSubmission(submissionId) {
    try {
      const submission = await db('submissions')
        .join('problems', 'submissions.problem_id', 'problems.problem_id')
        .where('submissions.id', submissionId)
        .first();

      if (!submission) {
        throw new Error('Submission not found');
      }

      const testCases = await db('test_cases')
        .where('problem_id', submission.problem_id)
        .orderBy('test_case_order')
        .select('input_parameters', 'expected_return as output');

      return await this.judgeSubmission({
        code: submission.source_code,
        language: submission.language,
        problemId: submission.problem_id,
        teamId: submission.team_id,
        contestId: submission.contest_id,
        submissionId: submission.submission_id
      }, testCases, {
        timeLimit: submission.time_limit
      });

    } catch (error) {
      console.error('Error re-judging submission:', error);
      throw error;
    }
  }

  /**
   * Get performance statistics from the execution monitor
   * @returns {Object} Performance statistics from execution monitor
   */
  getPerformanceStats() {
    return this.performanceMonitor.getPerformanceStats();
  }

  /**
   * Get performance statistics for a specific programming language
   * @param {string} language - Programming language identifier
   * @returns {Object} Language-specific performance statistics
   */
  getLanguagePerformanceStats(language) {
    return this.performanceMonitor.getLanguagePerformanceStats(language);
  }

  /**
   * Get comprehensive judge-specific performance metrics
   * @returns {Object} Combined performance metrics including system resources
   */
  getJudgePerformanceMetrics() {
    const executionStats = this.performanceMonitor.getPerformanceStats();
    const systemResources = this.performanceMonitor.getSystemResources();
    
    return {
      totalSubmissionsJudged: executionStats.totalExecutions,
      averageJudgingTime: executionStats.averageExecutionTime,
      peakMemoryUsage: executionStats.peakMemoryUsage,
      languageBreakdown: executionStats.languageStats,
      errorRates: executionStats.errorRates,
      containerOverheadStats: executionStats.containerOverhead,
      systemResources: systemResources,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset all performance statistics
   * @returns {void}
   */
  resetPerformanceStats() {
    this.performanceMonitor.resetPerformanceStats();
  }

  /**
   * Clear Redis cache for a submission
   */
  async clearSubmissionCache(submissionId) {
    try {
      await redis.del(`submission:status:${submissionId}`);
    } catch (error) {
      console.error('Failed to clear submission cache:', error);
    }
  }

  /**
   * Send push notification for completed submission
   */
  async notifySubmissionComplete(submission) {
    try {
      await pushNotificationService.notifySubmissionComplete(submission);
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }
}

module.exports = JudgeEngine;

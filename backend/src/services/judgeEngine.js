const multiLangExecutor = require('./multiLangExecutor');
const ExecutionMonitor = require('./executionMonitor');
const { db } = require('../utils/db');
const fs = require('fs').promises;
const path = require('path');

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
      MLE: 'Memory Limit Exceeded',
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
    const memoryLimit = problem.memoryLimit || 256; // MB
    
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
      // Notify compilation start
      await this.broadcastVerdictUpdate({
        submissionId,
        teamId,
        contestId,
        problemId,
        status: 'compiling'
      });

      // Step 1: Compile code if necessary
      const compileResult = await this.compileCode(code, language, timeLimit);
      if (!compileResult.success) {
        judgeResult.verdict = this.verdicts.CE;
        judgeResult.compilationTime = compileResult.executionTime || 0;
        judgeResult.details.push({
          error: compileResult.error,
          stage: 'compilation'
        });
        
        // Broadcast compilation error
        await this.broadcastSubmissionResult({
          ...judgeResult,
          submissionId,
          teamId,
          contestId,
          problemId,
          language
        });
        
        // CE doesn't count as attempt
        await this.updateSubmissionResult(submissionId, judgeResult, false);
        return judgeResult;
      }

      judgeResult.compilationTime = compileResult.executionTime || 0;
      
      // Notify judging start
      await this.broadcastVerdictUpdate({
        submissionId,
        teamId,
        contestId,
        problemId,
        status: 'judging',
        totalTestCases: testCases.length
      });

      // Step 2: Run all test cases (all-or-nothing)
      const testResult = await this.runAllTestCases(
        code, language, testCases, timeLimit, memoryLimit
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
      
      await this.broadcastSubmissionResult({
        ...judgeResult,
        submissionId,
        teamId,
        contestId,
        problemId,
        language
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
   * Run all test cases with all-or-nothing evaluation
   * @param {string} code - Source code to execute
   * @param {string} language - Programming language
   * @param {Array} testCases - Array of test case objects with input/output
   * @param {number} timeLimit - Maximum execution time per test case in milliseconds
   * @param {number} memoryLimit - Maximum memory usage in MB
   * @returns {Promise<Object>} Test execution result with verdict and performance data
   * @throws {Error} If system error occurs during testing
   */
  async runAllTestCases(code, language, testCases, timeLimit, memoryLimit) {
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
            memoryLimit,
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

        const testVerdict = this.analyzeExecution(executeResult, testCase, timeLimit, memoryLimit);
        
        result.details.push({
          testCase: i + 1,
          verdict: testVerdict,
          time: executeResult.executionTime || 0,
          netTime: executeResult.netExecutionTime || 0,
          memory: executeResult.memoryUsed || 0,
          input: testCase.input,
          expectedOutput: testCase.output,
          actualOutput: executeResult.output || '',
          error: executeResult.error || '',
          performanceData: executeResult.monitoring
        });

        if (testVerdict === this.verdicts.AC) {
          result.testCasesPassed++;
        } else {
          result.verdict = testVerdict;
          break;
        }

      } catch (error) {
        result.verdict = this.verdicts.SE;
        result.details.push({
          testCase: i + 1,
          verdict: this.verdicts.SE,
          error: error.message
        });
        break;
      }
    }

    return result;
  }

  /**
   * Analyze execution result and determine verdict
   * @param {Object} executeResult - Result from code execution
   * @param {Object} testCase - Test case with expected output
   * @param {number} timeLimit - Time limit in milliseconds
   * @param {number} memoryLimit - Memory limit in MB
   * @returns {string} Verdict code (AC, WA, TLE, RTE, etc.)
   */
  analyzeExecution(executeResult, testCase, timeLimit, memoryLimit) {
    if (executeResult.verdict === 'Compilation Error') {
      return this.verdicts.CE;
    }

    if (executeResult.executionTime > timeLimit || 
        executeResult.verdict === 'Time Limit Exceeded' ||
        executeResult.error.includes('Time limit exceeded')) {
      return this.verdicts.TLE;
    }

    if (executeResult.memoryUsed > memoryLimit ||
        executeResult.verdict === 'Memory Limit Exceeded' ||
        executeResult.error.includes('Memory limit') ||
        executeResult.error.includes('out of memory')) {
      return this.verdicts.MLE;
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
   * Compare program output with expected output using exact string matching
   * @param {string} actualOutput - Program's actual output
   * @param {string} expectedOutput - Expected output from test case
   * @returns {boolean} True if outputs match after normalization
   */
  compareOutputs(actualOutput, expectedOutput) {
    const normalizedActual = this.normalizeOutput(actualOutput);
    const normalizedExpected = this.normalizeOutput(expectedOutput);
    
    return normalizedActual === normalizedExpected;
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
      const contest = await db('contests').where('contest_id', contestId).first();
      if (!contest) return;

      const solveTime = new Date();
      const contestStart = new Date(contest.start_time);
      const minutesFromStart = Math.floor((solveTime - contestStart) / (1000 * 60));

      const wrongAttempts = await db('submissions')
        .where({
          contest_id: contestId,
          team_id: teamId,
          problem_id: problemId
        })
        .whereNot('verdict', 'Accepted')
        .whereNot('verdict', 'Compilation Error')
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
          verdict: judgeResult.verdict,
          execution_time: judgeResult.totalTime,
          memory_used: judgeResult.maxMemory,
          score: judgeResult.score || 0,
          judged_at: new Date(),
          judge_details: JSON.stringify({
            testCases: judgeResult.details,
            compilationTime: judgeResult.compilationTime,
            testCasesRun: judgeResult.testCasesRun,
            testCasesPassed: judgeResult.testCasesPassed
          })
        });
    } catch (error) {
      console.error('Error updating submission:', error);
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
        .select('verdict')
        .count('* as count')
        .groupBy('verdict');

      if (contestId) {
        query = query.where('contest_id', contestId);
      }

      const results = await query;
      
      const stats = {};
      results.forEach(row => {
        stats[row.verdict] = parseInt(row.count);
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
        verdict: submission.verdict,
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
        .select('input', 'expected_output as output');

      return await this.judgeSubmission({
        code: submission.source_code,
        language: submission.language,
        problemId: submission.problem_id,
        teamId: submission.team_id,
        contestId: submission.contest_id,
        submissionId: submission.submission_id
      }, testCases, {
        timeLimit: submission.time_limit,
        memoryLimit: submission.memory_limit
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
   * Broadcast submission result via WebSocket
   * @param {Object} submissionResult - Complete judging result
   */
  async broadcastSubmissionResult(submissionResult) {
    try {
      const websocketService = require('./websocketService');
      await websocketService.broadcastSubmissionResult(submissionResult);
    } catch (error) {
      console.error('Failed to broadcast submission result:', error);
    }
  }

  /**
   * Broadcast verdict update via WebSocket
   * @param {Object} verdictUpdate - Partial judging status
   */
  async broadcastVerdictUpdate(verdictUpdate) {
    try {
      const websocketService = require('./websocketService');
      await websocketService.broadcastVerdictUpdate(verdictUpdate);
    } catch (error) {
      console.error('Failed to broadcast verdict update:', error);
    }
  }
}

module.exports = JudgeEngine;
/**
 * Test Case Runner Service - Updated for Hackathon Scoring
 * Handles both ICPC all-or-nothing and hackathon partial scoring
 */

const ICPCJudge = require('./icpcJudge');
const ExecutionMonitor = require('./executionMonitor');
const { db } = require('../utils/db');
const partialScoringService = require('./partialScoringService');
const scoringService = require('./scoringService');

class TestCaseRunner {
  constructor() {
    this.judge = new ICPCJudge();
    this.monitor = new ExecutionMonitor();
    this.runningTests = new Map();
  }

  /**
   * Run all test cases for a problem based on contest scoring type
   * @param {Object} submission - Submission details
   * @param {Object} problem - Problem configuration
   * @returns {Promise<Object>} Test execution result
   */
  async runTestCases(submission, problem) {
    // Get contest scoring type to determine execution strategy
    const contestId = problem.contest_id;
    const scoringType = await scoringService.getContestScoringType(contestId);
    
    return scoringType === 'hackathon'
      ? this.runTestCasesWithPartialScoring(submission, problem)
      : this.runTestCasesICPCStyle(submission, problem);
  }

  /**
   * Run all test cases with ICPC-style evaluation (stop on first failure)
   * @param {Object} submission - Submission details
   * @param {Object} problem - Problem configuration
   * @returns {Promise<Object>} Test execution result
   */
  async runTestCasesICPCStyle(submission, problem) {
    const testRunId = this.generateTestRunId();
    
    try {
      // Get all test cases for the problem
      const testCases = await this.getTestCases(submission.problemId);
      
      if (testCases.length === 0) {
        throw new Error('No test cases found for problem');
      }

      // Start test run tracking
      this.runningTests.set(testRunId, {
        submissionId: submission.submissionId,
        problemId: submission.problemId,
        startTime: Date.now(),
        status: 'running'
      });

      // Execute ICPC-style judging
      const result = await this.executeICPCJudging(
        submission, 
        testCases, 
        problem, 
        testRunId
      );

      // Cleanup
      this.runningTests.delete(testRunId);
      
      return result;

    } catch (error) {
      this.runningTests.delete(testRunId);
      throw error;
    }
  }

  /**
   * Run all test cases with partial scoring (run all test cases, don't stop on failure)
   * @param {Object} submission - Submission details
   * @param {Object} problem - Problem configuration
   * @returns {Promise<Object>} Test execution result
   */
  async runTestCasesWithPartialScoring(submission, problem) {
    const testRunId = this.generateTestRunId();
    
    try {
      // Get all test cases for the problem
      const testCases = await this.getTestCases(submission.problemId);
      
      if (testCases.length === 0) {
        throw new Error('No test cases found for problem');
      }

      // Start test run tracking
      this.runningTests.set(testRunId, {
        submissionId: submission.submissionId,
        problemId: submission.problemId,
        startTime: Date.now(),
        status: 'running'
      });

      // Execute partial scoring judging
      const result = await this.executePartialScoringJudging(
        submission, 
        testCases, 
        problem, 
        testRunId
      );

      // Cleanup
      this.runningTests.delete(testRunId);
      
      return result;

    } catch (error) {
      this.runningTests.delete(testRunId);
      throw error;
    }
  }

  /**
   * Execute ICPC-style judging with all-or-nothing evaluation
   */
  async executeICPCJudging(submission, testCases, problem, testRunId) {
    const judgeResult = {
      testRunId,
      submissionId: submission.submissionId,
      verdict: 'Accepted',
      totalExecutionTime: 0,
      maxMemoryUsed: 0,
      testCasesExecuted: 0,
      testCasesPassed: 0,
      compilationTime: 0,
      testCaseResults: [],
      firstFailure: null,
      summary: {
        accepted: 0,
        wrongAnswer: 0,
        timeLimit: 0,
        memoryLimit: 0,
        runtimeError: 0,
        compilationError: 0
      }
    };

    try {
      // Step 1: Compile the code if necessary
      const compileResult = await this.compileSubmission(submission);
      judgeResult.compilationTime = compileResult.executionTime || 0;

      if (!compileResult.success) {
        judgeResult.verdict = 'Compilation Error';
        judgeResult.compilationError = compileResult.error;
        judgeResult.summary.compilationError = 1;
        return judgeResult;
      }

      // Step 2: Execute test cases (ICPC: stop on first failure)
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        judgeResult.testCasesExecuted++;

        // Update running test status
        this.updateTestRunStatus(testRunId, {
          currentTestCase: i + 1,
          totalTestCases: testCases.length,
          status: `running test case ${i + 1}`
        });

        // Execute single test case
        const testResult = await this.executeSingleTestCase(
          submission, 
          testCase, 
          problem, 
          i + 1
        );

        judgeResult.testCaseResults.push(testResult);
        judgeResult.totalExecutionTime += testResult.executionTime || 0;
        judgeResult.maxMemoryUsed = Math.max(
          judgeResult.maxMemoryUsed, 
          testResult.memoryUsed || 0
        );

        // Update summary
        this.updateVerdictSummary(judgeResult.summary, testResult.verdict);

        if (testResult.verdict === 'Accepted') {
          judgeResult.testCasesPassed++;
        } else {
          // ICPC: Stop on first failure
          judgeResult.verdict = testResult.verdict;
          judgeResult.firstFailure = {
            testCaseNumber: i + 1,
            verdict: testResult.verdict,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: testResult.output,
            error: testResult.error
          };
          break;
        }
      }

      // Determine final verdict
      if (judgeResult.testCasesPassed === testCases.length) {
        judgeResult.verdict = 'Accepted';
      }

      // Calculate partial scores if enabled
      if (submission.enablePartialScoring) {
        const testCaseResults = judgeResult.testCaseResults.map(tcr => ({
          testCaseId: tcr.testCaseId,
          verdict: tcr.verdict.toLowerCase().replace(' ', '_'),
          executionTime: tcr.executionTime,
          memoryUsed: tcr.memoryUsed
        }));

        judgeResult.scoring = await partialScoringService.calculateSubmissionScore(
          submission.submissionId,
          testCaseResults
        );
      }

      return judgeResult;

    } catch (error) {
      judgeResult.verdict = 'System Error';
      judgeResult.systemError = error.message;
      return judgeResult;
    }
  }

  /**
   * Execute partial scoring judging (run all test cases)
   */
  async executePartialScoringJudging(submission, testCases, problem, testRunId) {
    const judgeResult = {
      testRunId,
      submissionId: submission.submissionId,
      verdict: 'Accepted',
      totalExecutionTime: 0,
      maxMemoryUsed: 0,
      testCasesExecuted: 0,
      testCasesPassed: 0,
      compilationTime: 0,
      testCaseResults: [],
      summary: {
        accepted: 0,
        wrongAnswer: 0,
        timeLimit: 0,
        memoryLimit: 0,
        runtimeError: 0,
        compilationError: 0
      }
    };

    try {
      // Step 1: Compile the code if necessary
      const compileResult = await this.compileSubmission(submission);
      judgeResult.compilationTime = compileResult.executionTime || 0;

      if (!compileResult.success) {
        judgeResult.verdict = 'Compilation Error';
        judgeResult.compilationError = compileResult.error;
        judgeResult.summary.compilationError = 1;
        return judgeResult;
      }

      // Filter out sample test cases (they don't count toward scoring)
      const gradingTestCases = testCases.filter(tc => !tc.is_sample);
      const sampleTestCases = testCases.filter(tc => tc.is_sample);
      
      console.log(`Running ${gradingTestCases.length} grading test cases (${sampleTestCases.length} samples excluded)`);

      // Step 2: Execute ALL test cases (partial scoring: don't stop on failure)
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        judgeResult.testCasesExecuted++;

        // Update running test status
        this.updateTestRunStatus(testRunId, {
          currentTestCase: i + 1,
          totalTestCases: testCases.length,
          status: `running test case ${i + 1}`
        });

        // Execute single test case
        const testResult = await this.executeSingleTestCase(
          submission, 
          testCase, 
          problem, 
          i + 1
        );

        judgeResult.testCaseResults.push(testResult);
        judgeResult.totalExecutionTime += testResult.executionTime || 0;
        judgeResult.maxMemoryUsed = Math.max(
          judgeResult.maxMemoryUsed, 
          testResult.memoryUsed || 0
        );

        // Update summary
        this.updateVerdictSummary(judgeResult.summary, testResult.verdict);

        if (testResult.verdict === 'Accepted') {
          judgeResult.testCasesPassed++;
        }
      }

      // Determine final verdict based on all test cases
      if (judgeResult.testCasesPassed === testCases.length) {
        judgeResult.verdict = 'Accepted';
      } else if (judgeResult.testCasesPassed === 0) {
        // Set verdict to the most common failure type
        const failureTypes = ['wrongAnswer', 'timeLimit', 'memoryLimit', 'runtimeError'];
        const mostCommonFailure = failureTypes.reduce((prev, current) => 
          judgeResult.summary[current] > judgeResult.summary[prev] ? current : prev
        );
        
        const verdictMap = {
          wrongAnswer: 'Wrong Answer',
          timeLimit: 'Time Limit Exceeded', 
          memoryLimit: 'Memory Limit Exceeded',
          runtimeError: 'Runtime Error'
        };
        judgeResult.verdict = verdictMap[mostCommonFailure] || 'Wrong Answer';
      } else {
        judgeResult.verdict = 'Partial Credit';
      }

      // Calculate hackathon-style partial scoring
      const gradingResults = judgeResult.testCaseResults
        .filter((tcr, index) => !testCases[index].is_sample); // Exclude sample test cases
        
      const gradingTestCasesPassed = gradingResults.filter(tcr => tcr.verdict === 'Accepted').length;
      const totalGradingTestCases = gradingResults.length;
      
      // Get problem points from database
      const problemData = await db('problems')
        .where('id', submission.problemId)
        .first('points_value');
        
      const problemPoints = problemData?.points_value || 1;
      
      // Calculate partial points using hackathon scoring
      const hackathonScoring = require('./hackathonScoring');
      const pointsEarned = hackathonScoring.calculatePartialPoints(
        gradingTestCasesPassed,
        totalGradingTestCases, 
        problemPoints
      );

      judgeResult.scoring = {
        points_earned: pointsEarned,
        test_cases_passed: gradingTestCasesPassed,
        total_test_cases: totalGradingTestCases,
        problem_points: problemPoints,
        percentage: totalGradingTestCases > 0 ? 
          Math.round((gradingTestCasesPassed / totalGradingTestCases) * 100) : 0
      };
      
      // Store individual test case results in database
      await this.storeTestCaseResults(submission.submissionId, judgeResult.testCaseResults);
      
      // Update submission with partial score
      await this.updateSubmissionWithPartialScore(
        submission.submissionId, 
        judgeResult.scoring, 
        judgeResult.verdict
      );

      return judgeResult;

    } catch (error) {
      judgeResult.verdict = 'System Error';
      judgeResult.systemError = error.message;
      return judgeResult;
    }
  }

  /**
   * Compile submission code
   */
  async compileSubmission(submission) {
    try {
      const multiLangExecutor = require('./multiLangExecutor');
      return await multiLangExecutor.compileCode(
        submission.code, 
        submission.language,
        {
          timeLimit: 30000 // 30 second compile timeout
        }
      );
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: 0
      };
    }
  }

  /**
   * Execute a single test case
   */
  async executeSingleTestCase(submission, testCase, problem, testCaseNumber) {
    const timeLimit = problem.timeLimit || 5000;
    const memoryLimit = problem.memoryLimit || 256;

    try {
      const multiLangExecutor = require('./multiLangExecutor');
      
      // Execute with monitoring
      const executeResult = await multiLangExecutor.executeCode(
        submission.code,
        submission.language,
        testCase.input,
        {
          timeLimit,
          memoryLimit
        }
      );

      // Analyze result and determine verdict
      const verdict = this.analyzeTestCaseResult(
        executeResult, 
        testCase, 
        timeLimit, 
        memoryLimit
      );

      return {
        testCaseId: testCase.test_case_id || testCase.id,
        testCaseNumber,
        verdict,
        executionTime: executeResult.executionTime || 0,
        memoryUsed: executeResult.memoryUsed || 0,
        exitCode: executeResult.exitCode,
        output: executeResult.output || '',
        error: executeResult.error || '',
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        outputMatches: verdict === 'Accepted'
      };

    } catch (error) {
      return {
        testCaseId: testCase.test_case_id || testCase.id,
        testCaseNumber,
        verdict: 'System Error',
        executionTime: 0,
        memoryUsed: 0,
        exitCode: -1,
        output: '',
        error: error.message,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        outputMatches: false
      };
    }
  }

  /**
   * Analyze test case execution result
   */
  analyzeTestCaseResult(executeResult, testCase, timeLimit, memoryLimit) {
    // Check for compilation error (shouldn't happen at this stage)
    if (executeResult.verdict === 'Compilation Error') {
      return 'Compilation Error';
    }

    // Check for time limit exceeded
    if (executeResult.executionTime > timeLimit || 
        executeResult.verdict === 'Time Limit Exceeded') {
      return 'Time Limit Exceeded';
    }

    // Check for memory limit exceeded
    if (executeResult.memoryUsed > memoryLimit ||
        executeResult.verdict === 'Memory Limit Exceeded') {
      return 'Memory Limit Exceeded';
    }

    // Check for runtime error
    if (executeResult.exitCode !== 0 || 
        executeResult.verdict === 'Runtime Error') {
      return 'Runtime Error';
    }

    // Check for system error
    if (executeResult.verdict === 'System Error') {
      return 'System Error';
    }

    // Compare output
    const outputMatches = this.compareOutputs(
      executeResult.output || '', 
      testCase.expectedOutput
    );

    return outputMatches ? 'Accepted' : 'Wrong Answer';
  }

  /**
   * Compare program output with expected output (ICPC-style)
   */
  compareOutputs(actualOutput, expectedOutput) {
    // Normalize both outputs
    const normalizedActual = this.normalizeOutput(actualOutput);
    const normalizedExpected = this.normalizeOutput(expectedOutput);
    
    return normalizedActual === normalizedExpected;
  }

  /**
   * Normalize output for comparison
   */
  normalizeOutput(output) {
    if (!output) return '';
    
    return output
      .toString()
      .split('\n')
      .map(line => line.trimEnd())    // Remove trailing whitespace from each line
      .join('\n')
      .replace(/\n+$/, '')           // Remove trailing newlines
      .replace(/^\n+/, '');          // Remove leading newlines
  }

  /**
   * Get test cases for a problem
   */
  async getTestCases(problemId) {
    try {
      const testCases = await db('test_cases')
        .where('problem_id', problemId)
        .where('is_active', true)
        .orderBy('test_case_order', 'asc')
        .select([
          'test_case_id',
          'input',
          'expected_output as expectedOutput',
          'test_case_order',
          'is_sample',
          'points'
        ]);

      return testCases.map(tc => ({
        ...tc,
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || ''
      }));

    } catch (error) {
      console.error('Error fetching test cases:', error);
      throw new Error('Failed to fetch test cases');
    }
  }

  /**
   * Update verdict summary statistics
   */
  updateVerdictSummary(summary, verdict) {
    switch (verdict) {
      case 'Accepted':
        summary.accepted++;
        break;
      case 'Wrong Answer':
        summary.wrongAnswer++;
        break;
      case 'Time Limit Exceeded':
        summary.timeLimit++;
        break;
      case 'Memory Limit Exceeded':
        summary.memoryLimit++;
        break;
      case 'Runtime Error':
        summary.runtimeError++;
        break;
      case 'Compilation Error':
        summary.compilationError++;
        break;
    }
  }

  /**
   * Update test run status
   */
  updateTestRunStatus(testRunId, status) {
    const testRun = this.runningTests.get(testRunId);
    if (testRun) {
      Object.assign(testRun, status);
    }
  }

  /**
   * Generate unique test run ID
   */
  generateTestRunId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get running test status
   */
  getTestRunStatus(testRunId) {
    return this.runningTests.get(testRunId) || null;
  }

  /**
   * Get all running tests
   */
  getRunningTests() {
    return Array.from(this.runningTests.entries()).map(([id, data]) => ({
      testRunId: id,
      ...data
    }));
  }

  /**
   * Cancel a running test
   */
  async cancelTestRun(testRunId) {
    const testRun = this.runningTests.get(testRunId);
    if (testRun) {
      testRun.status = 'cancelled';
      // Implementation would kill running processes
      this.runningTests.delete(testRunId);
      return true;
    }
    return false;
  }

  /**
   * Validate test cases for a problem
   */
  async validateTestCases(problemId) {
    try {
      const testCases = await this.getTestCases(problemId);
      const validation = {
        problemId,
        totalTestCases: testCases.length,
        sampleTestCases: testCases.filter(tc => tc.is_sample).length,
        hiddenTestCases: testCases.filter(tc => !tc.is_sample).length,
        issues: []
      };

      // Check for issues
      if (testCases.length === 0) {
        validation.issues.push('No test cases found');
      }

      if (validation.sampleTestCases === 0) {
        validation.issues.push('No sample test cases found');
      }

      // Check for empty inputs/outputs
      testCases.forEach((tc, index) => {
        if (!tc.input && !tc.expectedOutput) {
          validation.issues.push(`Test case ${index + 1} has empty input and output`);
        }
        if (tc.expectedOutput === undefined || tc.expectedOutput === null) {
          validation.issues.push(`Test case ${index + 1} has no expected output`);
        }
      });

      validation.valid = validation.issues.length === 0;
      return validation;

    } catch (error) {
      return {
        problemId,
        valid: false,
        issues: [`Error validating test cases: ${error.message}`]
      };
    }
  }

  /**
   * Run test cases with custom judge (for special problems)
   */
  async runWithCustomJudge(submission, problem, customJudgeCode) {
    // Implementation for custom judge support
    // This would be used for problems requiring special output validation
    // (e.g., multiple correct answers, floating point comparison)
    
    throw new Error('Custom judge not implemented yet');
  }

  /**
   * Get test case execution statistics
   */
  getExecutionStats() {
    const runningTests = this.getRunningTests();
    
    return {
      activeTestRuns: runningTests.length,
      runningTests: runningTests.map(test => ({
        testRunId: test.testRunId,
        submissionId: test.submissionId,
        problemId: test.problemId,
        status: test.status,
        startTime: test.startTime,
        duration: Date.now() - test.startTime,
        currentTestCase: test.currentTestCase || 0,
        totalTestCases: test.totalTestCases || 0
      }))
    };
  }

  /**
   * Store individual test case results in database
   */
  async storeTestCaseResults(submissionId, testCaseResults) {
    try {
      const testResults = testCaseResults.map(result => ({
        submission_id: submissionId,
        test_case_id: result.testCaseId,
        result: result.verdict === 'Accepted' ? 'passed' : 'failed',
        output: result.output || '',
        expected_output: result.expectedOutput || '',
        execution_time: result.executionTime || 0,
        memory_used: result.memoryUsed || 0,
        tested_at: new Date()
      }));

      // Batch insert all test case results
      if (testResults.length > 0) {
        await db('submission_test_results').insert(testResults);
        console.log(`Stored ${testResults.length} test case results for submission ${submissionId}`);
      }
    } catch (error) {
      console.error('Error storing test case results:', error);
      // Don't throw - test case result storage is non-critical
    }
  }

  /**
   * Update submission with partial scoring results
   */
  async updateSubmissionWithPartialScore(submissionId, scoring, verdict) {
    try {
      await db('submissions')
        .where('id', submissionId)
        .update({
          test_cases_passed: scoring.test_cases_passed,
          total_test_cases: scoring.total_test_cases,
          points_earned: scoring.points_earned,
          status: verdict.toLowerCase().replace(' ', '_'),
          judged_at: new Date()
        });

      console.log(`Updated submission ${submissionId} with partial score: ${scoring.points_earned}/${scoring.problem_points} points`);
    } catch (error) {
      console.error('Error updating submission with partial score:', error);
      throw error;
    }
  }
}

module.exports = TestCaseRunner;
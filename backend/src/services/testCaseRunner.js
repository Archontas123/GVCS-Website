/**
 * Test Case Runner Service - Phase 4.2
 * Handles ICPC-style all-or-nothing test case execution
 */

const ICPCJudge = require('./icpcJudge');
const ExecutionMonitor = require('./executionMonitor');
const { db } = require('../utils/db');

class TestCaseRunner {
  constructor() {
    this.judge = new ICPCJudge();
    this.monitor = new ExecutionMonitor();
    this.runningTests = new Map();
  }

  /**
   * Run all test cases for a problem with ICPC-style evaluation
   * @param {Object} submission - Submission details
   * @param {Object} problem - Problem configuration
   * @returns {Promise<Object>} Test execution result
   */
  async runTestCases(submission, problem) {
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
}

module.exports = TestCaseRunner;
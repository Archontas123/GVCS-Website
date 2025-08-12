/**
 * Test Case Controller - Phase 2.2
 * Handles test case creation, management, and CRUD operations
 */

const { db } = require('../utils/db');
const { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  ConflictError,
  DatabaseError 
} = require('../utils/errors');
const Problem = require('./problemController');
const Contest = require('./contestController');

/**
 * TestCase Model Class
 */
class TestCase {
  constructor(data) {
    this.id = data.id;
    this.problem_id = data.problem_id;
    this.input = data.input;
    this.expected_output = data.expected_output;
    this.is_sample = data.is_sample;
    this.created_at = data.created_at;
  }

  /**
   * Validate test case data
   */
  static validateTestCaseData(data) {
    const errors = [];

    if (data.input === undefined || data.input === null) {
      errors.push('Input is required (can be empty string)');
    }
    if (typeof data.input !== 'string') {
      errors.push('Input must be a string');
    }
    if (data.input && data.input.length > 10000) {
      errors.push('Input must not exceed 10000 characters');
    }

    if (data.expected_output === undefined || data.expected_output === null) {
      errors.push('Expected output is required (can be empty string)');
    }
    if (typeof data.expected_output !== 'string') {
      errors.push('Expected output must be a string');
    }
    if (data.expected_output && data.expected_output.length > 10000) {
      errors.push('Expected output must not exceed 10000 characters');
    }

    if (data.is_sample !== undefined && typeof data.is_sample !== 'boolean') {
      errors.push('is_sample must be a boolean');
    }

    if (errors.length > 0) {
      throw new ValidationError('Test case validation failed', errors.map(msg => ({ message: msg })));
    }
  }

  /**
   * Check if admin can manage test cases for this problem
   */
  static async checkAdminAccess(problemId, adminId) {
    try {
      const problem = await Problem.findById(problemId);
      const contest = await Contest.findById(problem.contest_id);
      
      if (contest.created_by !== adminId) {
        throw new AuthenticationError('Not authorized to manage test cases for this problem');
      }

      return { problem, contest };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to verify admin access', error);
    }
  }

  /**
   * Create a new test case
   */
  static async create(testCaseData, problemId, adminId) {
    // Verify admin has access to this problem
    const { contest } = await this.checkAdminAccess(problemId, adminId);

    // Validate test case data
    this.validateTestCaseData(testCaseData);

    // Check if contest is running and prevent changes to test cases
    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      throw new ValidationError('Cannot add test cases while contest is running');
    }

    try {
      const [testCaseId] = await db('test_cases').insert({
        problem_id: problemId,
        input: testCaseData.input || '',
        expected_output: testCaseData.expected_output || '',
        is_sample: testCaseData.is_sample || false
      }).returning('id');

      return await this.findById(testCaseId);
    } catch (error) {
      throw new DatabaseError('Failed to create test case', error);
    }
  }

  /**
   * Find test case by ID
   */
  static async findById(testCaseId) {
    try {
      const testCase = await db('test_cases')
        .select('*')
        .where('id', testCaseId)
        .first();

      if (!testCase) {
        throw new NotFoundError('Test case not found');
      }

      return new TestCase(testCase);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to fetch test case', error);
    }
  }

  /**
   * Get all test cases for a problem
   */
  static async findByProblemId(problemId, includeSampleOnly = false) {
    try {
      let query = db('test_cases')
        .select('*')
        .where('problem_id', problemId);

      if (includeSampleOnly) {
        query = query.where('is_sample', true);
      }

      const testCases = await query.orderBy('is_sample', 'desc').orderBy('created_at');
      return testCases.map(testCase => new TestCase(testCase));
    } catch (error) {
      throw new DatabaseError('Failed to fetch test cases for problem', error);
    }
  }

  /**
   * Update test case
   */
  static async update(testCaseId, updateData, adminId) {
    const testCase = await this.findById(testCaseId);
    const { contest } = await this.checkAdminAccess(testCase.problem_id, adminId);

    // Check if contest is running and prevent changes to test cases
    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      throw new ValidationError('Cannot modify test cases while contest is running');
    }

    // Validate update data
    if (Object.keys(updateData).length > 0) {
      this.validateTestCaseData({ ...testCase, ...updateData });
    }

    try {
      // Log the changes for audit purposes
      const winston = require('winston');
      const logger = winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [
          new winston.transports.File({ filename: 'logs/audit.log' })
        ]
      });

      logger.info('Test case updated', {
        testCaseId,
        problemId: testCase.problem_id,
        adminId,
        changes: updateData,
        timestamp: new Date().toISOString(),
        action: 'testcase_update'
      });

      await db('test_cases')
        .where('id', testCaseId)
        .update(updateData);

      return await this.findById(testCaseId);
    } catch (error) {
      throw new DatabaseError('Failed to update test case', error);
    }
  }

  /**
   * Delete test case
   */
  static async delete(testCaseId, adminId) {
    const testCase = await this.findById(testCaseId);
    const { contest } = await this.checkAdminAccess(testCase.problem_id, adminId);

    // Check if contest is running and prevent changes to test cases
    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      throw new ValidationError('Cannot delete test cases while contest is running');
    }

    try {
      await db('test_cases').where('id', testCaseId).del();
      
      return { success: true, message: 'Test case deleted successfully' };
    } catch (error) {
      throw new DatabaseError('Failed to delete test case', error);
    }
  }

  /**
   * Bulk create test cases from CSV-like data
   */
  static async createBulk(testCasesData, problemId, adminId) {
    // Verify admin has access to this problem
    const { contest } = await this.checkAdminAccess(problemId, adminId);

    // Check if contest is running and prevent changes to test cases
    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      throw new ValidationError('Cannot add test cases while contest is running');
    }

    if (!Array.isArray(testCasesData) || testCasesData.length === 0) {
      throw new ValidationError('Test cases data must be a non-empty array');
    }

    // Validate all test cases before creating any
    testCasesData.forEach((testCaseData, index) => {
      try {
        this.validateTestCaseData(testCaseData);
      } catch (error) {
        throw new ValidationError(`Test case ${index + 1}: ${error.message}`);
      }
    });

    try {
      const testCasesToInsert = testCasesData.map(data => ({
        problem_id: problemId,
        input: data.input || '',
        expected_output: data.expected_output || '',
        is_sample: data.is_sample || false
      }));

      const insertedIds = await db('test_cases').insert(testCasesToInsert).returning('id');

      // Fetch all created test cases
      const createdTestCases = await Promise.all(
        insertedIds.map(id => this.findById(id))
      );

      return {
        success: true,
        created_count: createdTestCases.length,
        test_cases: createdTestCases
      };
    } catch (error) {
      throw new DatabaseError('Failed to create test cases in bulk', error);
    }
  }

  /**
   * Parse CSV data for bulk upload
   */
  static parseCSVData(csvContent) {
    try {
      const lines = csvContent.trim().split('\n');
      const testCases = [];

      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes('input') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parsing (handles basic cases)
        const parts = line.split(',').map(part => part.trim().replace(/^"|"$/g, ''));
        
        if (parts.length < 2) {
          throw new ValidationError(`Line ${i + 1}: Must have at least input and expected output`);
        }

        testCases.push({
          input: parts[0] || '',
          expected_output: parts[1] || '',
          is_sample: parts[2] ? parts[2].toLowerCase() === 'true' || parts[2] === '1' : false
        });
      }

      return testCases;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError('Failed to parse CSV data: ' + error.message);
    }
  }

  /**
   * Get test case statistics for a problem
   */
  static async getStatistics(problemId) {
    try {
      const [totalCount, sampleCount, hiddenCount] = await Promise.all([
        db('test_cases').where('problem_id', problemId).count('* as count').first(),
        db('test_cases').where('problem_id', problemId).where('is_sample', true).count('* as count').first(),
        db('test_cases').where('problem_id', problemId).where('is_sample', false).count('* as count').first()
      ]);

      return {
        total_count: parseInt(totalCount.count),
        sample_count: parseInt(sampleCount.count),
        hidden_count: parseInt(hiddenCount.count)
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch test case statistics', error);
    }
  }

  /**
   * Validate test case against expected format
   */
  static validateTestCaseFormat(input, expectedOutput, problemConstraints) {
    const warnings = [];
    
    // Check for trailing whitespace
    if (input.endsWith(' ') || input.endsWith('\t')) {
      warnings.push('Input has trailing whitespace');
    }
    if (expectedOutput.endsWith(' ') || expectedOutput.endsWith('\t')) {
      warnings.push('Expected output has trailing whitespace');
    }

    // Check for inconsistent line endings
    if (input.includes('\r\n') && input.includes('\n')) {
      warnings.push('Input has mixed line endings');
    }
    if (expectedOutput.includes('\r\n') && expectedOutput.includes('\n')) {
      warnings.push('Expected output has mixed line endings');
    }

    // Check for empty input/output when it might not be expected
    if (input.trim() === '' && expectedOutput.trim() !== '') {
      warnings.push('Empty input but non-empty output - verify this is correct');
    }

    return {
      isValid: true,
      warnings
    };
  }
}

module.exports = TestCase;
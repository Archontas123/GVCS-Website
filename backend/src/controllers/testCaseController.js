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
 * TestCase Model Class - Handles test case creation, management, and CRUD operations
 * Provides methods for managing problem test cases with validation and bulk operations
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
   * Validates test case data with comprehensive validation rules
   * @param {Object} data - The test case data to validate
   * @param {string} data.input - Test case input (required, can be empty string, max 10000 chars)
   * @param {string} data.expected_output - Expected output (required, can be empty string, max 10000 chars)
   * @param {boolean} [data.is_sample] - Whether this is a sample test case
   * @throws {ValidationError} When validation fails
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
   * Checks if an admin has permission to manage test cases for a problem
   * @param {number} problemId - The problem ID
   * @param {number} adminId - The admin ID
   * @returns {Promise<Object>} Object containing problem and contest data
   * @throws {AuthenticationError} When admin is not authorized
   * @throws {NotFoundError} When problem or contest not found
   * @throws {DatabaseError} When database operation fails
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
   * Creates a new test case with validation and contest state checks
   * @param {Object} testCaseData - The test case data
   * @param {number} problemId - The problem ID
   * @param {number} adminId - The admin ID creating the test case
   * @returns {Promise<TestCase>} The created test case instance
   * @throws {AuthenticationError} When admin is not authorized
   * @throws {ValidationError} When test case data is invalid or contest is running
   * @throws {DatabaseError} When database operation fails
   */
  static async create(testCaseData, problemId, adminId) {
    const { contest } = await this.checkAdminAccess(problemId, adminId);

    this.validateTestCaseData(testCaseData);

    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      throw new ValidationError('Cannot add test cases while contest is running');
    }

    try {
      const [result] = await db('test_cases').insert({
        problem_id: problemId,
        input: testCaseData.input || '',
        expected_output: testCaseData.expected_output || '',
        is_sample: testCaseData.is_sample || false
      }).returning('id');

      return await this.findById(result.id);
    } catch (error) {
      throw new DatabaseError('Failed to create test case', error);
    }
  }

  /**
   * Finds a test case by its ID
   * @param {number} testCaseId - The test case ID
   * @returns {Promise<TestCase>} The test case instance
   * @throws {NotFoundError} When test case is not found
   * @throws {DatabaseError} When database operation fails
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

    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      throw new ValidationError('Cannot modify test cases while contest is running');
    }

    if (Object.keys(updateData).length > 0) {
      this.validateTestCaseData({ ...testCase, ...updateData });
    }

    try {
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
    const { contest } = await this.checkAdminAccess(problemId, adminId);

    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      throw new ValidationError('Cannot add test cases while contest is running');
    }

    if (!Array.isArray(testCasesData) || testCasesData.length === 0) {
      throw new ValidationError('Test cases data must be a non-empty array');
    }

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

      const insertedResults = await db('test_cases').insert(testCasesToInsert).returning('id');

      const createdTestCases = await Promise.all(
        insertedResults.map(result => this.findById(result.id))
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

        const startIndex = lines[0].toLowerCase().includes('input') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

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
    
    if (input.endsWith(' ') || input.endsWith('\t')) {
      warnings.push('Input has trailing whitespace');
    }
    if (expectedOutput.endsWith(' ') || expectedOutput.endsWith('\t')) {
      warnings.push('Expected output has trailing whitespace');
    }

    if (input.includes('\r\n') && input.includes('\n')) {
      warnings.push('Input has mixed line endings');
    }
    if (expectedOutput.includes('\r\n') && expectedOutput.includes('\n')) {
      warnings.push('Expected output has mixed line endings');
    }

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
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
const TypeSystemService = require('../services/typeSystemService');

/**
 * TestCase Model Class - Handles test case creation, management, and CRUD operations
 * Provides methods for managing problem test cases with validation and bulk operations
 */
class TestCase {
  constructor(data) {
    this.id = data.id;
    this.problem_id = data.problem_id;

    // LeetCode-style fields (parse JSON strings if needed)
    this.input_parameters = this.parseJSON(data.input_parameters);
    this.expected_return = this.parseJSON(data.expected_return);
    this.parameter_types = this.parseJSON(data.parameter_types);
    this.test_case_name = data.test_case_name;
    this.explanation = data.explanation;
    this.converted_to_params = data.converted_to_params;

    // Common fields
    this.is_sample = data.is_sample;
    this.is_hidden = data.is_hidden;
    this.points = data.points;
    this.time_limit = data.time_limit;
    this.memory_limit = data.memory_limit;
    this.created_at = data.created_at;
  }

  /**
   * Helper method to parse JSON fields that might be strings
   * @param {*} value - The value to parse
   * @returns {*} Parsed JSON or original value
   */
  parseJSON(value) {
    if (value === null || value === undefined) {
      return value;
    }

    // If it's already an object or array, return as-is
    if (typeof value === 'object') {
      return value;
    }

    // If it's a string, try to parse it
    if (typeof value === 'string') {
      // Empty strings should return null
      if (value.trim() === '') {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch (error) {
        // If parsing fails, return the original string
        console.warn('Failed to parse JSON field:', error);
        return value;
      }
    }

    // For primitives (numbers, booleans), return as-is
    return value;
  }

  /**
   * Validates test case data before creation/update
   * @param {Object} data - Test case data to validate
   * @param {Array} problemParameters - Problem's function parameter definitions
   * @throws {ValidationError} When validation fails
   */
  static validateTestCaseData(data, problemParameters = null) {
    const errors = [];

    if (!data.test_case_name || typeof data.test_case_name !== 'string') {
      errors.push('Test case name is required and must be a string');
    }

    if (data.test_case_name && data.test_case_name.length > 200) {
      errors.push('Test case name must not exceed 200 characters');
    }

    if (!data.input_parameters) {
      errors.push('Input parameters are required');
    }

    if (!data.expected_return) {
      errors.push('Expected return value is required');
    }

    if (!data.parameter_types) {
      errors.push('Parameter types are required');
    }

    if (data.explanation && typeof data.explanation !== 'string') {
      errors.push('Explanation must be a string');
    }

    if (data.explanation && data.explanation.length > 1000) {
      errors.push('Explanation must not exceed 1000 characters');
    }

    if (data.is_sample !== undefined && typeof data.is_sample !== 'boolean') {
      errors.push('is_sample must be a boolean');
    }

    // Validate parameters against problem definition
    if (data.input_parameters && problemParameters) {
      try {
        this.validateParametersAgainstProblem(data, problemParameters);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(...error.details.map(d => d.message || d));
        } else {
          errors.push('Parameter validation failed: ' + error.message);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Test case validation failed', errors.map(msg => ({ message: msg })));
    }
  }

  /**
   * Validates test case parameters against problem definition
   * @param {Object} data - Test case data containing input_parameters
   * @param {Array} problemParameters - Problem's function parameter definitions
   * @throws {ValidationError} When parameter validation fails
   */
  static validateParametersAgainstProblem(data, problemParameters) {
    const errors = [];

    if (!data.input_parameters) {
      errors.push('Test cases require input_parameters');
      throw new ValidationError('Parameter validation failed', errors);
    }

    let inputParams;
    try {
      inputParams = typeof data.input_parameters === 'string' ?
        JSON.parse(data.input_parameters) : data.input_parameters;
    } catch (error) {
      errors.push('input_parameters must be valid JSON');
      throw new ValidationError('Parameter validation failed', errors);
    }

    // Check that all required parameters are provided and validate types
    problemParameters.forEach(paramDef => {
      const value = inputParams[paramDef.name];

      if (value === undefined) {
        errors.push(`Missing parameter: ${paramDef.name}`);
        return;
      }

      // Validate parameter type using bracket notation (INT, INT[], INT[][], etc.)
      const validationResult = TypeSystemService.validateParameter(value, paramDef.type);

      if (!validationResult.valid) {
        errors.push(`Parameter '${paramDef.name}': ${validationResult.error}`);
      }
    });

    // Check for extra parameters not defined in problem
    Object.keys(inputParams).forEach(paramName => {
      const isDefined = problemParameters.some(param => param.name === paramName);
      if (!isDefined) {
        errors.push(`Unexpected parameter: ${paramName}`);
      }
    });

    if (errors.length > 0) {
      throw new ValidationError('Parameter validation failed', errors);
    }
  }

  /**
   * Checks if an admin has permission to manage test cases for a problem
   * @param {number} problemId - The problem ID
   * @param {number} adminId - The admin ID
   * @returns {Promise<Object>} Object containing problem and contest data
   * @throws {NotFoundError} When problem or contest not found
   * @throws {DatabaseError} When database operation fails
   */
  static async checkAdminAccess(problemId, adminId) {
    try {
      const problem = await Problem.findById(problemId);
      const contest = await Contest.findById(problem.contest_id);

      // Any admin can manage test cases
      return { problem, contest };
    } catch (error) {
      if (error instanceof NotFoundError) {
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
    const { contest, problem } = await this.checkAdminAccess(problemId, adminId);

    // Get problem parameters for validation
    let problemParameters = null;
    if (problem.function_parameters) {
      try {
        // Check if it's already an object
        if (typeof problem.function_parameters === 'object') {
          problemParameters = problem.function_parameters;
        } else if (typeof problem.function_parameters === 'string' && problem.function_parameters.trim() !== '') {
          problemParameters = JSON.parse(problem.function_parameters);
        }
      } catch (error) {
        console.warn('Failed to parse problem function_parameters:', error);
        console.warn('function_parameters value:', problem.function_parameters);
        console.warn('function_parameters type:', typeof problem.function_parameters);
        // Continue with null parameters - validation will handle it
      }
    }

    this.validateTestCaseData(testCaseData, problemParameters);

    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      throw new ValidationError('Cannot add test cases while contest is running');
    }

    try {
      // Helper to ensure valid JSON for database JSON columns
      const ensureValidJson = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
          // Check if it's already valid JSON
          try {
            JSON.parse(value);
            return value; // Already valid JSON string
          } catch {
            // Not valid JSON, so wrap it as a JSON string
            return JSON.stringify(value);
          }
        }
        // It's an object/array, stringify it
        return JSON.stringify(value);
      };

      const insertData = {
        problem_id: problemId,
        test_case_name: testCaseData.test_case_name,
        input_parameters: ensureValidJson(testCaseData.input_parameters),
        expected_return: ensureValidJson(testCaseData.expected_return),
        parameter_types: ensureValidJson(testCaseData.parameter_types),
        explanation: testCaseData.explanation || '',
        is_sample: testCaseData.is_sample || false,
        converted_to_params: true
      };

      const [result] = await db('test_cases').insert(insertData).returning('id');

      return await this.findById(result.id);
    } catch (error) {
      console.error('Test case creation error:', error);
      console.error('Test case data received:', testCaseData);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        column: error.column
      });
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
      // Helper to ensure valid JSON for database JSON columns
      const ensureValidJson = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
            return value; // Already valid JSON string
          } catch {
            return JSON.stringify(value);
          }
        }
        return JSON.stringify(value);
      };

      const testCasesToInsert = testCasesData.map(data => ({
        problem_id: problemId,
        test_case_name: data.test_case_name,
        input_parameters: ensureValidJson(data.input_parameters),
        expected_return: ensureValidJson(data.expected_return),
        parameter_types: ensureValidJson(data.parameter_types),
        explanation: data.explanation || '',
        is_sample: data.is_sample || false,
        converted_to_params: true
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
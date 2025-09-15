const { db } = require('../utils/db');
const { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  ConflictError,
  DatabaseError 
} = require('../utils/errors');
const Contest = require('./contestController');
const partialScoringService = require('../services/partialScoringService');

/**
 * Problem Model Class - Handles problem creation, management, and CRUD operations
 * Provides methods for managing contest problems, test cases, and scoring
 */
class Problem {
  constructor(data) {
    this.id = data.id;
    this.contest_id = data.contest_id;
    this.problem_letter = data.problem_letter;
    this.title = data.title;
    this.description = data.description;
    this.input_format = data.input_format;
    this.output_format = data.output_format;
    this.sample_input = data.sample_input;
    this.sample_output = data.sample_output;
    this.constraints = data.constraints;
    this.time_limit = data.time_limit;
    this.memory_limit = data.memory_limit;
    this.difficulty = data.difficulty;
    this.max_points = data.max_points;
    this.created_at = data.created_at;
  }

  /**
   * Validates problem data with comprehensive validation rules
   * @param {Object} data - The problem data to validate
   * @param {string} data.title - Problem title (3-255 chars)
   * @param {string} data.description - Problem description (required, max 10000 chars)
   * @param {string} data.input_format - Input format description (min 5 chars, max 2000)
   * @param {string} data.output_format - Output format description (required, max 2000)
   * @param {string} [data.constraints] - Problem constraints (max 2000 chars)
   * @param {string} [data.sample_input] - Sample input (max 5000 chars)
   * @param {string} [data.sample_output] - Sample output (max 5000 chars)
   * @param {number} [data.time_limit] - Time limit in ms (100-30000)
   * @param {number} [data.memory_limit] - Memory limit in MB (16-2048)
   * @param {string} [data.difficulty] - Difficulty level (easy/medium/hard)
   * @param {number} [data.max_points] - Maximum points (1-1000)
   * @throws {ValidationError} When validation fails
   */
  static validateProblemData(data) {
    const errors = [];

    if (!data.title || data.title.trim().length < 3) {
      errors.push('Problem title must be at least 3 characters long');
    }
    if (data.title && data.title.length > 255) {
      errors.push('Problem title must not exceed 255 characters');
    }
    
    if (!data.description) {
      errors.push('Problem description is required');
    }
    if (data.description && data.description.length > 10000) {
      errors.push('Problem description must not exceed 10000 characters');
    }

    if (!data.input_format || data.input_format.trim().length < 5) {
      errors.push('Input format must be at least 5 characters long');
    }
    if (data.input_format && data.input_format.length > 2000) {
      errors.push('Input format must not exceed 2000 characters');
    }

    if (!data.output_format) {
      errors.push('Output format is required');
    }
    if (data.output_format && data.output_format.length > 2000) {
      errors.push('Output format must not exceed 2000 characters');
    }

    if (data.constraints && data.constraints.length > 2000) {
      errors.push('Constraints must not exceed 2000 characters');
    }

    if (data.sample_input && data.sample_input.length > 5000) {
      errors.push('Sample input must not exceed 5000 characters');
    }

    if (data.sample_output && data.sample_output.length > 5000) {
      errors.push('Sample output must not exceed 5000 characters');
    }

    if (data.time_limit && (data.time_limit < 100 || data.time_limit > 30000)) {
      errors.push('Time limit must be between 100ms and 30000ms');
    }

    if (data.memory_limit && (data.memory_limit < 16 || data.memory_limit > 2048)) {
      errors.push('Memory limit must be between 16MB and 2048MB');
    }

    if (data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
      errors.push('Difficulty must be easy, medium, or hard');
    }

    if (data.max_points !== undefined && (data.max_points < 1 || data.max_points > 1000)) {
      errors.push('Max points must be between 1 and 1000');
    }

    if (errors.length > 0) {
      throw new ValidationError('Problem validation failed', errors.map(msg => ({ message: msg })));
    }
  }

  /**
   * Gets the next available problem letter (A-Z) for a contest
   * @param {number} contestId - The contest ID
   * @returns {Promise<string>} The next available letter
   * @throws {ValidationError} When maximum problems (26) reached
   * @throws {DatabaseError} When database operation fails
   */
  static async getNextProblemLetter(contestId) {
    try {
      const existingLetters = await db('problems')
        .where('contest_id', contestId)
        .select('problem_letter')
        .orderBy('problem_letter');

      const usedLetters = existingLetters.map(p => p.problem_letter);
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      for (let i = 0; i < alphabet.length; i++) {
        const letter = alphabet[i];
        if (!usedLetters.includes(letter)) {
          return letter;
        }
      }

      throw new ValidationError('Maximum number of problems (26) reached for this contest');
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new DatabaseError('Failed to determine next problem letter', error);
    }
  }

  /**
   * Checks if a problem letter is available in a contest
   * @param {number} contestId - The contest ID
   * @param {string} letter - The problem letter to check
   * @param {number} [excludeProblemId] - Problem ID to exclude from check
   * @returns {Promise<boolean>} True if letter is available
   * @throws {DatabaseError} When database operation fails
   */
  static async isProblemLetterAvailable(contestId, letter, excludeProblemId = null) {
    try {
      let query = db('problems')
        .where('contest_id', contestId)
        .where('problem_letter', letter.toUpperCase());

      if (excludeProblemId) {
        query = query.where('id', '!=', excludeProblemId);
      }

      const existing = await query.first();
      return !existing;
    } catch (error) {
      throw new DatabaseError('Failed to check problem letter availability', error);
    }
  }

  /**
   * Creates a new problem with validation and automatic test case creation
   * @param {Object} problemData - The problem data
   * @param {number} contestId - The contest ID
   * @param {number} adminId - The admin ID creating the problem
   * @returns {Promise<Problem>} The created problem instance
   * @throws {AuthenticationError} When admin is not authorized
   * @throws {ValidationError} When problem data is invalid
   * @throws {ConflictError} When problem letter is already used
   * @throws {DatabaseError} When database operation fails
   */
  static async create(problemData, contestId, adminId) {
    const contest = await Contest.findById(contestId);
    if (contest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to create problems for this contest');
    }

    this.validateProblemData(problemData);

    let problemLetter;
    if (problemData.problem_letter) {
      problemLetter = problemData.problem_letter.toUpperCase();
      const isAvailable = await this.isProblemLetterAvailable(contestId, problemLetter);
      if (!isAvailable) {
        throw new ConflictError(`Problem letter ${problemLetter} is already used in this contest`);
      }
    } else {
      problemLetter = await this.getNextProblemLetter(contestId);
    }

    try {
      const result = await db('problems').insert({
        contest_id: contestId,
        problem_letter: problemLetter,
        title: problemData.title.trim(),
        description: problemData.description.trim(),
        input_format: problemData.input_format.trim(),
        output_format: problemData.output_format.trim(),
        sample_input: problemData.sample_input ? problemData.sample_input.trim() : null,
        sample_output: problemData.sample_output ? problemData.sample_output.trim() : null,
        constraints: problemData.constraints ? problemData.constraints.trim() : null,
        time_limit: problemData.time_limit || 2000,
        memory_limit: problemData.memory_limit || 256,
        difficulty: problemData.difficulty || 'medium',
        max_points: problemData.max_points || 100
      }).returning('id');
      
      const problemId = Array.isArray(result) ? result[0].id || result[0] : result.id || result;

      if (problemData.sample_input && problemData.sample_output) {
        await db('test_cases').insert({
          problem_id: problemId,
          input: problemData.sample_input.trim(),
          expected_output: problemData.sample_output.trim(),
          is_sample: true
        });
      }

      const createdProblem = await this.findById(problemId);
      
      await partialScoringService.calculateProblemPoints(problemId);
      
      return createdProblem;
    } catch (error) {
      console.error('Problem creation error details:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail
      });
      throw new DatabaseError('Failed to create problem', error);
    }
  }

  /**
   * Find problem by ID
   */
  static async findById(problemId) {
    try {
      const problem = await db('problems')
        .select('*')
        .where('id', problemId)
        .first();

      if (!problem) {
        throw new NotFoundError('Problem not found');
      }

      return new Problem(problem);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to fetch problem', error);
    }
  }

  /**
   * Get all problems for a contest
   */
  static async findByContestId(contestId, includeStatistics = false) {
    try {
      const problems = await db('problems')
        .select('*')
        .where('contest_id', contestId)
        .orderBy('problem_letter');

      const problemInstances = problems.map(problem => new Problem(problem));

      if (includeStatistics) {
        const problemsWithStats = await Promise.all(
          problemInstances.map(async (problem) => {
            const stats = await this.getStatistics(problem.id);
            return { ...problem, statistics: stats };
          })
        );
        return problemsWithStats;
      }

      return problemInstances;
    } catch (error) {
      throw new DatabaseError('Failed to fetch problems for contest', error);
    }
  }

  /**
   * Update problem
   */
  static async update(problemId, updateData, adminId) {
    const problem = await this.findById(problemId);
    const contest = await Contest.findById(problem.contest_id);
    
    if (contest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to update this problem');
    }

    const contestStatus = Contest.getContestStatus(contest);
    if (contestStatus.status === 'running' || contestStatus.status === 'frozen') {
      const allowedFields = ['constraints', 'time_limit', 'memory_limit'];
      const attemptedFields = Object.keys(updateData);
      const disallowedFields = attemptedFields.filter(field => !allowedFields.includes(field));
      
      if (disallowedFields.length > 0) {
        throw new ValidationError(`Cannot update ${disallowedFields.join(', ')} while contest is running`);
      }
    }

    if (Object.keys(updateData).some(key => ['title', 'description', 'input_format', 'output_format'].includes(key))) {
      this.validateProblemData({ ...problem, ...updateData });
    }

    if (updateData.problem_letter) {
      const newLetter = updateData.problem_letter.toUpperCase();
      if (newLetter !== problem.problem_letter) {
        const isAvailable = await this.isProblemLetterAvailable(problem.contest_id, newLetter, problemId);
        if (!isAvailable) {
          throw new ConflictError(`Problem letter ${newLetter} is already used in this contest`);
        }
        updateData.problem_letter = newLetter;
      }
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

      logger.info('Problem updated', {
        problemId,
        contestId: problem.contest_id,
        adminId,
        changes: updateData,
        timestamp: new Date().toISOString(),
        action: 'problem_update'
      });

      await db('problems')
        .where('id', problemId)
        .update(updateData);

      return await this.findById(problemId);
    } catch (error) {
      throw new DatabaseError('Failed to update problem', error);
    }
  }

  /**
   * Delete problem
   */
  static async delete(problemId, adminId) {
    const problem = await this.findById(problemId);
    const contest = await Contest.findById(problem.contest_id);
    
    if (contest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to delete this problem');
    }

    const submissionsCount = await db('submissions')
      .where('problem_id', problemId)
      .count('* as count')
      .first();

    if (parseInt(submissionsCount.count) > 0) {
      throw new ConflictError('Cannot delete problem that has submissions. Consider archiving instead.');
    }

    try {
      await db('problems').where('id', problemId).del();
      
      return { success: true, message: 'Problem deleted successfully' };
    } catch (error) {
      throw new DatabaseError('Failed to delete problem', error);
    }
  }

  /**
   * Get all problems created by an admin (across all contests)
   */
  static async findByAdminId(adminId) {
    try {
      const problems = await db('problems')
        .join('contests', 'problems.contest_id', 'contests.id')
        .select(
          'problems.*',
          'contests.contest_name',
          'contests.created_by'
        )
        .where('contests.created_by', adminId)
        .orderBy('problems.created_at', 'desc');

      const problemInstances = problems.map(problem => {
        const problemData = { ...problem };
        delete problemData.contest_name;
        delete problemData.created_by;
        return {
          ...new Problem(problemData),
          contest_name: problem.contest_name
        };
      });

      return problemInstances;
    } catch (error) {
      throw new DatabaseError('Failed to fetch problems for admin', error);
    }
  }

  /**
   * Copy a problem to another contest
   */
  static async copyToContest(originalProblemId, targetContestId, adminId) {
    try {
        const originalProblem = await this.findById(originalProblemId);
      
      const originalContest = await Contest.findById(originalProblem.contest_id);
      if (originalContest.created_by !== adminId) {
        throw new AuthenticationError('Not authorized to copy this problem');
      }

      const targetContest = await Contest.findById(targetContestId);
      if (targetContest.created_by !== adminId) {
        throw new AuthenticationError('Not authorized to add problems to this contest');
      }

      const existingProblems = await this.findByContestId(targetContestId);
      const usedLetters = existingProblems.map(p => p.problem_letter).sort();
      
      let nextLetter = 'A';
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i); // A-Z
        if (!usedLetters.includes(letter)) {
          nextLetter = letter;
          break;
        }
      }

      if (usedLetters.length >= 26) {
        throw new ValidationError('Contest already has maximum number of problems (26)');
      }

      const newProblemData = {
        title: originalProblem.title,
        description: originalProblem.description,
        input_format: originalProblem.input_format,
        output_format: originalProblem.output_format,
        sample_input: originalProblem.sample_input,
        sample_output: originalProblem.sample_output,
        constraints: originalProblem.constraints,
        time_limit: originalProblem.time_limit,
        memory_limit: originalProblem.memory_limit,
        difficulty: originalProblem.difficulty,
        problem_letter: nextLetter
      };

      const copiedProblem = await this.create(newProblemData, targetContestId, adminId);

      const TestCase = require('./testCaseController');
      const originalTestCases = await TestCase.findByProblemId(originalProblemId);
      
      for (const testCase of originalTestCases) {
        await TestCase.create({
          input: testCase.input,
          expected_output: testCase.expected_output,
          is_sample: testCase.is_sample
        }, copiedProblem.id, adminId);
      }

      return copiedProblem;
    } catch (error) {
      throw new DatabaseError('Failed to copy problem to contest', error);
    }
  }

  /**
   * Get problem statistics
   */
  static async getStatistics(problemId) {
    try {
      const [testCasesCount, submissionsCount, acceptedCount, uniqueSolvers] = await Promise.all([
        db('test_cases').where('problem_id', problemId).count('* as count').first(),
        db('submissions').where('problem_id', problemId).count('* as count').first(),
        db('submissions').where('problem_id', problemId).where('status', 'accepted').count('* as count').first(),
        db('submissions')
          .where('problem_id', problemId)
          .where('status', 'accepted')
          .countDistinct('team_id as count')
          .first()
      ]);

      const totalSubmissions = parseInt(submissionsCount.count);
      const acceptedSubmissions = parseInt(acceptedCount.count);
      const acceptanceRate = totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions * 100) : 0;

      return {
        test_cases_count: parseInt(testCasesCount.count),
        total_submissions: totalSubmissions,
        accepted_submissions: acceptedSubmissions,
        unique_solvers: parseInt(uniqueSolvers.count),
        acceptance_rate: Math.round(acceptanceRate * 100) / 100
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch problem statistics', error);
    }
  }

  /**
   * Set problem points and recalculate test case distribution
   */
  static async setProblemPoints(problemId, maxPoints, adminId) {
    const problem = await this.findById(problemId);
    const contest = await Contest.findById(problem.contest_id);
    
    if (contest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to update this problem');
    }

    if (maxPoints < 1 || maxPoints > 1000) {
      throw new ValidationError('Max points must be between 1 and 1000');
    }

    try {
      await partialScoringService.setProblemPoints(problemId, maxPoints);
      return await this.findById(problemId);
    } catch (error) {
      throw new DatabaseError('Failed to set problem points', error);
    }
  }

  /**
   * Get problem scoring statistics
   */
  static async getScoringStats(problemId, adminId) {
    const problem = await this.findById(problemId);
    const contest = await Contest.findById(problem.contest_id);
    
    if (contest.created_by !== adminId) {
      throw new AuthenticationError('Not authorized to view scoring stats for this problem');
    }

    try {
      return await partialScoringService.getProblemScoringStats(problemId);
    } catch (error) {
      throw new DatabaseError('Failed to get problem scoring statistics', error);
    }
  }

}

module.exports = Problem;
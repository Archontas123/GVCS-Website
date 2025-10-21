/**
 * @module TeamRoutes
 * @description Team Management API for Programming Contest Platform
 * 
 * This module provides comprehensive team management functionality:
 * - Team registration with validation and contest enrollment
 * - Secure authentication with JWT tokens and session management
 * - Team status monitoring with contest timing and progress tracking
 * - Contest problem access with proper authorization
 * - Submission statistics and performance tracking
 * - Session management with secure logout functionality
 * 
 * Supports multi-contest environments with proper isolation between contests
 * and includes comprehensive validation and error handling.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');
const { generateToken, generateSessionToken } = require('../utils/auth');
const { validate, teamRegistrationSchema, teamLoginSchema } = require('../utils/validation');
const { authenticateTeam } = require('../middleware/auth');
const Contest = require('../controllers/contestController');

/**
 * Transform problem object from snake_case to camelCase for frontend consumption
 * @param {Object} problem - Problem object with snake_case fields
 * @returns {Object} Problem object with camelCase fields
 */
const transformProblemToFrontend = (problem) => {
  return {
    id: problem.id,
    contestId: problem.contest_id,
    contest_id: problem.contest_id, // Also include snake_case for compatibility
    problemLetter: problem.problem_letter,
    title: problem.title,
    description: problem.description,
    inputFormat: problem.input_format,
    outputFormat: problem.output_format,
    sampleInput: problem.sample_input,
    sampleOutput: problem.sample_output,
    constraints: problem.constraints,
    timeLimit: problem.time_limit,
    memoryLimit: problem.memory_limit,
    difficulty: problem.difficulty,
    maxPoints: problem.max_points,
    // LeetCode-style fields
    uses_leetcode_style: problem.uses_leetcode_style,
    function_signature_cpp: problem.function_signature_cpp,
    function_signature_java: problem.function_signature_java,
    function_signature_python: problem.function_signature_python,
    function_name: problem.function_name,
    function_parameters: problem.function_parameters,
    return_type: problem.return_type,
    // Additional fields that might be present
    attemptCount: problem.attempt_count,
    isSolved: problem.is_solved,
    solvedAt: problem.solved_at,
    firstSubmission: problem.first_submission,
    sampleTestCases: problem.sample_test_cases
  };
};

/**
 * @route POST /api/team/register
 * @description Register a new team for a programming contest
 * 
 * Creates a new team registration including validation, password hashing,
 * contest enrollment, and initial scoring setup. Generates JWT token for
 * immediate authentication after successful registration.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Registration data (validated by teamRegistrationSchema)
 * @param {string} req.body.teamName - Unique team name within contest
 * @param {string} req.body.contestCode - Contest registration code
 * @param {string} req.body.password - Team password (will be hashed)
 * @param {string} req.body.schoolName - School or organization name
 * @param {Array} req.body.memberNames - Array of team member names
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with registration confirmation
 * @returns {boolean} returns.success - Registration success status
 * @returns {string} returns.message - Success message
 * @returns {Object} returns.data - Registration data
 * @returns {number} returns.data.teamId - Generated team identifier
 * @returns {string} returns.data.teamName - Registered team name
 * @returns {number} returns.data.contestId - Contest identifier
 * @returns {string} returns.data.contestCode - Contest code
 * @returns {string} returns.data.contestName - Contest name
 * @returns {string} returns.data.schoolName - School name
 * @returns {Array} returns.data.memberNames - Team member names
 * @returns {string} returns.data.token - JWT authentication token
 * @returns {string} returns.data.registeredAt - Registration timestamp
 * 
 * @throws {400} Invalid contest code
 * @throws {409} Team name already exists for this contest
 * @throws {500} Database or registration errors
 * 
 * @requires Validation via teamRegistrationSchema
 * 
 * Registration Process:
 * 1. Validates contest code and checks if contest is active
 * 2. Checks for duplicate team names within the contest
 * 3. Hashes the password securely using bcrypt
 * 4. Creates team record with session token
 * 5. Enrolls team in contest (team_contests table)
 * 6. Initializes contest results record
 * 7. Generates JWT token for authentication
 * 
 * @example
 * POST /api/team/register
 * Content-Type: application/json
 * 
 * {
 *   "teamName": "CodeMasters",
 *   "contestCode": "SPRING2025",
 *   "password": "securePassword123",
 *   "schoolName": "University of Technology",
 *   "memberNames": ["Alice Smith", "Bob Johnson", "Carol Davis"]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Team registered successfully",
 *   "data": {
 *     "teamId": 123,
 *     "teamName": "CodeMasters",
 *     "contestId": 456,
 *     "contestCode": "SPRING2025",
 *     "contestName": "Spring Programming Contest",
 *     "token": "eyJhbGciOiJIUzI1NiIs..."
 *   }
 * }
 */
router.post('/register', validate(teamRegistrationSchema), async (req, res, next) => {
  try {
    const { teamName, contestCode, password, schoolName, members } = req.body;

    const contest = await db('contests')
      .where({ registration_code: contestCode })
      .andWhere({ is_active: true })
      .first();

    if (!contest) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contest code',
        error: 'INVALID_CONTEST_CODE'
      });
    }


    const existingTeam = await db('teams')
      .where({ team_name: teamName })
      .andWhere({ contest_code: contestCode })
      .first();

    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: 'Team name already exists for this contest',
        error: 'DUPLICATE_TEAM_NAME'
      });
    }

    // Hash the password
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const sessionToken = generateSessionToken();

    // Build team insert object with member data
    const teamData = {
      team_name: teamName,
      contest_code: contestCode,
      password_hash: passwordHash,
      school_name: schoolName,
      session_token: sessionToken,
      registered_at: db.fn.now(),
      last_activity: db.fn.now(),
      is_active: true
    };

    // Add member first and last names
    if (members && members.length > 0) {
      members.forEach((member, index) => {
        if (index < 3) { // Only support up to 3 members
          const memberNum = index + 1;
          teamData[`member${memberNum}_first_name`] = member.firstName || '';
          teamData[`member${memberNum}_last_name`] = member.lastName || '';
        }
      });
      // Store as JSON for backward compatibility
      teamData.member_names = JSON.stringify(members.map(m => m.lastName));
    }

    const [teamResult] = await db('teams')
      .insert(teamData)
      .returning('id');

    const teamId = teamResult.id;

    // Team is already linked to contest via contest_code, no need for team_contests table

    await db('contest_results').insert({
      contest_id: contest.id,
      team_id: teamId,
      problems_solved: 0,
      penalty_time: 0,
      updated_at: db.fn.now()
    });
    
    const jwtToken = generateToken({
      teamId,
      teamName: teamName,
      contestCode: contestCode,
      sessionToken
    });
    
    res.status(201).json({
      success: true,
      message: 'Team registered successfully',
      data: {
        teamId,
        teamName: teamName,
        contestId: contest.id,
        contestCode: contestCode,
        contestName: contest.contest_name,
        schoolName: schoolName,
        members: members,
        token: jwtToken,
        registeredAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        message: 'Team name already exists for this contest',
        error: 'DUPLICATE_TEAM_NAME'
      });
    }

    // Log the actual error for debugging
    console.error('Team registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });

    const dbError = new Error('Registration failed');
    dbError.name = 'DatabaseError';
    next(dbError);
  }
});

/**
 * @route POST /api/team/login
 * @description Authenticate team with credentials
 * 
 * Authenticates team using team name and password, validates credentials,
 * generates new session token for security, and returns JWT token for
 * subsequent API requests.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Login credentials (validated by teamLoginSchema)
 * @param {string} req.body.teamName - Team name for authentication
 * @param {string} req.body.password - Team password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with authentication data
 * @returns {boolean} returns.success - Authentication success status
 * @returns {string} returns.message - Success message
 * @returns {Object} returns.data - Authentication data
 * @returns {number} returns.data.teamId - Team identifier
 * @returns {string} returns.data.teamName - Team name
 * @returns {string} returns.data.contestCode - Contest code
 * @returns {string} returns.data.contestName - Contest name
 * @returns {string} returns.data.schoolName - School name
 * @returns {Array} returns.data.memberNames - Team member names (parsed from JSON)
 * @returns {string} returns.data.token - JWT authentication token
 * @returns {string} returns.data.lastActivity - Login timestamp
 * 
 * @throws {401} Invalid credentials or inactive contest
 * @throws {500} Database or authentication errors
 * 
 * @requires Validation via teamLoginSchema
 * 
 * Authentication Process:
 * 1. Looks up team by name and checks if active
 * 2. Verifies password using bcrypt comparison
 * 3. Validates associated contest is active
 * 4. Generates new session token for security
 * 5. Updates last activity timestamp
 * 6. Creates JWT token with team and session information
 * 
 * @example
 * POST /api/team/login
 * Content-Type: application/json
 * 
 * {
 *   "teamName": "CodeMasters",
 *   "password": "securePassword123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "teamId": 123,
 *     "teamName": "CodeMasters",
 *     "contestCode": "SPRING2025",
 *     "contestName": "Spring Programming Contest",
 *     "schoolName": "University of Technology",
 *     "memberNames": ["Alice Smith", "Bob Johnson"],
 *     "token": "eyJhbGciOiJIUzI1NiIs...",
 *     "lastActivity": "2025-01-15T10:30:00.000Z"
 *   }
 * }
 */
router.post('/login', validate(teamLoginSchema), async (req, res, next) => {
  try {
    const { teamName, password } = req.body;
    
    const team = await db('teams')
      .where({ team_name: teamName })
      .andWhere({ is_active: true })
      .first();
    
    if (!team) {
      return res.status(401).json({
        success: false,
        message: 'Invalid team name or password',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const passwordValid = await bcrypt.compare(password, team.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid team name or password',
        error: 'INVALID_CREDENTIALS'
      });
    }
    
    const contest = await db('contests')
      .where({ registration_code: team.contest_code })
      .andWhere({ is_active: true })
      .first();
    
    if (!contest) {
      return res.status(401).json({
        success: false,
        message: 'Contest not found or inactive',
        error: 'INVALID_CONTEST'
      });
    }
    
    const newSessionToken = generateSessionToken();
    
    await db('teams')
      .where({ id: team.id })
      .update({
        session_token: newSessionToken,
        last_activity: db.fn.now()
      });
    
    const jwtToken = generateToken({
      teamId: team.id,
      teamName: team.team_name,
      contestCode: team.contest_code,
      sessionToken: newSessionToken
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        teamId: team.id,
        teamName: team.team_name,
        contestCode: team.contest_code,
        contestName: contest.contest_name,
        schoolName: team.school_name,
        memberNames: team.member_names ? JSON.parse(team.member_names) : [],
        token: jwtToken,
        lastActivity: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const dbError = new Error('Login failed');
    dbError.name = 'DatabaseError';
    next(dbError);
  }
});

/**
 * @route GET /api/team/status
 * @description Get comprehensive team status and contest information
 * 
 * Retrieves detailed team status including contest timing, progress,
 * submission statistics, and current standings. Provides real-time
 * contest state information for team dashboard displays.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier
 * @param {string} req.team.contestCode - Contest code
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with team status data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Team status information
 * @returns {Object} returns.data.team - Team information
 * @returns {number} returns.data.team.id - Team identifier
 * @returns {string} returns.data.team.name - Team name
 * @returns {string} returns.data.team.registeredAt - Registration timestamp
 * @returns {string} returns.data.team.lastActivity - Last activity timestamp
 * @returns {Object} returns.data.contest - Contest information and timing
 * @returns {number} returns.data.contest.id - Contest identifier
 * @returns {string} returns.data.contest.name - Contest name
 * @returns {string} returns.data.contest.code - Contest code
 * @returns {string} returns.data.contest.status - Contest status (not_started|running|ended)
 * @returns {string} returns.data.contest.startTime - Contest start time
 * @returns {number} returns.data.contest.duration - Contest duration (minutes)
 * @returns {number} [returns.data.contest.timeUntilStart] - Time until start (ms)
 * @returns {number} [returns.data.contest.timeRemaining] - Time remaining (ms)
 * @returns {string} [returns.data.contest.freezeTime] - Score freeze time
 * @returns {Object} returns.data.results - Team performance and results
 * @returns {number} returns.data.results.problemsSolved - Number of problems solved
 * @returns {number} returns.data.results.penaltyTime - Accumulated penalty time
 * @returns {number} [returns.data.results.rank] - Current team rank
 * @returns {number} returns.data.results.totalSubmissions - Total submissions count
 * 
 * @throws {404} Contest not found
 * @throws {500} Database query errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * Contest Status Calculation:
 * - 'not_started': Current time is before contest start
 * - 'running': Contest is currently active
 * - 'ended': Contest has finished
 * 
 * @example
 * GET /api/team/status
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "team": {
 *       "id": 123,
 *       "name": "CodeMasters",
 *       "registeredAt": "2025-01-15T08:00:00.000Z",
 *       "lastActivity": "2025-01-15T10:30:00.000Z"
 *     },
 *     "contest": {
 *       "id": 456,
 *       "name": "Spring Programming Contest",
 *       "status": "running",
 *       "timeRemaining": 5400000
 *     },
 *     "results": {
 *       "problemsSolved": 3,
 *       "penaltyTime": 180,
 *       "rank": 5,
 *       "totalSubmissions": 12
 *     }
 *   }
 * }
 */
router.get('/status', authenticateTeam, async (req, res, next) => {
  try {
    const team = req.team;
    
    const contest = await db('contests')
      .where({ registration_code: team.contestCode })
      .first();
    
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found',
        error: 'CONTEST_NOT_FOUND'
      });
    }
    
    const contestResults = await db('contest_results')
      .where({ 
        contest_id: contest.id, 
        team_id: team.id 
      })
      .first();
    
    const statusSnapshot = Contest.getContestStatus(contest);
    
    const contestStatus = statusSnapshot.status;
    const timeRemaining = statusSnapshot.time_remaining_seconds !== null
      ? statusSnapshot.time_remaining_seconds
      : null;
    const timeUntilStart = statusSnapshot.time_until_start_seconds !== null
      ? statusSnapshot.time_until_start_seconds
      : null;
    
    const submissionCount = await db('submissions')
      .where({ team_id: team.id })
      .count('id as count')
      .first();
    
    res.json({
      success: true,
      data: {
        team: {
          id: team.id,
          teamName: team.name,
          name: team.name,
          contestCode: team.contestCode,
          registeredAt: team.registeredAt,
          lastActivity: team.lastActivity,
          sessionToken: team.sessionToken,
          isActive: team.isActive
        },
        contest: {
          id: contest.id,
          name: contest.contest_name,
          code: team.contestCode,
          status: contestStatus,
          startTime: statusSnapshot.start_time,
          duration: contest.duration,
          timeUntilStart,
          timeRemaining,
          freezeTime: contest.freeze_time,
          manualControl: statusSnapshot.manual_control,
          isFrozen: statusSnapshot.is_frozen
        },
        results: {
          problemsSolved: contestResults?.problems_solved || 0,
          penaltyTime: contestResults?.penalty_time || 0,
          rank: contestResults?.rank || null,
          totalSubmissions: parseInt(submissionCount.count) || 0
        }
      }
    });
    
  } catch (error) {
    const dbError = new Error('Failed to get team status');
    dbError.name = 'DatabaseError';
    next(dbError);
  }
});

/**
 * @route POST /api/team/logout
 * @description Logout team and invalidate session
 * 
 * Securely logs out the team by invalidating the session token,
 * marking the team as inactive, and updating the last activity timestamp.
 * This ensures the JWT token becomes invalid for future requests.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with logout confirmation
 * @returns {boolean} returns.success - Logout success status
 * @returns {string} returns.message - Logout confirmation message
 * 
 * @throws {500} Database update errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * Logout Process:
 * 1. Clears the session token in database
 * 2. Marks team as inactive
 * 3. Updates last activity timestamp
 * 4. Invalidates current JWT token
 * 
 * @example
 * POST /api/team/logout
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Logout successful"
 * }
 */
router.post('/logout', authenticateTeam, async (req, res, next) => {
  try {
    await db('teams')
      .where({ id: req.team.id })
      .update({
        session_token: null,
        is_active: false,
        last_activity: db.fn.now()
      });
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    const dbError = new Error('Logout failed');
    dbError.name = 'DatabaseError';
    next(dbError);
  }
});


/**
 * @route GET /api/team/contest/problems
 * @description Get all problems for the team's contest with sample test cases
 * 
 * Retrieves all problems available in the team's contest including problem
 * statements, constraints, sample inputs/outputs, and sample test cases.
 * Only accessible after contest has started.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with contest problems
 * @returns {boolean} returns.success - Operation success status
 * @returns {Array} returns.data - Array of problem objects
 * @returns {number} returns.data[].id - Problem identifier
 * @returns {string} returns.data[].problem_letter - Problem letter (A, B, C, etc.)
 * @returns {string} returns.data[].title - Problem title
 * @returns {string} returns.data[].description - Problem description
 * @returns {string} returns.data[].input_format - Input format specification
 * @returns {string} returns.data[].output_format - Output format specification
 * @returns {string} returns.data[].sample_input - Sample input data
 * @returns {string} returns.data[].sample_output - Sample output data
 * @returns {string} returns.data[].constraints - Problem constraints
 * @returns {number} returns.data[].time_limit - Time limit in milliseconds
 * @returns {number} returns.data[].memory_limit - Memory limit in MB
 * @returns {string} returns.data[].difficulty - Difficulty level
 * @returns {Array} returns.data[].sample_test_cases - Sample test cases
 * @returns {string} returns.data[].sample_test_cases[].input - Test case input
 * @returns {string} returns.data[].sample_test_cases[].expected_output - Expected output
 * @returns {string} returns.message - Success message
 * 
 * @throws {403} Contest has not started yet
 * @throws {404} Contest not found
 * @throws {500} Database query errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * Access Control:
 * - Only returns public problem information (no hidden test cases)
 * - Contest must have started for access
 * - Problems are ordered by problem letter
 * 
 * @example
 * GET /api/team/contest/problems
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "problem_letter": "A",
 *       "title": "Sum Array",
 *       "description": "Calculate the sum of array elements",
 *       "input_format": "First line: n\nSecond line: n integers",
 *       "output_format": "Single integer: sum",
 *       "sample_input": "3\n1 2 3",
 *       "sample_output": "6",
 *       "time_limit": 5000,
 *       "memory_limit": 256,
 *       "difficulty": "Easy",
 *       "sample_test_cases": [
 *         {
 *           "input": "3\n1 2 3",
 *           "expected_output": "6"
 *         }
 *       ]
 *     }
 *   ],
 *   "message": "Contest problems retrieved successfully"
 * }
 */
router.get('/contest/problems', authenticateTeam, async (req, res, next) => {
  try {
    const Problem = require('../controllers/problemController');
    
    // Get team's contest
    const team = await db('teams').where('id', req.team.id).first();
    const contest = await db('contests').where('registration_code', team.contest_code).first();
    
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }
    
    const statusSnapshot = Contest.getContestStatus(contest);
    
    if (['not_started', 'pending_manual'].includes(statusSnapshot.status)) {
      return res.status(403).json({
        success: false,
        message: 'Contest has not started yet'
      });
    }
    
    // Get problems (without hidden information)
    const problems = await db('problems')
      .select('id', 'problem_letter', 'title', 'description', 'input_format',
              'output_format', 'sample_input', 'sample_output', 'constraints',
              'time_limit', 'memory_limit', 'difficulty', 'max_points')
      .where('contest_id', contest.id)
      .orderBy('problem_letter');

    // Add sample test cases and solve status for each problem
    const problemsWithSamples = await Promise.all(
      problems.map(async (problem) => {
        let sampleTestCases = await db('test_cases')
          .select('input_parameters', 'expected_return', 'test_case_name', 'explanation')
          .where('problem_id', problem.id)
          .where('is_sample', true);

        // Normalize JSON formatting for consistent display
        sampleTestCases = sampleTestCases.map(tc => ({
          ...tc,
          input_parameters: typeof tc.input_parameters === 'string'
            ? JSON.stringify(JSON.parse(tc.input_parameters))
            : JSON.stringify(tc.input_parameters),
          expected_return: typeof tc.expected_return === 'string'
            ? JSON.stringify(JSON.parse(tc.expected_return))
            : JSON.stringify(tc.expected_return)
        }));

        // Check if team has solved this problem (has any accepted submission)
        const acceptedSubmission = await db('submissions')
          .where('team_id', req.team.id)
          .where('problem_id', problem.id)
          .where('status', 'accepted')
          .first();

        return {
          ...problem,
          sample_test_cases: sampleTestCases,
          is_solved: !!acceptedSubmission
        };
      })
    );

    // Transform to camelCase for frontend
    const transformedProblems = problemsWithSamples.map(transformProblemToFrontend);

    res.json({
      success: true,
      data: transformedProblems,
      message: 'Contest problems retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/team/problems/:id
 * @description Get detailed information for a specific problem
 * 
 * Retrieves comprehensive problem details including description, constraints,
 * sample test cases, and team-specific statistics such as submission attempts
 * and solve status.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Problem ID to retrieve details for
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with problem details
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Problem details
 * @returns {number} returns.data.id - Problem identifier
 * @returns {string} returns.data.problem_letter - Problem letter (A, B, C, etc.)
 * @returns {string} returns.data.title - Problem title
 * @returns {string} returns.data.description - Full problem description
 * @returns {string} returns.data.input_format - Input format specification
 * @returns {string} returns.data.output_format - Output format specification
 * @returns {string} returns.data.sample_input - Sample input data
 * @returns {string} returns.data.sample_output - Sample expected output
 * @returns {string} returns.data.constraints - Problem constraints and limits
 * @returns {number} returns.data.time_limit - Execution time limit (milliseconds)
 * @returns {number} returns.data.memory_limit - Memory usage limit (MB)
 * @returns {string} returns.data.difficulty - Problem difficulty level
 * @returns {Array} returns.data.sample_test_cases - Sample test cases for validation
 * @returns {string} returns.data.sample_test_cases[].input - Test case input
 * @returns {string} returns.data.sample_test_cases[].expected_output - Expected output
 * @returns {Object} returns.data.team_statistics - Team-specific statistics
 * @returns {number} returns.data.team_statistics.total_attempts - Total submission attempts
 * @returns {boolean} returns.data.team_statistics.has_solved - Whether team solved problem
 * @returns {string} [returns.data.team_statistics.latest_status] - Status of latest submission
 * @returns {string} returns.message - Success message
 * 
 * @throws {403} Contest has not started yet
 * @throws {404} Problem not found or not in team's contest
 * @throws {500} Database query errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * Access Control:
 * - Problem must belong to team's contest
 * - Contest must have started
 * - Only returns public problem information
 * - Includes team-specific submission statistics
 * 
 * @example
 * GET /api/team/problems/123
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 123,
 *     "problem_letter": "A",
 *     "title": "Sum Array",
 *     "description": "Given an array of integers, calculate their sum.",
 *     "input_format": "First line: n (1 ≤ n ≤ 1000)\nSecond line: n integers",
 *     "output_format": "Single integer: the sum",
 *     "sample_input": "3\n1 2 3",
 *     "sample_output": "6",
 *     "constraints": "1 ≤ n ≤ 1000, -1000 ≤ ai ≤ 1000",
 *     "time_limit": 5000,
 *     "memory_limit": 256,
 *     "difficulty": "Easy",
 *     "sample_test_cases": [
 *       {
 *         "input": "3\n1 2 3",
 *         "expected_output": "6"
 *       }
 *     ],
 *     "team_statistics": {
 *       "total_attempts": 3,
 *       "has_solved": true,
 *       "latest_status": "accepted"
 *     }
 *   },
 *   "message": "Problem details retrieved successfully"
 * }
 */
router.get('/problems/:id', authenticateTeam, async (req, res, next) => {
  try {
    const problemId = parseInt(req.params.id);
    
    // Get team's contest
    const team = await db('teams').where('id', req.team.id).first();
    const contest = await db('contests').where('registration_code', team.contest_code).first();
    
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }
    
    // Check if contest has started
    const statusSnapshot = Contest.getContestStatus(contest);
    
    if (['not_started', 'pending_manual'].includes(statusSnapshot.status)) {
      return res.status(403).json({
        success: false,
        message: 'Contest has not started yet'
      });
    }
    
    // Get problem (ensure it belongs to the team's contest)
    const problem = await db('problems')
      .select('id', 'contest_id', 'problem_letter', 'title', 'description', 'input_format',
              'output_format', 'sample_input', 'sample_output', 'constraints',
              'time_limit', 'memory_limit', 'difficulty', 'uses_leetcode_style',
              'function_signature_cpp', 'function_signature_java', 'function_signature_python',
              'function_name', 'function_parameters', 'return_type')
      .where('id', problemId)
      .where('contest_id', contest.id)
      .first();
    
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }
    
    // Get sample test cases
    let sampleTestCases = await db('test_cases')
      .select('input_parameters', 'expected_return', 'test_case_name', 'explanation')
      .where('problem_id', problemId)
      .where('is_sample', true);

    // Normalize JSON formatting for consistent display
    sampleTestCases = sampleTestCases.map(tc => ({
      ...tc,
      input_parameters: typeof tc.input_parameters === 'string'
        ? JSON.stringify(JSON.parse(tc.input_parameters))  // Re-stringify without spacing
        : JSON.stringify(tc.input_parameters),
      expected_return: typeof tc.expected_return === 'string'
        ? JSON.stringify(JSON.parse(tc.expected_return))  // Re-stringify without spacing
        : JSON.stringify(tc.expected_return)
    }));

    // Get team's submission statistics for this problem
    const submissionStats = await db('submissions')
      .select('status')
      .where('team_id', req.team.id)
      .where('problem_id', problemId)
      .orderBy('submitted_at', 'desc');
    
    const totalAttempts = submissionStats.length;
    const hasAccepted = submissionStats.some(s => s.status === 'accepted');
    const latestStatus = submissionStats.length > 0 ? submissionStats[0].status : null;

    // Transform problem to camelCase for frontend
    const transformedProblem = transformProblemToFrontend({
      ...problem,
      sample_test_cases: sampleTestCases
    });

    res.json({
      success: true,
      data: {
        ...transformedProblem,
        teamStatistics: {
          totalAttempts: totalAttempts,
          hasSolved: hasAccepted,
          latestStatus: latestStatus
        }
      },
      message: 'Problem details retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});


module.exports = router;
 

const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');
const { generateToken, generateSessionToken } = require('../utils/auth');
const { validate, teamRegistrationSchema, teamLoginSchema } = require('../utils/validation');
const { authenticateTeam } = require('../middleware/auth');

router.post('/register', validate(teamRegistrationSchema), async (req, res, next) => {
  try {
    const { team_name, contest_code } = req.body;
    
    const contest = await db('contests')
      .where({ registration_code: contest_code })
      .andWhere({ is_active: true })
      .andWhere({ is_registration_open: true })
      .first();
    
    if (!contest) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contest code or registration is closed',
        error: 'INVALID_CONTEST_CODE'
      });
    }
    
    const now = new Date();
    if (contest.start_time && new Date(contest.start_time) <= now) {
      return res.status(400).json({
        success: false,
        message: 'Contest has already started. Registration is closed.',
        error: 'CONTEST_STARTED'
      });
    }
    
    const existingTeam = await db('teams')
      .where({ team_name })
      .andWhere({ contest_code })
      .first();
    
    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: 'Team name already exists for this contest',
        error: 'DUPLICATE_TEAM_NAME'
      });
    }
    
    const sessionToken = generateSessionToken();
    
    const [teamId] = await db('teams')
      .insert({
        team_name,
        contest_code,
        session_token: sessionToken,
        registered_at: db.fn.now(),
        last_activity: db.fn.now(),
        is_active: true
      })
      .returning('id');
    
    await db('team_contests').insert({
      team_id: teamId,
      contest_id: contest.id,
      registered_at: db.fn.now()
    });
    
    await db('contest_results').insert({
      contest_id: contest.id,
      team_id: teamId,
      problems_solved: 0,
      penalty_time: 0,
      updated_at: db.fn.now()
    });
    
    const jwtToken = generateToken({
      teamId,
      teamName: team_name,
      contestCode: contest_code,
      sessionToken
    });
    
    res.status(201).json({
      success: true,
      message: 'Team registered successfully',
      data: {
        teamId,
        teamName: team_name,
        contestCode: contest_code,
        contestName: contest.contest_name,
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
    
    const dbError = new Error('Registration failed');
    dbError.name = 'DatabaseError';
    next(dbError);
  }
});

router.post('/login', validate(teamLoginSchema), async (req, res, next) => {
  try {
    const { team_name, contest_code } = req.body;
    
    const team = await db('teams')
      .where({ team_name })
      .andWhere({ contest_code })
      .andWhere({ is_active: true })
      .first();
    
    if (!team) {
      return res.status(401).json({
        success: false,
        message: 'Invalid team name or contest code',
        error: 'INVALID_CREDENTIALS'
      });
    }
    
    const contest = await db('contests')
      .where({ registration_code: contest_code })
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
      contestCode: contest_code,
      sessionToken: newSessionToken
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        teamId: team.id,
        teamName: team.team_name,
        contestCode: contest_code,
        contestName: contest.contest_name,
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
    
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(startTime.getTime() + (contest.duration * 60 * 1000));
    
    let contestStatus = 'not_started';
    let timeRemaining = null;
    let timeUntilStart = null;
    
    if (now < startTime) {
      contestStatus = 'not_started';
      timeUntilStart = Math.max(0, startTime.getTime() - now.getTime());
    } else if (now >= startTime && now < endTime) {
      contestStatus = 'running';
      timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
    } else {
      contestStatus = 'ended';
    }
    
    const submissionCount = await db('submissions')
      .where({ team_id: team.id })
      .count('id as count')
      .first();
    
    res.json({
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          registeredAt: team.registeredAt,
          lastActivity: team.lastActivity
        },
        contest: {
          id: contest.id,
          name: contest.contest_name,
          code: team.contestCode,
          status: contestStatus,
          startTime: contest.start_time,
          duration: contest.duration,
          timeUntilStart,
          timeRemaining,
          freezeTime: contest.freeze_time
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

// =============================================================================
// TEAM PROBLEM ACCESS ROUTES (Phase 2.2)
// =============================================================================

/**
 * GET /api/team/contest/problems
 * Get all problems for the team's contest (read-only)
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
    
    // Check if contest has started
    const now = new Date();
    const startTime = new Date(contest.start_time);
    
    if (now < startTime) {
      return res.status(403).json({
        success: false,
        message: 'Contest has not started yet'
      });
    }
    
    // Get problems (without hidden information)
    const problems = await db('problems')
      .select('id', 'problem_letter', 'title', 'description', 'input_format', 
              'output_format', 'sample_input', 'sample_output', 'constraints',
              'time_limit', 'memory_limit', 'difficulty')
      .where('contest_id', contest.id)
      .orderBy('problem_letter');
    
    // Add sample test cases for each problem
    const problemsWithSamples = await Promise.all(
      problems.map(async (problem) => {
        const sampleTestCases = await db('test_cases')
          .select('input', 'expected_output')
          .where('problem_id', problem.id)
          .where('is_sample', true);
        
        return {
          ...problem,
          sample_test_cases: sampleTestCases
        };
      })
    );
    
    res.json({
      success: true,
      data: problemsWithSamples,
      message: 'Contest problems retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/team/problems/:id
 * Get specific problem details (read-only)
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
    const now = new Date();
    const startTime = new Date(contest.start_time);
    
    if (now < startTime) {
      return res.status(403).json({
        success: false,
        message: 'Contest has not started yet'
      });
    }
    
    // Get problem (ensure it belongs to the team's contest)
    const problem = await db('problems')
      .select('id', 'problem_letter', 'title', 'description', 'input_format', 
              'output_format', 'sample_input', 'sample_output', 'constraints',
              'time_limit', 'memory_limit', 'difficulty')
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
    const sampleTestCases = await db('test_cases')
      .select('input', 'expected_output')
      .where('problem_id', problemId)
      .where('is_sample', true);
    
    // Get team's submission statistics for this problem
    const submissionStats = await db('submissions')
      .select('status')
      .where('team_id', req.team.id)
      .where('problem_id', problemId)
      .orderBy('submission_time', 'desc');
    
    const totalAttempts = submissionStats.length;
    const hasAccepted = submissionStats.some(s => s.status === 'accepted');
    const latestStatus = submissionStats.length > 0 ? submissionStats[0].status : null;
    
    res.json({
      success: true,
      data: {
        ...problem,
        sample_test_cases: sampleTestCases,
        team_statistics: {
          total_attempts: totalAttempts,
          has_solved: hasAccepted,
          latest_status: latestStatus
        }
      },
      message: 'Problem details retrieved successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
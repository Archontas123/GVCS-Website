const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../utils/db');
const { generateToken, generateSessionToken } = require('../utils/auth');
const { validate, teamRegistrationSchema, teamLoginSchema } = require('../utils/validation');
const { authenticateTeam } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/projects');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `project-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  }
});

router.post('/register', validate(teamRegistrationSchema), async (req, res, next) => {
  try {
    const { teamName, contestCode, password, schoolName, memberNames } = req.body;
    
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
    
    const [teamResult] = await db('teams')
      .insert({
        team_name: teamName,
        contest_code: contestCode,
        password_hash: passwordHash,
        school_name: schoolName,
        member_names: JSON.stringify(memberNames),
        session_token: sessionToken,
        registered_at: db.fn.now(),
        last_activity: db.fn.now(),
        is_active: true
      })
      .returning('id');
    
    const teamId = teamResult.id;
    
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
        memberNames: memberNames,
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

// Project submission routes
router.post('/contests/:contestId/projects', authenticateTeam, upload.single('project_file'), async (req, res, next) => {
  try {
    const contestId = parseInt(req.params.contestId);
    const { project_title, project_description } = req.body;
    const teamId = req.team.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Project file is required',
        error: 'FILE_REQUIRED'
      });
    }

    if (!project_title) {
      return res.status(400).json({
        success: false,
        message: 'Project title is required',
        error: 'TITLE_REQUIRED'
      });
    }

    // Check if team belongs to this contest
    const teamContest = await db('team_contests')
      .where({ team_id: teamId, contest_id: contestId })
      .first();

    if (!teamContest) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'Team is not registered for this contest',
        error: 'NOT_REGISTERED'
      });
    }

    // Check if contest allows project submissions (not ended)
    const contest = await db('contests').where('id', contestId).first();
    const now = new Date();
    const endTime = new Date(new Date(contest.start_time).getTime() + contest.duration * 60 * 1000);

    if (now > endTime) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Contest has ended. Project submissions are no longer accepted.',
        error: 'CONTEST_ENDED'
      });
    }

    // Check if team already submitted a project for this contest
    const existingSubmission = await db('project_submissions')
      .where({ team_id: teamId, contest_id: contestId })
      .first();

    if (existingSubmission) {
      // Update existing submission
      await db('project_submissions')
        .where({ team_id: teamId, contest_id: contestId })
        .update({
          project_title,
          project_description,
          original_filename: req.file.originalname,
          file_path: req.file.path,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          updated_at: db.fn.now()
        });

      // Remove old file
      if (existingSubmission.file_path && fs.existsSync(existingSubmission.file_path)) {
        fs.unlinkSync(existingSubmission.file_path);
      }
    } else {
      // Create new submission
      await db('project_submissions').insert({
        team_id: teamId,
        contest_id: contestId,
        project_title,
        project_description,
        original_filename: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      });
    }

    res.json({
      success: true,
      message: 'Project submitted successfully',
      data: {
        project_title,
        original_filename: req.file.originalname,
        file_size: req.file.size
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

router.get('/contests/:contestId/projects/my-submission', authenticateTeam, async (req, res, next) => {
  try {
    const contestId = parseInt(req.params.contestId);
    const teamId = req.team.id;

    const submission = await db('project_submissions')
      .where({ team_id: teamId, contest_id: contestId })
      .first();

    if (!submission) {
      return res.json({
        success: true,
        data: null,
        message: 'No project submission found'
      });
    }

    res.json({
      success: true,
      data: {
        id: submission.id,
        project_title: submission.project_title,
        project_description: submission.project_description,
        original_filename: submission.original_filename,
        file_size: submission.file_size,
        submitted_at: submission.submitted_at,
        updated_at: submission.updated_at
      },
      message: 'Project submission retrieved successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
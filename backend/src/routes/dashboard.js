/**
 * Dashboard Routes Module
 * Provides real-time dashboard endpoints for team contest data including
 * overview statistics, standings, activity feed, and analytics
 * @module routes/dashboard
 */

const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');

/**
 * Simple logger for debugging and error tracking
 * @type {Object}
 */
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

/**
 * Map database status values to frontend verdict format
 * @param {string} status - Database status value (e.g., 'accepted', 'wrong_answer')
 * @returns {string} Frontend verdict format (e.g., 'AC', 'WA')
 */
const mapStatusToVerdict = (status) => {
  const verdictMap = {
    'accepted': 'AC',
    'wrong_answer': 'WA',
    'time_limit_exceeded': 'TLE',
    'memory_limit_exceeded': 'MLE',
    'runtime_error': 'RE',
    'compilation_error': 'CE',
    'pending': 'PENDING',
    'judging': 'JUDGING'
  };
  return verdictMap[status] || status?.toUpperCase() || 'UNKNOWN';
};

/**
 * Middleware to verify team authentication token
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.authorization - Bearer token in Authorization header
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sets req.team object or returns error response
 * @throws {UnauthorizedError} 401 - No token provided, invalid token, or inactive team
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Authentication error
 */
const verifyTeamToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const team = await db('teams')
      .select('*')
      .where('session_token', token)
      .andWhere('is_active', true)
      .first();

    if (!team) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const contest = await db('contests')
      .select('id')
      .where('registration_code', team.contest_code)
      .first();

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    req.team = { 
      id: team.id, 
      name: team.team_name,
      contest_id: contest.id,
      contest_code: team.contest_code
    };
    
    next();
  } catch (error) {
    logger.error('Error verifying team token:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Get comprehensive team dashboard overview with real-time data
 * @route GET /api/dashboard/overview
 * @param {Object} req - Express request object
 * @param {Object} req.team - Team object from authentication middleware
 * @param {number} req.team.id - Team ID
 * @param {number} req.team.contest_id - Contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with comprehensive dashboard data
 * @requires verifyTeamToken - Team authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Database or server error
 * @example
 * // Response data structure:
 * {
 *   "success": true,
 *   "data": {
 *     "contest": {
 *       "id": 1,
 *       "name": "Programming Contest",
 *       "status": "active",
 *       "time_remaining": 3600,
 *       "progress_percentage": 25.5
 *     },
 *     "team_stats": {
 *       "rank": 3,
 *       "total_submissions": 15,
 *       "accepted_submissions": 8,
 *       "problems_solved": 3,
 *       "accuracy_rate": "53.3"
 *     },
 *     "problems": [...],
 *     "recent_submissions": [...]
 *   }
 * }
 */
router.get('/overview', verifyTeamToken, async (req, res, next) => {
  try {
    const teamId = req.team.id;
    const contestId = req.team.contest_id;

    const contest = await db('contests')
      .select('*')
      .where('id', contestId)
      .first();

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    const now = new Date();
    const statusSnapshot = Contest.getContestStatus(contest);
    const statusMap = {
      pending_manual: 'pending_manual',
      not_started: 'upcoming',
      running: 'active',
      frozen: 'frozen',
      ended: 'ended'
    };

    const contestStatus = statusMap[statusSnapshot.status] || statusSnapshot.status;
    const timeRemainingSeconds = statusSnapshot.time_remaining_seconds ?? 0;
    const progressPercentage = statusSnapshot.progress_percentage ?? 0;
    const normalizedProgress = Math.max(0, Math.min(100, progressPercentage));

    const [teamStats, problemStats, recentSubmissions] = await Promise.all([
      db('submissions')
        .select(
          db.raw('COUNT(*) as total_submissions'),
          db.raw('COUNT(CASE WHEN status = \'accepted\' THEN 1 END) as accepted_submissions'),
          db.raw('COUNT(CASE WHEN status = \'wrong_answer\' THEN 1 END) as wrong_answer'),
          db.raw('COUNT(CASE WHEN status = \'time_limit_exceeded\' THEN 1 END) as time_limit_exceeded'),
          db.raw('COUNT(CASE WHEN status = \'compilation_error\' THEN 1 END) as compilation_error'),
          db.raw('COUNT(CASE WHEN status = \'runtime_error\' THEN 1 END) as runtime_error')
        )
        .where('team_id', teamId)
        .first(),

      db('problems')
        .leftJoin('submissions', function() {
          this.on('problems.id', '=', 'submissions.problem_id')
              .andOn('submissions.team_id', '=', teamId);
        })
        .select(
          'problems.id',
          'problems.problem_letter',
          'problems.title',
          'problems.difficulty',
          db.raw('MAX(CASE WHEN submissions.status = \'accepted\' THEN 1 ELSE 0 END) as is_solved'),
          db.raw('COUNT(submissions.id) as attempt_count'),
          db.raw('MIN(submissions.submitted_at) as first_submission'),
          db.raw('MAX(CASE WHEN submissions.status = \'accepted\' THEN submissions.submitted_at END) as solved_at')
        )
        .where('problems.contest_id', contestId)
        .groupBy('problems.id', 'problems.problem_letter', 'problems.title', 'problems.difficulty')
        .orderBy('problems.problem_letter'),

      db('submissions')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .select(
          'submissions.*',
          'problems.problem_letter',
          'problems.title'
        )
        .where('submissions.team_id', teamId)
        .orderBy('submissions.submitted_at', 'desc')
        .limit(10)
    ]);

    const teamRankResults = await db('submissions as s1')
      .join('problems as p', 's1.problem_id', 'p.id')
      .select(
        's1.team_id',
        db.raw('COUNT(DISTINCT CASE WHEN s1.status = \'accepted\' THEN s1.problem_id END) as problems_solved'),
        db.raw('COUNT(*) as total_submissions')
      )
      .where('p.contest_id', contestId)
      .groupBy('s1.team_id')
      .orderByRaw('problems_solved DESC, total_submissions ASC');

    const teamRank = teamRankResults.findIndex(r => r.team_id === teamId) + 1;

    const overview = {
      contest: {
        id: contest.id,
        name: contest.contest_name,
        description: contest.description,
        status: contestStatus,
        start_time: statusSnapshot.start_time,
        duration_minutes: contest.duration,
        freeze_time_minutes: contest.freeze_time,
        manual_control: statusSnapshot.manual_control ?? true,
        time_remaining: contestStatus === 'active' ? Math.max(0, Math.floor(timeRemainingSeconds)) : 0,
        progress_percentage: contestStatus === 'upcoming' ? 0 :
                           contestStatus === 'ended' ? 100 :
                           normalizedProgress
      },
      team_stats: {
        rank: teamRank,
        total_submissions: parseInt(teamStats.total_submissions) || 0,
        accepted_submissions: parseInt(teamStats.accepted_submissions) || 0,
        problems_solved: problemStats.filter(p => p.is_solved).length,
        total_problems: problemStats.length,
        accuracy_rate: teamStats.total_submissions > 0 ? 
          ((teamStats.accepted_submissions / teamStats.total_submissions) * 100).toFixed(1) : 0
      },
      verdict_distribution: {
        accepted: parseInt(teamStats.accepted_submissions) || 0,
        wrong_answer: parseInt(teamStats.wrong_answer) || 0,
        time_limit_exceeded: parseInt(teamStats.time_limit_exceeded) || 0,
        compilation_error: parseInt(teamStats.compilation_error) || 0,
        runtime_error: parseInt(teamStats.runtime_error) || 0
      },
      problems: problemStats.map(p => ({
        id: p.id,
        letter: p.problem_letter,
        title: p.title,
        difficulty: p.difficulty,
        is_solved: Boolean(p.is_solved),
        attempt_count: parseInt(p.attempt_count) || 0,
        first_submission: p.first_submission,
        solved_at: p.solved_at
      })),
      recent_submissions: recentSubmissions.map(s => ({
        id: s.id,
        problemLetter: s.problem_letter,
        problemTitle: s.title,
        language: s.language,
        verdict: mapStatusToVerdict(s.status),
        submittedAt: s.submitted_at,
        execution_time: s.execution_time,
        memory_used: s.memory_used
      }))
    };

    res.json({
      success: true,
      data: overview,
      message: 'Dashboard overview retrieved successfully'
    });

  } catch (error) {
    logger.error('Error getting dashboard overview:', error);
    next(error);
  }
});

/**
 * Get contest standings/leaderboard
 * @route GET /api/dashboard/standings
 * @param {Object} req - Express request object
 * @param {Object} req.team - Team object from authentication middleware
 * @param {number} req.team.contest_id - Contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with ranked standings data
 * @requires verifyTeamToken - Team authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Database or server error
 * @example
 * // Response data structure:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "rank": 1,
 *       "team_id": 5,
 *       "team_name": "CodeMasters",
 *       "problems_solved": 8,
 *       "penalty_time": 12,
 *       "last_submission": "2024-01-15T14:30:00.000Z"
 *     }
 *   ]
 * }
 */
router.get('/standings', verifyTeamToken, async (req, res, next) => {
  try {
    const contestId = req.team.contest_id;
    
    const standings = await db('submissions as s')
      .join('teams as t', 's.team_id', 't.id')
      .join('problems as p', 's.problem_id', 'p.id')
      .select(
        't.id as team_id',
        't.team_name',
        db.raw('COUNT(DISTINCT CASE WHEN s.status = \'accepted\' THEN s.problem_id END) as problems_solved'),
        db.raw('COUNT(*) as total_submissions'),
        db.raw('MAX(s.submitted_at) as last_submission')
      )
      .where('p.contest_id', contestId)
      .groupBy('t.id', 't.team_name')
      .orderByRaw('problems_solved DESC, total_submissions ASC');

    const rankedStandings = standings.map((team, index) => ({
      rank: index + 1,
      team_id: team.team_id,
      team_name: team.team_name,
      problems_solved: parseInt(team.problems_solved) || 0,
      penalty_time: parseInt(team.total_submissions) || 0,
      last_submission: team.last_submission
    }));

    res.json({
      success: true,
      data: rankedStandings,
      message: 'Standings retrieved successfully'
    });

  } catch (error) {
    logger.error('Error getting standings:', error);
    next(error);
  }
});

/**
 * Get recent contest activity feed
 * @route GET /api/dashboard/activity
 * @param {Object} req - Express request object
 * @param {Object} req.team - Team object from authentication middleware
 * @param {number} req.team.contest_id - Contest ID
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.limit=20] - Maximum number of activity entries to return
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with recent submission activity data
 * @requires verifyTeamToken - Team authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Database or server error
 * @example
 * // Response data structure:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 123,
 *       "team_name": "CodeMasters",
 *       "problem_letter": "A",
 *       "problem_title": "Simple Addition",
 *       "language": "python3",
 *       "verdict": "accepted",
 *       "submitted_at": "2024-01-15T14:30:00.000Z",
 *       "execution_time": 0.02,
 *       "memory_used": 1024
 *     }
 *   ]
 * }
 */
router.get('/activity', verifyTeamToken, async (req, res, next) => {
  try {
    const contestId = req.team.contest_id;
    const limit = parseInt(req.query.limit) || 20;

    const activity = await db('submissions as s')
      .join('teams as t', 's.team_id', 't.id')
      .join('problems as p', 's.problem_id', 'p.id')
      .select(
        's.id',
        't.team_name',
        'p.problem_letter',
        'p.title as problem_title',
        's.language',
        's.status',
        's.submitted_at as submitted_at',
        's.execution_time',
        's.memory_used'
      )
      .where('p.contest_id', contestId)
      .orderBy('s.submitted_at', 'desc')
      .limit(limit);

    res.json({
      success: true,
      data: activity.map(a => ({
        id: a.id,
        teamName: a.team_name,
        problemLetter: a.problem_letter,
        problemTitle: a.problem_title,
        language: a.language,
        verdict: mapStatusToVerdict(a.status),
        submittedAt: a.submitted_at,
        executionTime: a.execution_time,
        memoryUsed: a.memory_used
      })),
      message: 'Recent activity retrieved successfully'
    });

  } catch (error) {
    logger.error('Error getting activity:', error);
    next(error);
  }
});

/**
 * Get comprehensive contest analytics and statistics
 * @route GET /api/dashboard/analytics
 * @param {Object} req - Express request object
 * @param {Object} req.team - Team object from authentication middleware
 * @param {number} req.team.contest_id - Contest ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with detailed analytics data
 * @requires verifyTeamToken - Team authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {InternalServerError} 500 - Database or server error
 * @example
 * // Response data structure:
 * {
 *   "success": true,
 *   "data": {
 *     "submission_trends": [
 *       {"hour": "2024-01-15 14:00:00", "count": 25}
 *     ],
 *     "language_statistics": [
 *       {"language": "python3", "usage_count": 45, "success_rate": "67.5"}
 *     ],
 *     "problem_analysis": [
 *       {
 *         "letter": "A", 
 *         "title": "Simple Addition",
 *         "difficulty": "easy",
 *         "total_attempts": 120,
 *         "success_rate": "85.0"
 *       }
 *     ],
 *     "verdict_distribution": {
 *       "accepted": 180,
 *       "wrong_answer": 45,
 *       "time_limit_exceeded": 12
 *     }
 *   }
 * }
 */
router.get('/analytics', verifyTeamToken, async (req, res, next) => {
  try {
    const contestId = req.team.contest_id;

    const [
      submissionTrends,
      languageStats,
      problemDifficulty,
      verdictStats
    ] = await Promise.all([
      db('submissions as s')
        .join('problems as p', 's.problem_id', 'p.id')
        .select(
          db.raw('strftime(\'%Y-%m-%d %H:00:00\', s.submitted_at) as hour'),
          db.raw('COUNT(*) as submission_count')
        )
        .where('p.contest_id', contestId)
        .groupBy('hour')
        .orderBy('hour')
        .limit(24),

      db('submissions as s')
        .join('problems as p', 's.problem_id', 'p.id')
        .select(
          's.language',
          db.raw('COUNT(*) as usage_count'),
          db.raw('COUNT(CASE WHEN s.status = \'accepted\' THEN 1 END) as accepted_count')
        )
        .where('p.contest_id', contestId)
        .groupBy('s.language')
        .orderBy('usage_count', 'desc'),

      db('problems as p')
        .leftJoin('submissions as s', 'p.id', 's.problem_id')
        .select(
          'p.id',
          'p.problem_letter',
          'p.title',
          'p.difficulty',
          db.raw('COUNT(s.id) as total_attempts'),
          db.raw('COUNT(CASE WHEN s.status = \'accepted\' THEN 1 END) as successful_attempts'),
          db.raw('COUNT(DISTINCT s.team_id) as unique_teams_attempted')
        )
        .where('p.contest_id', contestId)
        .groupBy('p.id', 'p.problem_letter', 'p.title', 'p.difficulty')
        .orderBy('p.problem_letter'),

      db('submissions as s')
        .join('problems as p', 's.problem_id', 'p.id')
        .select(
          's.status',
          db.raw('COUNT(*) as count')
        )
        .where('p.contest_id', contestId)
        .groupBy('s.status')
    ]);

    const analytics = {
      submission_trends: submissionTrends.map(trend => ({
        hour: trend.hour,
        count: parseInt(trend.submission_count)
      })),
      language_statistics: languageStats.map(lang => ({
        language: lang.language,
        usage_count: parseInt(lang.usage_count),
        accepted_count: parseInt(lang.accepted_count),
        success_rate: lang.usage_count > 0 ? 
          ((lang.accepted_count / lang.usage_count) * 100).toFixed(1) : 0
      })),
      problem_analysis: problemDifficulty.map(prob => ({
        letter: prob.problem_letter,
        title: prob.title,
        difficulty: prob.difficulty,
        total_attempts: parseInt(prob.total_attempts) || 0,
        successful_attempts: parseInt(prob.successful_attempts) || 0,
        unique_teams: parseInt(prob.unique_teams_attempted) || 0,
        success_rate: prob.total_attempts > 0 ? 
          ((prob.successful_attempts / prob.total_attempts) * 100).toFixed(1) : 0
      })),
      verdict_distribution: verdictStats.reduce((acc, stat) => {
        acc[mapStatusToVerdict(stat.status)] = parseInt(stat.count);
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: analytics,
      message: 'Analytics retrieved successfully'
    });

  } catch (error) {
    logger.error('Error getting analytics:', error);
    next(error);
  }
});

module.exports = router;

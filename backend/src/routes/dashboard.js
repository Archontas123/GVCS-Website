/**
 * CS Club Hackathon Platform - Dashboard Routes
 * Real-time dashboard with actual data (no mock data)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');

// Simple logger replacement
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

// Middleware to verify team authentication
const verifyTeamToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    // Find team by session token
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

    // Get contest ID from team's contest code
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
 * GET /api/dashboard/overview
 * Get team dashboard overview with real data
 */
router.get('/overview', verifyTeamToken, async (req, res, next) => {
  try {
    const teamId = req.team.id;
    const contestId = req.team.contest_id;

    // Get team's contest information
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

    // Calculate contest status and timing
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
    const freezeTime = contest.freeze_time ? new Date(endTime.getTime() - contest.freeze_time * 60 * 1000) : null;

    let contestStatus = 'upcoming';
    if (now >= startTime && now < endTime) {
      contestStatus = freezeTime && now >= freezeTime ? 'frozen' : 'active';
    } else if (now >= endTime) {
      contestStatus = 'ended';
    }

    // Get team statistics
    const [teamStats, problemStats, recentSubmissions] = await Promise.all([
      // Team submission statistics
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

      // Problems solved by team
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
          db.raw('MIN(submissions.submission_time) as first_submission'),
          db.raw('MAX(CASE WHEN submissions.status = \'accepted\' THEN submissions.submission_time END) as solved_at')
        )
        .where('problems.contest_id', contestId)
        .groupBy('problems.id', 'problems.problem_letter', 'problems.title', 'problems.difficulty')
        .orderBy('problems.problem_letter'),

      // Recent submissions
      db('submissions')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .select(
          'submissions.*',
          'problems.problem_letter',
          'problems.title'
        )
        .where('submissions.team_id', teamId)
        .orderBy('submissions.submission_time', 'desc')
        .limit(10)
    ]);

    // Calculate team rank (simplified for SQLite)
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
        start_time: contest.start_time,
        duration_minutes: contest.duration,
        freeze_time_minutes: contest.freeze_time,
        time_remaining: contestStatus === 'active' ? Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000)) : 0,
        progress_percentage: contestStatus === 'upcoming' ? 0 : 
                           contestStatus === 'ended' ? 100 : 
                           Math.min(100, ((now.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())) * 100)
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
        problem_letter: s.problem_letter,
        problem_title: s.title,
        language: s.language,
        verdict: s.status,
        submitted_at: s.submission_time,
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
 * GET /api/dashboard/standings
 * Get contest standings
 */
router.get('/standings', verifyTeamToken, async (req, res, next) => {
  try {
    const contestId = req.team.contest_id;
    
    // Get all teams with their standings
    const standings = await db('submissions as s')
      .join('teams as t', 's.team_id', 't.id')
      .join('problems as p', 's.problem_id', 'p.id')
      .select(
        't.id as team_id',
        't.team_name',
        db.raw('COUNT(DISTINCT CASE WHEN s.status = \'accepted\' THEN s.problem_id END) as problems_solved'),
        db.raw('COUNT(*) as total_submissions'),
        db.raw('MAX(s.submission_time) as last_submission')
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
 * GET /api/dashboard/activity
 * Get recent contest activity
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
        's.status as verdict',
        's.submission_time as submitted_at',
        's.execution_time',
        's.memory_used'
      )
      .where('p.contest_id', contestId)
      .orderBy('s.submission_time', 'desc')
      .limit(limit);

    res.json({
      success: true,
      data: activity,
      message: 'Recent activity retrieved successfully'
    });

  } catch (error) {
    logger.error('Error getting activity:', error);
    next(error);
  }
});

/**
 * GET /api/dashboard/analytics
 * Get contest analytics
 */
router.get('/analytics', verifyTeamToken, async (req, res, next) => {
  try {
    const contestId = req.team.contest_id;

    // Get submission analytics
    const [
      submissionTrends,
      languageStats,
      problemDifficulty,
      verdictStats
    ] = await Promise.all([
      // Submissions over time (hourly) - simplified for SQLite
      db('submissions as s')
        .join('problems as p', 's.problem_id', 'p.id')
        .select(
          db.raw('strftime(\'%Y-%m-%d %H:00:00\', s.submission_time) as hour'),
          db.raw('COUNT(*) as submission_count')
        )
        .where('p.contest_id', contestId)
        .groupBy('hour')
        .orderBy('hour')
        .limit(24), // Last 24 hours

      // Language usage statistics
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

      // Problem difficulty analysis
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

      // Overall verdict statistics
      db('submissions as s')
        .join('problems as p', 's.problem_id', 'p.id')
        .select(
          's.status as verdict',
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
        acc[stat.verdict] = parseInt(stat.count);
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
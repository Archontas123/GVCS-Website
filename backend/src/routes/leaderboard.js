/**
 * Leaderboard API Routes - Updated for Hackathon Scoring
 * Unified scoring and leaderboard endpoints
 */

const express = require('express');
const router = express.Router();
const scoringService = require('../services/scoringService');
const submissionController = require('../controllers/submissionController');
const websocketService = require('../services/websocketService');
const { authenticateTeam } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');
const { db } = require('../utils/db');

/**
 * GET /api/leaderboard/:contestId
 * Get contest leaderboard (public access during contest)
 */
router.get('/:contestId', async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    
    if (!contestId || isNaN(contestId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contest ID'
      });
    }

    // Check if contest exists and is active
    const contest = await db('contests')
      .where('id', contestId)
      .first('id', 'contest_name', 'is_active', 'start_time', 'duration');

    if (!contest) {
      return res.status(404).json({
        success: false,
        error: 'Contest not found'
      });
    }

    // Get leaderboard using unified scoring service
    const leaderboard = await scoringService.getLeaderboard(contestId);

    // Get contest statistics
    const submissionStats = await submissionController.getContestSubmissionStats(contestId);

    res.json({
      success: true,
      data: {
        contest: contest,
        leaderboard: leaderboard,
        statistics: submissionStats,
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      details: error.message
    });
  }
});

/**
 * GET /api/leaderboard/:contestId/team/:teamId
 * Get team's position and statistics in contest (authenticated)
 */
router.get('/:contestId/team/:teamId', authenticateTeam, async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    const teamId = parseInt(req.params.teamId);
    
    // Verify team can access this data
    if (req.team.id !== teamId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get team statistics using unified scoring service
    const teamStats = await scoringService.getTeamStatistics(teamId, contestId);
    
    // Get team submissions
    const submissions = await submissionController.getTeamSubmissions(teamId, contestId, 20);

    // Get team's score details
    const teamScore = await scoringService.calculateTeamScore(teamId, contestId);

    res.json({
      success: true,
      data: {
        team_id: teamId,
        statistics: teamStats,
        recent_submissions: submissions,
        solved_problems: teamScore.solved_problems,
        total_points: teamScore.total_points || 0,
        total_penalty_time: teamScore.penalty_time || 0
      }
    });
  } catch (error) {
    console.error('Error getting team statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team statistics',
      details: error.message
    });
  }
});

/**
 * POST /api/leaderboard/:contestId/recalculate
 * Manually recalculate contest scores (admin only)
 */
router.post('/:contestId/recalculate', verifyAdminToken, async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    
    console.log(`Admin ${req.admin.username} requested score recalculation for contest ${contestId}`);
    
    // Get scoring service and recalculate scores
    const scoring = await scoringService.getScoringService(contestId);
    const results = await scoring.updateContestResults ? 
      await scoring.updateContestResults(contestId) : 
      await scoring.updateAllRanks(contestId);

    res.json({
      success: true,
      data: {
        message: 'Scores recalculated successfully',
        teams_updated: results.length,
        recalculated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error recalculating scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate scores',
      details: error.message
    });
  }
});

/**
 * GET /api/leaderboard/:contestId/problems
 * Get problem statistics for contest
 */
router.get('/:contestId/problems', async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);

    // Get problems with solve statistics
    const problems = await db('problems as p')
      .leftJoin('submissions as s', function() {
        this.on('s.problem_id', '=', 'p.id')
          .andOn('s.status', '=', db.raw('?', ['accepted']));
      })
      .where('p.contest_id', contestId)
      .groupBy('p.id', 'p.problem_letter', 'p.title', 'p.difficulty')
      .select(
        'p.id',
        'p.problem_letter',
        'p.title',
        'p.difficulty',
        db.raw('COUNT(DISTINCT s.team_id) as solve_count')
      )
      .orderBy('p.problem_letter');

    // Get total teams in contest
    const totalTeams = await db('teams as t')
      .join('contests as c', 'c.registration_code', 't.contest_code')
      .where('c.id', contestId)
      .count('* as count');

    const teamCount = parseInt(totalTeams[0].count);

    // Calculate solve percentages
    const problemStats = problems.map(problem => ({
      ...problem,
      solve_count: parseInt(problem.solve_count),
      solve_percentage: teamCount > 0 ? (parseInt(problem.solve_count) / teamCount * 100).toFixed(1) : 0
    }));

    res.json({
      success: true,
      data: {
        problems: problemStats,
        total_teams: teamCount
      }
    });
  } catch (error) {
    console.error('Error getting problem statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get problem statistics',
      details: error.message
    });
  }
});

/**
 * GET /api/leaderboard/:contestId/live
 * Get live contest statistics for admin monitoring
 */
router.get('/:contestId/live', verifyAdminToken, async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);

    // Get contest status
    const contest = await db('contests')
      .where('id', contestId)
      .first();

    // Get current leaderboard
    const leaderboard = await icpcScoring.getLeaderboard(contestId);

    // Get submission statistics
    const submissionStats = await submissionController.getContestSubmissionStats(contestId);

    // Get pending submissions count
    const pendingCount = await submissionController.getPendingSubmissionsCount();

    // Calculate contest timing
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
    
    const contestStatus = now < startTime ? 'not_started' : 
                         now > endTime ? 'ended' : 'running';
    
    const timeRemaining = contestStatus === 'running' ? 
      Math.max(0, Math.floor((endTime - now) / 1000)) : 0;

    res.json({
      success: true,
      data: {
        contest: {
          ...contest,
          status: contestStatus,
          time_remaining_seconds: timeRemaining
        },
        leaderboard: leaderboard.slice(0, 20), // Top 20 teams
        statistics: {
          ...submissionStats,
          pending_submissions: pendingCount
        }
      }
    });
  } catch (error) {
    console.error('Error getting live contest data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live contest data',
      details: error.message
    });
  }
});

/**
 * GET /api/leaderboard/:contestId/export
 * Export contest results as CSV (admin only)
 */
router.get('/:contestId/export', verifyAdminToken, async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);

    // Get complete leaderboard with detailed information
    const leaderboard = await icpcScoring.getLeaderboard(contestId);

    // Convert to CSV format
    const headers = ['Rank', 'Team Name', 'Problems Solved', 'Penalty Time', 'Last Submission'];
    const csvRows = [headers.join(',')];

    leaderboard.forEach(team => {
      const row = [
        team.rank,
        `"${team.team_name}"`, // Quote team names to handle commas
        team.problems_solved,
        team.penalty_time,
        team.last_submission_time ? new Date(team.last_submission_time).toISOString() : 'N/A'
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="contest_${contestId}_results.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting contest results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export contest results',
      details: error.message
    });
  }
});

/**
 * GET /api/leaderboard/websocket/stats
 * Get WebSocket connection statistics (admin only)
 */
router.get('/websocket/stats', verifyAdminToken, (req, res) => {
  try {
    const stats = websocketService.getConnectionStats();
    
    res.json({
      success: true,
      data: {
        websocket_stats: stats,
        server_time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket statistics',
      details: error.message
    });
  }
});

/**
 * POST /api/leaderboard/:contestId/broadcast
 * Manually trigger leaderboard broadcast (admin only)
 */
router.post('/:contestId/broadcast', verifyAdminToken, async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    
    console.log(`Admin ${req.admin.username} triggered manual leaderboard broadcast for contest ${contestId}`);
    
    // Trigger immediate broadcast
    await websocketService.broadcastLeaderboardUpdate(contestId);

    res.json({
      success: true,
      data: {
        message: 'Leaderboard broadcast triggered successfully',
        contest_id: contestId,
        triggered_at: new Date().toISOString(),
        triggered_by: req.admin.username
      }
    });
  } catch (error) {
    console.error('Error triggering leaderboard broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger leaderboard broadcast',
      details: error.message
    });
  }
});

module.exports = router;
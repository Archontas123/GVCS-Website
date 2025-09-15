/**
 * @module LeaderboardRoutes
 * @description Leaderboard API Routes for Programming Contest Scoring
 * 
 * This module provides comprehensive leaderboard functionality including:
 * - Contest leaderboard retrieval with real-time scoring
 * - Team statistics and performance tracking
 * - Administrative scoring controls and recalculation
 * - Problem solving statistics and analytics
 * - Live contest monitoring and broadcasting
 * - Results export and WebSocket integration
 * 
 * Supports multiple contest formats with unified scoring service integration.
 * Includes both public endpoints for contest participants and administrative
 * endpoints for contest management and monitoring.
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
 * @route GET /api/leaderboard/:contestId
 * @description Get contest leaderboard with comprehensive scoring data
 * 
 * Retrieves the current leaderboard for a contest including team rankings,
 * solved problems, penalty times, and submission statistics. Public access
 * during active contests.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestId - Contest ID to retrieve leaderboard for
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with leaderboard data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Leaderboard data
 * @returns {Object} returns.data.contest - Contest information
 * @returns {Array} returns.data.leaderboard - Ranked team list with scores
 * @returns {Object} returns.data.statistics - Contest submission statistics
 * @returns {string} returns.data.last_updated - Last update timestamp
 * 
 * @throws {400} Invalid contest ID format
 * @throws {404} Contest not found
 * @throws {500} Database or scoring service errors
 * 
 * @example
 * GET /api/leaderboard/123
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "contest": {
 *       "id": 123,
 *       "contest_name": "Spring Programming Contest",
 *       "is_active": true
 *     },
 *     "leaderboard": [
 *       {
 *         "rank": 1,
 *         "team_name": "CodeMasters",
 *         "problems_solved": 5,
 *         "penalty_time": 240
 *       }
 *     ],
 *     "statistics": {
 *       "total_submissions": 150,
 *       "accepted_submissions": 45
 *     }
 *   }
 * }
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
 * @route GET /api/leaderboard/:contestId/team/:teamId
 * @description Get detailed team statistics and position in contest
 * 
 * Retrieves comprehensive statistics for a specific team including their
 * position, solved problems, recent submissions, and performance metrics.
 * Requires team authentication - teams can only access their own data.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestId - Contest ID
 * @param {string} req.params.teamId - Team ID to retrieve statistics for
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Authenticated team's ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with team statistics
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Team statistics data
 * @returns {number} returns.data.team_id - Team identifier
 * @returns {Object} returns.data.statistics - Detailed team performance stats
 * @returns {Array} returns.data.recent_submissions - Last 20 submissions
 * @returns {Array} returns.data.solved_problems - List of solved problem IDs
 * @returns {number} returns.data.total_points - Team's total score
 * @returns {number} returns.data.total_penalty_time - Accumulated penalty time
 * 
 * @throws {403} Access denied - team can only view own statistics
 * @throws {500} Database or scoring service errors
 * 
 * @requires Authentication via authenticateTeam middleware
 * 
 * @example
 * GET /api/leaderboard/123/team/456
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "team_id": 456,
 *     "statistics": {
 *       "rank": 5,
 *       "problems_attempted": 8,
 *       "problems_solved": 3
 *     },
 *     "solved_problems": [1, 3, 5],
 *     "total_points": 300,
 *     "total_penalty_time": 180
 *   }
 * }
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
 * @route POST /api/leaderboard/:contestId/recalculate
 * @description Manually trigger contest score recalculation
 * 
 * Forces a complete recalculation of all team scores and rankings for
 * the specified contest. This is useful when scoring inconsistencies are
 * detected or after making changes to scoring rules. Admin access only.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestId - Contest ID to recalculate scores for
 * @param {Object} req.admin - Admin user data from middleware
 * @param {string} req.admin.username - Administrator username
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with recalculation results
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Recalculation results
 * @returns {string} returns.data.message - Success confirmation message
 * @returns {number} returns.data.teams_updated - Number of teams recalculated
 * @returns {string} returns.data.recalculated_at - Recalculation timestamp
 * 
 * @throws {500} Scoring service errors or database failures
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * POST /api/leaderboard/123/recalculate
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Scores recalculated successfully",
 *     "teams_updated": 25,
 *     "recalculated_at": "2025-01-15T10:30:00.000Z"
 *   }
 * }
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
 * @route GET /api/leaderboard/:contestId/problems
 * @description Get comprehensive problem solving statistics for contest
 * 
 * Retrieves detailed statistics for all problems in a contest including
 * solve counts, solve percentages, and difficulty analysis. Useful for
 * understanding problem difficulty and contest balance.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestId - Contest ID to get problem stats for
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with problem statistics
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Problem statistics data
 * @returns {Array} returns.data.problems - Problem statistics array
 * @returns {number} returns.data.problems[].id - Problem identifier
 * @returns {string} returns.data.problems[].problem_letter - Problem letter (A, B, C, etc.)
 * @returns {string} returns.data.problems[].title - Problem title
 * @returns {string} returns.data.problems[].difficulty - Problem difficulty level
 * @returns {number} returns.data.problems[].solve_count - Number of teams that solved
 * @returns {string} returns.data.problems[].solve_percentage - Solve percentage
 * @returns {number} returns.data.total_teams - Total teams in contest
 * 
 * @throws {500} Database query errors
 * 
 * @example
 * GET /api/leaderboard/123/problems
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "problems": [
 *       {
 *         "id": 1,
 *         "problem_letter": "A",
 *         "title": "Hello World",
 *         "difficulty": "Easy",
 *         "solve_count": 45,
 *         "solve_percentage": "90.0"
 *       }
 *     ],
 *     "total_teams": 50
 *   }
 * }
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
 * @route GET /api/leaderboard/:contestId/live
 * @description Get real-time contest statistics for administrative monitoring
 * 
 * Provides live contest data including current leaderboard, submission
 * statistics, contest timing, and system status. Designed for administrative
 * dashboards and real-time monitoring during contests.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestId - Contest ID for live monitoring
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with live contest data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Live contest data
 * @returns {Object} returns.data.contest - Contest status and timing
 * @returns {string} returns.data.contest.status - Contest status (not_started|running|ended)
 * @returns {number} returns.data.contest.time_remaining_seconds - Time left in seconds
 * @returns {Array} returns.data.leaderboard - Top 20 teams current rankings
 * @returns {Object} returns.data.statistics - Submission and processing stats
 * @returns {number} returns.data.statistics.pending_submissions - Queued submissions
 * 
 * @throws {500} Database or scoring service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * GET /api/leaderboard/123/live
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "contest": {
 *       "status": "running",
 *       "time_remaining_seconds": 3600
 *     },
 *     "leaderboard": [...],
 *     "statistics": {
 *       "total_submissions": 200,
 *       "pending_submissions": 5
 *     }
 *   }
 * }
 */
router.get('/:contestId/live', verifyAdminToken, async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);

    // Get contest status
    const contest = await db('contests')
      .where('id', contestId)
      .first();

    // Get current leaderboard
    const leaderboard = await scoringService.getLeaderboard(contestId);

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
 * @route GET /api/leaderboard/:contestId/export
 * @description Export complete contest results as CSV file
 * 
 * Generates and downloads a CSV file containing the complete contest
 * leaderboard with team names, problems solved, penalty times, and
 * last submission times. Useful for archiving and external analysis.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestId - Contest ID to export results for
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {string} CSV file download with contest results
 * @returns Content-Type: text/csv
 * @returns Content-Disposition: attachment with filename
 * 
 * CSV Format:
 * - Rank,Team Name,Problems Solved,Penalty Time,Last Submission
 * - Quoted team names to handle commas in names
 * - ISO timestamp format for submission times
 * 
 * @throws {500} Database or scoring service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * GET /api/leaderboard/123/export
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response: CSV file download
 * "Rank,Team Name,Problems Solved,Penalty Time,Last Submission\n1,\"CodeMasters\",5,240,2025-01-15T10:30:00.000Z\n"
 */
router.get('/:contestId/export', verifyAdminToken, async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);

    // Get complete leaderboard with detailed information
    const leaderboard = await scoringService.getLeaderboard(contestId);

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
 * @route GET /api/leaderboard/websocket/stats
 * @description Get WebSocket connection statistics for monitoring
 * 
 * Retrieves current WebSocket connection statistics including active
 * connections, connection counts, and server performance metrics.
 * Used for monitoring real-time features and connection health.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with WebSocket statistics
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - WebSocket statistics data
 * @returns {Object} returns.data.websocket_stats - Connection statistics
 * @returns {string} returns.data.server_time - Current server timestamp
 * 
 * @throws {500} WebSocket service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * GET /api/leaderboard/websocket/stats
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "websocket_stats": {
 *       "active_connections": 25,
 *       "total_messages_sent": 1200
 *     },
 *     "server_time": "2025-01-15T10:30:00.000Z"
 *   }
 * }
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
 * @route POST /api/leaderboard/:contestId/broadcast
 * @description Manually trigger leaderboard broadcast to all connected clients
 * 
 * Forces an immediate broadcast of the current leaderboard to all WebSocket
 * clients connected to the contest. Useful for testing real-time features
 * or pushing urgent updates during contests.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestId - Contest ID to broadcast leaderboard for
 * @param {Object} req.admin - Admin user data from middleware
 * @param {string} req.admin.username - Administrator username for logging
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with broadcast confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Broadcast operation data
 * @returns {string} returns.data.message - Success confirmation message
 * @returns {number} returns.data.contest_id - Contest ID that was broadcast
 * @returns {string} returns.data.triggered_at - Broadcast timestamp
 * @returns {string} returns.data.triggered_by - Administrator who triggered broadcast
 * 
 * @throws {500} WebSocket service or broadcast errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * POST /api/leaderboard/123/broadcast
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Leaderboard broadcast triggered successfully",
 *     "contest_id": 123,
 *     "triggered_at": "2025-01-15T10:30:00.000Z",
 *     "triggered_by": "admin_user"
 *   }
 * }
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
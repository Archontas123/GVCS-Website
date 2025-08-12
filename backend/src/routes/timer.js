/**
 * Contest Timer Routes - Phase 2.4
 * Real-time contest timing and synchronization endpoints
 */

const express = require('express');
const router = express.Router();
const Contest = require('../controllers/contestController');
const { authenticateTeam } = require('../middleware/auth');
const { validate } = require('../utils/validation');
const Joi = require('joi');

/**
 * GET /api/timer/contest/:contestCode
 * Get current contest timing information for teams
 * Public endpoint for contest status synchronization
 */
router.get('/contest/:contestCode', async (req, res, next) => {
  try {
    const { contestCode } = req.params;

    // Find contest by registration code
    const contest = await Contest.findByRegistrationCode(contestCode);
    if (!contest) {
      return res.notFound('Contest not found');
    }

    // Get current contest status and timing
    const status = Contest.getContestStatus(contest);

    // Return timing information
    res.success({
      contest: {
        id: contest.id,
        name: contest.contest_name,
        registration_code: contest.registration_code
      },
      timing: status
    }, 'Contest timing retrieved successfully');

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/timer/sync
 * Server time synchronization endpoint
 * Returns precise server time for client synchronization
 */
router.get('/sync', (req, res) => {
  const serverTime = new Date();
  const timestamp = serverTime.getTime();

  res.success({
    server_time: serverTime.toISOString(),
    timestamp_ms: timestamp,
    timezone_offset: serverTime.getTimezoneOffset(),
    sync_id: `sync_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  }, 'Server time synchronization');
});

/**
 * GET /api/timer/contest/:contestCode/status
 * Authenticated endpoint for teams to get detailed contest status
 */
router.get('/contest/:contestCode/status', authenticateTeam, async (req, res, next) => {
  try {
    const { contestCode } = req.params;
    const team = req.team;

    // Verify team is registered for this contest
    const contest = await Contest.findByRegistrationCode(contestCode);
    if (!contest) {
      return res.notFound('Contest not found');
    }

    if (team.contestCode !== contestCode) {
      return res.forbidden('Team not registered for this contest');
    }

    // Get detailed contest status
    const status = Contest.getContestStatus(contest);

    // Get team-specific information
    const teamStats = await Contest.getTeamStatistics(contest.id, team.id);

    res.success({
      contest: {
        id: contest.id,
        name: contest.contest_name,
        description: contest.description,
        registration_code: contest.registration_code
      },
      team: {
        id: team.id,
        name: team.team_name,
        statistics: teamStats
      },
      timing: status,
      permissions: {
        can_submit: status.status === 'running',
        can_view_problems: ['running', 'frozen'].includes(status.status),
        can_register: status.status === 'not_started' && contest.is_registration_open
      }
    }, 'Detailed contest status retrieved successfully');

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/timer/contest/:contestCode/ping
 * Team activity ping endpoint
 * Updates team's last_activity timestamp
 */
router.post('/contest/:contestCode/ping', authenticateTeam, async (req, res, next) => {
  try {
    const { contestCode } = req.params;
    const team = req.team;

    // Verify team is registered for this contest
    if (team.contestCode !== contestCode) {
      return res.forbidden('Team not registered for this contest');
    }

    // Update team's last activity
    await Contest.updateTeamActivity(team.id);

    // Return basic timing info
    const contest = await Contest.findByRegistrationCode(contestCode);
    const status = Contest.getContestStatus(contest);

    res.success({
      timing: {
        server_time: status.current_server_time,
        time_remaining_seconds: status.time_remaining_seconds,
        status: status.status
      },
      activity_updated: true
    }, 'Team activity updated');

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/timer/contests/active
 * Get all currently active contests (for admin monitoring)
 */
router.get('/contests/active', async (req, res, next) => {
  try {
    const activeContests = await Contest.findActiveContests();
    
    const contestsWithStatus = activeContests.map(contest => ({
      ...contest,
      status: Contest.getContestStatus(contest)
    }));

    res.success(contestsWithStatus, 'Active contests retrieved successfully');

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/timer/duration/recommendations
 * Get contest duration recommendations for different contest types
 */
router.get('/duration/recommendations', (req, res) => {
  const contestType = req.query.type || 'standard';
  
  const recommendation = Contest.getDurationRecommendations(contestType);
  const allTypes = ['practice', 'beginner', 'standard', 'advanced', 'marathon'];
  
  const allRecommendations = {};
  allTypes.forEach(type => {
    allRecommendations[type] = Contest.getDurationRecommendations(type);
  });

  res.success({
    requested_type: contestType,
    recommendation,
    all_recommendations: allRecommendations
  }, 'Duration recommendations retrieved successfully');
});

/**
 * GET /api/timer/duration/optimal-freeze
 * Calculate optimal freeze time for a given duration
 */
router.get('/duration/optimal-freeze', (req, res) => {
  const duration = parseInt(req.query.duration);
  
  if (!duration || duration < 15) {
    return res.validationError(['Duration must be at least 15 minutes']);
  }
  
  const optimalFreezeTime = Contest.calculateOptimalFreezeTime(duration);
  const freezePercentage = Math.round((optimalFreezeTime / duration) * 100);

  res.success({
    duration_minutes: duration,
    optimal_freeze_time_minutes: optimalFreezeTime,
    freeze_percentage: freezePercentage,
    recommendation: `For a ${duration}-minute contest, freeze leaderboard ${optimalFreezeTime} minutes before end (${freezePercentage}% of duration)`
  }, 'Optimal freeze time calculated successfully');
});

module.exports = router;
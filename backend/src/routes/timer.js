/**
 * Contest Timer Routes Module
 * Provides real-time contest timing and synchronization endpoints for
 * teams, administrators, and system monitoring
 * @module routes/timer
 */

const express = require('express');
const router = express.Router();
const Contest = require('../controllers/contestController');
const { authenticateTeam } = require('../middleware/auth');
const { validate } = require('../utils/validation');
const Joi = require('joi');

/**
 * Get contest timing information by registration code (public endpoint)
 * @route GET /api/timer/contest/:contestCode
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestCode - Contest registration code
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with contest timing information
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Server error
 * @example
 * // GET /api/timer/contest/PROG2024
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "contest": {
 *       "id": 1,
 *       "name": "Programming Contest 2024",
 *       "registration_code": "PROG2024"
 *     },
 *     "timing": {
 *       "status": "running",
 *       "time_remaining_seconds": 3600,
 *       "progress_percentage": 50.0
 *     }
 *   }
 * }
 */
router.get('/contest/:contestCode', async (req, res, next) => {
  try {
    const { contestCode } = req.params;

    const contest = await Contest.findByRegistrationCode(contestCode);
    if (!contest) {
      return res.notFound('Contest not found');
    }

    const status = Contest.getContestStatus(contest);

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
 * Get server time for client synchronization
 * @route GET /api/timer/sync
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with precise server time information
 * @example
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "server_time": "2024-01-15T14:30:00.123Z",
 *     "timestamp_ms": 1705326600123,
 *     "timezone_offset": -300,
 *     "sync_id": "sync_1705326600123_abc123def"
 *   }
 * }
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
 * Get detailed contest status for authenticated teams
 * @route GET /api/timer/contest/:contestCode/status
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestCode - Contest registration code
 * @param {Object} req.team - Team object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with detailed contest and team status
 * @requires authenticateTeam - Team authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {ForbiddenError} 403 - Team not registered for this contest
 * @throws {NotFoundError} 404 - Contest not found
 * @throws {InternalServerError} 500 - Server error
 */
router.get('/contest/:contestCode/status', authenticateTeam, async (req, res, next) => {
  try {
    const { contestCode } = req.params;
    const team = req.team;

    const contest = await Contest.findByRegistrationCode(contestCode);
    if (!contest) {
      return res.notFound('Contest not found');
    }

    if (team.contestCode !== contestCode) {
      return res.forbidden('Team not registered for this contest');
    }

    const status = Contest.getContestStatus(contest);
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
        can_register: true
      }
    }, 'Detailed contest status retrieved successfully');

  } catch (error) {
    next(error);
  }
});

/**
 * Update team activity timestamp (heartbeat endpoint)
 * @route POST /api/timer/contest/:contestCode/ping
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.contestCode - Contest registration code
 * @param {Object} req.team - Team object from authentication middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with updated timing information
 * @requires authenticateTeam - Team authentication required
 * @throws {UnauthorizedError} 401 - Not authenticated
 * @throws {ForbiddenError} 403 - Team not registered for this contest
 * @throws {InternalServerError} 500 - Server error
 */
router.post('/contest/:contestCode/ping', authenticateTeam, async (req, res, next) => {
  try {
    const { contestCode } = req.params;
    const team = req.team;

    if (team.contestCode !== contestCode) {
      return res.forbidden('Team not registered for this contest');
    }

    await Contest.updateTeamActivity(team.id);

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
 * Get all currently active contests for monitoring
 * @route GET /api/timer/contests/active
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with array of active contests and their status
 * @throws {InternalServerError} 500 - Server error
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
 * Get contest duration recommendations for different contest types
 * @route GET /api/timer/duration/recommendations
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.type=standard] - Contest type (standard, short, long, practice)
 * @param {Object} res - Express response object
 * @returns {Object} Response with duration recommendations
 * @example
 * // GET /api/timer/duration/recommendations?type=standard
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "requested_type": "standard",
 *     "recommendation": {
 *       "duration": 180,
 *       "problems": "5-6",
 *       "freeze_time": 60
 *     },
 *     "all_recommendations": {...}
 *   }
 * }
 */
router.get('/duration/recommendations', (req, res) => {
  const allRecommendations = Contest.getDurationRecommendations();
  const requestedType = req.query.type || 'standard';
  const recommendation = allRecommendations[requestedType] || allRecommendations.standard;

  res.success({
    requested_type: requestedType,
    recommendation,
    all_recommendations: allRecommendations
  }, 'Duration recommendations retrieved successfully');
});

/**
 * Calculate optimal freeze time for a given contest duration
 * @route GET /api/timer/duration/optimal-freeze
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.duration - Contest duration in minutes (minimum 15)
 * @param {Object} res - Express response object
 * @returns {Object} Response with optimal freeze time calculation
 * @throws {ValidationError} 400 - Invalid duration parameter
 * @example
 * // GET /api/timer/duration/optimal-freeze?duration=180
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "duration_minutes": 180,
 *     "optimal_freeze_time_minutes": 60,
 *     "freeze_percentage": 33,
 *     "recommendation": "For a 180-minute contest, freeze leaderboard 60 minutes before end (33% of duration)"
 *   }
 * }
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
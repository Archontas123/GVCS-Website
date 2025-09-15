/**
 * @fileoverview Team authentication middleware for the programming contest platform.
 * Provides authentication and authorization for team-based API endpoints.
 */

const { verifyToken } = require('../utils/auth');
const { db } = require('../utils/db');

/**
 * Middleware to authenticate team requests using JWT tokens.
 * Validates Bearer tokens, verifies team existence and active status,
 * updates team activity timestamp, and attaches team data to request.
 * 
 * @async
 * @function authenticateTeam
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.authorization - Authorization header with Bearer token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {AuthenticationError} When no token provided, invalid token, or team not found
 * @example
 * // Usage in route
 * router.get('/protected', authenticateTeam, (req, res) => {
 *   console.log(req.team.name); // Team name from authenticated token
 * });
 */
const authenticateTeam = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('No token provided');
      error.name = 'AuthenticationError';
      return next(error);
    }
    
    const token = authHeader.substring(7);
    
    const decoded = verifyToken(token);
    
    if (!decoded.teamId) {
      const error = new Error('Invalid token payload');
      error.name = 'AuthenticationError';
      return next(error);
    }
    
    const team = await db('teams')
      .where({ id: decoded.teamId })
      .andWhere({ is_active: true })
      .first();
    
    if (!team) {
      const error = new Error('Team not found or inactive');
      error.name = 'AuthenticationError';
      return next(error);
    }
    
    await db('teams')
      .where({ id: team.id })
      .update({ 
        last_activity: db.fn.now() 
      });
    
    req.team = {
      id: team.id,
      name: team.team_name,
      contestCode: team.contest_code,
      registeredAt: team.registered_at,
      lastActivity: new Date()
    };
    
    next();
  } catch (error) {
    if (error.name === 'AuthenticationError') {
      return next(error);
    }
    
    const authError = new Error('Token verification failed');
    authError.name = 'AuthenticationError';
    next(authError);
  }
};

/**
 * Optional authentication middleware that attempts to authenticate teams
 * but continues processing even if authentication fails or no token is provided.
 * Useful for endpoints that can work with or without authentication.
 * 
 * @async
 * @function optionalAuth
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} [req.headers.authorization] - Optional authorization header with Bearer token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @description If authentication succeeds, req.team will be populated with team data.
 *              If authentication fails or no token provided, req.team remains undefined.
 * @example
 * // Usage for public endpoint with optional team context
 * router.get('/leaderboard', optionalAuth, (req, res) => {
 *   const isAuthenticated = !!req.team;
 *   // Show different data based on authentication status
 * });
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded.teamId) {
      const team = await db('teams')
        .where({ id: decoded.teamId })
        .andWhere({ is_active: true })
        .first();
      
      if (team) {
        req.team = {
          id: team.id,
          name: team.team_name,
          contestCode: team.contest_code,
          registeredAt: team.registered_at,
          lastActivity: team.last_activity
        };
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * @module auth
 * @description Exported team authentication middleware functions.
 * @exports {Object} middleware - Collection of team authentication middleware
 * @exports {Function} middleware.authenticateTeam - Strict team authentication middleware
 * @exports {Function} middleware.optionalAuth - Optional team authentication middleware
 */
module.exports = {
  authenticateTeam,
  optionalAuth
};
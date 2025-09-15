const { db } = require('../utils/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

/** @constant {number} Default session timeout in minutes (2 hours) */
const SESSION_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 120;

/**
 * Clean up expired team sessions based on inactivity timeout
 * Marks teams as inactive and clears their session tokens
 * @returns {Promise<number>} Number of sessions cleaned up
 * @throws {Error} When database operations fail
 */
const cleanupExpiredSessions = async () => {
  try {
    const timeoutThreshold = new Date(Date.now() - (SESSION_TIMEOUT_MINUTES * 60 * 1000));
    
    const result = await db('teams')
      .where('last_activity', '<', timeoutThreshold)
      .andWhere('is_active', true)
      .whereNotNull('session_token')
      .update({
        session_token: null,
        is_active: false
      });
    
    if (result > 0) {
      logger.info(`Cleaned up ${result} expired sessions`);
    }
    
    return result;
    
  } catch (error) {
    logger.error('Failed to cleanup expired sessions:', error);
    throw error;
  }
};

/**
 * Mark a specific team as inactive and clear their session
 * Updates team status and logs the deactivation reason
 * @param {number} teamId - Team ID to deactivate
 * @param {string} [reason='manual_logout'] - Reason for deactivation
 * @returns {Promise<void>}
 * @throws {Error} When database update fails
 */
const markTeamInactive = async (teamId, reason = 'manual_logout') => {
  try {
    await db('teams')
      .where('id', teamId)
      .update({
        session_token: null,
        is_active: false,
        last_activity: db.fn.now()
      });
    
    logger.info(`Team ${teamId} marked as inactive (${reason})`);
    
  } catch (error) {
    logger.error(`Failed to mark team ${teamId} as inactive:`, error);
    throw error;
  }
};

/**
 * Refresh a team's last activity timestamp to extend their session
 * Updates the last_activity field to current time
 * @param {number} teamId - Team ID to refresh
 * @returns {Promise<void>}
 * @throws {Error} When database update fails
 */
const refreshTeamActivity = async (teamId) => {
  try {
    await db('teams')
      .where('id', teamId)
      .update({
        last_activity: db.fn.now()
      });
    
  } catch (error) {
    logger.error(`Failed to refresh activity for team ${teamId}:`, error);
    throw error;
  }
};

/**
 * Get the current count of active teams with valid sessions
 * Counts teams that are active and have non-null session tokens
 * @returns {Promise<number>} Number of currently active teams
 * @throws {Error} When database query fails
 */
const getActiveTeamsCount = async () => {
  try {
    const result = await db('teams')
      .where('is_active', true)
      .whereNotNull('session_token')
      .count('id as count')
      .first();
    
    return parseInt(result.count) || 0;
    
  } catch (error) {
    logger.error('Failed to get active teams count:', error);
    throw error;
  }
};

/**
 * Start the automated session cleanup interval process
 * Runs cleanup every 5 minutes to remove expired sessions
 * @returns {void}
 */
const startSessionCleanupInterval = () => {
  /** @constant {number} Cleanup interval in minutes */
  const intervalMinutes = 5;
  /** @constant {number} Cleanup interval in milliseconds */
  const intervalMs = intervalMinutes * 60 * 1000;
  
  logger.info(`Starting session cleanup interval (every ${intervalMinutes} minutes)`);
  
  /**
   * Internal cleanup function executed at regular intervals
   * Performs session cleanup with error handling and logging
   * @private
   * @returns {Promise<void>}
   */
  const cleanup = async () => {
    try {
      await cleanupExpiredSessions();
    } catch (error) {
      logger.error('Session cleanup failed:', error);
    }
  };
  
  cleanup();
  
  setInterval(cleanup, intervalMs);
};

module.exports = {
  cleanupExpiredSessions,
  markTeamInactive,
  refreshTeamActivity,
  getActiveTeamsCount,
  startSessionCleanupInterval,
  SESSION_TIMEOUT_MINUTES
};
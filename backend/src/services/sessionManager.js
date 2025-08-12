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

const SESSION_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 120; // 2 hours

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

const startSessionCleanupInterval = () => {
  const intervalMinutes = 5; // Run cleanup every 5 minutes
  const intervalMs = intervalMinutes * 60 * 1000;
  
  logger.info(`Starting session cleanup interval (every ${intervalMinutes} minutes)`);
  
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
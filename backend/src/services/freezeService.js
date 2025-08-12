/**
 * Freeze Service - Phase 3.4
 * Manages leaderboard freeze state, frozen data storage, and freeze/unfreeze operations
 */

const { db } = require('../utils/db');
const icpcScoring = require('./icpcScoring');
const notificationService = require('./notificationService');

class FreezeService {
  /**
   * Check if contest should be automatically frozen
   * @param {number} contestId - Contest ID
   * @returns {boolean} True if contest should be frozen now
   */
  async shouldAutoFreeze(contestId) {
    try {
      const contest = await db('contests').where('id', contestId).first();
      
      if (!contest || contest.is_frozen) {
        return false;
      }
      
      const now = new Date();
      const startTime = new Date(contest.start_time);
      const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
      const freezeTime = new Date(endTime.getTime() - contest.freeze_time * 60 * 1000);
      
      // Should freeze if current time is past freeze time and contest is still running
      return now >= freezeTime && now < endTime;
    } catch (error) {
      console.error('Error checking auto-freeze condition:', error);
      return false;
    }
  }
  
  /**
   * Freeze the contest leaderboard
   * @param {number} contestId - Contest ID
   * @param {number} adminId - Admin ID (optional for auto-freeze)
   * @returns {Object} Updated contest data
   */
  async freezeLeaderboard(contestId, adminId = null) {
    try {
      const contest = await db('contests').where('id', contestId).first();
      
      if (!contest) {
        throw new Error('Contest not found');
      }
      
      if (contest.is_frozen) {
        throw new Error('Contest is already frozen');
      }
      
      const now = new Date();
      const startTime = new Date(contest.start_time);
      const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
      
      // Check if contest has ended
      if (now >= endTime) {
        throw new Error('Cannot freeze contest that has already ended');
      }
      
      // Get current leaderboard to store as frozen state
      const currentLeaderboard = await icpcScoring.getEnhancedLeaderboard(contestId);
      
      // Store frozen leaderboard data
      await this.storeFrozenLeaderboard(contestId, currentLeaderboard, now);
      
      // Update contest freeze status
      const [updatedContest] = await db('contests')
        .where('id', contestId)
        .update({
          is_frozen: true,
          frozen_at: now
        })
        .returning('*');
      
      // Notify all connected clients about the freeze
      try {
        const websocketService = require('./websocketService');
        await websocketService.broadcastFreezeUpdate(contestId, updatedContest);
      } catch (error) {
        console.error('Failed to broadcast freeze update:', error);
        // Don't throw - WebSocket notifications are non-critical
      }
      
      return updatedContest;
    } catch (error) {
      console.error('Error freezing leaderboard:', error);
      throw error;
    }
  }
  
  /**
   * Unfreeze the contest leaderboard
   * @param {number} contestId - Contest ID
   * @param {number} adminId - Admin ID
   * @returns {Object} Updated contest data
   */
  async unfreezeLeaderboard(contestId, adminId) {
    try {
      const contest = await db('contests').where('id', contestId).first();
      
      if (!contest) {
        throw new Error('Contest not found');
      }
      
      if (!contest.is_frozen) {
        throw new Error('Contest is not currently frozen');
      }
      
      // Update contest freeze status
      const [updatedContest] = await db('contests')
        .where('id', contestId)
        .update({
          is_frozen: false,
          frozen_at: null
        })
        .returning('*');
      
      // Clean up frozen leaderboard data
      await this.clearFrozenLeaderboard(contestId);
      
      // Notify all connected clients about the unfreeze
      try {
        const websocketService = require('./websocketService');
        await websocketService.broadcastUnfreezeUpdate(contestId, updatedContest);
      } catch (error) {
        console.error('Failed to broadcast unfreeze update:', error);
        // Don't throw - WebSocket notifications are non-critical
      }
      
      return updatedContest;
    } catch (error) {
      console.error('Error unfreezing leaderboard:', error);
      throw error;
    }
  }
  
  /**
   * Get frozen leaderboard data
   * @param {number} contestId - Contest ID
   * @returns {Array} Frozen leaderboard or null if not frozen
   */
  async getFrozenLeaderboard(contestId) {
    try {
      const contest = await db('contests').where('id', contestId).first();
      
      if (!contest || !contest.is_frozen) {
        return null;
      }
      
      // Check if we have stored frozen data
      const frozenData = await db('frozen_leaderboards')
        .where('contest_id', contestId)
        .first();
      
      if (frozenData) {
        return JSON.parse(frozenData.leaderboard_data);
      }
      
      // Fallback: return current leaderboard (shouldn't happen in normal operation)
      return await icpcScoring.getEnhancedLeaderboard(contestId);
    } catch (error) {
      console.error('Error getting frozen leaderboard:', error);
      throw error;
    }
  }
  
  /**
   * Check if contest is currently frozen
   * @param {number} contestId - Contest ID
   * @returns {boolean} True if contest is frozen
   */
  async isContestFrozen(contestId) {
    try {
      const contest = await db('contests').where('id', contestId).first();
      return contest ? contest.is_frozen : false;
    } catch (error) {
      console.error('Error checking freeze status:', error);
      return false;
    }
  }
  
  /**
   * Get time until contest should be frozen
   * @param {number} contestId - Contest ID
   * @returns {number|null} Seconds until freeze, or null if not applicable
   */
  async getTimeUntilFreeze(contestId) {
    try {
      const contest = await db('contests').where('id', contestId).first();
      
      if (!contest || contest.is_frozen) {
        return null;
      }
      
      const now = new Date();
      const startTime = new Date(contest.start_time);
      const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
      const freezeTime = new Date(endTime.getTime() - contest.freeze_time * 60 * 1000);
      
      // If contest hasn't started or freeze time is past, return null
      if (now < startTime || now >= freezeTime) {
        return null;
      }
      
      // Return seconds until freeze
      return Math.max(0, Math.floor((freezeTime - now) / 1000));
    } catch (error) {
      console.error('Error calculating time until freeze:', error);
      return null;
    }
  }
  
  /**
   * Store frozen leaderboard data
   * @private
   * @param {number} contestId - Contest ID
   * @param {Array} leaderboardData - Current leaderboard data
   * @param {Date} frozenAt - Freeze timestamp
   */
  async storeFrozenLeaderboard(contestId, leaderboardData, frozenAt) {
    try {
      // First, ensure the frozen_leaderboards table exists
      const hasTable = await db.schema.hasTable('frozen_leaderboards');
      
      if (!hasTable) {
        await db.schema.createTable('frozen_leaderboards', table => {
          table.increments('id');
          table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');
          table.json('leaderboard_data');
          table.timestamp('frozen_at');
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.unique(['contest_id']);
        });
      }
      
      // Store or update frozen leaderboard
      await db('frozen_leaderboards')
        .insert({
          contest_id: contestId,
          leaderboard_data: JSON.stringify(leaderboardData),
          frozen_at: frozenAt
        })
        .onConflict('contest_id')
        .merge(['leaderboard_data', 'frozen_at']);
        
    } catch (error) {
      console.error('Error storing frozen leaderboard:', error);
      throw error;
    }
  }
  
  /**
   * Clear frozen leaderboard data
   * @private
   * @param {number} contestId - Contest ID
   */
  async clearFrozenLeaderboard(contestId) {
    try {
      const hasTable = await db.schema.hasTable('frozen_leaderboards');
      
      if (hasTable) {
        await db('frozen_leaderboards')
          .where('contest_id', contestId)
          .del();
      }
    } catch (error) {
      console.error('Error clearing frozen leaderboard:', error);
      // Don't throw error here as it's not critical
    }
  }
  
  /**
   * Get display leaderboard (frozen if applicable, real-time otherwise)
   * @param {number} contestId - Contest ID
   * @returns {Array} Leaderboard data to display
   */
  async getDisplayLeaderboard(contestId) {
    try {
      const isFrozen = await this.isContestFrozen(contestId);
      
      if (isFrozen) {
        const frozenLeaderboard = await this.getFrozenLeaderboard(contestId);
        if (frozenLeaderboard) {
          return frozenLeaderboard;
        }
      }
      
      // Return real-time leaderboard
      return await icpcScoring.getEnhancedLeaderboard(contestId);
    } catch (error) {
      console.error('Error getting display leaderboard:', error);
      throw error;
    }
  }
}

module.exports = new FreezeService();
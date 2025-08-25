/**
 * Unified Scoring Service
 * Routes to appropriate scoring system based on contest configuration
 */

const { db } = require('../utils/db');
const icpcScoring = require('./icpcScoring');
const hackathonScoring = require('./hackathonScoring');

class ScoringService {
  /**
   * Get the appropriate scoring service for a contest
   */
  async getScoringService(contestId) {
    try {
      const contest = await db('contests')
        .where('id', contestId)
        .first('scoring_type');
      
      if (!contest) {
        throw new Error(`Contest with ID ${contestId} not found`);
      }
      
      // Default to hackathon scoring if not specified
      const scoringType = contest.scoring_type || 'hackathon';
      
      return scoringType === 'icpc' ? icpcScoring : hackathonScoring;
    } catch (error) {
      console.error('Error getting scoring service:', error);
      // Default to hackathon scoring on error
      return hackathonScoring;
    }
  }

  /**
   * Calculate team score using appropriate scoring system
   */
  async calculateTeamScore(teamId, contestId) {
    const scoringService = await this.getScoringService(contestId);
    return await scoringService.calculateTeamScore(teamId, contestId);
  }

  /**
   * Get leaderboard using appropriate scoring system
   */
  async getLeaderboard(contestId) {
    const scoringService = await this.getScoringService(contestId);
    return await scoringService.getLeaderboard(contestId);
  }

  /**
   * Update team score on submission using appropriate scoring system
   */
  async updateTeamScoreOnSubmission(teamId, problemId, submissionResult) {
    // Get contest ID to determine scoring type
    const problem = await db('problems')
      .where('id', problemId)
      .first('contest_id');
    
    if (!problem) {
      throw new Error('Problem not found');
    }

    const scoringService = await this.getScoringService(problem.contest_id);
    return await scoringService.updateTeamScoreOnSubmission(teamId, problemId, submissionResult);
  }

  /**
   * Get team statistics using appropriate scoring system
   */
  async getTeamStatistics(teamId, contestId) {
    const scoringService = await this.getScoringService(contestId);
    return await scoringService.getTeamStatistics(teamId, contestId);
  }

  /**
   * Get problem attempt details using appropriate scoring system
   */
  async getProblemAttemptDetails(teamId, problemId) {
    // Get contest ID to determine scoring type
    const problem = await db('problems')
      .where('id', problemId)
      .first('contest_id');
    
    if (!problem) {
      throw new Error('Problem not found');
    }

    const scoringService = await this.getScoringService(problem.contest_id);
    return await scoringService.getProblemAttemptDetails(teamId, problemId);
  }

  /**
   * Get contest scoring type
   */
  async getContestScoringType(contestId) {
    try {
      const contest = await db('contests')
        .where('id', contestId)
        .first('scoring_type');
      
      return contest ? (contest.scoring_type || 'hackathon') : 'hackathon';
    } catch (error) {
      console.error('Error getting contest scoring type:', error);
      return 'hackathon';
    }
  }

  /**
   * Set contest scoring type
   */
  async setContestScoringType(contestId, scoringType) {
    try {
      if (!['icpc', 'hackathon'].includes(scoringType)) {
        throw new Error('Invalid scoring type. Must be "icpc" or "hackathon"');
      }

      await db('contests')
        .where('id', contestId)
        .update('scoring_type', scoringType);

      console.log(`Set contest ${contestId} scoring type to: ${scoringType}`);
      return true;
    } catch (error) {
      console.error('Error setting contest scoring type:', error);
      throw error;
    }
  }

  /**
   * Get enhanced leaderboard with appropriate scoring system
   */
  async getEnhancedLeaderboard(contestId) {
    const scoringService = await this.getScoringService(contestId);
    
    // Use enhanced leaderboard if available, otherwise fall back to basic
    if (scoringService.getEnhancedLeaderboard) {
      return await scoringService.getEnhancedLeaderboard(contestId);
    } else {
      return await scoringService.getLeaderboard(contestId);
    }
  }
}

module.exports = new ScoringService();
/**
 * Hackathon Scoring Service
 * Provides hackathon-style scoring with partial credit
 */

const { db } = require('../utils/db');
const hackathonScoring = require('./hackathonScoring');

class ScoringService {
  /**
   * Get the hackathon scoring service
   */
  async getScoringService(contestId) {
    return hackathonScoring;
  }

  /**
   * Calculate team score using hackathon scoring system
   */
  async calculateTeamScore(teamId, contestId) {
    return await hackathonScoring.calculateTeamScore(teamId, contestId);
  }

  /**
   * Get leaderboard using hackathon scoring system
   */
  async getLeaderboard(contestId) {
    return await hackathonScoring.getLeaderboard(contestId);
  }

  /**
   * Update team score on submission using hackathon scoring system
   */
  async updateTeamScoreOnSubmission(teamId, problemId, submissionResult) {
    return await hackathonScoring.updateTeamScoreOnSubmission(teamId, problemId, submissionResult);
  }

  /**
   * Get team statistics using hackathon scoring system
   */
  async getTeamStatistics(teamId, contestId) {
    return await hackathonScoring.getTeamStatistics(teamId, contestId);
  }

  /**
   * Get problem attempt details using hackathon scoring system
   */
  async getProblemAttemptDetails(teamId, problemId) {
    return await hackathonScoring.getProblemAttemptDetails(teamId, problemId);
  }

  /**
   * Get contest scoring type (always hackathon)
   */
  async getContestScoringType(contestId) {
    return 'hackathon';
  }

  /**
   * Set contest scoring type (deprecated - always uses hackathon)
   */
  async setContestScoringType(contestId, scoringType) {
    console.log(`Contest ${contestId} always uses hackathon scoring`);
    return true;
  }

  /**
   * Get enhanced leaderboard with hackathon scoring system
   */
  async getEnhancedLeaderboard(contestId) {
    return await hackathonScoring.getLeaderboard(contestId);
  }
}

module.exports = new ScoringService();
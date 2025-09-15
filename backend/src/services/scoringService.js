const { db } = require('../utils/db');
const partialScoringService = require('./partialScoringService');

/**
 * Service for handling contest scoring and leaderboard calculations
 * Integrates with partial scoring system for flexible score computation
 */
class ScoringService {
  /**
   * Calculate team score using partial credit scoring system
   * Computes total score based on best submission for each problem
   * @param {number} teamId - Team ID to calculate score for
   * @param {number} contestId - Contest ID containing the problems
   * @returns {Promise<Object>} Score breakdown with total and per-problem scores
   * @throws {Error} When database query fails
   */
  async calculateTeamScore(teamId, contestId) {
    try {
      const problems = await db('problems')
        .where('contest_id', contestId)
        .select('id', 'problemLetter', 'max_points');

      let totalScore = 0;
      const problemScores = {};

      for (const problem of problems) {
        const bestSubmission = await db('submissions')
          .where('team_id', teamId)
          .where('problem_id', problem.id)
          .orderBy('points_earned', 'desc')
          .orderBy('submitted_at', 'asc')
          .first();

        const problemScore = bestSubmission ? (bestSubmission.points_earned || 0) : 0;
        problemScores[problem.problemLetter] = problemScore;
        totalScore += problemScore;
      }

      return {
        teamId,
        contestId,
        totalScore,
        problemScores
      };
    } catch (error) {
      console.error('Error calculating team score:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard using partial credit scoring system
   * Delegates to partialScoringService for comprehensive scoring
   * @param {number} contestId - Contest ID to get leaderboard for
   * @returns {Promise<Array>} Sorted leaderboard with team scores and rankings
   * @throws {Error} When scoring service fails
   */
  async getLeaderboard(contestId) {
    return await partialScoringService.getContestScores(contestId);
  }

  /**
   * Update team score on submission
   * Placeholder method - actual scoring handled by partialScoringService
   * @param {number} teamId - Team ID that submitted
   * @param {number} problemId - Problem ID submitted for
   * @param {Object} submissionResult - Result of the submission
   * @returns {Promise<boolean>} Always returns true (delegated to partialScoringService)
   */
  async updateTeamScoreOnSubmission(teamId, problemId, submissionResult) {
    return true;
  }

  /**
   * Get comprehensive team statistics for a contest
   * Includes submission counts, scores, and problem-wise breakdown
   * @param {number} teamId - Team ID to get statistics for
   * @param {number} contestId - Contest ID to analyze
   * @returns {Promise<Object>} Team statistics including scores and problem details
   * @throws {Error} When database query fails
   */
  async getTeamStatistics(teamId, contestId) {
    try {
      const submissions = await db('submissions as s')
        .join('problems as p', 's.problem_id', 'p.id')
        .where('s.team_id', teamId)
        .where('s.contest_id', contestId)
        .select(
          's.*',
          'p.problemLetter',
          'p.title'
        );

      const problemStats = {};
      let totalScore = 0;

      submissions.forEach(sub => {
        const letter = sub.problemLetter;
        if (!problemStats[letter]) {
          problemStats[letter] = {
            attempts: 0,
            bestScore: 0,
            solved: false
          };
        }

        problemStats[letter].attempts++;
        if (sub.points_earned > problemStats[letter].bestScore) {
          problemStats[letter].bestScore = sub.points_earned;
          problemStats[letter].solved = sub.verdict === 'accepted';
        }
      });

      Object.values(problemStats).forEach(stat => {
        totalScore += stat.bestScore;
      });

      return {
        teamId,
        contestId,
        totalScore,
        problemStats,
        totalSubmissions: submissions.length
      };
    } catch (error) {
      console.error('Error getting team statistics:', error);
      throw error;
    }
  }

  /**
   * Get detailed attempt information for a specific problem
   * Returns all submissions made by a team for a particular problem
   * @param {number} teamId - Team ID to get attempts for
   * @param {number} problemId - Problem ID to analyze
   * @returns {Promise<Object>} Attempt details with submission history
   * @throws {Error} When database query fails
   */
  async getProblemAttemptDetails(teamId, problemId) {
    try {
      const submissions = await db('submissions')
        .where('team_id', teamId)
        .where('problem_id', problemId)
        .orderBy('submitted_at', 'desc');

      return {
        teamId,
        problemId,
        attempts: submissions.length,
        submissions
      };
    } catch (error) {
      console.error('Error getting problem attempt details:', error);
      throw error;
    }
  }
}

module.exports = new ScoringService();
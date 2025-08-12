/**
 * Balloon Service - Phase 3.5
 * Handles virtual balloon system: first solve detection, balloon assignment, and notifications
 */

const { db } = require('../utils/db');

class BalloonService {
  /**
   * Balloon color mapping for problems
   * Standard ICPC balloon colors by problem letter
   */
  static BALLOON_COLORS = {
    'A': 'red',
    'B': 'blue', 
    'C': 'green',
    'D': 'yellow',
    'E': 'orange',
    'F': 'purple',
    'G': 'pink',
    'H': 'brown',
    'I': 'gray',
    'J': 'white',
    'K': 'black',
    'L': 'cyan'
  };

  /**
   * Task 1: Detect first team to solve a specific problem
   * @param {number} problemId - Problem ID
   * @param {number} contestId - Contest ID
   * @returns {Object|null} First solve submission or null if no solves
   */
  async detectFirstSolve(problemId, contestId) {
    try {
      // Get the first accepted submission for this problem
      const firstSolve = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .join('teams as t', 't.id', 's.team_id')
        .where('s.problem_id', problemId)
        .where('p.contest_id', contestId)
        .where('s.status', 'accepted')
        .orderBy('s.submission_time', 'asc')
        .first([
          's.id as submission_id',
          's.team_id',
          's.problem_id',
          's.submission_time',
          't.team_name',
          'p.problem_letter'
        ]);

      return firstSolve || null;
    } catch (error) {
      console.error('Error detecting first solve:', error);
      throw error;
    }
  }

  /**
   * Task 2: Award balloon to team for first solve
   * @param {number} contestId - Contest ID
   * @param {number} teamId - Team ID
   * @param {number} problemId - Problem ID
   * @param {string} problemLetter - Problem letter (A, B, C, etc.)
   * @returns {Object} Awarded balloon data
   */
  async awardBalloon(contestId, teamId, problemId, problemLetter = null) {
    try {
      // Get problem letter if not provided
      if (!problemLetter) {
        const problem = await db('problems')
          .where('id', problemId)
          .first('problem_letter');
        problemLetter = problem ? problem.problem_letter : 'A';
      }

      // Check if balloon already awarded for this problem
      const existingBalloon = await db('balloons')
        .where('contest_id', contestId)
        .where('problem_id', problemId)
        .first();

      if (existingBalloon) {
        throw new Error('Balloon already awarded for this problem');
      }

      // Get balloon color for problem
      const color = this.getBalloonColor(problemId, problemLetter);

      // Award the balloon
      const balloonData = {
        contest_id: contestId,
        team_id: teamId,
        problem_id: problemId,
        color: color,
        awarded_at: new Date()
      };

      const [balloonResult] = await db('balloons')
        .insert(balloonData)
        .returning('*');

      const balloon = balloonResult || balloonData;

      // Broadcast balloon award notification
      try {
        const websocketService = require('./websocketService');
        await websocketService.broadcastBalloonAward(contestId, {
          balloon: balloon,
          team_id: teamId,
          problem_id: problemId,
          problem_letter: problemLetter,
          color: color
        });
      } catch (error) {
        console.error('Failed to broadcast balloon award:', error);
        // Don't throw - WebSocket notifications are non-critical
      }

      return balloon;
    } catch (error) {
      console.error('Error awarding balloon:', error);
      throw error;
    }
  }

  /**
   * Get balloon color for a problem
   * @param {number} problemId - Problem ID
   * @param {string} problemLetter - Problem letter
   * @returns {string} Balloon color
   */
  getBalloonColor(problemId, problemLetter) {
    return BalloonService.BALLOON_COLORS[problemLetter] || 'silver';
  }

  /**
   * Task 3: Get all balloons awarded to a specific team
   * @param {number} teamId - Team ID
   * @param {number} contestId - Contest ID
   * @returns {Array} Team's balloon collection
   */
  async getTeamBalloons(teamId, contestId) {
    try {
      const balloons = await db('balloons as b')
        .join('problems as p', 'p.id', 'b.problem_id')
        .join('teams as t', 't.id', 'b.team_id')
        .where('b.team_id', teamId)
        .where('b.contest_id', contestId)
        .orderBy('b.awarded_at', 'asc')
        .select([
          'b.id',
          'b.color',
          'b.awarded_at',
          'p.problem_letter',
          'p.title as problem_title',
          't.team_name'
        ]);

      return balloons;
    } catch (error) {
      console.error('Error getting team balloons:', error);
      throw error;
    }
  }

  /**
   * Task 4: Get all balloons awarded in a contest
   * @param {number} contestId - Contest ID
   * @returns {Array} All contest balloons
   */
  async getContestBalloons(contestId) {
    try {
      const balloons = await db('balloons as b')
        .join('problems as p', 'p.id', 'b.problem_id')
        .join('teams as t', 't.id', 'b.team_id')
        .where('b.contest_id', contestId)
        .orderBy('b.awarded_at', 'asc')
        .select([
          'b.id',
          'b.color',
          'b.awarded_at',
          'p.problem_letter',
          'p.title as problem_title',
          't.team_name',
          'b.team_id',
          'b.problem_id'
        ]);

      return balloons;
    } catch (error) {
      console.error('Error getting contest balloons:', error);
      throw error;
    }
  }

  /**
   * Get balloon statistics for a contest
   * @param {number} contestId - Contest ID
   * @returns {Object} Balloon statistics
   */
  async getBalloonStats(contestId) {
    try {
      const stats = await db('balloons')
        .where('contest_id', contestId)
        .count('* as total_balloons')
        .first();

      const colorStats = await db('balloons')
        .where('contest_id', contestId)
        .select('color')
        .count('* as count')
        .groupBy('color');

      const teamStats = await db('balloons')
        .where('contest_id', contestId)
        .select('team_id')
        .count('* as balloon_count')
        .groupBy('team_id')
        .orderBy('balloon_count', 'desc');

      return {
        total_balloons: parseInt(stats.total_balloons) || 0,
        color_distribution: colorStats,
        top_teams: teamStats
      };
    } catch (error) {
      console.error('Error getting balloon stats:', error);
      throw error;
    }
  }

  /**
   * Check and award balloon for a new accepted submission
   * This is the main entry point called when a submission is judged
   * @param {Object} submission - Submission data
   * @returns {Object|null} Awarded balloon or null if not first solve
   */
  async processSubmissionForBalloon(submission) {
    try {
      // Only process accepted submissions
      if (submission.status !== 'accepted') {
        return null;
      }

      // Get contest ID from problem
      const problem = await db('problems')
        .where('id', submission.problem_id)
        .first(['contest_id', 'problem_letter']);

      if (!problem) {
        throw new Error('Problem not found');
      }

      // Check if this is the first solve
      const firstSolve = await this.detectFirstSolve(submission.problem_id, problem.contest_id);
      
      if (!firstSolve || firstSolve.team_id !== submission.team_id) {
        // Not the first solve
        return null;
      }

      // Check if balloon already exists (race condition protection)
      const existingBalloon = await db('balloons')
        .where('contest_id', problem.contest_id)
        .where('problem_id', submission.problem_id)
        .first();

      if (existingBalloon) {
        return null; // Balloon already awarded
      }

      // Award the balloon
      const balloon = await this.awardBalloon(
        problem.contest_id,
        submission.team_id,
        submission.problem_id,
        problem.problem_letter
      );

      console.log(`🎈 Balloon awarded! Team ${submission.team_id} gets ${balloon.color} balloon for problem ${problem.problem_letter}`);

      return balloon;
    } catch (error) {
      console.error('Error processing submission for balloon:', error);
      // Don't throw - balloon processing should not fail submission judging
      return null;
    }
  }

  /**
   * Get balloon information for leaderboard display
   * @param {number} contestId - Contest ID
   * @returns {Object} Balloon data organized by team
   */
  async getBalloonsForLeaderboard(contestId) {
    try {
      const balloons = await this.getContestBalloons(contestId);
      
      // Organize by team for leaderboard integration
      const balloonsByTeam = {};
      
      balloons.forEach(balloon => {
        if (!balloonsByTeam[balloon.team_id]) {
          balloonsByTeam[balloon.team_id] = {
            balloons: [],
            balloon_count: 0,
            colors: []
          };
        }
        
        balloonsByTeam[balloon.team_id].balloons.push({
          problem_letter: balloon.problem_letter,
          color: balloon.color,
          awarded_at: balloon.awarded_at
        });
        balloonsByTeam[balloon.team_id].balloon_count++;
        balloonsByTeam[balloon.team_id].colors.push(balloon.color);
      });

      return balloonsByTeam;
    } catch (error) {
      console.error('Error getting balloons for leaderboard:', error);
      return {};
    }
  }

  /**
   * Get first solve status for all problems in contest
   * @param {number} contestId - Contest ID
   * @returns {Object} First solve status by problem
   */
  async getFirstSolveStatus(contestId) {
    try {
      const problems = await db('problems')
        .where('contest_id', contestId)
        .select(['id', 'problem_letter']);

      const firstSolveStatus = {};

      for (const problem of problems) {
        const firstSolve = await this.detectFirstSolve(problem.id, contestId);
        firstSolveStatus[problem.problem_letter] = {
          problem_id: problem.id,
          has_first_solve: !!firstSolve,
          first_solve_team: firstSolve ? firstSolve.team_id : null,
          first_solve_time: firstSolve ? firstSolve.submission_time : null,
          balloon_color: this.getBalloonColor(problem.id, problem.problem_letter)
        };
      }

      return firstSolveStatus;
    } catch (error) {
      console.error('Error getting first solve status:', error);
      throw error;
    }
  }
}

module.exports = new BalloonService();
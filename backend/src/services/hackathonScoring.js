/**
 * Hackathon Scoring System - Points-Based Scoring (No Penalties)
 * Teams gain points for correct submissions, no penalties for wrong attempts
 * Encourages exploration and multiple attempts during hackathon timeframe
 */

const { db } = require('../utils/db');

class HackathonScoring {
  constructor() {
    // Simple points configuration
    this.pointsConfig = {
      DEFAULT_POINTS: 1,          // Default points per problem
      TIME_BONUS: {               // No time bonuses
        ENABLED: false
      },
      FIRST_SOLVE_BONUS: 0        // No first solve bonus
    };
  }

  /**
   * Calculate partial points based on test cases passed
   * @param {number} testCasesPassed - Number of test cases passed (excluding samples)
   * @param {number} totalTestCases - Total test cases (excluding samples)
   * @param {number} problemPoints - Total points available for this problem
   * @returns {number} Points earned (can be fractional)
   */
  calculatePartialPoints(testCasesPassed, totalTestCases, problemPoints) {
    if (totalTestCases === 0) return 0;
    
    // Simple fraction: (passed / total) * available_points
    const pointsEarned = (testCasesPassed / totalTestCases) * problemPoints;
    
    // Round to 2 decimal places
    return Math.round(pointsEarned * 100) / 100;
  }

  /**
   * Get all problems attempted by a team with their partial points
   */
  async getTeamProblemScores(teamId, contestId) {
    try {
      // Get all problems in the contest
      const problems = await db('problems')
        .where('contest_id', contestId)
        .select('id', 'problem_letter', 'title', 'points_value')
        .orderBy('problem_letter');

      const problemScores = [];
      
      for (const problem of problems) {
        // Get the best submission for this team and problem
        const bestSubmission = await this.getBestSubmissionScore(teamId, problem.id);
        
        if (bestSubmission) {
          problemScores.push({
            problem_id: problem.id,
            problem_letter: problem.problem_letter,
            title: problem.title,
            total_points: problem.points_value || this.pointsConfig.DEFAULT_POINTS,
            points_earned: bestSubmission.points_earned,
            test_cases_passed: bestSubmission.test_cases_passed,
            total_test_cases: bestSubmission.total_test_cases,
            submission_time: bestSubmission.submission_time,
            is_fully_solved: bestSubmission.points_earned === (problem.points_value || this.pointsConfig.DEFAULT_POINTS)
          });
        }
      }

      return problemScores;
    } catch (error) {
      console.error('Error getting team problem scores:', error);
      throw error;
    }
  }

  /**
   * Get the best submission score for a team on a problem
   */
  async getBestSubmissionScore(teamId, problemId) {
    try {
      // Get the submission with the highest points for this team and problem
      const bestSubmission = await db('submissions')
        .where('team_id', teamId)
        .where('problem_id', problemId)
        .orderBy('points_earned', 'desc')
        .orderBy('submission_time', 'asc') // Earlier submission wins ties
        .first('points_earned', 'test_cases_passed', 'total_test_cases', 'submission_time');

      return bestSubmission;
    } catch (error) {
      console.error('Error getting best submission score:', error);
      return null;
    }
  }

  /**
   * Calculate total score for a team
   */
  async calculateTeamScore(teamId, contestId) {
    try {
      const problemScores = await this.getTeamProblemScores(teamId, contestId);
      
      const totalPoints = problemScores.reduce((sum, problem) => sum + problem.points_earned, 0);
      const problemsFullySolved = problemScores.filter(p => p.is_fully_solved).length;
      const problemsAttempted = problemScores.length;
      
      // Get last submission time for tiebreaking
      const lastSubmission = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .where('s.team_id', teamId)
        .where('p.contest_id', contestId)
        .orderBy('s.submission_time', 'desc')
        .first('s.submission_time');

      return {
        team_id: teamId,
        contest_id: contestId,
        total_points: Math.round(totalPoints * 100) / 100, // Round to 2 decimal places
        problems_solved: problemsFullySolved,
        problems_attempted: problemsAttempted,
        problem_scores: problemScores,
        last_submission_time: lastSubmission ? lastSubmission.submission_time : null
      };
    } catch (error) {
      console.error('Error calculating team score:', error);
      throw error;
    }
  }

  /**
   * Calculate scores for all teams in a contest
   */
  async calculateContestScores(contestId) {
    try {
      // Get all teams in the contest
      const teams = await db('teams as t')
        .join('contests as c', 'c.registration_code', 't.contest_code')
        .where('c.id', contestId)
        .select('t.id as team_id', 't.team_name');

      const scores = [];
      
      for (const team of teams) {
        const score = await this.calculateTeamScore(team.team_id, contestId);
        scores.push({
          ...score,
          team_name: team.team_name
        });
      }

      return scores;
    } catch (error) {
      console.error('Error calculating contest scores:', error);
      throw error;
    }
  }

  /**
   * Rank teams by points (descending), then by problems solved, then by earliest last submission
   */
  async rankTeams(contestId) {
    try {
      const scores = await this.calculateContestScores(contestId);
      
      // Sort teams by hackathon ranking criteria:
      // 1. Total points (descending) - most points wins
      // 2. Problems solved (descending) - more problems solved is better
      // 3. Last submission time (ascending) - earlier submission breaks ties
      const rankedTeams = scores.sort((a, b) => {
        // Primary: Total points (more is better)
        if (a.total_points !== b.total_points) {
          return b.total_points - a.total_points;
        }
        
        // Secondary: Problems solved (more is better)
        if (a.problems_solved !== b.problems_solved) {
          return b.problems_solved - a.problems_solved;
        }
        
        // Tertiary: Last submission time (earlier is better)
        if (a.last_submission_time && b.last_submission_time) {
          return new Date(a.last_submission_time) - new Date(b.last_submission_time);
        }
        
        // If one team has submissions and other doesn't, rank submitting team higher
        if (a.last_submission_time && !b.last_submission_time) return -1;
        if (!a.last_submission_time && b.last_submission_time) return 1;
        
        // If both have no submissions, maintain stable sort by team name
        return a.team_name.localeCompare(b.team_name);
      });

      return rankedTeams;
    } catch (error) {
      console.error('Error ranking teams:', error);
      throw error;
    }
  }

  /**
   * Assign rank numbers to teams
   */
  async assignRanks(contestId) {
    try {
      const rankedTeams = await this.rankTeams(contestId);
      let currentRank = 1;
      let previousTeam = null;
      
      const teamsWithRanks = rankedTeams.map((team, index) => {
        // Check if this team is tied with the previous team
        if (previousTeam && 
            team.total_points === previousTeam.total_points && 
            team.problems_solved === previousTeam.problems_solved) {
          // Tied teams get the same rank
          team.rank = previousTeam.rank;
        } else {
          // New rank position (this accounts for tied teams before)
          currentRank = index + 1;
          team.rank = currentRank;
        }
        
        previousTeam = team;
        return team;
      });

      return teamsWithRanks;
    } catch (error) {
      console.error('Error assigning ranks:', error);
      throw error;
    }
  }

  /**
   * Get current leaderboard for a contest
   */
  async getLeaderboard(contestId) {
    try {
      const teamsWithRanks = await this.assignRanks(contestId);
      
      // Format for leaderboard display
      const leaderboard = teamsWithRanks.map(team => ({
        rank: team.rank,
        team_name: team.team_name,
        team_id: team.team_id,
        total_points: team.total_points,
        problems_solved: team.problems_solved,
        last_submission_time: team.last_submission_time,
        solved_problems: team.solved_problems
      }));

      return leaderboard;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Update team score after a submission
   */
  async updateTeamScoreOnSubmission(teamId, problemId, submissionResult) {
    try {
      // Get contest ID from problem
      const problem = await db('problems')
        .where('id', problemId)
        .first('contest_id');
      
      if (!problem) {
        throw new Error('Problem not found');
      }
      
      const contestId = problem.contest_id;
      
      // Only recalculate if this was an accepted submission
      if (submissionResult === 'accepted') {
        console.log(`Updating scores for team ${teamId} in contest ${contestId} after accepted submission`);
        
        // Update this team's score
        const teamScore = await this.calculateTeamScore(teamId, contestId);
        
        // Update contest results for this team
        await db('contest_results')
          .insert({
            contest_id: contestId,
            team_id: teamId,
            problems_solved: teamScore.problems_solved,
            penalty_time: 0, // No penalty in hackathon scoring
            total_points: teamScore.total_points, // Add total_points field
            last_submission_time: teamScore.last_submission_time ? new Date(teamScore.last_submission_time) : null,
            updated_at: new Date()
          })
          .onConflict(['contest_id', 'team_id'])
          .merge([
            'problems_solved',
            'penalty_time',
            'total_points',
            'last_submission_time',
            'updated_at'
          ]);
        
        // Recalculate all ranks since points can affect multiple positions
        await this.updateAllRanks(contestId);
        
        // Trigger real-time leaderboard update
        this.triggerLeaderboardUpdate(contestId);
        
        return teamScore;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating team score on submission:', error);
      throw error;
    }
  }

  /**
   * Update all team ranks efficiently
   */
  async updateAllRanks(contestId) {
    try {
      // Get all current scores from contest_results
      const currentResults = await db('contest_results as cr')
        .join('teams as t', 't.id', 'cr.team_id')
        .where('cr.contest_id', contestId)
        .select(
          'cr.team_id',
          'cr.problems_solved',
          'cr.total_points',
          'cr.last_submission_time',
          't.team_name'
        );

      // Sort by hackathon criteria
      const rankedTeams = currentResults.sort((a, b) => {
        if (a.total_points !== b.total_points) {
          return b.total_points - a.total_points;
        }
        if (a.problems_solved !== b.problems_solved) {
          return b.problems_solved - a.problems_solved;
        }
        if (a.last_submission_time && b.last_submission_time) {
          return new Date(a.last_submission_time) - new Date(b.last_submission_time);
        }
        if (a.last_submission_time && !b.last_submission_time) return -1;
        if (!a.last_submission_time && b.last_submission_time) return 1;
        return a.team_name.localeCompare(b.team_name);
      });

      // Assign ranks
      let previousTeam = null;
      const updates = rankedTeams.map((team, index) => {
        let rank;
        if (previousTeam && 
            team.total_points === previousTeam.total_points && 
            team.problems_solved === previousTeam.problems_solved) {
          rank = previousTeam.rank;
        } else {
          rank = index + 1;
        }
        
        previousTeam = { ...team, rank };
        return { team_id: team.team_id, rank };
      });

      // Batch update ranks
      for (const update of updates) {
        await db('contest_results')
          .where('contest_id', contestId)
          .where('team_id', update.team_id)
          .update('rank', update.rank);
      }

      console.log(`Updated ranks for ${updates.length} teams in contest ${contestId}`);
      return updates;
    } catch (error) {
      console.error('Error updating all ranks:', error);
      throw error;
    }
  }

  /**
   * Get team statistics for a contest
   */
  async getTeamStatistics(teamId, contestId) {
    try {
      const result = await db('contest_results')
        .where('contest_id', contestId)
        .where('team_id', teamId)
        .first();

      if (!result) {
        // Return default stats if team hasn't submitted yet
        return {
          total_points: 0,
          problems_solved: 0,
          rank: null,
          last_submission_time: null
        };
      }

      return {
        total_points: result.total_points || 0,
        problems_solved: result.problems_solved,
        rank: result.rank,
        last_submission_time: result.last_submission_time
      };
    } catch (error) {
      console.error('Error getting team statistics:', error);
      throw error;
    }
  }

  /**
   * Trigger real-time leaderboard update via WebSocket
   */
  triggerLeaderboardUpdate(contestId) {
    try {
      const websocketService = require('./websocketService');
      websocketService.queueLeaderboardUpdate(contestId);
    } catch (error) {
      console.error('Error triggering leaderboard update:', error);
    }
  }

  /**
   * Get attempt details for a problem (no penalty tracking)
   */
  async getProblemAttemptDetails(teamId, problemId) {
    try {
      const submissions = await db('submissions')
        .where('team_id', teamId)
        .where('problem_id', problemId)
        .orderBy('submission_time', 'asc')
        .select('status', 'submission_time');

      if (submissions.length === 0) {
        return {
          total_attempts: 0,
          is_solved: false,
          first_solve_time: null,
          status: 'not_attempted',
          points_earned: 0
        };
      }

      const firstAccepted = submissions.find(s => s.status === 'accepted');
      
      return {
        total_attempts: submissions.length,
        is_solved: !!firstAccepted,
        first_solve_time: firstAccepted ? firstAccepted.submission_time : null,
        status: this.determineProblemStatus(submissions, firstAccepted),
        last_attempt_time: submissions[submissions.length - 1].submission_time,
        points_earned: firstAccepted ? await this.getPointsForProblem(teamId, problemId) : 0
      };
    } catch (error) {
      console.error('Error getting problem attempt details:', error);
      throw error;
    }
  }

  /**
   * Get points earned for a specific problem
   */
  async getPointsForProblem(teamId, problemId) {
    try {
      const solvedProblems = await this.getTeamSolvedProblems(teamId, null);
      const problem = solvedProblems.find(p => p.problem_id === problemId);
      return problem ? problem.points : 0;
    } catch (error) {
      console.error('Error getting points for problem:', error);
      return 0;
    }
  }

  /**
   * Determine visual status for a problem
   */
  determineProblemStatus(submissions, firstAccepted) {
    if (submissions.length === 0) {
      return 'not_attempted';
    }
    
    if (firstAccepted) {
      return 'accepted';
    }
    
    const hasNonCompilationError = submissions.some(s => 
      s.status !== 'compilation_error' && s.status !== 'accepted'
    );
    
    if (hasNonCompilationError) {
      return 'wrong_answer';
    }
    
    return 'compilation_error';
  }
}

module.exports = new HackathonScoring();
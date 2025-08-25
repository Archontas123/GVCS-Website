/**
 * ICPC Scoring System - Phases 3.1, 3.2, 3.3
 * Implements ICPC-style scoring algorithm with problems solved, penalty time,
 * and comprehensive submission attempt tracking
 */

const { db } = require('../utils/db');

class ICPCScoring {
  /**
   * Task 1: Problems solved counter
   * Count accepted submissions per team, track first solve time per problem
   */
  async countProblemsSolved(teamId, contestId) {
    try {
      // Get distinct problems this team has solved
      const solvedProblemIds = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .where('s.team_id', teamId)
        .where('p.contest_id', contestId)
        .where('s.status', 'accepted')
        .distinct('p.id', 'p.problem_letter');

      // For each problem, get the first solve time using a separate query
      const solvedProblems = [];
      for (const problem of solvedProblemIds) {
        const firstSolve = await db('submissions as s')
          .where('s.team_id', teamId)
          .where('s.problem_id', problem.id)
          .where('s.status', 'accepted')
          .orderBy('s.submission_time', 'asc')
          .first('s.submission_time');

        if (firstSolve) {
          solvedProblems.push({
            problem_id: problem.id,
            problem_letter: problem.problem_letter,
            first_solve_time: firstSolve.submission_time,
            accept_count: 1
          });
        }
      }

      return {
        count: solvedProblems.length,
        problems: solvedProblems
      };
    } catch (error) {
      console.error('Error counting problems solved:', error);
      throw error;
    }
  }

  /**
   * Get first solve time for a specific problem by a team
   */
  async getFirstSolveTime(teamId, problemId) {
    try {
      const result = await db('submissions')
        .where('team_id', teamId)
        .where('problem_id', problemId)
        .where('status', 'accepted')
        .orderBy('submission_time', 'asc')
        .first('submission_time');

      return result ? result.submission_time : null;
    } catch (error) {
      console.error('Error getting first solve time:', error);
      throw error;
    }
  }

  /**
   * Get wrong submissions count before first accept for a problem
   */
  async getWrongSubmissionsBeforeAccept(teamId, problemId) {
    try {
      const firstAccept = await this.getFirstSolveTime(teamId, problemId);
      
      if (!firstAccept) {
        // No accepted solution, return all non-compilation-error submissions
        const wrongSubmissions = await db('submissions')
          .where('team_id', teamId)
          .where('problem_id', problemId)
          .whereNot('status', 'compilation_error')
          .whereNot('status', 'accepted')
          .count('* as count');
        
        return parseInt(wrongSubmissions[0].count) || 0;
      }

      // Count wrong submissions before first accept (excluding compilation errors)
      const wrongSubmissions = await db('submissions')
        .where('team_id', teamId)
        .where('problem_id', problemId)
        .where('submission_time', '<', firstAccept)
        .whereNot('status', 'compilation_error')
        .whereNot('status', 'accepted')
        .count('* as count');

      return parseInt(wrongSubmissions[0].count) || 0;
    } catch (error) {
      console.error('Error getting wrong submissions before accept:', error);
      throw error;
    }
  }

  /**
   * Task 2: Penalty time calculation
   * Calculate submission time in minutes + 20 minutes per wrong submission
   * Only count wrong submissions before accept, handle unsolved problems
   */
  async calculatePenaltyTime(teamId, contestId) {
    try {
      // Get contest start time
      const contest = await db('contests')
        .where('id', contestId)
        .first('start_time');

      if (!contest) {
        throw new Error(`Contest with ID ${contestId} not found`);
      }

      const contestStartTime = new Date(contest.start_time);
      let totalPenaltyTime = 0;

      // Get all problems this team has solved
      const solvedProblems = await this.countProblemsSolved(teamId, contestId);
      

      for (const problem of solvedProblems.problems) {
        // Calculate solve time in minutes from contest start
        const solveTime = new Date(problem.first_solve_time);
        const solveTimeMinutes = Math.floor((solveTime - contestStartTime) / (1000 * 60));

        // Get wrong submissions before accept
        const wrongSubmissions = await this.getWrongSubmissionsBeforeAccept(teamId, problem.problem_id);

        // ICPC penalty: solve time + (wrong attempts * 20 minutes)
        const problemPenalty = solveTimeMinutes + (wrongSubmissions * 20);
        
        // Ensure we don't add NaN to total
        if (!isNaN(problemPenalty) && problemPenalty >= 0) {
          totalPenaltyTime += problemPenalty;
        }
      }

      return totalPenaltyTime;
    } catch (error) {
      console.error('Error calculating penalty time:', error);
      throw error;
    }
  }

  /**
   * Calculate penalty time for a specific problem
   */
  async calculateProblemPenaltyTime(teamId, problemId, contestId) {
    try {
      const contest = await db('contests')
        .where('id', contestId)
        .first('start_time');

      if (!contest) {
        throw new Error('Contest not found');
      }

      const firstSolveTime = await this.getFirstSolveTime(teamId, problemId);
      
      if (!firstSolveTime) {
        return 0; // Unsolved problems contribute 0 penalty
      }

      const contestStartTime = new Date(contest.start_time);
      const solveTime = new Date(firstSolveTime);
      const solveTimeMinutes = Math.floor((solveTime - contestStartTime) / (1000 * 60));

      const wrongSubmissions = await this.getWrongSubmissionsBeforeAccept(teamId, problemId);
      
      return solveTimeMinutes + (wrongSubmissions * 20);
    } catch (error) {
      console.error('Error calculating problem penalty time:', error);
      throw error;
    }
  }

  /**
   * Calculate complete team score for a contest
   */
  async calculateTeamScore(teamId, contestId) {
    try {
      const solvedProblems = await this.countProblemsSolved(teamId, contestId);
      const penaltyTime = await this.calculatePenaltyTime(teamId, contestId);

      return {
        team_id: teamId,
        contest_id: contestId,
        problems_solved: solvedProblems.count,
        penalty_time: penaltyTime,
        solved_problems: solvedProblems.problems,
        last_submission_time: solvedProblems.problems.length > 0 
          ? Math.max(...solvedProblems.problems.map(p => new Date(p.first_solve_time).getTime()))
          : null
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
   * Task 3 & 4: Ranking Algorithm Implementation
   * Primary ranking by problems solved (descending), tiebreaker by penalty time (ascending)
   */
  async rankTeams(contestId) {
    try {
      const scores = await this.calculateContestScores(contestId);
      
      // Sort teams by ICPC ranking criteria:
      // 1. Problems solved (descending)
      // 2. Penalty time (ascending) - only for teams with same problems solved
      // 3. Last submission time (ascending) - for final tiebreaker
      const rankedTeams = scores.sort((a, b) => {
        // Primary: Problems solved (more is better)
        if (a.problems_solved !== b.problems_solved) {
          return b.problems_solved - a.problems_solved;
        }
        
        // Secondary: Penalty time (less is better, only for solved problems)
        if (a.penalty_time !== b.penalty_time) {
          return a.penalty_time - b.penalty_time;
        }
        
        // Tertiary: Last submission time (earlier is better)
        if (a.last_submission_time && b.last_submission_time) {
          return new Date(a.last_submission_time) - new Date(b.last_submission_time);
        }
        
        // If one team has no submissions, rank them lower
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
   * Task 5: Final ranking assignment
   * Assign rank numbers, handle tied teams (same rank)
   */
  async assignRanks(contestId) {
    try {
      const rankedTeams = await this.rankTeams(contestId);
      let currentRank = 1;
      let previousTeam = null;
      
      const teamsWithRanks = rankedTeams.map((team, index) => {
        // Check if this team is tied with the previous team
        if (previousTeam && 
            team.problems_solved === previousTeam.problems_solved && 
            team.penalty_time === previousTeam.penalty_time) {
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
        problems_solved: team.problems_solved,
        penalty_time: team.penalty_time,
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
   * Task 6: Score update triggers
   * Update scores on new submissions, recalculate affected team rankings
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
      // or if it affects the penalty calculation
      if (submissionResult === 'accepted' || submissionResult !== 'compilation_error') {
        console.log(`Updating scores for team ${teamId} in contest ${contestId} after submission`);
        
        // Update this team's score
        const teamScore = await this.calculateTeamScore(teamId, contestId);
        
        // Update contest results for this team
        await db('contest_results')
          .insert({
            contest_id: contestId,
            team_id: teamId,
            problems_solved: teamScore.problems_solved,
            penalty_time: teamScore.penalty_time,
            last_submission_time: teamScore.last_submission_time ? new Date(teamScore.last_submission_time) : null,
            updated_at: new Date()
          })
          .onConflict(['contest_id', 'team_id'])
          .merge([
            'problems_solved',
            'penalty_time',
            'last_submission_time',
            'updated_at'
          ]);
        
        // If this was an accepted submission, recalculate all ranks
        if (submissionResult === 'accepted') {
          await this.updateAllRanks(contestId);
        }
        
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
   * Efficiently update only the ranks without recalculating all scores
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
          'cr.penalty_time',
          'cr.last_submission_time',
          't.team_name'
        );

      // Sort by ICPC criteria
      const rankedTeams = currentResults.sort((a, b) => {
        if (a.problems_solved !== b.problems_solved) {
          return b.problems_solved - a.problems_solved;
        }
        if (a.penalty_time !== b.penalty_time) {
          return a.penalty_time - b.penalty_time;
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
            team.problems_solved === previousTeam.problems_solved && 
            team.penalty_time === previousTeam.penalty_time) {
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
   * Update contest results table with calculated scores and ranks
   */
  async updateContestResults(contestId) {
    try {
      const teamsWithRanks = await this.assignRanks(contestId);
      
      for (const team of teamsWithRanks) {
        // Insert or update contest results
        await db('contest_results')
          .insert({
            contest_id: contestId,
            team_id: team.team_id,
            problems_solved: team.problems_solved,
            penalty_time: team.penalty_time,
            rank: team.rank,
            last_submission_time: team.last_submission_time ? new Date(team.last_submission_time) : null,
            updated_at: new Date()
          })
          .onConflict(['contest_id', 'team_id'])
          .merge([
            'problems_solved',
            'penalty_time',
            'rank',
            'last_submission_time',
            'updated_at'
          ]);
      }

      console.log(`Updated contest results for ${teamsWithRanks.length} teams in contest ${contestId}`);
      return teamsWithRanks;
    } catch (error) {
      console.error('Error updating contest results:', error);
      throw error;
    }
  }

  /**
   * Get team's current position in contest
   */
  async getTeamRank(teamId, contestId) {
    try {
      const result = await db('contest_results')
        .where('contest_id', contestId)
        .where('team_id', teamId)
        .first('rank');

      return result ? result.rank : null;
    } catch (error) {
      console.error('Error getting team rank:', error);
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
          problems_solved: 0,
          penalty_time: 0,
          rank: null,
          last_submission_time: null
        };
      }

      return {
        problems_solved: result.problems_solved,
        penalty_time: result.penalty_time,
        rank: result.rank,
        last_submission_time: result.last_submission_time
      };
    } catch (error) {
      console.error('Error getting team statistics:', error);
      throw error;
    }
  }

  // ========================================
  // PHASE 3.3: SUBMISSION ATTEMPT TRACKING
  // ========================================

  /**
   * Task 1: Attempt Counter Implementation
   * Get comprehensive attempt information for a team's problem
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
          wrong_attempts: 0,
          is_solved: false,
          first_solve_time: null,
          status: 'not_attempted',
          compilation_errors: 0
        };
      }

      const firstAccepted = submissions.find(s => s.status === 'accepted');
      const wrongAttempts = firstAccepted 
        ? submissions.filter(s => 
            s.submission_time < firstAccepted.submission_time && 
            s.status !== 'compilation_error' && 
            s.status !== 'accepted'
          ).length
        : submissions.filter(s => 
            s.status !== 'compilation_error' && 
            s.status !== 'accepted'
          ).length;

      const compilationErrors = submissions.filter(s => s.status === 'compilation_error').length;
      
      return {
        total_attempts: submissions.length,
        wrong_attempts: wrongAttempts,
        is_solved: !!firstAccepted,
        first_solve_time: firstAccepted ? firstAccepted.submission_time : null,
        status: this.determineProblemStatus(submissions, firstAccepted),
        compilation_errors: compilationErrors,
        last_attempt_time: submissions[submissions.length - 1].submission_time,
        submissions: submissions
      };
    } catch (error) {
      console.error('Error getting problem attempt details:', error);
      throw error;
    }
  }

  /**
   * Determine visual status for a problem based on submission history
   */
  determineProblemStatus(submissions, firstAccepted) {
    if (submissions.length === 0) {
      return 'not_attempted'; // Gray
    }
    
    if (firstAccepted) {
      return 'accepted'; // Green
    }
    
    const hasNonCompilationError = submissions.some(s => 
      s.status !== 'compilation_error' && s.status !== 'accepted'
    );
    
    if (hasNonCompilationError) {
      return 'wrong_answer'; // Red
    }
    
    // Only compilation errors
    return 'compilation_error'; // Blue/Yellow
  }

  /**
   * Task 4: Submission History per Team
   * Get complete submission history for a team in a contest
   */
  async getTeamSubmissionHistory(teamId, contestId, options = {}) {
    try {
      const query = db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .where('s.team_id', teamId)
        .where('p.contest_id', contestId)
        .select(
          's.id as submission_id',
          's.problem_id',
          'p.problem_letter',
          'p.title as problem_title',
          's.language',
          's.status',
          's.submission_time',
          's.execution_time',
          's.memory_used',
          's.judged_at'
        )
        .orderBy('s.submission_time', 'desc');

      if (options.limit) {
        query.limit(options.limit);
      }

      if (options.problemId) {
        query.where('s.problem_id', options.problemId);
      }

      const submissions = await query;
      
      // Group by problem for better organization
      const groupedByProblem = {};
      
      for (const submission of submissions) {
        const problemKey = `${submission.problem_letter}`;
        if (!groupedByProblem[problemKey]) {
          groupedByProblem[problemKey] = {
            problem_id: submission.problem_id,
            problem_letter: submission.problem_letter,
            problem_title: submission.problem_title,
            submissions: []
          };
        }
        
        groupedByProblem[problemKey].submissions.push({
          submission_id: submission.submission_id,
          language: submission.language,
          status: submission.status,
          submission_time: submission.submission_time,
          execution_time: submission.execution_time,
          memory_used: submission.memory_used,
          judged_at: submission.judged_at,
          status_icon: this.getStatusIcon(submission.status),
          status_color: this.getStatusColor(submission.status)
        });
      }

      return {
        team_id: teamId,
        contest_id: contestId,
        total_submissions: submissions.length,
        problems: Object.values(groupedByProblem),
        submissions: submissions
      };
    } catch (error) {
      console.error('Error getting team submission history:', error);
      throw error;
    }
  }

  /**
   * Task 5: Visual Status Indicators Implementation
   * Get status icon for a submission verdict
   */
  getStatusIcon(status) {
    const icons = {
      'accepted': '✅',
      'wrong_answer': '❌',
      'time_limit_exceeded': '⏱️',
      'memory_limit_exceeded': '💾',
      'runtime_error': '💥',
      'compilation_error': '📝',
      'pending': '⏳',
      'judging': '🔄'
    };
    
    return icons[status] || '❓';
  }

  /**
   * Get status color for a submission verdict
   */
  getStatusColor(status) {
    const colors = {
      'accepted': 'green',
      'wrong_answer': 'red',
      'time_limit_exceeded': 'orange',
      'memory_limit_exceeded': 'orange',
      'runtime_error': 'purple',
      'compilation_error': 'blue',
      'pending': 'gray',
      'judging': 'gray'
    };
    
    return colors[status] || 'gray';
  }

  /**
   * Get team's problem matrix with attempt details
   * Shows solve status and attempt count for each problem
   */
  async getTeamProblemMatrix(teamId, contestId) {
    try {
      // Get all problems in the contest
      const problems = await db('problems')
        .where('contest_id', contestId)
        .orderBy('problem_letter', 'asc')
        .select('id', 'problem_letter', 'title');

      const problemMatrix = [];
      
      for (const problem of problems) {
        const attemptDetails = await this.getProblemAttemptDetails(teamId, problem.id);
        const penaltyTime = await this.calculateProblemPenaltyTime(teamId, problem.id, contestId);
        
        problemMatrix.push({
          problem_id: problem.id,
          problem_letter: problem.problem_letter,
          problem_title: problem.title,
          status: attemptDetails.status,
          status_icon: this.getStatusIcon(attemptDetails.is_solved ? 'accepted' : attemptDetails.status),
          status_color: this.getStatusColor(attemptDetails.is_solved ? 'accepted' : attemptDetails.status),
          is_solved: attemptDetails.is_solved,
          total_attempts: attemptDetails.total_attempts,
          wrong_attempts: attemptDetails.wrong_attempts,
          compilation_errors: attemptDetails.compilation_errors,
          first_solve_time: attemptDetails.first_solve_time,
          penalty_time: penaltyTime,
          display_format: attemptDetails.is_solved 
            ? `${attemptDetails.wrong_attempts + 1}/${attemptDetails.total_attempts}`
            : attemptDetails.total_attempts > 0 
              ? `-/${attemptDetails.total_attempts}`
              : '-'
        });
      }

      return {
        team_id: teamId,
        contest_id: contestId,
        problems: problemMatrix,
        summary: {
          total_problems: problems.length,
          solved_problems: problemMatrix.filter(p => p.is_solved).length,
          attempted_problems: problemMatrix.filter(p => p.total_attempts > 0).length,
          total_submissions: problemMatrix.reduce((sum, p) => sum + p.total_attempts, 0)
        }
      };
    } catch (error) {
      console.error('Error getting team problem matrix:', error);
      throw error;
    }
  }

  /**
   * Enhanced leaderboard with attempt tracking details
   */
  async getEnhancedLeaderboard(contestId) {
    try {
      const basicLeaderboard = await this.getLeaderboard(contestId);
      const enhancedLeaderboard = [];
      
      for (const teamEntry of basicLeaderboard) {
        const problemMatrix = await this.getTeamProblemMatrix(teamEntry.team_id, contestId);
        
        enhancedLeaderboard.push({
          ...teamEntry,
          problem_matrix: problemMatrix.problems,
          total_attempts: problemMatrix.problems.reduce((sum, p) => sum + p.total_attempts, 0),
          problems_attempted: problemMatrix.problems.filter(p => p.total_attempts > 0).length
        });
      }

      return enhancedLeaderboard;
    } catch (error) {
      console.error('Error getting enhanced leaderboard:', error);
      throw error;
    }
  }

  /**
   * Trigger real-time leaderboard update via WebSocket
   */
  triggerLeaderboardUpdate(contestId) {
    try {
      // Use lazy loading to avoid circular dependency
      const websocketService = require('./websocketService');
      websocketService.queueLeaderboardUpdate(contestId);
    } catch (error) {
      console.error('Error triggering leaderboard update:', error);
      // Don't throw - WebSocket updates are non-critical
    }
  }

  /**
   * Get frozen leaderboard data - Phase 3.4
   * Returns the leaderboard state that was saved when the contest was frozen
   */
  async getFrozenLeaderboard(contestId) {
    try {
      const freezeService = require('./freezeService');
      return await freezeService.getFrozenLeaderboard(contestId);
    } catch (error) {
      console.error('Error getting frozen leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get display leaderboard - Phase 3.4
   * Returns frozen leaderboard if contest is frozen, otherwise returns real-time leaderboard
   */
  async getDisplayLeaderboard(contestId) {
    try {
      const freezeService = require('./freezeService');
      return await freezeService.getDisplayLeaderboard(contestId);
    } catch (error) {
      console.error('Error getting display leaderboard:', error);
      throw error;
    }
  }

  /**
   * Check if contest is currently frozen - Phase 3.4
   */
  async isContestFrozen(contestId) {
    try {
      const freezeService = require('./freezeService');
      return await freezeService.isContestFrozen(contestId);
    } catch (error) {
      console.error('Error checking freeze status:', error);
      return false;
    }
  }

  /**
   * Get time until contest should be frozen - Phase 3.4
   */
  async getTimeUntilFreeze(contestId) {
    try {
      const freezeService = require('./freezeService');
      return await freezeService.getTimeUntilFreeze(contestId);
    } catch (error) {
      console.error('Error getting time until freeze:', error);
      return null;
    }
  }



}

module.exports = new ICPCScoring();
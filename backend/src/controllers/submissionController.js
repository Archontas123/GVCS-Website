/**
 * Submission Controller - Phase 3.1 Integration
 * Handles code submissions and integrates with ICPC scoring system
 */

const { db } = require('../utils/db');
const icpcScoring = require('../services/icpcScoring');

class SubmissionController {
  /**
   * Create a new submission and update scores
   */
  async createSubmission(teamId, problemId, language, code) {
    try {
      // Insert submission with pending status
      const [submission] = await db('submissions')
        .insert({
          team_id: teamId,
          problem_id: problemId,
          language: language,
          code: code,
          status: 'pending',
          submission_time: new Date()
        })
        .returning('*');

      console.log(`Created submission ${submission.id} for team ${teamId} on problem ${problemId}`);
      return submission;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  }

  /**
   * Update submission status after judging and update ICPC scores
   */
  async updateSubmissionResult(submissionId, status, executionTime = null, memoryUsed = null, judgedAt = null) {
    try {
      // Update submission in database
      const [updatedSubmission] = await db('submissions')
        .where('id', submissionId)
        .update({
          status: status,
          execution_time: executionTime,
          memory_used: memoryUsed,
          judged_at: judgedAt || new Date()
        })
        .returning('*');

      if (!updatedSubmission) {
        throw new Error('Submission not found');
      }

      console.log(`Updated submission ${submissionId} with status: ${status}`);

      // Update ICPC scores if this affects scoring
      if (status !== 'compilation_error') {
        await icpcScoring.updateTeamScoreOnSubmission(
          updatedSubmission.team_id, 
          updatedSubmission.problem_id, 
          status
        );
        
        console.log(`Updated ICPC scores for team ${updatedSubmission.team_id}`);
      }

      return updatedSubmission;
    } catch (error) {
      console.error('Error updating submission result:', error);
      throw error;
    }
  }

  /**
   * Get submissions for a team in a contest
   */
  async getTeamSubmissions(teamId, contestId, limit = 50) {
    try {
      const submissions = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .where('s.team_id', teamId)
        .where('p.contest_id', contestId)
        .orderBy('s.submission_time', 'desc')
        .limit(limit)
        .select(
          's.id',
          's.language',
          's.status',
          's.submission_time',
          's.execution_time',
          's.memory_used',
          's.judged_at',
          'p.problem_letter',
          'p.title as problem_title'
        );

      return submissions;
    } catch (error) {
      console.error('Error getting team submissions:', error);
      throw error;
    }
  }

  /**
   * Get submissions for a specific problem
   */
  async getProblemSubmissions(problemId, limit = 100) {
    try {
      const submissions = await db('submissions as s')
        .join('teams as t', 't.id', 's.team_id')
        .where('s.problem_id', problemId)
        .orderBy('s.submission_time', 'desc')
        .limit(limit)
        .select(
          's.id',
          's.language',
          's.status',
          's.submission_time',
          's.execution_time',
          's.memory_used',
          's.judged_at',
          't.team_name'
        );

      return submissions;
    } catch (error) {
      console.error('Error getting problem submissions:', error);
      throw error;
    }
  }

  /**
   * Get submission statistics for a contest
   */
  async getContestSubmissionStats(contestId) {
    try {
      const stats = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .where('p.contest_id', contestId)
        .groupBy('s.status')
        .count('* as count')
        .select('s.status');

      const languageStats = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .where('p.contest_id', contestId)
        .groupBy('s.language')
        .count('* as count')
        .select('s.language');

      const totalSubmissions = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .where('p.contest_id', contestId)
        .count('* as total');

      const recentSubmissions = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .join('teams as t', 't.id', 's.team_id')
        .where('p.contest_id', contestId)
        .orderBy('s.submission_time', 'desc')
        .limit(20)
        .select(
          's.id',
          's.status',
          's.language',
          's.submission_time',
          't.team_name',
          'p.problem_letter'
        );

      // Format status statistics
      const statusCounts = {};
      stats.forEach(stat => {
        statusCounts[stat.status] = parseInt(stat.count);
      });

      // Format language statistics
      const languageCounts = {};
      languageStats.forEach(stat => {
        languageCounts[stat.language] = parseInt(stat.count);
      });

      return {
        total_submissions: parseInt(totalSubmissions[0].total),
        status_distribution: statusCounts,
        language_distribution: languageCounts,
        recent_submissions: recentSubmissions
      };
    } catch (error) {
      console.error('Error getting contest submission stats:', error);
      throw error;
    }
  }

  /**
   * Get team's submission history for a specific problem
   */
  async getTeamProblemSubmissions(teamId, problemId) {
    try {
      const submissions = await db('submissions')
        .where('team_id', teamId)
        .where('problem_id', problemId)
        .orderBy('submission_time', 'asc')
        .select(
          'id',
          'language',
          'status',
          'submission_time',
          'execution_time',
          'memory_used',
          'judged_at'
        );

      // Calculate attempts and solve status
      const acceptedSubmissions = submissions.filter(s => s.status === 'accepted');
      const wrongAttempts = submissions.filter(s => 
        s.status !== 'accepted' && 
        s.status !== 'compilation_error' &&
        (!acceptedSubmissions.length || new Date(s.submission_time) < new Date(acceptedSubmissions[0].submission_time))
      ).length;

      return {
        submissions: submissions,
        total_attempts: submissions.length,
        wrong_attempts: wrongAttempts,
        is_solved: acceptedSubmissions.length > 0,
        first_solve_time: acceptedSubmissions.length > 0 ? acceptedSubmissions[0].submission_time : null
      };
    } catch (error) {
      console.error('Error getting team problem submissions:', error);
      throw error;
    }
  }

  /**
   * Get pending submissions count
   */
  async getPendingSubmissionsCount() {
    try {
      const result = await db('submissions')
        .where('status', 'pending')
        .count('* as count');

      return parseInt(result[0].count);
    } catch (error) {
      console.error('Error getting pending submissions count:', error);
      throw error;
    }
  }

  /**
   * Check if team can submit to problem (contest rules)
   */
  async canTeamSubmit(teamId, problemId) {
    try {
      // Get contest info
      const contest = await db('problems as p')
        .join('contests as c', 'c.id', 'p.contest_id')
        .where('p.id', problemId)
        .first(
          'c.id as contest_id',
          'c.start_time',
          'c.duration',
          'c.is_active'
        );

      if (!contest) {
        return { canSubmit: false, reason: 'Problem not found' };
      }

      if (!contest.is_active) {
        return { canSubmit: false, reason: 'Contest is not active' };
      }

      // Check if contest has started
      const now = new Date();
      const startTime = new Date(contest.start_time);
      if (now < startTime) {
        return { canSubmit: false, reason: 'Contest has not started yet' };
      }

      // Check if contest has ended
      const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
      if (now > endTime) {
        return { canSubmit: false, reason: 'Contest has ended' };
      }

      // Check if team is registered for this contest
      const teamInContest = await db('teams as t')
        .join('contests as c', 'c.registration_code', 't.contest_code')
        .where('t.id', teamId)
        .where('c.id', contest.contest_id)
        .first('t.id');

      if (!teamInContest) {
        return { canSubmit: false, reason: 'Team not registered for this contest' };
      }

      return { canSubmit: true };
    } catch (error) {
      console.error('Error checking if team can submit:', error);
      return { canSubmit: false, reason: 'System error' };
    }
  }
}

module.exports = new SubmissionController();
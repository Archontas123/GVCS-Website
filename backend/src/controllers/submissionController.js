const { db } = require('../utils/db');
const scoringService = require('../services/scoringService');

/**
 * Submission Controller - Handles code submissions and scoring integration
 * Manages submission creation, status updates, and statistics
 */
class SubmissionController {
  /**
   * Creates a new submission and queues it for judging
   * @param {number} teamId - The team ID submitting code
   * @param {number} problemId - The problem ID being submitted to
   * @param {string} language - The programming language used
   * @param {string} code - The source code submitted
   * @returns {Promise<Object>} The created submission object
   * @throws {Error} When submission creation fails
   */
  async createSubmission(teamId, problemId, language, code) {
    try {
      const problem = await db('problems')
        .select('contest_id')
        .where('id', problemId)
        .first();

      if (!problem) {
        throw new Error(`Problem ${problemId} not found`);
      }

      const submittedAt = new Date();

      const [submission] = await db('submissions')
        .insert({
          team_id: teamId,
          problem_id: problemId,
          contest_id: problem.contest_id,
          language: language,
          source_code: code,
          status: 'pending',
          submitted_at: submittedAt
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
   * Updates submission status after judging and triggers score recalculation
   * @param {number} submissionId - The submission ID to update
   * @param {string} status - The judging status (accepted, wrong_answer, etc.)
   * @param {number} [executionTime] - Time taken to execute in milliseconds
   * @param {number} [memoryUsed] - Memory used in MB
   * @param {Date} [judgedAt] - Timestamp when judging completed
   * @returns {Promise<Object>} The updated submission object
   * @throws {Error} When update fails or submission not found
   */
  async updateSubmissionResult(submissionId, status, executionTime = null, memoryUsed = null, judgedAt = null) {
    try {
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

      if (status !== 'compilation_error') {
        await scoringService.updateTeamScoreOnSubmission(
          updatedSubmission.team_id, 
          updatedSubmission.problem_id, 
          status
        );
        
        console.log(`Updated scores for team ${updatedSubmission.team_id}`);
      }

      return updatedSubmission;
    } catch (error) {
      console.error('Error updating submission result:', error);
      throw error;
    }
  }

  /**
   * Gets all submissions for a team in a specific contest
   * @param {number} teamId - The team ID
   * @param {number} contestId - The contest ID
   * @param {number} [limit=50] - Maximum number of submissions to return
   * @returns {Promise<Object[]>} Array of submission objects with problem info
   * @throws {Error} When database query fails
   */
  async getTeamSubmissions(teamId, contestId, limit = 50) {
    try {
      console.log('🔍 [SubmissionController.getTeamSubmissions] Called with:', { teamId, contestId, limit });

      const submissions = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .where('s.team_id', teamId)
        .where('p.contest_id', contestId)
        .orderBy('s.submitted_at', 'desc')
        .limit(limit)
        .select(
          's.id',
          's.language',
          's.status',
          's.submitted_at',
          's.execution_time',
          's.memory_used',
          's.judged_at',
          'p.problem_letter',
          'p.title as problem_title'
        );

      console.log('✅ [SubmissionController.getTeamSubmissions] Retrieved', submissions.length, 'submissions');
      if (submissions.length > 0) {
        console.log('📝 [SubmissionController.getTeamSubmissions] First submission:', submissions[0]);
      }

      return submissions;
    } catch (error) {
      console.error('❌ [SubmissionController.getTeamSubmissions] Error:', error);
      console.error('❌ [SubmissionController.getTeamSubmissions] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Gets all submissions for a specific problem
   * @param {number} problemId - The problem ID
   * @param {number} [limit=100] - Maximum number of submissions to return
   * @returns {Promise<Object[]>} Array of submission objects with team info
   * @throws {Error} When database query fails
   */
  async getProblemSubmissions(problemId, limit = 100) {
    try {
      const submissions = await db('submissions as s')
        .join('teams as t', 't.id', 's.team_id')
        .where('s.problem_id', problemId)
        .orderBy('s.submitted_at', 'desc')
        .limit(limit)
        .select(
          's.id',
          's.language',
          's.status',
          's.submitted_at',
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
   * Gets comprehensive submission statistics for a contest
   * @param {number} contestId - The contest ID
   * @returns {Promise<Object>} Object containing statistics and recent submissions
   * @throws {Error} When database query fails
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
        .orderBy('s.submitted_at', 'desc')
        .limit(20)
        .select(
          's.id',
          's.status',
          's.language',
          's.submitted_at',
          't.team_name',
          'p.problem_letter'
        );

      const statusCounts = {};
      stats.forEach(stat => {
        statusCounts[stat.status] = parseInt(stat.count);
      });

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
   * Gets a team's complete submission history for a specific problem
   * @param {number} teamId - The team ID
   * @param {number} problemId - The problem ID
   * @returns {Promise<Object>} Object containing submissions and solve statistics
   * @throws {Error} When database query fails
   */
  async getTeamProblemSubmissions(teamId, problemId) {
    try {
      const submissions = await db('submissions')
        .where('team_id', teamId)
        .where('problem_id', problemId)
        .orderBy('submitted_at', 'asc')
        .select(
          'id',
          'language',
          'status',
          'submitted_at',
          'execution_time',
          'memory_used',
          'judged_at'
        );

      const acceptedSubmissions = submissions.filter(s => s.status === 'accepted');
      const wrongAttempts = submissions.filter(s =>
        s.status !== 'accepted' &&
        s.status !== 'compilation_error' &&
        (!acceptedSubmissions.length || new Date(s.submitted_at) < new Date(acceptedSubmissions[0].submitted_at))
      ).length;

      return {
        submissions: submissions,
        total_attempts: submissions.length,
        wrong_attempts: wrongAttempts,
        is_solved: acceptedSubmissions.length > 0,
        first_solve_time: acceptedSubmissions.length > 0 ? acceptedSubmissions[0].submitted_at : null
      };
    } catch (error) {
      console.error('Error getting team problem submissions:', error);
      throw error;
    }
  }

  /**
   * Gets the count of submissions currently pending judgment
   * @returns {Promise<number>} The number of pending submissions
   * @throws {Error} When database query fails
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
   * Checks if a team is allowed to submit to a problem based on contest rules
   * @param {number} teamId - The team ID
   * @param {number} problemId - The problem ID
   * @returns {Promise<Object>} Object with canSubmit boolean and reason if not
   * @throws {Error} When database query fails
   */
  async canTeamSubmit(teamId, problemId) {
    try {
      const contest = await db('problems as p')
        .join('contests as c', 'c.id', 'p.contest_id')
        .where('p.id', problemId)
        .first(
          'c.id as contest_id',
          'c.start_time',
          'c.duration',
          'c.is_active',
          'c.manual_control',
          'c.ended_at'
        );

      if (!contest) {
        return { canSubmit: false, reason: 'Problem not found' };
      }

      if (!contest.is_active) {
        return { canSubmit: false, reason: 'Contest is not active' };
      }

      if (!contest.start_time) {
        return { canSubmit: false, reason: 'Contest has not started yet' };
      }

      const now = new Date();
      const startTime = new Date(contest.start_time);
      if (Number.isNaN(startTime.getTime())) {
        return { canSubmit: false, reason: 'Contest schedule is invalid' };
      }

      if (now < startTime) {
        return { canSubmit: false, reason: 'Contest has not started yet' };
      }

      if (!contest.manual_control) {
        const hasDuration = contest.duration !== null && contest.duration !== undefined;
        if (hasDuration) {
          const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
          if (now > endTime) {
            return { canSubmit: false, reason: 'Contest has ended' };
          }
        }
      } else if (contest.ended_at) {
        return { canSubmit: false, reason: 'Contest has ended' };
      }

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

/**
 * Partial Scoring Service
 * Handles point assignment and partial scoring based on test case completion
 */

const { db } = require('../utils/db');

class PartialScoringService {
  /**
   * Calculate points for a problem based on test cases
   * Sample test cases award 0 points, non-sample test cases split the total points equally
   */
  async calculateProblemPoints(problemId) {
    try {
      const problem = await db('problems').where('id', problemId).first();
      if (!problem) {
        throw new Error('Problem not found');
      }

      const testCases = await db('test_cases').where('problem_id', problemId);
      const nonSampleTestCases = testCases.filter(tc => !tc.is_sample);
      const totalPoints = problem.max_points || 100;

      if (nonSampleTestCases.length === 0) {
        return { totalPoints, pointsPerTestCase: 0, nonSampleCount: 0 };
      }

      const pointsPerTestCase = Math.floor(totalPoints / nonSampleTestCases.length);
      
      // Update test case points
      await this.updateTestCasePoints(problemId, pointsPerTestCase);

      return {
        totalPoints,
        pointsPerTestCase,
        nonSampleCount: nonSampleTestCases.length
      };
    } catch (error) {
      console.error('Error calculating problem points:', error);
      throw error;
    }
  }

  /**
   * Update test case points based on problem configuration
   */
  async updateTestCasePoints(problemId, pointsPerTestCase) {
    try {
      // Set sample test cases to 0 points
      await db('test_cases')
        .where('problem_id', problemId)
        .where('is_sample', true)
        .update({ points: 0 });

      // Set non-sample test cases to calculated points
      await db('test_cases')
        .where('problem_id', problemId)
        .where('is_sample', false)
        .update({ points: pointsPerTestCase });

      return true;
    } catch (error) {
      console.error('Error updating test case points:', error);
      throw error;
    }
  }

  /**
   * Set custom points for a problem
   */
  async setProblemPoints(problemId, maxPoints) {
    try {
      await db('problems')
        .where('id', problemId)
        .update({ max_points: maxPoints });

      // Recalculate test case points
      await this.calculateProblemPoints(problemId);

      return true;
    } catch (error) {
      console.error('Error setting problem points:', error);
      throw error;
    }
  }

  /**
   * Calculate submission score based on test case results
   */
  async calculateSubmissionScore(submissionId, testCaseResults) {
    try {
      const submission = await db('submissions').where('id', submissionId).first();
      if (!submission) {
        throw new Error('Submission not found');
      }

      const problem = await db('problems').where('id', submission.problem_id).first();
      const testCases = await db('test_cases').where('problem_id', submission.problem_id);

      let totalPoints = 0;
      let testCasesPassed = 0;
      const maxPoints = problem.max_points || 100;

      // Clear existing partial scores
      await db('partial_scores').where('submission_id', submissionId).del();

      // Calculate points for each test case
      for (const result of testCaseResults) {
        const testCase = testCases.find(tc => tc.id === result.testCaseId);
        if (!testCase) continue;

        const pointsEarned = result.verdict === 'accepted' ? (testCase.points || 0) : 0;
        totalPoints += pointsEarned;
        
        if (result.verdict === 'accepted') {
          testCasesPassed++;
        }

        // Store partial score result
        await db('partial_scores').insert({
          submission_id: submissionId,
          test_case_id: testCase.id,
          verdict: result.verdict,
          points_earned: pointsEarned,
          execution_time: result.executionTime,
          memory_used: result.memoryUsed
        });
      }

      // Update submission with calculated scores
      await db('submissions')
        .where('id', submissionId)
        .update({
          total_points: totalPoints,
          max_points: maxPoints,
          test_cases_passed: testCasesPassed,
          total_test_cases: testCases.length
        });

      return {
        totalPoints,
        maxPoints,
        testCasesPassed,
        totalTestCases: testCases.length,
        percentage: maxPoints > 0 ? (totalPoints / maxPoints * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Error calculating submission score:', error);
      throw error;
    }
  }

  /**
   * Get submission scores with breakdown
   */
  async getSubmissionScore(submissionId) {
    try {
      const submission = await db('submissions')
        .where('id', submissionId)
        .first();

      if (!submission) {
        throw new Error('Submission not found');
      }

      const partialScores = await db('partial_scores as ps')
        .join('test_cases as tc', 'tc.id', 'ps.test_case_id')
        .where('ps.submission_id', submissionId)
        .select(
          'ps.*',
          'tc.is_sample',
          'tc.points as max_test_case_points'
        )
        .orderBy('tc.id');

      return {
        submissionId,
        totalPoints: submission.total_points || 0,
        maxPoints: submission.max_points || 0,
        testCasesPassed: submission.test_cases_passed || 0,
        totalTestCases: submission.total_test_cases || 0,
        percentage: submission.max_points > 0 
          ? ((submission.total_points / submission.max_points) * 100).toFixed(2)
          : 0,
        partialScores
      };
    } catch (error) {
      console.error('Error getting submission score:', error);
      throw error;
    }
  }

  /**
   * Get team scores for a contest with partial scoring
   */
  async getContestScores(contestId) {
    try {
      const teams = await db('teams as t')
        .join('team_contests as tc', 't.id', 'tc.team_id')
        .where('tc.contest_id', contestId)
        .select('t.*');

      const problems = await db('problems')
        .where('contest_id', contestId)
        .orderBy('problem_letter');

      const scores = [];

      for (const team of teams) {
        const teamScore = {
          teamId: team.id,
          teamName: team.team_name,
          totalPoints: 0,
          maxPoints: 0,
          problems: {}
        };

        for (const problem of problems) {
          // Get best submission for this team-problem combination
          const bestSubmission = await db('submissions as s')
            .where('s.team_id', team.id)
            .where('s.problem_id', problem.id)
            .orderBy('s.total_points', 'desc')
            .orderBy('s.submission_time', 'asc')
            .first();

          if (bestSubmission) {
            teamScore.totalPoints += bestSubmission.total_points || 0;
            teamScore.problems[problem.problem_letter] = {
              points: bestSubmission.total_points || 0,
              maxPoints: bestSubmission.max_points || 0,
              percentage: bestSubmission.max_points > 0 
                ? ((bestSubmission.total_points / bestSubmission.max_points) * 100).toFixed(2)
                : 0,
              status: bestSubmission.status,
              submissionTime: bestSubmission.submission_time
            };
          } else {
            teamScore.problems[problem.problem_letter] = {
              points: 0,
              maxPoints: problem.max_points || 0,
              percentage: 0,
              status: 'not_attempted',
              submissionTime: null
            };
          }

          teamScore.maxPoints += problem.max_points || 0;
        }

        scores.push(teamScore);
      }

      // Sort by total points (descending), then by earliest submission time
      scores.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        // For tie-breaking, use earliest last submission time
        const aLastSubmission = Math.min(...Object.values(a.problems)
          .filter(p => p.submissionTime)
          .map(p => new Date(p.submissionTime).getTime()));
        const bLastSubmission = Math.min(...Object.values(b.problems)
          .filter(p => p.submissionTime)
          .map(p => new Date(p.submissionTime).getTime()));
        
        return aLastSubmission - bLastSubmission;
      });

      return scores;
    } catch (error) {
      console.error('Error getting contest scores:', error);
      throw error;
    }
  }

  /**
   * Update all problems in a contest to use equal point distribution
   */
  async updateContestPointsDistribution(contestId, totalPointsPerProblem = 100) {
    try {
      const problems = await db('problems').where('contest_id', contestId);
      
      for (const problem of problems) {
        await this.setProblemPoints(problem.id, totalPointsPerProblem);
      }

      return {
        problemsUpdated: problems.length,
        pointsPerProblem: totalPointsPerProblem
      };
    } catch (error) {
      console.error('Error updating contest points distribution:', error);
      throw error;
    }
  }

  /**
   * Get detailed scoring statistics for a problem
   */
  async getProblemScoringStats(problemId) {
    try {
      const problem = await db('problems').where('id', problemId).first();
      const testCases = await db('test_cases').where('problem_id', problemId);
      
      const submissions = await db('submissions')
        .where('problem_id', problemId)
        .where('status', '!=', 'pending');

      const stats = {
        problemId,
        problemTitle: problem.title,
        maxPoints: problem.max_points || 100,
        totalTestCases: testCases.length,
        sampleTestCases: testCases.filter(tc => tc.is_sample).length,
        scoringTestCases: testCases.filter(tc => !tc.is_sample).length,
        pointsPerScoringTestCase: testCases.filter(tc => !tc.is_sample)[0]?.points || 0,
        submissions: {
          total: submissions.length,
          fullPoints: submissions.filter(s => s.total_points === problem.max_points).length,
          partialPoints: submissions.filter(s => s.total_points > 0 && s.total_points < problem.max_points).length,
          zeroPoints: submissions.filter(s => s.total_points === 0).length,
          averageScore: submissions.length > 0 
            ? (submissions.reduce((sum, s) => sum + (s.total_points || 0), 0) / submissions.length).toFixed(2)
            : 0
        }
      };

      return stats;
    } catch (error) {
      console.error('Error getting problem scoring stats:', error);
      throw error;
    }
  }
}

module.exports = new PartialScoringService();
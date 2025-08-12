/**
 * ICPC Scoring System Tests - Phase 3.1 Task 8: Score validation
 * Test with known examples, validate edge cases, handle negative scenarios
 */

const icpcScoring = require('../services/icpcScoring');
const { db } = require('../utils/db');

describe('ICPC Scoring System', () => {
  let contestId, teamId1, teamId2, teamId3;
  let problemIds = {};

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    
    // Create test contest
    const [contest] = await db('contests').insert({
      contest_name: 'ICPC Scoring Test',
      description: 'Test contest for scoring validation',
      registration_code: 'SCORE_TEST',
      start_time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      duration: 240, // 4 hours
      freeze_time: 60,
      created_by: 1,
      is_active: true
    }).returning('id');
    contestId = contest.id;

    // Create test teams
    const teams = await db('teams').insert([
      {
        team_name: 'Team Alpha',
        contest_code: 'SCORE_TEST'
      },
      {
        team_name: 'Team Beta', 
        contest_code: 'SCORE_TEST'
      },
      {
        team_name: 'Team Gamma',
        contest_code: 'SCORE_TEST'
      }
    ]).returning('id');
    
    [teamId1, teamId2, teamId3] = teams.map(t => t.id);

    // Create test problems
    const problems = await db('problems').insert([
      {
        contest_id: contestId,
        problem_letter: 'A',
        title: 'Simple Addition',
        description: 'Add two numbers',
        input_format: 'Two integers',
        output_format: 'Sum',
        time_limit: 1000,
        memory_limit: 256
      },
      {
        contest_id: contestId,
        problem_letter: 'B',
        title: 'Array Sum',
        description: 'Sum array elements',
        input_format: 'Array of integers',
        output_format: 'Sum',
        time_limit: 2000,
        memory_limit: 512
      },
      {
        contest_id: contestId,
        problem_letter: 'C',
        title: 'Complex Algorithm',
        description: 'Complex problem',
        input_format: 'Complex input',
        output_format: 'Complex output',
        time_limit: 3000,
        memory_limit: 1024
      }
    ]).returning('id');

    problemIds.A = problems[0].id;
    problemIds.B = problems[1].id;
    problemIds.C = problems[2].id;
  });

  afterAll(async () => {
    // Clean up test data
    await db('submissions').where('team_id', 'in', [teamId1, teamId2, teamId3]).del();
    await db('contest_results').where('contest_id', contestId).del();
    await db('problems').where('contest_id', contestId).del();
    await db('teams').where('contest_code', 'SCORE_TEST').del();
    await db('contests').where('id', contestId).del();
    
    await db.destroy();
  });

  describe('Problems Solved Counter', () => {
    beforeEach(async () => {
      // Clear submissions before each test
      await db('submissions').where('team_id', 'in', [teamId1, teamId2, teamId3]).del();
      await db('contest_results').where('contest_id', contestId).del();
    });

    test('should count accepted submissions correctly', async () => {
      // Team Alpha solves problems A and B
      await db('submissions').insert([
        {
          team_id: teamId1,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Solution A',
          status: 'accepted',
          submission_time: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        },
        {
          team_id: teamId1,
          problem_id: problemIds.B,
          language: 'cpp', 
          code: '// Solution B',
          status: 'accepted',
          submission_time: new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
        }
      ]);

      const result = await icpcScoring.countProblemsSolved(teamId1, contestId);
      expect(result.count).toBe(2);
      expect(result.problems.length).toBe(2);
    });

    test('should handle multiple submissions to same problem', async () => {
      // Team Beta makes multiple attempts on problem A with distinct timestamps
      const baseTime = Date.now();
      
      // Insert submissions with different second timestamps to ensure uniqueness
      const submissions = [
        {
          team_id: teamId2,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Wrong attempt 1',
          status: 'wrong_answer',
          submission_time: new Date(baseTime - (180 * 60 * 1000) - 10000) // 180 min 10s ago
        },
        {
          team_id: teamId2,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Wrong attempt 2', 
          status: 'time_limit_exceeded',
          submission_time: new Date(baseTime - (150 * 60 * 1000) - 5000) // 150 min 5s ago
        },
        {
          team_id: teamId2,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Correct solution',
          status: 'accepted',
          submission_time: new Date(baseTime - (120 * 60 * 1000) - 1000) // 120 min 1s ago
        }
      ];

      for (let i = 0; i < submissions.length; i++) {
        await db('submissions').insert(submissions[i]);
        if (i < submissions.length - 1) {
          // Small delay to ensure different insertion times
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }

      const result = await icpcScoring.countProblemsSolved(teamId2, contestId);
      expect(result.count).toBe(1);
      expect(result.problems[0].problem_letter).toBe('A');
    });
  });

  describe('Penalty Time Calculation', () => {
    beforeEach(async () => {
      await db('submissions').where('team_id', 'in', [teamId1, teamId2, teamId3]).del();
      await db('contest_results').where('contest_id', contestId).del();
    });

    test('should calculate penalty time correctly', async () => {
      // Team Alpha: Solves A at 60min with 1 wrong attempt, B at 30min with no wrong attempts
      const baseTime = Date.now();
      
      // Insert submissions individually with proper unique timing (ensure unique milliseconds)
      const submissions = [
        {
          team_id: teamId1,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Wrong attempt',
          status: 'wrong_answer',
          submission_time: new Date(baseTime - (80 * 60 * 1000) - 100) // 80 min + 100ms ago
        },
        {
          team_id: teamId1, 
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Correct solution',
          status: 'accepted',
          submission_time: new Date(baseTime - (60 * 60 * 1000) - 200) // 60 min + 200ms ago
        },
        {
          team_id: teamId1,
          problem_id: problemIds.B,
          language: 'cpp',
          code: '// Correct solution B',
          status: 'accepted', 
          submission_time: new Date(baseTime - (30 * 60 * 1000) - 300) // 30 min + 300ms ago
        }
      ];

      for (const submission of submissions) {
        await db('submissions').insert(submission);
      }

      const penaltyTime = await icpcScoring.calculatePenaltyTime(teamId1, contestId);
      
      // Problem A: 60 minutes + 20 penalty = 80 minutes
      // Problem B: 30 minutes + 0 penalty = 30 minutes  
      // Total: 110 minutes
      expect(penaltyTime).toBe(110);
    });

    test('should not count compilation errors in penalty', async () => {
      const baseTime = Date.now();
      
      // Insert submissions with unique millisecond timing
      const submissions = [
        {
          team_id: teamId2,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Compilation error',
          status: 'compilation_error',
          submission_time: new Date(baseTime - (100 * 60 * 1000) - 100)
        },
        {
          team_id: teamId2,
          problem_id: problemIds.A, 
          language: 'cpp',
          code: '// Wrong attempt',
          status: 'wrong_answer',
          submission_time: new Date(baseTime - (90 * 60 * 1000) - 200)
        },
        {
          team_id: teamId2,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Correct solution',
          status: 'accepted',
          submission_time: new Date(baseTime - (60 * 60 * 1000) - 300) // 60 min + 300ms ago
        }
      ];

      for (const submission of submissions) {
        await db('submissions').insert(submission);
      }

      const penaltyTime = await icpcScoring.calculatePenaltyTime(teamId2, contestId);
      
      // Problem A: 60 minutes + 20 penalty (only 1 wrong, CE doesn't count) = 80 minutes
      expect(penaltyTime).toBe(80);
    });
  });

  describe('Ranking Algorithm', () => {
    beforeEach(async () => {
      await db('submissions').where('team_id', 'in', [teamId1, teamId2, teamId3]).del();
      await db('contest_results').where('contest_id', contestId).del();
    });

    test('should rank by problems solved first', async () => {
      // Team Alpha solves 2 problems
      await db('submissions').insert([
        {
          team_id: teamId1,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Solution A',
          status: 'accepted',
          submission_time: new Date(Date.now() - 60 * 60 * 1000)
        },
        {
          team_id: teamId1,
          problem_id: problemIds.B,
          language: 'cpp',
          code: '// Solution B', 
          status: 'accepted',
          submission_time: new Date(Date.now() - 30 * 60 * 1000)
        }
      ]);

      // Team Beta solves 1 problem
      await db('submissions').insert([
        {
          team_id: teamId2,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Solution A',
          status: 'accepted',
          submission_time: new Date(Date.now() - 45 * 60 * 1000)
        }
      ]);

      const leaderboard = await icpcScoring.getLeaderboard(contestId);
      
      expect(leaderboard[0].team_id).toBe(teamId1); // Alpha should be first
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].team_id).toBe(teamId2); // Beta should be second
      expect(leaderboard[1].rank).toBe(2);
    });

    test('should use penalty time as tiebreaker', async () => {
      // Both teams solve 1 problem, but different penalty times
      const baseTime = Date.now();
      
      // Team Alpha: 1 wrong attempt, then accept at 60min
      const submissions = [
        {
          team_id: teamId1,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Wrong',
          status: 'wrong_answer', 
          submission_time: new Date(baseTime - (80 * 60 * 1000) - 100)
        },
        {
          team_id: teamId1,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Correct',
          status: 'accepted',
          submission_time: new Date(baseTime - (60 * 60 * 1000) - 200)
        },
        {
          // Team Beta: Direct accept at 60min (no wrong attempts) - different problem to avoid constraint
          team_id: teamId2,
          problem_id: problemIds.B,
          language: 'cpp',
          code: '// Correct', 
          status: 'accepted',
          submission_time: new Date(baseTime - (60 * 60 * 1000) - 300)
        }
      ];

      for (const submission of submissions) {
        await db('submissions').insert(submission);
      }

      const leaderboard = await icpcScoring.getLeaderboard(contestId);
      
      // Team Beta should be first (lower penalty time: 60 vs 80)
      expect(leaderboard[0].team_id).toBe(teamId2);
      expect(leaderboard[0].penalty_time).toBe(60);
      expect(leaderboard[1].team_id).toBe(teamId1);
      expect(leaderboard[1].penalty_time).toBe(80);
    });

    test('should handle tied teams correctly', async () => {
      // Both teams solve same number of problems with same penalty
      const baseTime = Date.now();
      const solveTime = new Date(baseTime - 60 * 60 * 1000);
      await db('submissions').insert([
        // Team Alpha
        {
          team_id: teamId1,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Solution Alpha',
          status: 'accepted',
          submission_time: solveTime
        },
        // Team Beta (same problem, same time = should have same penalty)
        {
          team_id: teamId2,
          problem_id: problemIds.B,
          language: 'cpp', 
          code: '// Solution Beta',
          status: 'accepted',
          submission_time: solveTime
        }
      ]);

      const leaderboard = await icpcScoring.getLeaderboard(contestId);
      
      // Both teams should have the same rank
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(1);
    });
  });

  describe('Score Updates', () => {
    beforeEach(async () => {
      await db('submissions').where('team_id', 'in', [teamId1, teamId2, teamId3]).del();
      await db('contest_results').where('contest_id', contestId).del();
    });

    test('should update scores on new accepted submission', async () => {
      // Get contest start time to calculate proper submission time
      const contest = await db('contests').where('id', contestId).first('start_time');
      const contestStartTime = new Date(contest.start_time);
      
      // Create submission 60 minutes after contest start
      const submissionTime = new Date(contestStartTime.getTime() + 60 * 60 * 1000);
      
      await db('submissions').insert({
        team_id: teamId1,
        problem_id: problemIds.A,
        language: 'cpp',
        code: '// Solution A',
        status: 'accepted',
        submission_time: submissionTime
      });

      // Update scores
      const result = await icpcScoring.updateTeamScoreOnSubmission(teamId1, problemIds.A, 'accepted');
      
      expect(result).toBeTruthy();
      expect(result.problems_solved).toBe(1);
      expect(result.penalty_time).toBe(60);

      // Check that it's persisted
      const stats = await icpcScoring.getTeamStatistics(teamId1, contestId);
      expect(stats.problems_solved).toBe(1);
      expect(stats.penalty_time).toBe(60);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await db('submissions').where('team_id', 'in', [teamId1, teamId2, teamId3]).del();
      await db('contest_results').where('contest_id', contestId).del();
    });

    test('should handle team with no submissions', async () => {
      const result = await icpcScoring.calculateTeamScore(teamId1, contestId);
      
      expect(result.problems_solved).toBe(0);
      expect(result.penalty_time).toBe(0);
      expect(result.solved_problems.length).toBe(0);
    });

    test('should handle team with only compilation errors', async () => {
      const baseTime = Date.now();
      await db('submissions').insert([
        {
          team_id: teamId1,
          problem_id: problemIds.A,
          language: 'cpp',
          code: '// Bad code',
          status: 'compilation_error',
          submission_time: new Date(baseTime - 60 * 60 * 1000)
        }
      ]);

      const result = await icpcScoring.calculateTeamScore(teamId1, contestId);
      
      expect(result.problems_solved).toBe(0);
      expect(result.penalty_time).toBe(0);
    });

    test('should handle invalid contest ID', async () => {
      await expect(icpcScoring.calculateTeamScore(teamId1, 99999)).rejects.toThrow();
    });

    test('should handle invalid team ID', async () => {
      const result = await icpcScoring.calculateTeamScore(99999, contestId);
      
      expect(result.problems_solved).toBe(0);
      expect(result.penalty_time).toBe(0);
    });
  });
});
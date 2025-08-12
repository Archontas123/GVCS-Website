/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Add composite indexes for better query performance
    .table('submissions', function(table) {
      table.index(['problem_id', 'status'], 'submissions_problem_status_idx');
      table.index(['team_id', 'submission_time'], 'submissions_team_time_idx');
      table.index(['status', 'judged_at'], 'submissions_status_judged_idx');
    })
    
    .table('contest_results', function(table) {
      table.index(['contest_id', 'problems_solved', 'penalty_time'], 'contest_results_ranking_idx');
      table.index(['updated_at'], 'contest_results_updated_idx');
    })
    
    .table('teams', function(table) {
      table.index(['is_active', 'last_activity'], 'teams_active_activity_idx');
    })
    
    .table('problems', function(table) {
      table.index(['contest_id', 'problem_letter'], 'problems_contest_letter_idx');
    })
    
    .table('test_cases', function(table) {
      table.index(['problem_id', 'is_sample'], 'test_cases_problem_sample_idx');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .table('submissions', function(table) {
      table.dropIndex(['problem_id', 'status'], 'submissions_problem_status_idx');
      table.dropIndex(['team_id', 'submission_time'], 'submissions_team_time_idx');
      table.dropIndex(['status', 'judged_at'], 'submissions_status_judged_idx');
    })
    
    .table('contest_results', function(table) {
      table.dropIndex(['contest_id', 'problems_solved', 'penalty_time'], 'contest_results_ranking_idx');
      table.dropIndex(['updated_at'], 'contest_results_updated_idx');
    })
    
    .table('teams', function(table) {
      table.dropIndex(['is_active', 'last_activity'], 'teams_active_activity_idx');
    })
    
    .table('problems', function(table) {
      table.dropIndex(['contest_id', 'problem_letter'], 'problems_contest_letter_idx');
    })
    
    .table('test_cases', function(table) {
      table.dropIndex(['problem_id', 'is_sample'], 'test_cases_problem_sample_idx');
    });
};
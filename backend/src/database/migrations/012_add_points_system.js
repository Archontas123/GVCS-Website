/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Add points column to problems table
    .alterTable('problems', function(table) {
      table.integer('max_points').defaultTo(100);
    })
    
    // Add points column to test_cases table
    .alterTable('test_cases', function(table) {
      table.integer('points').defaultTo(0);
    })
    
    // Create partial_scores table for tracking test case results
    .createTable('partial_scores', function(table) {
      table.increments('id').primary();
      table.integer('submission_id').references('id').inTable('submissions').onDelete('CASCADE');
      table.integer('test_case_id').references('id').inTable('test_cases').onDelete('CASCADE');
      table.enum('verdict', [
        'accepted',
        'wrong_answer', 
        'runtime_error',
        'time_limit_exceeded',
        'memory_limit_exceeded'
      ]).notNullable();
      table.integer('points_earned').defaultTo(0);
      table.integer('execution_time');
      table.integer('memory_used');
      table.timestamp('judged_at').defaultTo(knex.fn.now());
      
      table.unique(['submission_id', 'test_case_id']);
      table.index(['submission_id']);
      table.index(['test_case_id']);
      table.index(['verdict']);
    })
    
    // Add columns to submissions table for partial scoring
    .alterTable('submissions', function(table) {
      table.integer('total_points').defaultTo(0);
      table.integer('max_points').defaultTo(0);
      table.integer('test_cases_passed').defaultTo(0);
      table.integer('total_test_cases').defaultTo(0);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('partial_scores')
    .alterTable('submissions', function(table) {
      table.dropColumn('total_points');
      table.dropColumn('max_points');
      table.dropColumn('test_cases_passed');
      table.dropColumn('total_test_cases');
    })
    .alterTable('test_cases', function(table) {
      table.dropColumn('points');
    })
    .alterTable('problems', function(table) {
      table.dropColumn('max_points');
    });
};
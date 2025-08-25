/**
 * Add partial scoring support - store test case results
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Add test case result tracking to submissions
    .table('submissions', function(table) {
      table.integer('test_cases_passed').defaultTo(0);
      table.integer('total_test_cases').defaultTo(0);
      table.decimal('points_earned', 8, 2).defaultTo(0);
      table.index(['team_id', 'problem_id', 'points_earned']); // For finding best scores
    })
    
    // Update problems table to ensure points_value has default
    .table('problems', function(table) {
      table.integer('points_value').defaultTo(1).alter();
    })
    
    // Create table to store individual test case results
    .createTable('submission_test_results', function(table) {
      table.increments('id').primary();
      table.integer('submission_id').references('id').inTable('submissions').onDelete('CASCADE');
      table.integer('test_case_id').references('id').inTable('test_cases').onDelete('CASCADE');
      table.enum('result', ['passed', 'failed', 'error']).notNullable();
      table.text('output');
      table.text('expected_output');
      table.integer('execution_time'); // milliseconds
      table.integer('memory_used'); // KB
      table.timestamp('tested_at').defaultTo(knex.fn.now());
      
      table.index(['submission_id']);
      table.index(['test_case_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('submission_test_results')
    .table('submissions', function(table) {
      table.dropIndex(['team_id', 'problem_id', 'points_earned']);
      table.dropColumn('test_cases_passed');
      table.dropColumn('total_test_cases');
      table.dropColumn('points_earned');
    });
};
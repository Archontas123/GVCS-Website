/**
 * Comprehensive database schema - all tables
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Create contests table
    .createTable('contests', function(table) {
      table.increments('id').primary();
      table.string('contest_name').notNullable();
      table.text('description');
      table.string('registration_code').unique();
      table.timestamp('start_time').notNullable();
      table.timestamp('end_time').notNullable();
      table.integer('duration').notNullable(); // in minutes
      table.integer('freeze_time').defaultTo(0); // minutes before end
      table.boolean('is_active').defaultTo(false);
      table.boolean('is_registration_open').defaultTo(true);
      table.boolean('is_frozen').defaultTo(false);
      table.enum('scoring_type', ['icpc']).defaultTo('icpc');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.index(['start_time', 'end_time']);
      table.index(['is_active']);
    })
    
    // Create problems table
    .createTable('problems', function(table) {
      table.increments('id').primary();
      table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');
      table.string('problemLetter', 1).notNullable();
      table.string('title').notNullable();
      table.text('description').notNullable();
      table.text('input_format');
      table.text('output_format');
      table.text('constraints');
      table.text('sample_input');
      table.text('sample_output');
      table.text('explanation');
      table.integer('timeLimit').defaultTo(1000); // milliseconds
      table.integer('memoryLimit').defaultTo(256); // MB
      table.enum('difficulty', ['easy', 'medium', 'hard']).defaultTo('medium');
      table.integer('points_value').defaultTo(1);
      table.integer('max_points').defaultTo(100);
      table.boolean('is_visible').defaultTo(true);
      table.string('language');
      table.text('function_signature');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['contest_id', 'problemLetter']);
      table.index(['contest_id']);
      table.index(['difficulty']);
    })
    
    // Create teams table
    .createTable('teams', function(table) {
      table.increments('id').primary();
      table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');
      table.string('team_name').notNullable();
      table.string('school');
      table.string('email').notNullable();
      table.string('password_hash').notNullable();
      table.boolean('is_verified').defaultTo(false);
      table.string('verification_token');
      table.timestamp('registered_at').defaultTo(knex.fn.now());
      table.timestamp('last_login');
      table.string('member1_name');
      table.string('member1_email');
      table.string('member2_name');
      table.string('member2_email');
      table.string('member3_name');
      table.string('member3_email');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['contest_id', 'team_name']);
      table.unique(['contest_id', 'email']);
      table.index(['contest_id']);
      table.index(['is_verified']);
    })
    
    // Create test_cases table
    .createTable('test_cases', function(table) {
      table.increments('id').primary();
      table.integer('problem_id').references('id').inTable('problems').onDelete('CASCADE');
      table.text('input').notNullable();
      table.text('expected_output').notNullable();
      table.boolean('is_sample').defaultTo(false);
      table.boolean('is_hidden').defaultTo(false);
      table.integer('points').defaultTo(0);
      table.integer('time_limit');
      table.integer('memory_limit');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['problem_id']);
      table.index(['is_sample']);
    })
    
    // Create submissions table
    .createTable('submissions', function(table) {
      table.increments('id').primary();
      table.integer('team_id').references('id').inTable('teams').onDelete('CASCADE');
      table.integer('problem_id').references('id').inTable('problems').onDelete('CASCADE');
      table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');
      table.text('source_code').notNullable();
      table.string('language').notNullable();
      table.enum('verdict', [
        'pending',
        'accepted',
        'wrong_answer',
        'runtime_error',
        'time_limit_exceeded',
        'memory_limit_exceeded',
        'compilation_error'
      ]).defaultTo('pending');
      table.text('judge_output');
      table.integer('execution_time');
      table.integer('memory_used');
      table.integer('test_cases_passed').defaultTo(0);
      table.integer('total_test_cases').defaultTo(0);
      table.decimal('points_earned', 8, 2).defaultTo(0);
      table.integer('total_points').defaultTo(0);
      table.integer('max_points').defaultTo(0);
      table.timestamp('submitted_at').defaultTo(knex.fn.now());
      table.timestamp('judged_at');
      
      table.index(['team_id', 'problem_id']);
      table.index(['contest_id']);
      table.index(['verdict']);
      table.index(['submitted_at']);
      table.index(['team_id', 'problem_id', 'points_earned']);
    })
    
    // Create submission_test_results table
    .createTable('submission_test_results', function(table) {
      table.increments('id').primary();
      table.integer('submission_id').references('id').inTable('submissions').onDelete('CASCADE');
      table.integer('test_case_id').references('id').inTable('test_cases').onDelete('CASCADE');
      table.enum('result', ['passed', 'failed', 'error']).notNullable();
      table.text('output');
      table.text('expected_output');
      table.integer('execution_time');
      table.integer('memory_used');
      table.timestamp('tested_at').defaultTo(knex.fn.now());
      
      table.index(['submission_id']);
      table.index(['test_case_id']);
    })
    
    // Create partial_scores table
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
    
    // Create clarifications table
    .createTable('clarifications', function(table) {
      table.increments('id').primary();
      table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');
      table.integer('team_id').references('id').inTable('teams').onDelete('CASCADE');
      table.integer('problem_id').references('id').inTable('problems').onDelete('CASCADE').nullable();
      table.text('question').notNullable();
      table.text('answer');
      table.boolean('is_public').defaultTo(false);
      table.boolean('is_answered').defaultTo(false);
      table.timestamp('asked_at').defaultTo(knex.fn.now());
      table.timestamp('answered_at');
      table.string('answered_by');
      
      table.index(['contest_id']);
      table.index(['team_id']);
      table.index(['is_public']);
      table.index(['is_answered']);
    })
    
    // Create admin_users table
    .createTable('admin_users', function(table) {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.enum('role', ['super_admin', 'admin', 'judge']).defaultTo('admin');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_login');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.index(['username']);
      table.index(['role']);
    })
    
    // Create team_problem_code table
    .createTable('team_problem_code', function(table) {
      table.increments('id').primary();
      table.integer('team_id').references('id').inTable('teams').onDelete('CASCADE');
      table.integer('problem_id').references('id').inTable('problems').onDelete('CASCADE');
      table.text('code').defaultTo('');
      table.string('language').defaultTo('javascript');
      table.timestamp('last_updated').defaultTo(knex.fn.now());
      
      table.unique(['team_id', 'problem_id']);
      table.index(['team_id']);
      table.index(['problem_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('team_problem_code')
    .dropTableIfExists('admin_users')
    .dropTableIfExists('clarifications')
    .dropTableIfExists('partial_scores')
    .dropTableIfExists('submission_test_results')
    .dropTableIfExists('submissions')
    .dropTableIfExists('test_cases')
    .dropTableIfExists('teams')
    .dropTableIfExists('problems')
    .dropTableIfExists('contests');
};
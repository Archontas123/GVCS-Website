/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Create Admins table first (referenced by contests)
    .createTable('admins', function(table) {
      table.increments('id').primary();
      table.string('username', 50).notNullable().unique();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.enum('role', ['super_admin', 'judge']).defaultTo('judge');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['username']);
      table.index(['email']);
    })
    
    // Create Contests table
    .createTable('contests', function(table) {
      table.increments('id').primary();
      table.string('contest_name', 255).notNullable();
      table.text('description');
      table.string('registration_code', 50).notNullable().unique();
      table.timestamp('start_time').notNullable();
      table.integer('duration').notNullable(); // in minutes
      table.integer('freeze_time').defaultTo(60); // minutes before end
      table.integer('created_by').references('id').inTable('admins');
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_registration_open').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['registration_code']);
      table.index(['start_time']);
      table.index(['is_active']);
    })
    
    // Create Teams table
    .createTable('teams', function(table) {
      table.increments('id').primary();
      table.string('team_name', 50).notNullable();
      table.string('contest_code', 50).notNullable();
      table.string('session_token', 255).unique();
      table.timestamp('registered_at').defaultTo(knex.fn.now());
      table.timestamp('last_activity').defaultTo(knex.fn.now());
      table.boolean('is_active').defaultTo(true);
      
      table.unique(['team_name', 'contest_code']);
      table.index(['contest_code']);
      table.index(['session_token']);
      table.index(['last_activity']);
    })
    
    // Create Problems table
    .createTable('problems', function(table) {
      table.increments('id').primary();
      table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');
      table.string('problem_letter', 1).notNullable();
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.text('input_format').notNullable();
      table.text('output_format').notNullable();
      table.text('sample_input');
      table.text('sample_output');
      table.text('constraints');
      table.integer('time_limit').defaultTo(1000); // milliseconds
      table.integer('memory_limit').defaultTo(256); // MB
      table.enum('difficulty', ['easy', 'medium', 'hard']).defaultTo('medium');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.unique(['contest_id', 'problem_letter']);
      table.index(['contest_id']);
    })
    
    // Create Test Cases table
    .createTable('test_cases', function(table) {
      table.increments('id').primary();
      table.integer('problem_id').references('id').inTable('problems').onDelete('CASCADE');
      table.text('input').notNullable();
      table.text('expected_output').notNullable();
      table.boolean('is_sample').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['problem_id']);
      table.index(['is_sample']);
    })
    
    // Create Submissions table
    .createTable('submissions', function(table) {
      table.increments('id').primary();
      table.integer('team_id').references('id').inTable('teams');
      table.integer('problem_id').references('id').inTable('problems');
      table.string('language', 20).notNullable();
      table.text('code').notNullable();
      table.enum('status', [
        'pending',
        'accepted', 
        'wrong_answer',
        'runtime_error',
        'time_limit_exceeded',
        'compilation_error',
        'memory_limit_exceeded'
      ]).defaultTo('pending');
      table.timestamp('submission_time').defaultTo(knex.fn.now());
      table.integer('execution_time'); // milliseconds
      table.integer('memory_used'); // KB
      table.timestamp('judged_at');
      
      table.unique(['team_id', 'problem_id', 'submission_time']);
      table.index(['team_id', 'problem_id']);
      table.index(['submission_time']);
      table.index(['status']);
    })
    
    // Create Team Contests junction table
    .createTable('team_contests', function(table) {
      table.integer('team_id').references('id').inTable('teams');
      table.integer('contest_id').references('id').inTable('contests');
      table.timestamp('registered_at').defaultTo(knex.fn.now());
      
      table.primary(['team_id', 'contest_id']);
      table.index(['contest_id']);
    })
    
    // Create Contest Results table
    .createTable('contest_results', function(table) {
      table.increments('id').primary();
      table.integer('contest_id').references('id').inTable('contests');
      table.integer('team_id').references('id').inTable('teams');
      table.integer('problems_solved').defaultTo(0);
      table.integer('penalty_time').defaultTo(0); // in minutes
      table.timestamp('last_submission_time');
      table.integer('rank');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['contest_id', 'team_id']);
      table.index(['contest_id', 'rank']);
      table.index(['problems_solved']);
      table.index(['penalty_time']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('contest_results')
    .dropTableIfExists('team_contests')
    .dropTableIfExists('submissions')
    .dropTableIfExists('test_cases')
    .dropTableIfExists('problems')
    .dropTableIfExists('teams')
    .dropTableIfExists('contests')
    .dropTableIfExists('admins');
};
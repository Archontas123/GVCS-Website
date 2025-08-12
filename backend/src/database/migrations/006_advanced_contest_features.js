/**
 * CS Club Hackathon Platform - Advanced Contest Features Migration
 * Phase 6.3: Contest templates, scheduling, and series support
 */

exports.up = async function(knex) {
  // Contest templates table
  await knex.schema.createTable('contest_templates', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.json('settings').notNullable();
    table.json('problem_templates');
    table.boolean('is_custom').defaultTo(false);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['is_custom']);
    table.index(['created_by']);
  });

  // Scheduled contests table
  await knex.schema.createTable('scheduled_contests', function(table) {
    table.increments('id').primary();
    table.string('contest_name').notNullable();
    table.text('description');
    table.string('template_id');
    table.timestamp('scheduled_time').notNullable();
    table.integer('duration').notNullable(); // in minutes
    table.json('settings');
    table.json('notification_settings');
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('series_id').references('id').inTable('contest_series');
    table.enum('status', ['scheduled', 'executed', 'failed', 'cancelled']).defaultTo('scheduled');
    table.integer('created_by').references('id').inTable('admins');
    table.integer('cancelled_by').references('id').inTable('admins');
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('executed_at');
    table.timestamp('failed_at');
    table.timestamp('cancelled_at');
    
    table.index(['status']);
    table.index(['scheduled_time']);
    table.index(['series_id']);
  });

  // Recurring contests table
  await knex.schema.createTable('recurring_contests', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.string('template_id');
    table.string('cron_expression').notNullable();
    table.integer('duration').notNullable();
    table.json('settings');
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').references('id').inTable('admins');
    table.integer('disabled_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_execution');
    table.timestamp('next_execution');
    table.timestamp('disabled_at');
    
    table.index(['is_active']);
    table.index(['next_execution']);
  });

  // Contest series (tournaments) table
  await knex.schema.createTable('contest_series', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.date('start_date');
    table.date('end_date');
    table.json('settings'); // qualification_criteria, advancement_rules, prize_distribution
    table.enum('status', ['planning', 'active', 'completed', 'cancelled']).defaultTo('planning');
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['status']);
    table.index(['start_date', 'end_date']);
  });

  // Recurring contest executions log
  await knex.schema.createTable('recurring_contest_executions', function(table) {
    table.increments('id').primary();
    table.integer('recurring_contest_id').references('id').inTable('recurring_contests');
    table.integer('contest_id').references('id').inTable('contests');
    table.timestamp('executed_at').notNullable();
    table.enum('status', ['success', 'failed']).notNullable();
    table.text('error_message');
    
    table.index(['recurring_contest_id']);
    table.index(['executed_at']);
  });

  // Add template_id to contests table
  await knex.schema.table('contests', function(table) {
    table.string('template_id');
    table.json('advanced_settings');
    table.integer('series_id').references('id').inTable('contest_series');
    table.enum('contest_type', ['single', 'series', 'qualifying', 'final']).defaultTo('single');
    
    table.index(['template_id']);
    table.index(['series_id']);
    table.index(['contest_type']);
  });

  // Contest participation tracking
  await knex.schema.createTable('contest_participation', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('team_id').references('id').inTable('teams');
    table.timestamp('registered_at').defaultTo(knex.fn.now());
    table.enum('status', ['registered', 'participated', 'disqualified']).defaultTo('registered');
    table.json('metadata'); // Additional participation data
    
    table.unique(['contest_id', 'team_id']);
    table.index(['contest_id']);
    table.index(['team_id']);
    table.index(['status']);
  });

  // Contest ratings and rankings
  await knex.schema.createTable('contest_ratings', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('team_id').references('id').inTable('teams');
    table.integer('rank').notNullable();
    table.integer('score').notNullable();
    table.integer('problems_solved').defaultTo(0);
    table.integer('penalty_time').defaultTo(0);
    table.decimal('rating_change', 8, 2);
    table.decimal('new_rating', 8, 2);
    table.json('problem_results'); // Detailed per-problem results
    table.timestamp('calculated_at').defaultTo(knex.fn.now());
    
    table.unique(['contest_id', 'team_id']);
    table.index(['contest_id', 'rank']);
    table.index(['team_id']);
  });

  // Team ratings history
  await knex.schema.createTable('team_ratings', function(table) {
    table.increments('id').primary();
    table.integer('team_id').references('id').inTable('teams');
    table.decimal('rating', 8, 2).notNullable();
    table.integer('contests_participated').defaultTo(0);
    table.decimal('peak_rating', 8, 2);
    table.integer('contest_id').references('id').inTable('contests'); // Contest that caused rating change
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['team_id']);
    table.index(['rating']);
    table.index(['updated_at']);
  });

  // Contest announcements and updates
  await knex.schema.createTable('contest_announcements', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.enum('type', ['general', 'clarification', 'update', 'emergency']).defaultTo('general');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.boolean('is_published').defaultTo(false);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('published_at');
    
    table.index(['contest_id', 'is_published']);
    table.index(['type']);
    table.index(['priority']);
  });

  // Contest statistics and analytics
  await knex.schema.createTable('contest_statistics', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('total_teams');
    table.integer('active_teams');
    table.integer('total_submissions');
    table.integer('accepted_submissions');
    table.decimal('average_score', 8, 2);
    table.json('problem_statistics'); // Per-problem stats
    table.json('language_statistics'); // Language usage stats
    table.json('time_statistics'); // Submissions over time
    table.timestamp('calculated_at').defaultTo(knex.fn.now());
    
    table.unique(['contest_id']);
    table.index(['calculated_at']);
  });

  // Problem categories and tags
  await knex.schema.createTable('problem_categories', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.text('description');
    table.string('color_code'); // For UI display
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    
    table.index(['is_active', 'sort_order']);
  });

  await knex.schema.createTable('problem_tags', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.text('description');
    table.string('color_code');
    table.boolean('is_active').defaultTo(true);
    
    table.index(['is_active']);
  });

  await knex.schema.createTable('problem_tag_assignments', function(table) {
    table.integer('problem_id').references('id').inTable('problems');
    table.integer('tag_id').references('id').inTable('problem_tags');
    
    table.primary(['problem_id', 'tag_id']);
  });

  // Add category and enhanced metadata to problems
  await knex.schema.table('problems', function(table) {
    table.integer('category_id').references('id').inTable('problem_categories');
    table.json('metadata'); // Additional problem metadata
    table.integer('solve_count').defaultTo(0);
    table.integer('attempt_count').defaultTo(0);
    table.decimal('acceptance_rate', 5, 2);
    table.decimal('average_time', 8, 2); // Average solve time in seconds
    
    table.index(['category_id']);
    table.index(['solve_count']);
    table.index(['acceptance_rate']);
  });

  // Contest access control
  await knex.schema.createTable('contest_access_control', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.enum('access_type', ['public', 'private', 'password', 'invitation']).defaultTo('public');
    table.string('password_hash'); // For password-protected contests
    table.json('allowed_teams'); // List of allowed team IDs for private contests
    table.json('restrictions'); // Additional access restrictions
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['contest_id']);
    table.index(['access_type']);
  });

  // Contest invitations
  await knex.schema.createTable('contest_invitations', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.string('email');
    table.string('team_name');
    table.string('invitation_code').unique();
    table.enum('status', ['sent', 'accepted', 'expired']).defaultTo('sent');
    table.integer('sent_by').references('id').inTable('admins');
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.timestamp('accepted_at');
    table.timestamp('expires_at');
    
    table.index(['contest_id']);
    table.index(['invitation_code']);
    table.index(['status']);
  });
};

exports.down = async function(knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.dropTableIfExists('contest_invitations');
  await knex.schema.dropTableIfExists('contest_access_control');
  
  await knex.schema.table('problems', function(table) {
    table.dropColumn('category_id');
    table.dropColumn('metadata');
    table.dropColumn('solve_count');
    table.dropColumn('attempt_count');
    table.dropColumn('acceptance_rate');
    table.dropColumn('average_time');
  });
  
  await knex.schema.dropTableIfExists('problem_tag_assignments');
  await knex.schema.dropTableIfExists('problem_tags');
  await knex.schema.dropTableIfExists('problem_categories');
  await knex.schema.dropTableIfExists('contest_statistics');
  await knex.schema.dropTableIfExists('contest_announcements');
  await knex.schema.dropTableIfExists('team_ratings');
  await knex.schema.dropTableIfExists('contest_ratings');
  await knex.schema.dropTableIfExists('contest_participation');
  
  await knex.schema.table('contests', function(table) {
    table.dropColumn('template_id');
    table.dropColumn('advanced_settings');
    table.dropColumn('series_id');
    table.dropColumn('contest_type');
  });
  
  await knex.schema.dropTableIfExists('recurring_contest_executions');
  await knex.schema.dropTableIfExists('contest_series');
  await knex.schema.dropTableIfExists('recurring_contests');
  await knex.schema.dropTableIfExists('scheduled_contests');
  await knex.schema.dropTableIfExists('contest_templates');
};
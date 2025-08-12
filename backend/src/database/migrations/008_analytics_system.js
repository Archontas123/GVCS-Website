/**
 * CS Club Hackathon Platform - Analytics System Migration
 * Phase 6.3: Advanced analytics and reporting features
 */

exports.up = async function(knex) {
  // Analytics reports storage
  await knex.schema.createTable('analytics_reports', function(table) {
    table.increments('id').primary();
    table.enum('report_type', ['contest', 'team', 'platform', 'problem', 'user']).notNullable();
    table.integer('entity_id'); // Contest ID, Team ID, etc.
    table.json('report_data').notNullable();
    table.json('report_metadata'); // Additional metadata about the report
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at'); // For automatic cleanup
    table.integer('generated_by').references('id').inTable('admins');
    
    table.index(['report_type', 'entity_id']);
    table.index(['generated_at']);
    table.index(['expires_at']);
  });

  // Platform analytics metrics
  await knex.schema.createTable('platform_metrics', function(table) {
    table.increments('id').primary();
    table.string('metric_name').notNullable();
    table.string('metric_category'); // performance, usage, engagement
    table.decimal('metric_value', 15, 2).notNullable();
    table.json('metric_metadata'); // Additional context
    table.timestamp('recorded_at').defaultTo(knex.fn.now());
    table.string('time_period'); // hour, day, week, month
    
    table.index(['metric_name', 'recorded_at']);
    table.index(['metric_category']);
    table.index(['time_period']);
  });

  // Contest analytics cache
  await knex.schema.createTable('contest_analytics_cache', function(table) {
    table.integer('contest_id').primary().references('id').inTable('contests');
    table.json('analytics_data').notNullable();
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    table.timestamp('expires_at');
    table.boolean('is_live').defaultTo(false); // Real-time updates for active contests
    
    table.index(['last_updated']);
    table.index(['is_live']);
  });

  // Team performance analytics
  await knex.schema.createTable('team_analytics', function(table) {
    table.increments('id').primary();
    table.integer('team_id').references('id').inTable('teams');
    table.integer('contest_id').references('id').inTable('contests');
    table.json('performance_metrics').notNullable();
    table.json('behavioral_patterns'); // Time patterns, language preferences
    table.decimal('skill_rating', 8, 2);
    table.integer('problems_solved').defaultTo(0);
    table.integer('total_submissions').defaultTo(0);
    table.decimal('success_rate', 5, 2);
    table.integer('average_solve_time'); // in seconds
    table.timestamp('calculated_at').defaultTo(knex.fn.now());
    
    table.unique(['team_id', 'contest_id']);
    table.index(['team_id']);
    table.index(['contest_id']);
    table.index(['skill_rating']);
    table.index(['calculated_at']);
  });

  // Problem analytics
  await knex.schema.createTable('problem_analytics', function(table) {
    table.integer('problem_id').primary().references('id').inTable('problems');
    table.integer('total_attempts').defaultTo(0);
    table.integer('successful_attempts').defaultTo(0);
    table.decimal('success_rate', 5, 2).defaultTo(0);
    table.integer('average_attempts_to_solve').defaultTo(0);
    table.integer('average_solve_time').defaultTo(0); // in seconds
    table.json('language_statistics'); // Success rate by language
    table.json('attempt_patterns'); // Time-based attempt patterns
    table.json('error_patterns'); // Common error types
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    
    table.index(['success_rate']);
    table.index(['total_attempts']);
  });

  // Real-time contest monitoring
  await knex.schema.createTable('contest_monitoring', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('active_teams').defaultTo(0);
    table.integer('submissions_per_minute').defaultTo(0);
    table.json('current_activity'); // Active teams, recent submissions
    table.json('system_metrics'); // Server load, response times
    table.timestamp('snapshot_time').defaultTo(knex.fn.now());
    
    table.index(['contest_id', 'snapshot_time']);
  });

  // User activity tracking
  await knex.schema.createTable('user_activity_logs', function(table) {
    table.increments('id').primary();
    table.integer('user_id'); // Team member ID or admin ID
    table.string('user_type').notNullable(); // team_member, admin
    table.string('activity_type').notNullable(); // login, submission, view_standings, etc.
    table.json('activity_data'); // Additional activity details
    table.string('ip_address');
    table.string('user_agent');
    table.integer('contest_id').references('id').inTable('contests');
    table.timestamp('activity_time').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'activity_time']);
    table.index(['activity_type']);
    table.index(['contest_id']);
    table.index(['activity_time']);
  });

  // Performance benchmarks
  await knex.schema.createTable('performance_benchmarks', function(table) {
    table.increments('id').primary();
    table.string('benchmark_name').notNullable();
    table.string('benchmark_category'); // response_time, throughput, accuracy
    table.decimal('target_value', 10, 3);
    table.decimal('current_value', 10, 3);
    table.decimal('threshold_warning', 10, 3);
    table.decimal('threshold_critical', 10, 3);
    table.enum('status', ['good', 'warning', 'critical']).defaultTo('good');
    table.timestamp('last_measured').defaultTo(knex.fn.now());
    table.json('measurement_history'); // Last N measurements
    
    table.index(['benchmark_category']);
    table.index(['status']);
    table.index(['last_measured']);
  });

  // Analytics dashboards configuration
  await knex.schema.createTable('analytics_dashboards', function(table) {
    table.increments('id').primary();
    table.string('dashboard_name').notNullable();
    table.text('dashboard_description');
    table.json('dashboard_config').notNullable(); // Widgets, layout, filters
    table.enum('dashboard_type', ['contest', 'platform', 'team', 'custom']).notNullable();
    table.json('access_permissions'); // Who can view/edit
    table.integer('created_by').references('id').inTable('admins');
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_public').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['dashboard_type']);
    table.index(['is_default']);
    table.index(['is_public']);
  });

  // Scheduled analytics tasks
  await knex.schema.createTable('analytics_tasks', function(table) {
    table.increments('id').primary();
    table.string('task_name').notNullable();
    table.string('task_type').notNullable(); // report_generation, data_aggregation, cleanup
    table.string('cron_expression');
    table.json('task_parameters');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_execution');
    table.timestamp('next_execution');
    table.enum('last_status', ['success', 'failed', 'running']).defaultTo('success');
    table.text('last_error');
    table.integer('execution_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['is_active']);
    table.index(['next_execution']);
    table.index(['task_type']);
  });

  // Data export requests
  await knex.schema.createTable('data_export_requests', function(table) {
    table.increments('id').primary();
    table.string('export_type').notNullable(); // contest_data, team_data, submissions
    table.json('export_parameters'); // Filters, date ranges, etc.
    table.enum('export_format', ['json', 'csv', 'xlsx']).defaultTo('json');
    table.integer('requested_by').references('id').inTable('admins');
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.string('file_path'); // Path to generated file
    table.integer('file_size'); // File size in bytes
    table.timestamp('requested_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.timestamp('expires_at'); // Auto-cleanup
    table.text('error_message');
    
    table.index(['requested_by']);
    table.index(['status']);
    table.index(['requested_at']);
    table.index(['expires_at']);
  });

  // Add analytics columns to existing tables
  await knex.schema.table('contests', function(table) {
    table.json('analytics_settings'); // Custom analytics configuration
    table.boolean('real_time_monitoring').defaultTo(false);
    table.timestamp('analytics_last_updated');
  });

  await knex.schema.table('teams', function(table) {
    table.json('analytics_metadata'); // Cached performance metrics
    table.decimal('current_skill_rating', 8, 2);
    table.integer('total_contests_participated').defaultTo(0);
    table.timestamp('analytics_last_updated');
  });

  await knex.schema.table('problems', function(table) {
    table.json('analytics_metadata'); // Cached statistics
    table.decimal('difficulty_rating', 5, 2); // Calculated based on solve rates
    table.timestamp('analytics_last_updated');
  });

  await knex.schema.table('submissions', function(table) {
    table.integer('code_complexity_score'); // Static analysis score
    table.json('performance_metrics'); // Runtime, memory usage
    table.boolean('is_plagiarized').defaultTo(false);
    table.decimal('similarity_score', 5, 2); // For plagiarism detection
  });
};

exports.down = async function(knex) {
  // Remove added columns from existing tables
  await knex.schema.table('submissions', function(table) {
    table.dropColumn('code_complexity_score');
    table.dropColumn('performance_metrics');
    table.dropColumn('is_plagiarized');
    table.dropColumn('similarity_score');
  });

  await knex.schema.table('problems', function(table) {
    table.dropColumn('analytics_metadata');
    table.dropColumn('difficulty_rating');
    table.dropColumn('analytics_last_updated');
  });

  await knex.schema.table('teams', function(table) {
    table.dropColumn('analytics_metadata');
    table.dropColumn('current_skill_rating');
    table.dropColumn('total_contests_participated');
    table.dropColumn('analytics_last_updated');
  });

  await knex.schema.table('contests', function(table) {
    table.dropColumn('analytics_settings');
    table.dropColumn('real_time_monitoring');
    table.dropColumn('analytics_last_updated');
  });

  // Drop analytics tables
  await knex.schema.dropTableIfExists('data_export_requests');
  await knex.schema.dropTableIfExists('analytics_tasks');
  await knex.schema.dropTableIfExists('analytics_dashboards');
  await knex.schema.dropTableIfExists('performance_benchmarks');
  await knex.schema.dropTableIfExists('user_activity_logs');
  await knex.schema.dropTableIfExists('contest_monitoring');
  await knex.schema.dropTableIfExists('problem_analytics');
  await knex.schema.dropTableIfExists('team_analytics');
  await knex.schema.dropTableIfExists('contest_analytics_cache');
  await knex.schema.dropTableIfExists('platform_metrics');
  await knex.schema.dropTableIfExists('analytics_reports');
};
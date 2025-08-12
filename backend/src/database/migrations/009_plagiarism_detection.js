/**
 * CS Club Hackathon Platform - Plagiarism Detection Migration
 * Phase 6.3: Code similarity analysis and plagiarism detection
 */

exports.up = async function(knex) {
  // Plagiarism analysis results
  await knex.schema.createTable('plagiarism_analysis_results', function(table) {
    table.increments('id').primary();
    table.integer('submission_id').references('id').inTable('submissions').notNullable();
    table.integer('compared_submission_id').references('id').inTable('submissions').notNullable();
    table.decimal('similarity_score', 5, 4).notNullable(); // 0.0000 to 1.0000
    table.json('analysis_details'); // Detailed similarity breakdown
    table.enum('status', ['suspicious', 'highly_suspicious', 'confirmed', 'dismissed']).defaultTo('suspicious');
    table.timestamp('analyzed_at').defaultTo(knex.fn.now());
    
    // Review fields
    table.integer('reviewed_by').references('id').inTable('admins');
    table.enum('review_decision', ['innocent', 'suspicious', 'guilty']).nullable();
    table.text('review_notes');
    table.timestamp('reviewed_at');
    
    // Indexes
    table.index(['submission_id']);
    table.index(['compared_submission_id']);
    table.index(['similarity_score']);
    table.index(['status']);
    table.index(['analyzed_at']);
  });

  // Code analysis metrics
  await knex.schema.createTable('code_analysis_metrics', function(table) {
    table.integer('submission_id').primary().references('id').inTable('submissions');
    table.integer('lines_of_code').defaultTo(0);
    table.integer('cyclomatic_complexity').defaultTo(0);
    table.integer('function_count').defaultTo(0);
    table.integer('variable_count').defaultTo(0);
    table.json('language_features'); // Used language features
    table.json('complexity_breakdown'); // Detailed complexity analysis
    table.decimal('readability_score', 5, 2); // Code readability score
    table.json('style_analysis'); // Coding style analysis
    table.timestamp('analyzed_at').defaultTo(knex.fn.now());
    
    table.index(['lines_of_code']);
    table.index(['cyclomatic_complexity']);
    table.index(['readability_score']);
  });

  // Plagiarism detection patterns
  await knex.schema.createTable('plagiarism_patterns', function(table) {
    table.increments('id').primary();
    table.string('pattern_name').notNullable();
    table.text('pattern_description');
    table.string('language').notNullable();
    table.json('pattern_rules'); // Detection rules and weights
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['language']);
    table.index(['is_active']);
  });

  // Code similarity cache
  await knex.schema.createTable('similarity_cache', function(table) {
    table.increments('id').primary();
    table.string('cache_key').unique().notNullable(); // Hash of both submission IDs
    table.integer('submission1_id').references('id').inTable('submissions');
    table.integer('submission2_id').references('id').inTable('submissions');
    table.decimal('similarity_score', 5, 4).notNullable();
    table.json('similarity_details');
    table.timestamp('calculated_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');
    
    table.index(['cache_key']);
    table.index(['submission1_id']);
    table.index(['submission2_id']);
    table.index(['expires_at']);
  });

  // Plagiarism detection jobs queue
  await knex.schema.createTable('plagiarism_detection_jobs', function(table) {
    table.increments('id').primary();
    table.enum('job_type', ['single_submission', 'contest_batch', 'problem_batch']).notNullable();
    table.integer('entity_id').notNullable(); // Submission ID, Contest ID, or Problem ID
    table.json('job_parameters'); // Additional parameters for the job
    table.enum('status', ['pending', 'running', 'completed', 'failed']).defaultTo('pending');
    table.integer('progress_current').defaultTo(0);
    table.integer('progress_total').defaultTo(0);
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('created_by').references('id').inTable('admins');
    
    table.index(['job_type']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // Code fingerprints for fast similarity detection
  await knex.schema.createTable('code_fingerprints', function(table) {
    table.integer('submission_id').primary().references('id').inTable('submissions');
    table.text('structural_hash'); // Hash of code structure
    table.text('semantic_hash'); // Hash of semantic content
    table.json('token_fingerprint'); // Tokenized representation
    table.json('ast_fingerprint'); // Abstract syntax tree fingerprint
    table.integer('fingerprint_version').defaultTo(1); // For algorithm versioning
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    
    table.index(['structural_hash']);
    table.index(['semantic_hash']);
    table.index(['fingerprint_version']);
  });

  // Whitelist for allowed similarities
  await knex.schema.createTable('similarity_whitelist', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('problem_id').references('id').inTable('problems');
    table.string('pattern_type'); // template_code, boilerplate, library_function
    table.text('pattern_content'); // The whitelisted pattern
    table.text('reason'); // Why this pattern is whitelisted
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['contest_id']);
    table.index(['problem_id']);
    table.index(['pattern_type']);
    table.index(['is_active']);
  });

  // Team collaboration exemptions
  await knex.schema.createTable('collaboration_exemptions', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('team1_id').references('id').inTable('teams');
    table.integer('team2_id').references('id').inTable('teams');
    table.text('reason'); // Why these teams are allowed to collaborate
    table.boolean('is_active').defaultTo(true);
    table.integer('approved_by').references('id').inTable('admins');
    table.timestamp('approved_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');
    
    table.unique(['contest_id', 'team1_id', 'team2_id']);
    table.index(['contest_id']);
    table.index(['is_active']);
    table.index(['expires_at']);
  });

  // Plagiarism detection settings
  await knex.schema.createTable('plagiarism_detection_settings', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.decimal('similarity_threshold', 5, 4).defaultTo(0.8000);
    table.decimal('suspicious_threshold', 5, 4).defaultTo(0.6000);
    table.boolean('auto_flag_enabled').defaultTo(true);
    table.boolean('real_time_detection').defaultTo(false);
    table.json('detection_algorithms'); // Which algorithms to use
    table.json('language_specific_settings'); // Per-language settings
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['contest_id']);
    table.index(['is_active']);
  });

  // False positive reports
  await knex.schema.createTable('false_positive_reports', function(table) {
    table.increments('id').primary();
    table.integer('analysis_result_id').references('id').inTable('plagiarism_analysis_results');
    table.integer('reported_by').references('id').inTable('admins');
    table.text('report_reason');
    table.enum('status', ['pending', 'accepted', 'rejected']).defaultTo('pending');
    table.integer('reviewed_by').references('id').inTable('admins');
    table.text('review_notes');
    table.timestamp('reported_at').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    
    table.index(['analysis_result_id']);
    table.index(['status']);
    table.index(['reported_at']);
  });

  // Code clone detection results
  await knex.schema.createTable('code_clone_groups', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('problem_id').references('id').inTable('problems');
    table.enum('clone_type', ['exact', 'renamed', 'structural', 'semantic']).notNullable();
    table.decimal('similarity_score', 5, 4).notNullable();
    table.json('clone_details'); // Details about the cloned sections
    table.integer('submission_count').notNullable(); // Number of submissions in this group
    table.timestamp('detected_at').defaultTo(knex.fn.now());
    
    table.index(['contest_id']);
    table.index(['problem_id']);
    table.index(['clone_type']);
    table.index(['similarity_score']);
  });

  // Submissions in clone groups
  await knex.schema.createTable('clone_group_submissions', function(table) {
    table.integer('clone_group_id').references('id').inTable('code_clone_groups');
    table.integer('submission_id').references('id').inTable('submissions');
    table.json('clone_sections'); // Which parts of the submission are cloned
    
    table.primary(['clone_group_id', 'submission_id']);
    table.index(['clone_group_id']);
    table.index(['submission_id']);
  });
};

exports.down = async function(knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('clone_group_submissions');
  await knex.schema.dropTableIfExists('code_clone_groups');
  await knex.schema.dropTableIfExists('false_positive_reports');
  await knex.schema.dropTableIfExists('plagiarism_detection_settings');
  await knex.schema.dropTableIfExists('collaboration_exemptions');
  await knex.schema.dropTableIfExists('similarity_whitelist');
  await knex.schema.dropTableIfExists('code_fingerprints');
  await knex.schema.dropTableIfExists('plagiarism_detection_jobs');
  await knex.schema.dropTableIfExists('similarity_cache');
  await knex.schema.dropTableIfExists('plagiarism_patterns');
  await knex.schema.dropTableIfExists('code_analysis_metrics');
  await knex.schema.dropTableIfExists('plagiarism_analysis_results');
};
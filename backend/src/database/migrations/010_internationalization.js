/**
 * CS Club Hackathon Platform - Internationalization Migration
 * Phase 6.3: Multi-language support and localization
 */

exports.up = async function(knex) {
  // Supported languages
  await knex.schema.createTable('supported_languages', function(table) {
    table.string('language_code').primary(); // en, es, fr, zh, etc.
    table.string('language_name').notNullable(); // English, Spanish, French
    table.string('native_name').notNullable(); // English, Español, Français
    table.string('flag_icon'); // Flag icon or emoji
    table.enum('text_direction', ['ltr', 'rtl']).defaultTo('ltr');
    table.string('date_format').defaultTo('MM/dd/yyyy');
    table.string('time_format').defaultTo('HH:mm'); // 24h or 12h
    table.string('number_format').defaultTo('en-US'); // Locale for number formatting
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['is_active', 'sort_order']);
    table.index(['is_default']);
  });

  // Translation strings
  await knex.schema.createTable('translation_strings', function(table) {
    table.increments('id').primary();
    table.string('translation_key').notNullable(); // Hierarchical key like 'contest.title'
    table.string('language_code').references('language_code').inTable('supported_languages').notNullable();
    table.text('translation_value').notNullable();
    table.string('category').defaultTo('general'); // UI, contest, problem, etc.
    table.text('context_description'); // Description for translators
    table.json('placeholder_info'); // Information about placeholders
    table.boolean('is_active').defaultTo(true);
    table.boolean('needs_review').defaultTo(false);
    table.integer('created_by').references('id').inTable('admins');
    table.integer('updated_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['translation_key', 'language_code']);
    table.index(['language_code']);
    table.index(['category']);
    table.index(['is_active']);
    table.index(['needs_review']);
  });

  // Contest localizations
  await knex.schema.createTable('contest_localizations', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests').notNullable();
    table.string('language_code').references('language_code').inTable('supported_languages').notNullable();
    table.string('contest_name').notNullable();
    table.text('description');
    table.text('rules'); // Localized contest rules
    table.json('custom_fields'); // Additional localized fields
    table.boolean('is_active').defaultTo(true);
    table.integer('translated_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['contest_id', 'language_code']);
    table.index(['contest_id']);
    table.index(['language_code']);
    table.index(['is_active']);
  });

  // Problem localizations
  await knex.schema.createTable('problem_localizations', function(table) {
    table.increments('id').primary();
    table.integer('problem_id').references('id').inTable('problems').notNullable();
    table.string('language_code').references('language_code').inTable('supported_languages').notNullable();
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.text('input_format');
    table.text('output_format');
    table.text('sample_input');
    table.text('sample_output');
    table.text('constraints');
    table.text('explanation'); // Solution explanation
    table.json('custom_fields');
    table.boolean('is_active').defaultTo(true);
    table.integer('translated_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['problem_id', 'language_code']);
    table.index(['problem_id']);
    table.index(['language_code']);
    table.index(['is_active']);
  });

  // User language preferences
  await knex.schema.createTable('user_language_preferences', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable(); // Could be admin or team member
    table.enum('user_type', ['admin', 'team_member']).notNullable();
    table.string('preferred_language').references('language_code').inTable('supported_languages').notNullable();
    table.string('fallback_language').references('language_code').inTable('supported_languages');
    table.json('ui_preferences'); // UI-specific language preferences
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id', 'user_type']);
    table.index(['user_type']);
    table.index(['preferred_language']);
  });

  // Translation requests for community translation
  await knex.schema.createTable('translation_requests', function(table) {
    table.increments('id').primary();
    table.string('content_type').notNullable(); // contest, problem, ui
    table.integer('content_id'); // ID of the content to be translated
    table.string('source_language').references('language_code').inTable('supported_languages').notNullable();
    table.string('target_language').references('language_code').inTable('supported_languages').notNullable();
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.text('description'); // Why this translation is needed
    table.enum('status', ['pending', 'assigned', 'in_progress', 'completed', 'rejected']).defaultTo('pending');
    table.integer('requested_by').references('id').inTable('admins');
    table.integer('assigned_to').references('id').inTable('admins');
    table.text('rejection_reason');
    table.timestamp('requested_at').defaultTo(knex.fn.now());
    table.timestamp('assigned_at');
    table.timestamp('completed_at');
    table.timestamp('due_date');
    
    table.index(['content_type']);
    table.index(['status']);
    table.index(['target_language']);
    table.index(['priority']);
    table.index(['requested_at']);
  });

  // Translation workflow and approval
  await knex.schema.createTable('translation_workflow', function(table) {
    table.increments('id').primary();
    table.integer('translation_id').references('id').inTable('translation_strings').notNullable();
    table.enum('workflow_stage', ['draft', 'review', 'approved', 'published']).defaultTo('draft');
    table.integer('translator_id').references('id').inTable('admins');
    table.integer('reviewer_id').references('id').inTable('admins');
    table.integer('approver_id').references('id').inTable('admins');
    table.text('translator_notes');
    table.text('reviewer_notes');
    table.text('reviewer_feedback');
    table.timestamp('translated_at');
    table.timestamp('reviewed_at');
    table.timestamp('approved_at');
    table.timestamp('published_at');
    
    table.unique(['translation_id']);
    table.index(['workflow_stage']);
    table.index(['translator_id']);
    table.index(['reviewer_id']);
  });

  // Translation memory for reuse
  await knex.schema.createTable('translation_memory', function(table) {
    table.increments('id').primary();
    table.text('source_text').notNullable();
    table.text('target_text').notNullable();
    table.string('source_language').references('language_code').inTable('supported_languages').notNullable();
    table.string('target_language').references('language_code').inTable('supported_languages').notNullable();
    table.string('context_category'); // UI, contest, problem
    table.decimal('similarity_threshold', 3, 2).defaultTo(0.95); // For fuzzy matching
    table.integer('usage_count').defaultTo(1);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_used').defaultTo(knex.fn.now());
    
    table.index(['source_language', 'target_language']);
    table.index(['context_category']);
    table.index(['usage_count']);
  });

  // Localization assets (images, documents, etc.)
  await knex.schema.createTable('localization_assets', function(table) {
    table.increments('id').primary();
    table.string('asset_type').notNullable(); // image, document, audio, video
    table.string('asset_key').notNullable(); // Unique identifier
    table.string('language_code').references('language_code').inTable('supported_languages').notNullable();
    table.string('file_path').notNullable();
    table.string('original_filename');
    table.integer('file_size');
    table.string('mime_type');
    table.json('metadata'); // Additional asset information
    table.boolean('is_active').defaultTo(true);
    table.integer('uploaded_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['asset_key', 'language_code']);
    table.index(['asset_type']);
    table.index(['language_code']);
    table.index(['is_active']);
  });

  // Auto-translation jobs and cache
  await knex.schema.createTable('auto_translation_cache', function(table) {
    table.increments('id').primary();
    table.text('source_text').notNullable();
    table.text('translated_text');
    table.string('source_language').notNullable();
    table.string('target_language').notNullable();
    table.string('translation_service'); // google, azure, aws, etc.
    table.decimal('confidence_score', 5, 4); // Translation confidence
    table.boolean('human_reviewed').defaultTo(false);
    table.integer('reviewed_by').references('id').inTable('admins');
    table.timestamp('translated_at').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    table.timestamp('expires_at');
    
    table.index(['source_language', 'target_language']);
    table.index(['translation_service']);
    table.index(['expires_at']);
  });

  // Email templates localization
  await knex.schema.createTable('email_template_localizations', function(table) {
    table.increments('id').primary();
    table.string('template_name').notNullable(); // welcome, contest_reminder, etc.
    table.string('language_code').references('language_code').inTable('supported_languages').notNullable();
    table.string('subject').notNullable();
    table.text('body_html').notNullable();
    table.text('body_text').notNullable();
    table.json('variables_info'); // Information about template variables
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['template_name', 'language_code']);
    table.index(['template_name']);
    table.index(['language_code']);
    table.index(['is_active']);
  });

  // Add language preferences to existing tables
  await knex.schema.table('contests', function(table) {
    table.string('primary_language').references('language_code').inTable('supported_languages').defaultTo('en');
    table.json('available_languages'); // List of languages this contest supports
    table.boolean('multilingual_enabled').defaultTo(false);
  });

  await knex.schema.table('teams', function(table) {
    table.string('preferred_language').references('language_code').inTable('supported_languages');
  });

  // Insert default language
  await knex('supported_languages').insert({
    language_code: 'en',
    language_name: 'English',
    native_name: 'English',
    flag_icon: '🇺🇸',
    text_direction: 'ltr',
    date_format: 'MM/dd/yyyy',
    time_format: 'HH:mm',
    number_format: 'en-US',
    is_default: true,
    is_active: true,
    sort_order: 1,
    created_at: knex.fn.now()
  });

  // Insert some basic UI translations
  const baseTranslations = [
    { key: 'common.save', value: 'Save', category: 'ui' },
    { key: 'common.cancel', value: 'Cancel', category: 'ui' },
    { key: 'common.submit', value: 'Submit', category: 'ui' },
    { key: 'common.delete', value: 'Delete', category: 'ui' },
    { key: 'common.edit', value: 'Edit', category: 'ui' },
    { key: 'contest.title', value: 'Contest', category: 'contest' },
    { key: 'contest.description', value: 'Description', category: 'contest' },
    { key: 'contest.start_time', value: 'Start Time', category: 'contest' },
    { key: 'contest.duration', value: 'Duration', category: 'contest' },
    { key: 'problem.title', value: 'Problem', category: 'problem' },
    { key: 'problem.statement', value: 'Problem Statement', category: 'problem' },
    { key: 'submission.code', value: 'Source Code', category: 'submission' },
    { key: 'submission.language', value: 'Language', category: 'submission' },
    { key: 'submission.verdict', value: 'Verdict', category: 'submission' }
  ];

  for (const translation of baseTranslations) {
    await knex('translation_strings').insert({
      translation_key: translation.key,
      language_code: 'en',
      translation_value: translation.value,
      category: translation.category,
      is_active: true,
      created_at: knex.fn.now()
    });
  }
};

exports.down = async function(knex) {
  // Remove columns from existing tables
  await knex.schema.table('teams', function(table) {
    table.dropColumn('preferred_language');
  });

  await knex.schema.table('contests', function(table) {
    table.dropColumn('primary_language');
    table.dropColumn('available_languages');
    table.dropColumn('multilingual_enabled');
  });

  // Drop internationalization tables
  await knex.schema.dropTableIfExists('email_template_localizations');
  await knex.schema.dropTableIfExists('auto_translation_cache');
  await knex.schema.dropTableIfExists('localization_assets');
  await knex.schema.dropTableIfExists('translation_memory');
  await knex.schema.dropTableIfExists('translation_workflow');
  await knex.schema.dropTableIfExists('translation_requests');
  await knex.schema.dropTableIfExists('user_language_preferences');
  await knex.schema.dropTableIfExists('problem_localizations');
  await knex.schema.dropTableIfExists('contest_localizations');
  await knex.schema.dropTableIfExists('translation_strings');
  await knex.schema.dropTableIfExists('supported_languages');
};
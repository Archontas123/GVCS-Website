/**
 * CS Club Hackathon Platform - Team Collaboration Features Migration
 * Phase 6.3: Team communication and collaboration tools
 */

exports.up = async function(knex) {
  // Team workspaces
  await knex.schema.createTable('team_workspaces', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('team_id').references('id').inTable('teams');
    table.string('name').notNullable();
    table.text('description');
    table.json('settings');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_activity');
    
    table.unique(['contest_id', 'team_id']);
    table.index(['is_active']);
  });

  // Chat rooms
  await knex.schema.createTable('chat_rooms', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests');
    table.integer('team_id').references('id').inTable('teams');
    table.integer('workspace_id').references('id').inTable('team_workspaces');
    table.string('room_name').notNullable();
    table.enum('room_type', ['team_private', 'contest_public', 'workspace', 'direct_message']).defaultTo('team_private');
    table.json('settings');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_activity');
    
    table.index(['contest_id']);
    table.index(['team_id']);
    table.index(['room_type']);
    table.index(['is_active']);
  });

  // Chat participants
  await knex.schema.createTable('chat_participants', function(table) {
    table.increments('id').primary();
    table.integer('room_id').references('id').inTable('chat_rooms');
    table.integer('user_id');
    table.enum('user_type', ['team_member', 'admin', 'moderator']).defaultTo('team_member');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('last_active');
    
    table.unique(['room_id', 'user_id']);
    table.index(['room_id']);
    table.index(['user_id']);
    table.index(['is_active']);
  });

  // Chat messages
  await knex.schema.createTable('chat_messages', function(table) {
    table.increments('id').primary();
    table.integer('room_id').references('id').inTable('chat_rooms');
    table.integer('sender_id');
    table.enum('message_type', ['text', 'code_snippet', 'file_share', 'system', 'collaboration_start']).defaultTo('text');
    table.text('content').notNullable();
    table.json('metadata');
    table.boolean('is_deleted').defaultTo(false);
    table.boolean('is_edited').defaultTo(false);
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.timestamp('edited_at');
    table.timestamp('deleted_at');
    
    table.index(['room_id', 'sent_at']);
    table.index(['sender_id']);
    table.index(['message_type']);
    table.index(['is_deleted']);
  });

  // Code snippets
  await knex.schema.createTable('code_snippets', function(table) {
    table.string('id').primary(); // UUID
    table.integer('room_id').references('id').inTable('chat_rooms');
    table.integer('shared_by');
    table.string('title').notNullable();
    table.string('language').defaultTo('text');
    table.text('code').notNullable();
    table.text('description');
    table.boolean('is_public').defaultTo(false);
    table.integer('view_count').defaultTo(0);
    table.json('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['room_id']);
    table.index(['shared_by']);
    table.index(['language']);
    table.index(['is_public']);
    table.index(['created_at']);
  });

  // Collaborative coding sessions
  await knex.schema.createTable('collaborative_sessions', function(table) {
    table.string('id').primary(); // UUID
    table.integer('room_id').references('id').inTable('chat_rooms');
    table.integer('initiator_id');
    table.string('title').notNullable();
    table.string('language').defaultTo('cpp');
    table.text('initial_code');
    table.text('current_code');
    table.json('settings');
    table.boolean('is_active').defaultTo(true);
    table.integer('last_modified_by');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_modified');
    table.timestamp('ended_at');
    
    table.index(['room_id']);
    table.index(['initiator_id']);
    table.index(['is_active']);
    table.index(['created_at']);
  });

  // Collaborative session participants
  await knex.schema.createTable('collaboration_participants', function(table) {
    table.increments('id').primary();
    table.string('session_id').references('id').inTable('collaborative_sessions');
    table.integer('user_id');
    table.boolean('is_active').defaultTo(true);
    table.json('permissions'); // read, write, execute
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('last_active');
    table.timestamp('left_at');
    
    table.unique(['session_id', 'user_id']);
    table.index(['session_id']);
    table.index(['user_id']);
    table.index(['is_active']);
  });

  // Code change history for collaborative sessions
  await knex.schema.createTable('collaboration_history', function(table) {
    table.increments('id').primary();
    table.string('session_id').references('id').inTable('collaborative_sessions');
    table.integer('user_id');
    table.json('changes'); // Operational transform data
    table.text('resulting_code');
    table.timestamp('applied_at').defaultTo(knex.fn.now());
    
    table.index(['session_id', 'applied_at']);
    table.index(['user_id']);
  });

  // Shared files
  await knex.schema.createTable('shared_files', function(table) {
    table.increments('id').primary();
    table.integer('room_id').references('id').inTable('chat_rooms');
    table.integer('message_id').references('id').inTable('chat_messages');
    table.string('file_id').notNullable();
    table.string('file_name').notNullable();
    table.integer('file_size');
    table.string('mime_type');
    table.string('file_path');
    table.integer('download_count').defaultTo(0);
    table.boolean('is_deleted').defaultTo(false);
    table.timestamp('shared_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');
    
    table.index(['room_id']);
    table.index(['file_id']);
    table.index(['shared_at']);
    table.index(['is_deleted']);
  });

  // Team member roles and permissions
  await knex.schema.createTable('team_members', function(table) {
    table.increments('id').primary();
    table.integer('team_id').references('id').inTable('teams');
    table.integer('user_id');
    table.string('username').notNullable();
    table.string('email');
    table.enum('role', ['member', 'leader', 'captain']).defaultTo('member');
    table.json('permissions');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('last_active');
    
    table.unique(['team_id', 'user_id']);
    table.unique(['team_id', 'username']);
    table.index(['team_id']);
    table.index(['user_id']);
    table.index(['role']);
    table.index(['is_active']);
  });

  // Team notifications
  await knex.schema.createTable('team_notifications', function(table) {
    table.increments('id').primary();
    table.integer('team_id').references('id').inTable('teams');
    table.integer('user_id');
    table.string('title').notNullable();
    table.text('content');
    table.enum('type', ['info', 'warning', 'success', 'error', 'system']).defaultTo('info');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.json('metadata');
    table.boolean('is_read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('read_at');
    table.timestamp('expires_at');
    
    table.index(['team_id']);
    table.index(['user_id']);
    table.index(['type']);
    table.index(['priority']);
    table.index(['is_read']);
    table.index(['created_at']);
  });

  // Voice/video call sessions
  await knex.schema.createTable('call_sessions', function(table) {
    table.increments('id').primary();
    table.integer('room_id').references('id').inTable('chat_rooms');
    table.integer('initiated_by');
    table.enum('call_type', ['voice', 'video', 'screen_share']).defaultTo('voice');
    table.string('session_token');
    table.json('settings');
    table.enum('status', ['active', 'ended', 'failed']).defaultTo('active');
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('ended_at');
    table.integer('duration'); // in seconds
    
    table.index(['room_id']);
    table.index(['initiated_by']);
    table.index(['status']);
    table.index(['started_at']);
  });

  // Call participants
  await knex.schema.createTable('call_participants', function(table) {
    table.increments('id').primary();
    table.integer('call_id').references('id').inTable('call_sessions');
    table.integer('user_id');
    table.boolean('audio_enabled').defaultTo(true);
    table.boolean('video_enabled').defaultTo(false);
    table.boolean('screen_sharing').defaultTo(false);
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('left_at');
    
    table.unique(['call_id', 'user_id']);
    table.index(['call_id']);
    table.index(['user_id']);
  });

  // Whiteboard sessions
  await knex.schema.createTable('whiteboard_sessions', function(table) {
    table.increments('id').primary();
    table.integer('room_id').references('id').inTable('chat_rooms');
    table.integer('created_by');
    table.string('title').notNullable();
    table.json('canvas_data'); // Drawing data
    table.json('settings');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_modified');
    
    table.index(['room_id']);
    table.index(['created_by']);
    table.index(['is_active']);
  });

  // Whiteboard changes history
  await knex.schema.createTable('whiteboard_changes', function(table) {
    table.increments('id').primary();
    table.integer('whiteboard_id').references('id').inTable('whiteboard_sessions');
    table.integer('user_id');
    table.enum('action', ['draw', 'erase', 'move', 'resize', 'add_text', 'clear']).notNullable();
    table.json('change_data');
    table.timestamp('applied_at').defaultTo(knex.fn.now());
    
    table.index(['whiteboard_id', 'applied_at']);
    table.index(['user_id']);
  });

  // Add collaboration features to existing tables
  await knex.schema.table('teams', function(table) {
    table.json('collaboration_settings');
    table.boolean('allow_chat').defaultTo(true);
    table.boolean('allow_code_sharing').defaultTo(true);
    table.boolean('allow_voice_calls').defaultTo(false);
    table.boolean('allow_screen_sharing').defaultTo(false);
    table.integer('max_members').defaultTo(5);
  });

  // Add team workspace reference to contests
  await knex.schema.table('contests', function(table) {
    table.boolean('enable_team_collaboration').defaultTo(false);
    table.json('collaboration_settings');
  });
};

exports.down = async function(knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.table('contests', function(table) {
    table.dropColumn('enable_team_collaboration');
    table.dropColumn('collaboration_settings');
  });

  await knex.schema.table('teams', function(table) {
    table.dropColumn('collaboration_settings');
    table.dropColumn('allow_chat');
    table.dropColumn('allow_code_sharing');
    table.dropColumn('allow_voice_calls');
    table.dropColumn('allow_screen_sharing');
    table.dropColumn('max_members');
  });

  await knex.schema.dropTableIfExists('whiteboard_changes');
  await knex.schema.dropTableIfExists('whiteboard_sessions');
  await knex.schema.dropTableIfExists('call_participants');
  await knex.schema.dropTableIfExists('call_sessions');
  await knex.schema.dropTableIfExists('team_notifications');
  await knex.schema.dropTableIfExists('team_members');
  await knex.schema.dropTableIfExists('shared_files');
  await knex.schema.dropTableIfExists('collaboration_history');
  await knex.schema.dropTableIfExists('collaboration_participants');
  await knex.schema.dropTableIfExists('collaborative_sessions');
  await knex.schema.dropTableIfExists('code_snippets');
  await knex.schema.dropTableIfExists('chat_messages');
  await knex.schema.dropTableIfExists('chat_participants');
  await knex.schema.dropTableIfExists('chat_rooms');
  await knex.schema.dropTableIfExists('team_workspaces');
};
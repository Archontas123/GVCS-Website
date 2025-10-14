/**
 * Update teams table to match team routes expectations
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('teams', function(table) {
    // Add columns expected by team routes
    table.string('contest_code');
    table.string('school_name');
    table.text('member_names'); // JSON string
    table.string('session_token');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_activity').defaultTo(knex.fn.now());

    // Drop contest_id foreign key if it exists since we're using contest_code instead
    table.dropForeign(['contest_id'], 'teams_contest_id_foreign');
    table.dropColumn('contest_id');

    // Rename columns to match expected structure
    table.renameColumn('school', 'school_name_old');
    table.renameColumn('last_login', 'last_activity_old');

    // Add index for contest_code and team_name combination
    table.index(['contest_code', 'team_name']);
    table.index(['session_token']);
    table.index(['is_active']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('teams', function(table) {
    // Remove added columns
    table.dropColumn('contest_code');
    table.dropColumn('school_name');
    table.dropColumn('member_names');
    table.dropColumn('session_token');
    table.dropColumn('is_active');
    table.dropColumn('last_activity');

    // Add back contest_id
    table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');

    // Rename columns back
    table.renameColumn('school_name_old', 'school');
    table.renameColumn('last_activity_old', 'last_login');
  });
};
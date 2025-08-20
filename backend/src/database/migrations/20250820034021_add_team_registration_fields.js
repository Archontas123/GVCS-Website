/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('teams', function(table) {
    // Add password hash for team authentication
    table.string('password_hash', 255);
    
    // Add school name
    table.string('school_name', 100);
    
    // Add member names (JSON array of last names)
    table.json('member_names');
    
    // Add indexes for new fields
    table.index(['school_name']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('teams', function(table) {
    table.dropColumn('password_hash');
    table.dropColumn('school_name');
    table.dropColumn('member_names');
    table.dropIndex(['school_name']);
  });
};
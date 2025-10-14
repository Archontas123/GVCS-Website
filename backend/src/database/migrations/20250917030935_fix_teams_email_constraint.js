/**
 * Fix teams table email constraint
 * Remove NOT NULL constraint from email column since the new registration system
 * doesn't require email (uses member_names array instead)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('teams', function(table) {
    // Remove NOT NULL constraint from email column
    table.string('email').nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('teams', function(table) {
    // Restore NOT NULL constraint to email column
    table.string('email').notNullable().alter();
  });
};

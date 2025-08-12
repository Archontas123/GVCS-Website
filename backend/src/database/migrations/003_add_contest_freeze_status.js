/**
 * Add freeze status fields to contests table - Phase 2.1
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('contests', function(table) {
    table.boolean('is_frozen').defaultTo(false);
    table.timestamp('frozen_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('contests', function(table) {
    table.dropColumn('is_frozen');
    table.dropColumn('frozen_at');
  });
};
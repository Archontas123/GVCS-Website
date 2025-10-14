/**
 * Rename verdict column to status for consistency
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('submissions', function(table) {
    table.renameColumn('verdict', 'status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('submissions', function(table) {
    table.renameColumn('status', 'verdict');
  });
};

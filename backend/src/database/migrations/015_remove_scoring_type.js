/**
 * Remove scoring_type column - Convert to hackathon-only scoring
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Remove scoring_type column since we only use hackathon scoring now
    .table('contests', function(table) {
      table.dropColumn('scoring_type');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    // Re-add scoring_type column if rollback is needed
    .table('contests', function(table) {
      table.enum('scoring_type', ['hackathon']).defaultTo('hackathon');
    });
};
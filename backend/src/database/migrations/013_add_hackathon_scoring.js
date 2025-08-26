/**
 * Add hackathon scoring support - points-based system
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Add total_points column to contest_results table
    .table('contest_results', function(table) {
      table.integer('total_points').defaultTo(0).notNullable();
      table.index(['total_points']); // Index for fast sorting by points
    })
    
    // Add points_value column to problems table for custom point values
    .table('problems', function(table) {
      table.integer('points_value').defaultTo(100); // Base points for solving
    })
    
    // Add scoring_type to contests table (hackathon scoring only)
    .table('contests', function(table) {
      table.enum('scoring_type', ['hackathon']).defaultTo('hackathon');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .table('contest_results', function(table) {
      table.dropIndex(['total_points']);
      table.dropColumn('total_points');
    })
    .table('problems', function(table) {
      table.dropColumn('points_value');
    })
    .table('contests', function(table) {
      table.dropColumn('scoring_type');
    });
};
/**
 * Create balloons table for virtual balloon system - Phase 3.5
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('balloons', function(table) {
    table.increments('id').primary();
    table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');
    table.integer('team_id').references('id').inTable('teams').onDelete('CASCADE');
    table.integer('problem_id').references('id').inTable('problems').onDelete('CASCADE');
    table.string('color', 20).notNullable(); // red, blue, green, yellow, orange, purple, etc.
    table.timestamp('awarded_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['contest_id']);
    table.index(['team_id']);
    table.index(['problem_id']);
    table.index(['contest_id', 'problem_id']); // For first solve queries
    table.index(['contest_id', 'team_id']); // For team balloon queries
    
    // Unique constraint: only one balloon per problem per contest
    table.unique(['contest_id', 'problem_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('balloons');
};
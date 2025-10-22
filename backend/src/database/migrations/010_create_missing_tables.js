/**
 * Create missing tables: contest_results and team_contests
 * These tables are required for team registration and leaderboard functionality
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Create contest_results table for tracking team performance
    .createTable('contest_results', function(table) {
      table.increments('id').primary();
      table.integer('contest_id').unsigned().notNullable();
      table.integer('team_id').unsigned().notNullable();
      table.integer('problems_solved').defaultTo(0);
      table.integer('penalty_time').defaultTo(0);
      table.integer('total_score').defaultTo(0);
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Foreign keys
      table.foreign('contest_id').references('id').inTable('contests').onDelete('CASCADE');
      table.foreign('team_id').references('id').inTable('teams').onDelete('CASCADE');

      // Unique constraint: one result per team per contest
      table.unique(['contest_id', 'team_id']);

      // Indexes for performance
      table.index('contest_id');
      table.index('team_id');
      table.index(['contest_id', 'problems_solved', 'penalty_time']);
    })
    // Create team_contests table for many-to-many relationship
    .createTable('team_contests', function(table) {
      table.increments('id').primary();
      table.integer('team_id').unsigned().notNullable();
      table.integer('contest_id').unsigned().notNullable();
      table.timestamp('joined_at').defaultTo(knex.fn.now());

      // Foreign keys
      table.foreign('team_id').references('id').inTable('teams').onDelete('CASCADE');
      table.foreign('contest_id').references('id').inTable('contests').onDelete('CASCADE');

      // Unique constraint: team can only join a contest once
      table.unique(['team_id', 'contest_id']);

      // Indexes
      table.index('team_id');
      table.index('contest_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('team_contests')
    .dropTableIfExists('contest_results');
};

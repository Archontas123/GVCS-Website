/**
 * Create push_subscriptions table for browser push notifications
 * Stores Web Push API subscriptions for sending notifications to teams
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('push_subscriptions', function(table) {
      table.increments('id').primary();
      table.integer('team_id').unsigned().notNullable();
      table.text('endpoint').notNullable();
      table.text('keys').notNullable(); // JSON string containing p256dh and auth keys
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Foreign key
      table.foreign('team_id').references('id').inTable('teams').onDelete('CASCADE');

      // Unique constraint: one subscription per endpoint
      table.unique(['endpoint']);

      // Index for fast team lookups
      table.index('team_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('push_subscriptions');
};

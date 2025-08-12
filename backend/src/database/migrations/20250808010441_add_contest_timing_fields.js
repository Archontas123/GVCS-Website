/**
 * Migration: Add contest timing fields - Phase 2.4
 */

exports.up = function(knex) {
  return knex.schema.alterTable('contests', function(table) {
    // Add ended timestamp
    table.timestamp('ended_at').nullable();
    
    // Add archived timestamp
    table.timestamp('archived_at').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('contests', function(table) {
    table.dropColumn('ended_at');
    table.dropColumn('archived_at');
  });
};
/**
 * Remove contest timing fields (start_time, end_time, duration, freeze_time)
 * These are no longer needed with manual contest control
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('contests', function(table) {
    table.dropColumn('start_time');
    table.dropColumn('end_time');
    table.dropColumn('duration');
    table.dropColumn('freeze_time');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('contests', function(table) {
    table.timestamp('start_time');
    table.timestamp('end_time');
    table.integer('duration');
    table.integer('freeze_time').defaultTo(0);
  });
};

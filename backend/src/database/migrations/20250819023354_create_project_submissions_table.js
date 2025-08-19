/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('project_submissions', function(table) {
    table.increments('id').primary();
    table.integer('team_id').references('id').inTable('teams').onDelete('CASCADE');
    table.integer('contest_id').references('id').inTable('contests').onDelete('CASCADE');
    table.string('project_title', 255).notNullable();
    table.text('project_description');
    table.string('original_filename', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.bigInteger('file_size').notNullable();
    table.string('mime_type', 100).defaultTo('application/zip');
    table.timestamp('submitted_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['team_id', 'contest_id']);
    table.index(['contest_id']);
    table.index(['submitted_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('project_submissions');
};

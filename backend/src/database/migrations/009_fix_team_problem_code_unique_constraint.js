/**
 * Migration: Fix team_problem_code unique constraint to include language
 *
 * Problem: The unique constraint on (team_id, problem_id) was causing code to be
 * overwritten when switching languages. Code for different languages should be
 * stored separately.
 *
 * Solution: Change unique constraint to (team_id, problem_id, language)
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if we're using SQLite or PostgreSQL/MySQL
  const client = knex.client.config.client;

  if (client === 'sqlite3') {
    // SQLite doesn't support dropping constraints directly, so we need to recreate the table
    // First, create a temporary table with the correct structure
    await knex.schema.createTable('team_problem_code_temp', function(table) {
      table.increments('id').primary();
      table.integer('team_id').references('id').inTable('teams').onDelete('CASCADE');
      table.integer('problem_id').references('id').inTable('problems').onDelete('CASCADE');
      table.text('code').defaultTo('');
      table.string('language').defaultTo('javascript');
      table.timestamp('last_updated').defaultTo(knex.fn.now());

      // New unique constraint includes language
      table.unique(['team_id', 'problem_id', 'language']);
      table.index(['team_id']);
      table.index(['problem_id']);
    });

    // Copy data from old table to new table
    // Note: This handles the case where duplicate (team_id, problem_id) exist
    // by keeping only the most recently updated record per language
    const rows = await knex('team_problem_code').select('*');

    // Group by team_id, problem_id, language and keep the most recent
    const uniqueRows = {};
    for (const row of rows) {
      const key = `${row.team_id}_${row.problem_id}_${row.language}`;
      if (!uniqueRows[key] || new Date(row.last_updated) > new Date(uniqueRows[key].last_updated)) {
        uniqueRows[key] = row;
      }
    }

    // Insert unique rows into temp table
    if (Object.keys(uniqueRows).length > 0) {
      await knex('team_problem_code_temp').insert(
        Object.values(uniqueRows).map(row => ({
          team_id: row.team_id,
          problem_id: row.problem_id,
          code: row.code,
          language: row.language,
          last_updated: row.last_updated
        }))
      );
    }

    // Drop old table
    await knex.schema.dropTable('team_problem_code');

    // Rename temp table to original name
    await knex.schema.renameTable('team_problem_code_temp', 'team_problem_code');

  } else {
    // For PostgreSQL/MySQL, we can drop and recreate the constraint
    await knex.schema.alterTable('team_problem_code', function(table) {
      // Drop the old unique constraint
      table.dropUnique(['team_id', 'problem_id']);

      // Add the new unique constraint with language
      table.unique(['team_id', 'problem_id', 'language']);
    });
  }

  console.log('✓ Fixed team_problem_code unique constraint to include language');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'sqlite3') {
    // Recreate the table with the old structure
    await knex.schema.createTable('team_problem_code_temp', function(table) {
      table.increments('id').primary();
      table.integer('team_id').references('id').inTable('teams').onDelete('CASCADE');
      table.integer('problem_id').references('id').inTable('problems').onDelete('CASCADE');
      table.text('code').defaultTo('');
      table.string('language').defaultTo('javascript');
      table.timestamp('last_updated').defaultTo(knex.fn.now());

      // Old unique constraint without language
      table.unique(['team_id', 'problem_id']);
      table.index(['team_id']);
      table.index(['problem_id']);
    });

    // Copy data
    const rows = await knex('team_problem_code').select('*');
    if (rows.length > 0) {
      await knex('team_problem_code_temp').insert(rows);
    }

    // Drop and rename
    await knex.schema.dropTable('team_problem_code');
    await knex.schema.renameTable('team_problem_code_temp', 'team_problem_code');

  } else {
    await knex.schema.alterTable('team_problem_code', function(table) {
      table.dropUnique(['team_id', 'problem_id', 'language']);
      table.unique(['team_id', 'problem_id']);
    });
  }

  console.log('✓ Reverted team_problem_code unique constraint to exclude language');
};

/**
 * Migration to support manually controlled contests.
 * - Allows contests to be created without preset start/end timestamps.
 * - Adds a manual_control flag to skip automatic scheduler actions.
 * - Permits null duration so contests can run open-ended until ended manually.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('contests', table => {
    table.boolean('manual_control').notNullable().defaultTo(true);
  });

  // Allow nullable scheduling metadata for manual contests
  await knex.raw('ALTER TABLE contests ALTER COLUMN start_time DROP NOT NULL');
  await knex.raw('ALTER TABLE contests ALTER COLUMN end_time DROP NOT NULL');
  await knex.raw('ALTER TABLE contests ALTER COLUMN duration DROP NOT NULL');

  // Ensure existing contests default to automated behaviour unless explicitly flipped
  await knex('contests')
    .whereNotNull('start_time')
    .update({ manual_control: false });
};

/**
 * Revert manual contest control changes.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  // Prevent reverting if manual contests are still relying on nullable columns
  const manualContest = await knex('contests')
    .where('manual_control', true)
    .whereNull('start_time')
    .first();

  if (manualContest) {
    throw new Error(
      'Cannot revert manual contest migration while manual contests exist. ' +
      'Please assign start_time, end_time, and duration before rolling back.'
    );
  }

  await knex.raw('ALTER TABLE contests ALTER COLUMN duration SET NOT NULL');
  await knex.raw('ALTER TABLE contests ALTER COLUMN end_time SET NOT NULL');
  await knex.raw('ALTER TABLE contests ALTER COLUMN start_time SET NOT NULL');

  await knex.schema.alterTable('contests', table => {
    table.dropColumn('manual_control');
  });
};

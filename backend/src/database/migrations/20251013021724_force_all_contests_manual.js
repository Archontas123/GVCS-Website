/**
 * Migration to force all contests to use manual control.
 * - Sets all existing contests to manual_control = true
 * - Disables automatic contest scheduling in favor of admin-controlled start/end
 * - Contests must now be manually started and ended via admin API
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  // Set all existing contests to manual control
  await knex('contests')
    .update({ manual_control: true });

  console.log('✓ All contests migrated to manual control');
};

/**
 * Revert all contests back to scheduled mode (based on start_time presence)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  // Revert to scheduled mode for contests that have a start_time
  await knex('contests')
    .whereNotNull('start_time')
    .update({ manual_control: false });

  console.log('✓ Contests with start_time reverted to scheduled mode');
};

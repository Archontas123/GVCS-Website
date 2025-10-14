/**
 * Add first_name and last_name fields for team members
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('teams', function(table) {
    // Add first name fields
    table.string('member1_first_name');
    table.string('member2_first_name');
    table.string('member3_first_name');

    // Add last name fields
    table.string('member1_last_name');
    table.string('member2_last_name');
    table.string('member3_last_name');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('teams', function(table) {
    table.dropColumn('member1_first_name');
    table.dropColumn('member2_first_name');
    table.dropColumn('member3_first_name');
    table.dropColumn('member1_last_name');
    table.dropColumn('member2_last_name');
    table.dropColumn('member3_last_name');
  });
};

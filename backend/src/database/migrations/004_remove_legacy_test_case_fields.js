/**
 * Migration: Remove legacy test case fields
 *
 * This migration removes the legacy fields from test_cases table that are no longer used:
 * - input (text field for legacy string-based input)
 * - expected_output (text field for legacy string-based output)
 *
 * The new system uses:
 * - input_parameters (jsonb field for structured input parameters)
 * - expected_return (jsonb field for expected return value)
 * - parameter_types (jsonb field for parameter type definitions)
 * - test_case_name (text field for test case name)
 * - explanation (text field for explanation)
 */

exports.up = function(knex) {
  return knex.schema
    .alterTable('test_cases', function(table) {
      // Remove legacy fields
      table.dropColumn('input');
      table.dropColumn('expected_output');
    })
    .then(() => {
      console.log('✅ Removed legacy test case fields: input, expected_output');
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('test_cases', function(table) {
      // Restore legacy fields for rollback
      table.text('input').notNullable().defaultTo('');
      table.text('expected_output').notNullable().defaultTo('');
    })
    .then(() => {
      console.log('⚠️  Restored legacy test case fields: input, expected_output');
      console.log('⚠️  Warning: Data in these fields will be empty after rollback!');
    });
};
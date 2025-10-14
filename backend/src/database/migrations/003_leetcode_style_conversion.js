/**
 * Migration to convert system from STDIN/STDOUT to LeetCode-style function-based execution
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Update problems table for LeetCode-style support
    .alterTable('problems', function(table) {
      // Function signatures for each language
      table.text('function_signature_cpp');
      table.text('function_signature_java');
      table.text('function_signature_python');
      table.text('function_signature_javascript');

      // I/O wrapper templates for each language
      table.text('io_wrapper_cpp');
      table.text('io_wrapper_java');
      table.text('io_wrapper_python');
      table.text('io_wrapper_javascript');

      // Default solution templates for each language
      table.text('default_solution_cpp');
      table.text('default_solution_java');
      table.text('default_solution_python');
      table.text('default_solution_javascript');

      // Function metadata
      table.text('function_name').defaultTo('solution');
      table.jsonb('function_parameters').defaultTo('[]');
      table.string('return_type').defaultTo('int');
      table.text('parameter_descriptions').defaultTo('');

      // Migration flags
      table.boolean('uses_leetcode_style').defaultTo(true);
      table.boolean('migration_completed').defaultTo(false);
    })

    // Update test_cases table for parameter-based testing
    .alterTable('test_cases', function(table) {
      // New LeetCode-style fields
      table.jsonb('input_parameters').defaultTo('[]');
      table.jsonb('expected_return');
      table.jsonb('parameter_types').defaultTo('[]');
      table.text('test_case_name');
      table.text('explanation');

      // Migration flags
      table.boolean('converted_to_params').defaultTo(false);
    })

    // Update team_problem_code table for function-only code storage
    .alterTable('team_problem_code', function(table) {
      table.boolean('is_function_only').defaultTo(true);
      table.text('full_executable_code'); // For debugging/admin view
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('problems', function(table) {
      table.dropColumn('function_signature_cpp');
      table.dropColumn('function_signature_java');
      table.dropColumn('function_signature_python');
      table.dropColumn('function_signature_javascript');
      table.dropColumn('io_wrapper_cpp');
      table.dropColumn('io_wrapper_java');
      table.dropColumn('io_wrapper_python');
      table.dropColumn('io_wrapper_javascript');
      table.dropColumn('default_solution_cpp');
      table.dropColumn('default_solution_java');
      table.dropColumn('default_solution_python');
      table.dropColumn('default_solution_javascript');
      table.dropColumn('function_name');
      table.dropColumn('function_parameters');
      table.dropColumn('return_type');
      table.dropColumn('parameter_descriptions');
      table.dropColumn('uses_leetcode_style');
      table.dropColumn('migration_completed');
    })
    .alterTable('test_cases', function(table) {
      table.dropColumn('input_parameters');
      table.dropColumn('expected_return');
      table.dropColumn('parameter_types');
      table.dropColumn('test_case_name');
      table.dropColumn('explanation');
      table.dropColumn('converted_to_params');
    })
    .alterTable('team_problem_code', function(table) {
      table.dropColumn('is_function_only');
      table.dropColumn('full_executable_code');
    });
};
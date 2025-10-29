/**
 * Migration: Remove External Library IO Wrappers
 *
 * Clears io_wrapper fields that depend on external libraries (Gson, nlohmann/json)
 * to allow the backend's dynamic parsing system to generate dependency-free wrappers.
 *
 * Changes:
 * - Removes io_wrapper_cpp that contains 'nlohmann/json.hpp'
 * - Removes io_wrapper_java that contains 'com.google.gson'
 * - Backend will use default wrappers with manual JSON parsing (no external dependencies)
 */

exports.up = async function(knex) {
  console.log('Starting removal of external library IO wrappers...');

  // Get all problems with io_wrappers
  const problems = await knex('problems').select(
    'id',
    'title',
    'io_wrapper_cpp',
    'io_wrapper_java',
    'io_wrapper_python'
  );

  let cppCleared = 0;
  let javaCleared = 0;

  for (const problem of problems) {
    const updates = {};

    // Clear C++ wrapper if it uses nlohmann/json
    if (problem.io_wrapper_cpp && problem.io_wrapper_cpp.includes('nlohmann/json')) {
      updates.io_wrapper_cpp = null;
      cppCleared++;
    }

    // Clear Java wrapper if it uses Gson
    if (problem.io_wrapper_java && problem.io_wrapper_java.includes('com.google.gson')) {
      updates.io_wrapper_java = null;
      javaCleared++;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await knex('problems')
        .where('id', problem.id)
        .update(updates);

      console.log(`  Updated problem ${problem.id} (${problem.title}): cleared ${Object.keys(updates).join(', ')}`);
    }
  }

  console.log(`\nMigration completed:`);
  console.log(`  - Cleared ${cppCleared} C++ wrappers (nlohmann/json dependency)`);
  console.log(`  - Cleared ${javaCleared} Java wrappers (Gson dependency)`);
  console.log(`  - Backend will now use dynamic parsing without external dependencies`);
};

exports.down = async function(knex) {
  console.log('Rollback not supported for external library wrapper removal.');
  console.log('Original io_wrapper templates cannot be automatically restored.');
  console.log('Please restore from database backup if needed, or manually set io_wrapper fields.');

  throw new Error('Rollback not supported - restore from backup if needed');
};

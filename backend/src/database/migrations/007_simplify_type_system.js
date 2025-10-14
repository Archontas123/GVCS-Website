/**
 * Migration: Simplify Type System
 *
 * Converts composite types (array_integer, matrix_integer, etc.) to base types (integer, string, etc.)
 * with automatic dimensionality detection from JSON structure.
 *
 * Changes:
 * - array_integer, matrix_integer, vector<int>, int[] → integer
 * - array_string, matrix_string, vector<string>, string[] → string
 * - array_float, double[], vector<double> → float
 * - array_boolean, bool[] → boolean
 */

/**
 * Simplifies a composite type to its base type
 * @param {string} type - The type to simplify
 * @returns {string} The simplified base type
 */
function simplifyType(type) {
  if (!type) return 'integer'; // Default fallback

  const lowerType = type.toLowerCase();

  // Integer types
  if (lowerType.includes('int') || lowerType.includes('long')) {
    return 'integer';
  }

  // String types
  if (lowerType.includes('string')) {
    return 'string';
  }

  // Float/Double types
  if (lowerType.includes('float') || lowerType.includes('double')) {
    return 'float';
  }

  // Boolean types
  if (lowerType.includes('bool')) {
    return 'boolean';
  }

  // Character types
  if (lowerType === 'char' || lowerType === 'character') {
    return 'character';
  }

  // Default to integer for unknown types
  console.warn(`Unknown type "${type}", defaulting to "integer"`);
  return 'integer';
}

exports.up = async function(knex) {
  console.log('Starting type system simplification migration...');

  // 1. Update test_cases.parameter_types
  console.log('Updating test cases parameter_types...');
  const testCases = await knex('test_cases').select('id', 'parameter_types');

  let testCasesUpdated = 0;
  for (const tc of testCases) {
    if (tc.parameter_types) {
      try {
        const paramTypes = typeof tc.parameter_types === 'string'
          ? JSON.parse(tc.parameter_types)
          : tc.parameter_types;

        if (Array.isArray(paramTypes)) {
          const simplified = paramTypes.map(pt => ({
            name: pt.name,
            type: simplifyType(pt.type)
          }));

          await knex('test_cases')
            .where('id', tc.id)
            .update({
              parameter_types: JSON.stringify(simplified)
            });

          testCasesUpdated++;
        }
      } catch (error) {
        console.error(`Failed to update test case ${tc.id}:`, error.message);
      }
    }
  }
  console.log(`Updated ${testCasesUpdated} test cases`);

  // 2. Update problems.function_parameters and return_type
  console.log('Updating problems function_parameters and return_type...');
  const problems = await knex('problems').select('id', 'function_parameters', 'return_type');

  let problemsUpdated = 0;
  for (const problem of problems) {
    const updates = {};

    // Update function_parameters
    if (problem.function_parameters) {
      try {
        const params = typeof problem.function_parameters === 'string'
          ? JSON.parse(problem.function_parameters)
          : problem.function_parameters;

        if (Array.isArray(params)) {
          const simplified = params.map(p => ({
            ...p,
            type: simplifyType(p.type)
          }));

          updates.function_parameters = JSON.stringify(simplified);
        }
      } catch (error) {
        console.error(`Failed to update problem ${problem.id} parameters:`, error.message);
      }
    }

    // Update return_type
    if (problem.return_type) {
      updates.return_type = simplifyType(problem.return_type);
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await knex('problems')
        .where('id', problem.id)
        .update(updates);

      problemsUpdated++;
    }
  }
  console.log(`Updated ${problemsUpdated} problems`);

  console.log('Type system simplification migration completed successfully!');
};

exports.down = async function(knex) {
  console.log('Rollback not supported for type system simplification.');
  console.log('Original type information (array dimensions) cannot be recovered from simplified types.');
  console.log('Please restore from database backup if needed.');

  throw new Error('Rollback not supported - restore from backup if needed');
};

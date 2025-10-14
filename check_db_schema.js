const knex = require('knex');
const config = require('./backend/src/config/database');

const db = knex(config.development);

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...');

    // Check if the LeetCode fields exist in the problems table
    const problemsSchema = await db.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'problems' AND column_name LIKE '%function%' OR table_name = 'problems' AND column_name LIKE '%leetcode%'");

    console.log('\n📊 LeetCode-related columns in problems table:');
    console.log(problemsSchema.rows.map(row => row.column_name));

    // Get a sample problem to see what fields are actually stored
    const problem = await db('problems').where('id', 1).first();

    console.log('\n🎯 Sample problem data:');
    console.log('Function Name:', problem?.function_name);
    console.log('Uses LeetCode Style:', problem?.uses_leetcode_style);
    console.log('Return Type:', problem?.return_type);
    console.log('Python Signature exists:', !!problem?.function_signature_python);

    if (problem?.function_signature_python) {
      console.log('\n📝 Python Function Signature:');
      console.log(problem.function_signature_python);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkSchema();
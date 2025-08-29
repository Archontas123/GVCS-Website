/**
 * Update existing database with LeetCode-style columns
 */

async function updateDatabase() {
  let db;
  
  try {
    console.log('🔧 Updating database with LeetCode-style columns...\n');
    
    // Import database connection
    const { db: database } = require('./backend/src/utils/db');
    db = database;
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Check current schema
    console.log('\n🔍 Checking current problems table schema...');
    const hasLeetCodeCols = await db.schema.hasColumn('problems', 'function_signature_cpp');
    
    if (hasLeetCodeCols) {
      console.log('✅ LeetCode columns already exist');
    } else {
      console.log('⚠️  LeetCode columns not found, adding them...');
      
      // Check and add each column individually
      const columnsToAdd = [
        { name: 'function_signature_cpp', value: `int solution(vector<int>& nums) {\n    // Your solution here\n    return 0;\n}` },
        { name: 'function_signature_java', value: `public int solution(int[] nums) {\n    // Your solution here\n    return 0;\n}` },
        { name: 'function_signature_python', value: `def solution(nums):\n    # Your solution here\n    return 0` },
        { name: 'io_wrapper_cpp', value: `#include <iostream>\n#include <vector>\nusing namespace std;\n\n{USER_FUNCTION}\n\nint main() {\n    return 0;\n}` },
        { name: 'io_wrapper_java', value: `import java.util.*;\n\npublic class Solution {\n    {USER_FUNCTION}\n    \n    public static void main(String[] args) {\n    }\n}` },
        { name: 'io_wrapper_python', value: `{USER_FUNCTION}\n\nif __name__ == "__main__":\n    pass` },
        { name: 'input_format', value: '{}' },
        { name: 'output_format', value: '0' },
        { name: 'default_solution_cpp', value: '// Your solution here\nreturn 0;' },
        { name: 'default_solution_java', value: '// Your solution here\nreturn 0;' },
        { name: 'default_solution_python', value: '# Your solution here\nreturn 0' }
      ];
      
      for (const col of columnsToAdd) {
        const hasColumn = await db.schema.hasColumn('problems', col.name);
        if (!hasColumn) {
          await db.schema.alterTable('problems', function(table) {
            table.text(col.name).defaultTo(col.value);
          });
          console.log(`✅ Added column: ${col.name}`);
        } else {
          console.log(`ℹ️  Column already exists: ${col.name}`);
        }
      }
    }
    
    // Check for team_problem_code table
    const hasCodeTable = await db.schema.hasTable('team_problem_code');
    
    if (hasCodeTable) {
      console.log('✅ team_problem_code table already exists');
    } else {
      console.log('⚠️  team_problem_code table not found, creating...');
      
      await db.schema.createTable('team_problem_code', function(table) {
        table.increments('id').primary();
        table.integer('team_id').unsigned().notNullable();
        table.integer('problem_id').unsigned().notNullable();
        table.string('language', 20).notNullable();
        table.text('code').notNullable();
        table.timestamp('saved_at').defaultTo(db.fn.now());
        table.timestamp('created_at').defaultTo(db.fn.now());
        
        table.unique(['team_id', 'problem_id', 'language']);
        
        // Add indexes
        table.index(['team_id', 'problem_id']);
        table.index('language');
      });
      
      console.log('✅ Created team_problem_code table');
    }
    
    // Test the codeTemplateService
    console.log('\n🧪 Testing codeTemplateService...');
    const codeTemplateService = require('./backend/src/services/codeTemplateService');
    
    const javaDefault = codeTemplateService.getDefaultSignature('java');
    console.log('✅ Code template service working');
    console.log('📝 Java default signature:');
    console.log(javaDefault);
    
    console.log('\n🎉 Database update complete!');
    console.log('\n📋 What\'s ready:');
    console.log('✅ LeetCode columns added to problems table');
    console.log('✅ team_problem_code table created');
    console.log('✅ Code template service working');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Start backend: npm run dev:backend');
    console.log('2. Add API endpoints for function signatures');
    console.log('3. Update frontend code editor');
    console.log('4. Test with admin interface');
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Make sure you\'re in the project root directory');
    console.log('2. Check that backend/src/database/contest.db exists');
    console.log('3. Verify database configuration in backend/src/config/database.js');
  } finally {
    if (db) {
      await db.destroy();
    }
  }
}

updateDatabase();
/**
 * Fix missing LeetCode columns
 */

async function fixMissingColumns() {
  console.log('🔧 Fixing missing LeetCode columns...\n');
  
  try {
    const { db } = require('./backend/src/utils/db');
    
    // Check and add missing default solution columns
    const missingColumns = [
      { name: 'default_solution_cpp', value: '// Your solution here\nreturn 0;' },
      { name: 'default_solution_java', value: '// Your solution here\nreturn 0;' },
      { name: 'default_solution_python', value: '# Your solution here\nreturn 0' }
    ];
    
    for (const col of missingColumns) {
      const exists = await db.schema.hasColumn('problems', col.name);
      if (!exists) {
        console.log(`Adding missing column: ${col.name}`);
        await db.schema.alterTable('problems', function(table) {
          table.text(col.name).defaultTo(col.value);
        });
        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`ℹ️  Column already exists: ${col.name}`);
      }
    }
    
    // Verify all columns are now present
    console.log('\n🔍 Verifying all LeetCode columns...');
    const allColumns = [
      'function_signature_cpp',
      'function_signature_java', 
      'function_signature_python',
      'io_wrapper_cpp',
      'io_wrapper_java',
      'io_wrapper_python',
      'input_format',
      'output_format',
      'default_solution_cpp',
      'default_solution_java',
      'default_solution_python'
    ];
    
    let allPresent = true;
    for (const col of allColumns) {
      const exists = await db.schema.hasColumn('problems', col);
      console.log(`${exists ? '✅' : '❌'} ${col}`);
      if (!exists) allPresent = false;
    }
    
    await db.destroy();
    
    if (allPresent) {
      console.log('\n🎉 All LeetCode columns are now present!');
      console.log('\n✅ LeetCode-style system is complete and ready for use!');
      console.log('\n🚀 Ready to test:');
      console.log('1. npm run dev:backend');
      console.log('2. npm run dev:frontend'); 
      console.log('3. Create problems with LeetCode-style function signatures');
    } else {
      console.log('\n❌ Some columns are still missing. Check database permissions.');
    }
    
  } catch (error) {
    console.error('❌ Failed to fix columns:', error.message);
  }
}

fixMissingColumns();
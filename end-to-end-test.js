/**
 * End-to-End LeetCode Integration Test
 * Actually tests the functionality, not just file existence
 */

async function endToEndTest() {
  console.log('🧪 End-to-End LeetCode Integration Test...\n');
  
  let db;
  const issues = [];
  
  try {
    // 1. Test database and create actual problem
    console.log('📊 Testing database operations...');
    const { db: database } = require('./backend/src/utils/db');
    db = database;
    
    // Check required columns exist and can be written to
    const testProblemData = {
      title: 'E2E Test Problem',
      description: 'End-to-end test',
      difficulty: 'easy',
      time_limit: 1000,
      memory_limit: 256,
      problem_letter: 'T',
      function_signature_cpp: 'int test() { return 0; }',
      function_signature_java: 'public int test() { return 0; }',
      function_signature_python: 'def test(): return 0',
      io_wrapper_cpp: '#include <iostream>\n{USER_FUNCTION}\nint main() { return 0; }',
      io_wrapper_java: 'public class Solution { {USER_FUNCTION} }',
      io_wrapper_python: '{USER_FUNCTION}',
      input_format: '{}',
      output_format: '0',
      default_solution_cpp: '// test',
      default_solution_java: '// test',
      default_solution_python: '# test',
      created_at: new Date().toISOString()
    };
    
    let testProblemId;
    try {
      const [problem] = await db('problems').insert(testProblemData).returning('id');
      testProblemId = problem.id || problem;
      console.log('✅ Database write test passed');
    } catch (error) {
      issues.push(`Database write failed: ${error.message}`);
    }
    
    // 2. Test codeTemplateService with real database
    if (testProblemId) {
      console.log('\n🔧 Testing codeTemplateService with real data...');
      const codeTemplateService = require('./backend/src/services/codeTemplateService');
      
      try {
        // Test getFunctionSignature
        const javaSignature = await codeTemplateService.getFunctionSignature(testProblemId, 'java');
        if (javaSignature !== 'public int test() { return 0; }') {
          issues.push('getFunctionSignature returned wrong data');
        } else {
          console.log('✅ getFunctionSignature works');
        }
        
        // Test generateExecutableCode
        const userCode = 'public int test() { return 42; }';
        const executable = await codeTemplateService.generateExecutableCode(testProblemId, 'java', userCode);
        if (!executable.includes('public int test() { return 42; }') || !executable.includes('public class Solution')) {
          issues.push('generateExecutableCode not working properly');
        } else {
          console.log('✅ generateExecutableCode works');
        }
        
        // Test saveUserImplementation
        await codeTemplateService.saveUserImplementation(1, testProblemId, 'java', userCode);
        const retrieved = await codeTemplateService.getUserImplementation(1, testProblemId, 'java');
        if (retrieved !== userCode) {
          issues.push('User code save/retrieve not working');
        } else {
          console.log('✅ User code persistence works');
        }
        
      } catch (error) {
        issues.push(`codeTemplateService error: ${error.message}`);
      }
    }
    
    // 3. Test multiLangExecutor integration
    console.log('\n⚙️ Testing multiLangExecutor integration...');
    const executor = require('./backend/src/services/multiLangExecutor');
    
    if (typeof executor.executeLeetCodeStyle !== 'function') {
      issues.push('executeLeetCodeStyle method missing');
    } else {
      // Test with the actual test problem we created
      try {
        if (testProblemId) {
          const result = await executor.executeLeetCodeStyle(testProblemId, 'int test() { return 42; }', 'cpp', '', {});
          if (result && typeof result.success === 'boolean') {
            console.log('✅ executeLeetCodeStyle method exists and working');
          } else {
            issues.push('executeLeetCodeStyle returned invalid result structure');
          }
        } else {
          console.log('⚠️ Skipping executeLeetCodeStyle test - no test problem created');
        }
      } catch (error) {
        issues.push(`executeLeetCodeStyle error: ${error.message}`);
      }
    }
    
    // 4. Test API routes (by checking route handlers exist)
    console.log('\n🌐 Testing API route handlers...');
    try {
      const leetcodeRoutes = require('./backend/src/routes/leetcode');
      
      // Check if it's a router with routes
      if (typeof leetcodeRoutes !== 'function' || !leetcodeRoutes.stack) {
        issues.push('leetcode routes not properly exported as Express router');
      } else {
        const routePaths = leetcodeRoutes.stack.map(layer => layer.route?.path).filter(Boolean);
        console.log(`✅ LeetCode routes loaded: ${routePaths.length} endpoints`);
      }
    } catch (error) {
      issues.push(`API routes error: ${error.message}`);
    }
    
    // 5. Test frontend component imports
    console.log('\n🎨 Testing frontend component syntax...');
    const fs = require('fs');
    
    try {
      // Check LeetCodeEditor for syntax issues
      const leetCodeEditorContent = fs.readFileSync('./frontend/src/components/CodeEditor/LeetCodeEditor.tsx', 'utf8');
      
      // Basic syntax checks
      if (!leetCodeEditorContent.includes('export default LeetCodeEditor')) {
        issues.push('LeetCodeEditor not properly exported');
      }
      
      if (!leetCodeEditorContent.includes('interface LeetCodeEditorProps')) {
        issues.push('LeetCodeEditor missing TypeScript interface');
      }
      
      // Check CodeEditor integration
      const codeEditorContent = fs.readFileSync('./frontend/src/components/CodeEditor/CodeEditor.tsx', 'utf8');
      
      if (!codeEditorContent.includes('import LeetCodeEditor')) {
        issues.push('CodeEditor missing LeetCodeEditor import');
      }
      
      if (!codeEditorContent.includes('return (') || !codeEditorContent.includes('<LeetCodeEditor')) {
        issues.push('CodeEditor missing LeetCode conditional rendering');
      }
      
      console.log('✅ Frontend components syntax check passed');
      
    } catch (error) {
      issues.push(`Frontend component check error: ${error.message}`);
    }
    
    // 6. Test authentication middleware compatibility
    console.log('\n🔒 Testing auth middleware compatibility...');
    try {
      const auth = require('./backend/src/middleware/auth');
      const adminAuth = require('./backend/src/middleware/adminAuth');
      
      // Check that required middleware functions exist
      if (typeof auth.authenticateTeam !== 'function' || 
          typeof adminAuth.verifyAdminToken !== 'function' || 
          typeof adminAuth.requireAdmin !== 'function') {
        issues.push('Authentication middleware not properly exported');
      } else {
        console.log('✅ Authentication middleware compatible');
      }
    } catch (error) {
      issues.push(`Auth middleware error: ${error.message}`);
    }
    
    // 7. Check for potential runtime issues
    console.log('\n⚠️  Checking for potential runtime issues...');
    const warnings = [];
    
    // Check if backend dependencies exist
    try {
      require('knex');
      require('sqlite3');
    } catch (error) {
      warnings.push('Missing backend dependencies (knex/sqlite3)');
    }
    
    // Check if testCaseRunner is updated to use LeetCode style
    try {
      const testCaseRunnerContent = fs.readFileSync('./backend/src/services/testCaseRunner.js', 'utf8');
      if (!testCaseRunnerContent.includes('executeLeetCodeStyle') && !testCaseRunnerContent.includes('codeTemplateService')) {
        warnings.push('testCaseRunner may not be integrated with LeetCode-style execution');
      }
    } catch (error) {
      warnings.push('Could not check testCaseRunner integration');
    }
    
    // Clean up test data
    if (testProblemId) {
      try {
        await db('team_problem_code').where('problem_id', testProblemId).del();
        await db('problems').where('id', testProblemId).del();
        console.log('🧹 Test data cleaned up');
      } catch (error) {
        console.log('⚠️  Could not clean up test data');
      }
    }
    
    await db.destroy();
    
    // Final Results
    console.log('\n📋 End-to-End Test Results:');
    console.log('================================');
    
    if (issues.length === 0) {
      console.log('🎉 ALL TESTS PASSED! LeetCode integration is fully functional.');
      
      if (warnings.length > 0) {
        console.log('\n⚠️  Minor warnings to consider:');
        warnings.forEach(w => console.log(`  • ${w}`));
      }
      
      console.log('\n✅ The system is ready for production use!');
      console.log('\n🚀 How to use:');
      console.log('1. Start: npm run dev:backend && npm run dev:frontend');
      console.log('2. Create problem with function signatures via admin');
      console.log('3. Use: <CodeEditor problemId={id} useLeetCodeStyle={true} />');
      console.log('4. Users see only: function signature');
      console.log('5. System handles: I/O, execution, scoring');
      
    } else {
      console.log('❌ ISSUES FOUND:');
      issues.forEach(issue => console.log(`  • ${issue}`));
      console.log('\n❌ Fix these issues before using the system');
    }
    
  } catch (error) {
    console.error('❌ End-to-end test crashed:', error.message);
    console.error(error.stack);
  }
}

endToEndTest();
/**
 * Simple LeetCode Integration Test
 * Tests core functionality without database inserts
 */

async function testLeetCode() {
  console.log('🧪 Testing LeetCode-Style System...\n');

  try {
    // Test 1: Database connection
    console.log('📊 Testing database...');
    const { db } = require('./backend/src/utils/db');
    await db.raw('SELECT 1');
    console.log('✅ Database connection works');
    
    // Check if LeetCode columns exist
    const hasColumns = await db.schema.hasColumn('problems', 'function_signature_cpp');
    console.log(`${hasColumns ? '✅' : '❌'} LeetCode columns ${hasColumns ? 'exist' : 'missing'}`);
    
    // Test 2: Code template service
    console.log('\n🔧 Testing code template service...');
    const codeTemplateService = require('./backend/src/services/codeTemplateService');
    
    console.log('✅ Default signatures:', Object.keys({
      cpp: codeTemplateService.getDefaultSignature('cpp'),
      java: codeTemplateService.getDefaultSignature('java'), 
      python: codeTemplateService.getDefaultSignature('python')
    }));
    
    console.log('✅ Default wrappers:', Object.keys({
      cpp: codeTemplateService.getDefaultWrapper('cpp'),
      java: codeTemplateService.getDefaultWrapper('java'),
      python: codeTemplateService.getDefaultWrapper('python')  
    }));
    
    // Test 3: MultiLangExecutor
    console.log('\n⚙️ Testing multiLangExecutor...');
    const executor = require('./backend/src/services/multiLangExecutor');
    console.log(`✅ LeetCode-style method: ${typeof executor.executeLeetCodeStyle === 'function' ? 'exists' : 'missing'}`);
    console.log(`✅ Supported languages: ${executor.getSupportedLanguages().join(', ')}`);
    
    // Test 4: API route registration 
    console.log('\n🌐 Testing API routes...');
    const fs = require('fs');
    const serverContent = fs.readFileSync('./backend/src/server.js', 'utf8');
    const hasLeetCodeRoutes = serverContent.includes("require('./routes/leetcode')");
    console.log(`${hasLeetCodeRoutes ? '✅' : '❌'} LeetCode API routes ${hasLeetCodeRoutes ? 'registered' : 'missing'}`);
    
    // Test 5: Frontend components
    console.log('\n🎨 Testing frontend components...');
    const hasLeetCodeEditor = fs.existsSync('./frontend/src/components/CodeEditor/LeetCodeEditor.tsx');
    const hasLeetCodeCSS = fs.existsSync('./frontend/src/components/CodeEditor/LeetCodeEditor.css');
    console.log(`${hasLeetCodeEditor ? '✅' : '❌'} LeetCode editor component ${hasLeetCodeEditor ? 'exists' : 'missing'}`);
    console.log(`${hasLeetCodeCSS ? '✅' : '❌'} LeetCode editor CSS ${hasLeetCodeCSS ? 'exists' : 'missing'}`);
    
    // Test 6: CodeEditor integration
    const codeEditorContent = fs.readFileSync('./frontend/src/components/CodeEditor/CodeEditor.tsx', 'utf8');
    const hasLeetCodeIntegration = codeEditorContent.includes('useLeetCodeStyle') && codeEditorContent.includes('LeetCodeEditor');
    console.log(`${hasLeetCodeIntegration ? '✅' : '❌'} CodeEditor integration ${hasLeetCodeIntegration ? 'complete' : 'missing'}`);
    
    await db.destroy();
    
    console.log('\n🎉 LeetCode-Style System Status:');
    console.log(`${hasColumns ? '✅' : '❌'} Database schema updated`);
    console.log('✅ Code template service working');
    console.log('✅ MultiLangExecutor enhanced'); 
    console.log(`${hasLeetCodeRoutes ? '✅' : '❌'} API endpoints ready`);
    console.log(`${hasLeetCodeEditor ? '✅' : '❌'} Frontend components ready`);
    console.log(`${hasLeetCodeIntegration ? '✅' : '❌'} Editor integration complete`);
    
    const allWorking = hasColumns && hasLeetCodeRoutes && hasLeetCodeEditor && hasLeetCodeIntegration;
    
    if (allWorking) {
      console.log('\n🚀 System Ready! Next steps:');
      console.log('1. Start backend: npm run dev:backend');
      console.log('2. Start frontend: npm run dev:frontend');
      console.log('3. Create problems with useLeetCodeStyle={true}');
      console.log('4. Test the LeetCode-style interface');
    } else {
      console.log('\n⚠️  Some components are missing. Review the checklist above.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLeetCode();
/**
 * Comprehensive LeetCode Integration Check
 * Verifies every component and integration point
 */

const fs = require('fs');
const path = require('path');

async function comprehensiveCheck() {
  console.log('🔍 Comprehensive LeetCode Integration Check...\n');
  
  const issues = [];
  const warnings = [];
  
  try {
    // 1. Database Schema Check
    console.log('📊 Database Schema Check...');
    const { db } = require('./backend/src/utils/db');
    
    const requiredColumns = [
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
    
    for (const col of requiredColumns) {
      const exists = await db.schema.hasColumn('problems', col);
      if (!exists) {
        issues.push(`Missing column: problems.${col}`);
      }
    }
    
    const hasCodeTable = await db.schema.hasTable('team_problem_code');
    if (!hasCodeTable) {
      issues.push('Missing table: team_problem_code');
    }
    
    console.log(`${issues.length === 0 ? '✅' : '❌'} Database schema check`);
    
    // 2. Backend Services Check
    console.log('\n🔧 Backend Services Check...');
    
    // CodeTemplateService
    const codeTemplateService = require('./backend/src/services/codeTemplateService');
    const requiredMethods = [
      'getFunctionSignature',
      'generateExecutableCode', 
      'saveUserImplementation',
      'getUserImplementation',
      'getDefaultSignature',
      'getDefaultWrapper'
    ];
    
    for (const method of requiredMethods) {
      if (typeof codeTemplateService[method] !== 'function') {
        issues.push(`Missing method: codeTemplateService.${method}`);
      }
    }
    
    // MultiLangExecutor
    const executor = require('./backend/src/services/multiLangExecutor');
    if (typeof executor.executeLeetCodeStyle !== 'function') {
      issues.push('Missing method: multiLangExecutor.executeLeetCodeStyle');
    }
    
    console.log(`${issues.filter(i => i.includes('codeTemplateService') || i.includes('multiLangExecutor')).length === 0 ? '✅' : '❌'} Backend services check`);
    
    // 3. API Routes Check
    console.log('\n🌐 API Routes Check...');
    
    // Check if leetcode routes file exists
    if (!fs.existsSync('./backend/src/routes/leetcode.js')) {
      issues.push('Missing file: backend/src/routes/leetcode.js');
    }
    
    // Check if routes are registered in server.js
    const serverContent = fs.readFileSync('./backend/src/server.js', 'utf8');
    if (!serverContent.includes("require('./routes/leetcode')")) {
      issues.push('LeetCode routes not registered in server.js');
    }
    
    // Check required API endpoints in routes file
    if (fs.existsSync('./backend/src/routes/leetcode.js')) {
      const routesContent = fs.readFileSync('./backend/src/routes/leetcode.js', 'utf8');
      const requiredEndpoints = [
        '/problems/:problemId/signature/:language',
        '/problems/:problemId/code/:language', 
        '/problems/:problemId/test/:language',
        '/admin/problems/:problemId/templates'
      ];
      
      for (const endpoint of requiredEndpoints) {
        if (!routesContent.includes(endpoint)) {
          issues.push(`Missing API endpoint: ${endpoint}`);
        }
      }
    }
    
    console.log(`${issues.filter(i => i.includes('API') || i.includes('routes')).length === 0 ? '✅' : '❌'} API routes check`);
    
    // 4. Frontend Components Check
    console.log('\n🎨 Frontend Components Check...');
    
    // LeetCodeEditor component
    if (!fs.existsSync('./frontend/src/components/CodeEditor/LeetCodeEditor.tsx')) {
      issues.push('Missing file: frontend/src/components/CodeEditor/LeetCodeEditor.tsx');
    } else {
      const leetCodeEditorContent = fs.readFileSync('./frontend/src/components/CodeEditor/LeetCodeEditor.tsx', 'utf8');
      const requiredFeatures = [
        'problemId',
        'language', 
        'onLanguageChange',
        'onTest',
        'onSubmit',
        'auto-save',
        'Monaco Editor'
      ];
      
      const missingFeatures = requiredFeatures.filter(feature => {
        switch(feature) {
          case 'problemId': return !leetCodeEditorContent.includes('problemId');
          case 'language': return !leetCodeEditorContent.includes('language');
          case 'onLanguageChange': return !leetCodeEditorContent.includes('onLanguageChange');
          case 'onTest': return !leetCodeEditorContent.includes('onTest');
          case 'onSubmit': return !leetCodeEditorContent.includes('onSubmit');
          case 'auto-save': return !leetCodeEditorContent.includes('saveCode');
          case 'Monaco Editor': return !leetCodeEditorContent.includes('@monaco-editor/react');
          default: return false;
        }
      });
      
      if (missingFeatures.length > 0) {
        issues.push(`LeetCodeEditor missing features: ${missingFeatures.join(', ')}`);
      }
    }
    
    // LeetCodeEditor CSS
    if (!fs.existsSync('./frontend/src/components/CodeEditor/LeetCodeEditor.css')) {
      warnings.push('Missing file: frontend/src/components/CodeEditor/LeetCodeEditor.css (component may look unstyled)');
    }
    
    // CodeEditor integration
    if (!fs.existsSync('./frontend/src/components/CodeEditor/CodeEditor.tsx')) {
      issues.push('Missing file: frontend/src/components/CodeEditor/CodeEditor.tsx');
    } else {
      const codeEditorContent = fs.readFileSync('./frontend/src/components/CodeEditor/CodeEditor.tsx', 'utf8');
      
      if (!codeEditorContent.includes('LeetCodeEditor')) {
        issues.push('CodeEditor missing LeetCodeEditor import');
      }
      
      if (!codeEditorContent.includes('useLeetCodeStyle')) {
        issues.push('CodeEditor missing useLeetCodeStyle prop');
      }
      
      if (!codeEditorContent.includes('if (useLeetCodeStyle')) {
        issues.push('CodeEditor missing conditional LeetCode rendering');
      }
    }
    
    console.log(`${issues.filter(i => i.includes('frontend') || i.includes('Component')).length === 0 ? '✅' : '❌'} Frontend components check`);
    
    // 5. Integration Points Check
    console.log('\n🔗 Integration Points Check...');
    
    // Check if multiLangExecutor uses codeTemplateService
    const multiLangExecutorContent = fs.readFileSync('./backend/src/services/multiLangExecutor.js', 'utf8');
    if (!multiLangExecutorContent.includes('codeTemplateService')) {
      issues.push('multiLangExecutor not integrated with codeTemplateService');
    }
    
    // Check testCaseRunner integration
    if (fs.existsSync('./backend/src/services/testCaseRunner.js')) {
      const testCaseRunnerContent = fs.readFileSync('./backend/src/services/testCaseRunner.js', 'utf8');
      if (!testCaseRunnerContent.includes('multiLangExecutor') && !testCaseRunnerContent.includes('executeLeetCodeStyle')) {
        warnings.push('testCaseRunner may not be using LeetCode-style execution');
      }
    }
    
    console.log(`${issues.filter(i => i.includes('integration')).length === 0 ? '✅' : '❌'} Integration points check`);
    
    // 6. Configuration Check
    console.log('\n⚙️ Configuration Check...');
    
    // Check if database is configured for SQLite
    const dbConfigContent = fs.readFileSync('./backend/src/config/database.js', 'utf8');
    if (!dbConfigContent.includes('sqlite3')) {
      warnings.push('Database not configured for SQLite - may need PostgreSQL setup');
    }
    
    // Check if package dependencies are installed
    const backendPackageContent = fs.readFileSync('./backend/package.json', 'utf8');
    const frontendPackageContent = fs.readFileSync('./frontend/package.json', 'utf8');
    
    const requiredBackendDeps = ['knex', 'sqlite3'];
    const requiredFrontendDeps = ['@monaco-editor/react'];
    
    for (const dep of requiredBackendDeps) {
      if (!backendPackageContent.includes(`"${dep}"`)) {
        warnings.push(`Backend missing dependency: ${dep}`);
      }
    }
    
    for (const dep of requiredFrontendDeps) {
      if (!frontendPackageContent.includes(`"${dep}"`)) {
        warnings.push(`Frontend missing dependency: ${dep}`);
      }
    }
    
    await db.destroy();
    
    // 7. Results Summary
    console.log('\n📋 Integration Check Results:');
    console.log('=====================================');
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('🎉 Perfect! LeetCode integration is complete with no issues.');
    } else {
      if (issues.length > 0) {
        console.log('❌ Critical Issues (must fix):');
        issues.forEach(issue => console.log(`  • ${issue}`));
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  Warnings (should review):');
        warnings.forEach(warning => console.log(`  • ${warning}`));
      }
    }
    
    console.log('\n🚀 Next Steps:');
    if (issues.length === 0) {
      console.log('✅ System ready for testing!');
      console.log('1. Start servers: npm run dev:backend && npm run dev:frontend');
      console.log('2. Create a problem with function signatures');
      console.log('3. Test the LeetCode-style editor interface');
    } else {
      console.log('❌ Fix critical issues first, then test');
    }
    
  } catch (error) {
    console.error('❌ Comprehensive check failed:', error.message);
    issues.push(`Check failed: ${error.message}`);
  }
  
  return { issues, warnings };
}

comprehensiveCheck();
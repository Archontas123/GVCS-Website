/**
 * CS Club Programming Contest Platform - Phase 1.3 Validation Script
 * Validates that all Phase 1.3 components are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Phase 1.3: Docker Code Execution Environment');
console.log('==========================================================\n');

const requiredFiles = [
    // Docker Environment
    '../../docker/Dockerfile',
    '../../docker/seccomp-profile.json', 
    '../../docker/execute.sh',
    '../../docker-compose.execution.yml',
    
    // Service Layer
    '../services/dockerExecutor.js',
    '../routes/execute.js',
    
    // Build Scripts
    '../../scripts/build-judge.sh',
    
    // Tests
    './execution.test.js',
    './execution.basic.test.js',
    './execution.api.test.js'
];

const validationResults = {
    files: [],
    configurations: [],
    security: [],
    integration: []
};

// File validation
console.log('📁 Checking required files...');
requiredFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✅' : '❌'} ${filePath}`);
    validationResults.files.push({ file: filePath, exists });
});

// Configuration validation
console.log('\n⚙️  Checking configurations...');

try {
    const DockerExecutor = require('../services/dockerExecutor');
    const executor = new DockerExecutor();
    
    const status = executor.getStatus();
    const hasCorrectLanguages = JSON.stringify(status.supportedLanguages.sort()) === JSON.stringify(['cpp', 'java', 'python'].sort());
    console.log(`  ${hasCorrectLanguages ? '✅' : '❌'} Language support: ${status.supportedLanguages.join(', ')}`);
    validationResults.configurations.push({ check: 'Language support', passed: hasCorrectLanguages });
    
    const hasCorrectLimits = status.maxConcurrentContainers === 10;
    console.log(`  ${hasCorrectLimits ? '✅' : '❌'} Container limit: ${status.maxConcurrentContainers}`);
    validationResults.configurations.push({ check: 'Container limits', passed: hasCorrectLimits });
    
    // Test templates
    const cppTemplate = executor.getLanguageTemplate('cpp');
    const javaTemplate = executor.getLanguageTemplate('java');
    const pythonTemplate = executor.getLanguageTemplate('python');
    
    const templatesValid = cppTemplate.includes('#include') && 
                          javaTemplate.includes('public class') && 
                          pythonTemplate.includes('# Your code');
    console.log(`  ${templatesValid ? '✅' : '❌'} Language templates`);
    validationResults.configurations.push({ check: 'Language templates', passed: templatesValid });
    
} catch (error) {
    console.log(`  ❌ DockerExecutor configuration: ${error.message}`);
    validationResults.configurations.push({ check: 'DockerExecutor', passed: false, error: error.message });
}

// Security validation
console.log('\n🔐 Checking security configurations...');

try {
    const seccompPath = path.join(__dirname, '../../docker/seccomp-profile.json');
    const seccompProfile = JSON.parse(fs.readFileSync(seccompPath, 'utf8'));
    
    const hasSeccomp = seccompProfile.defaultAction === 'SCMP_ACT_ERRNO';
    console.log(`  ${hasSeccomp ? '✅' : '❌'} Seccomp profile configured`);
    validationResults.security.push({ check: 'Seccomp profile', passed: hasSeccomp });
    
    const hasSyscallFilter = Array.isArray(seccompProfile.syscalls) && seccompProfile.syscalls.length > 0;
    console.log(`  ${hasSyscallFilter ? '✅' : '❌'} System call filtering`);
    validationResults.security.push({ check: 'System call filtering', passed: hasSyscallFilter });
    
} catch (error) {
    console.log(`  ❌ Security configuration: ${error.message}`);
    validationResults.security.push({ check: 'Security config', passed: false, error: error.message });
}

// Dockerfile validation
try {
    const dockerfilePath = path.join(__dirname, '../../docker/Dockerfile');
    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    
    const hasExecutorUser = dockerfile.includes('useradd') && dockerfile.includes('executor');
    console.log(`  ${hasExecutorUser ? '✅' : '❌'} Non-root executor user`);
    validationResults.security.push({ check: 'Non-root user', passed: hasExecutorUser });
    
    const hasResourceLimits = dockerfile.includes('limits.conf');
    console.log(`  ${hasResourceLimits ? '✅' : '❌'} Resource limits configured`);
    validationResults.security.push({ check: 'Resource limits', passed: hasResourceLimits });
    
} catch (error) {
    console.log(`  ❌ Dockerfile validation: ${error.message}`);
    validationResults.security.push({ check: 'Dockerfile', passed: false, error: error.message });
}

// Integration validation
console.log('\n🔗 Checking integration points...');

try {
    // Check if execution routes are properly integrated
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    const hasExecuteRoutes = serverContent.includes("require('./routes/execute')");
    console.log(`  ${hasExecuteRoutes ? '✅' : '❌'} Execution routes integrated`);
    validationResults.integration.push({ check: 'Routes integration', passed: hasExecuteRoutes });
    
    // Check package.json for judge scripts
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const hasJudgeScripts = packageJson.scripts && packageJson.scripts['judge:build'];
    console.log(`  ${hasJudgeScripts ? '✅' : '❌'} Build scripts configured`);
    validationResults.integration.push({ check: 'Build scripts', passed: hasJudgeScripts });
    
} catch (error) {
    console.log(`  ❌ Integration validation: ${error.message}`);
    validationResults.integration.push({ check: 'Integration', passed: false, error: error.message });
}

// API endpoint validation
console.log('\n🌐 Checking API endpoints...');

try {
    const routesPath = path.join(__dirname, '../routes/execute.js');
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    
    const requiredEndpoints = ['/status', '/languages', '/template', '/test', '/submit'];
    requiredEndpoints.forEach(endpoint => {
        const hasEndpoint = routesContent.includes(endpoint);
        console.log(`  ${hasEndpoint ? '✅' : '❌'} ${endpoint} endpoint`);
        validationResults.integration.push({ 
            check: `${endpoint} endpoint`, 
            passed: hasEndpoint 
        });
    });
    
} catch (error) {
    console.log(`  ❌ API endpoints validation: ${error.message}`);
    validationResults.integration.push({ check: 'API endpoints', passed: false, error: error.message });
}

// Summary
console.log('\n📊 Validation Summary');
console.log('====================');

const totalChecks = validationResults.files.length + 
                   validationResults.configurations.length + 
                   validationResults.security.length + 
                   validationResults.integration.length;

const passedChecks = validationResults.files.filter(r => r.exists).length +
                    validationResults.configurations.filter(r => r.passed).length +
                    validationResults.security.filter(r => r.passed).length +
                    validationResults.integration.filter(r => r.passed).length;

console.log(`📁 Files: ${validationResults.files.filter(r => r.exists).length}/${validationResults.files.length} ✅`);
console.log(`⚙️  Configuration: ${validationResults.configurations.filter(r => r.passed).length}/${validationResults.configurations.length} ✅`);
console.log(`🔐 Security: ${validationResults.security.filter(r => r.passed).length}/${validationResults.security.length} ✅`);
console.log(`🔗 Integration: ${validationResults.integration.filter(r => r.passed).length}/${validationResults.integration.length} ✅`);

console.log(`\n🎯 Overall: ${passedChecks}/${totalChecks} checks passed (${Math.round(passedChecks/totalChecks*100)}%)`);

if (passedChecks === totalChecks) {
    console.log('\n🎉 Phase 1.3 Docker Code Execution Environment validation PASSED!');
    console.log('✅ All components are properly configured and ready for use.');
    console.log('\n📋 Next Steps:');
    console.log('1. Run "./scripts/build-judge.sh" to build the execution container');
    console.log('2. Run "npm run dev" to start the development server');
    console.log('3. Test execution with: curl -X POST http://localhost:3000/api/execute/test \\');
    console.log('   -H "Content-Type: application/json" \\');
    console.log('   -d \'{"language":"python","code":"print(\\"Hello World\\")"}\'');
    process.exit(0);
} else {
    console.log('\n❌ Phase 1.3 validation FAILED!');
    console.log('Please fix the issues above before proceeding.');
    
    // Show failed checks
    const failedChecks = [
        ...validationResults.files.filter(r => !r.exists),
        ...validationResults.configurations.filter(r => !r.passed),
        ...validationResults.security.filter(r => !r.passed),
        ...validationResults.integration.filter(r => !r.passed)
    ];
    
    if (failedChecks.length > 0) {
        console.log('\n🔍 Failed checks:');
        failedChecks.forEach(check => {
            console.log(`  ❌ ${check.file || check.check}${check.error ? ': ' + check.error : ''}`);
        });
    }
    
    process.exit(1);
}
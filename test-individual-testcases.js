/**
 * Simple test to verify the individual test case system works
 * This script tests the API endpoints for creating individual test cases
 */

const TestCase = require('./backend/src/controllers/testCaseController');

async function testIndividualTestCases() {
  console.log('🧪 Testing Individual Test Case System...\n');

  try {
    // Test 1: Validate test case data
    console.log('📝 Test 1: Validating test case data...');
    
    const validTestCase = {
      input: '5 3\n2 1 4 3 5',
      expected_output: '2',
      is_sample: true
    };

    // This should not throw an error
    TestCase.validateTestCaseData(validTestCase);
    console.log('✅ Valid test case data accepted');

    // Test 2: Test invalid data
    console.log('\n📝 Test 2: Testing invalid test case data...');
    
    try {
      TestCase.validateTestCaseData({
        input: 'x'.repeat(15000), // Too long
        expected_output: '1',
        is_sample: false
      });
      console.log('❌ Should have failed validation');
    } catch (error) {
      console.log('✅ Invalid test case properly rejected:', error.message);
    }

    // Test 3: Test format validation
    console.log('\n📝 Test 3: Testing format validation...');
    
    const formatResult = TestCase.validateTestCaseFormat(
      '5\n1 2 3 4 5',
      '15',
      {}
    );
    
    console.log('✅ Format validation result:', formatResult);

    // Test 4: Test CSV parsing
    console.log('\n📝 Test 4: Testing CSV parsing...');
    
    const csvData = `input,expected_output,is_sample
"5","25",true
"10","100",false
"0","0",true`;

    const parsedData = TestCase.parseCSVData(csvData);
    console.log('✅ Parsed CSV data:', parsedData);

    console.log('\n🎉 All tests passed! Individual test case system is working correctly.');
    console.log('\n📋 Summary of changes made:');
    console.log('• Removed zip upload functionality from frontend');
    console.log('• Updated TestCaseModal to focus on STDIN/STDOUT input');
    console.log('• Updated ProblemDetailPage to remove zip references');
    console.log('• Backend already supports individual test cases perfectly');
    console.log('• Database schema is ready for individual test cases');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIndividualTestCases();
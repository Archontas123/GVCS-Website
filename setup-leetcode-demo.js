/**
 * Quick Setup Script for LeetCode-Style Demo
 * Creates sample problems with function signatures
 */

const { db } = require('./backend/src/utils/db');

const DEMO_PROBLEMS = [
  {
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'easy',
    points_value: 10,
    function_signature_cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}`,
    function_signature_java: `public int[] twoSum(int[] nums, int target) {
    // Your solution here  
    return new int[]{};
}`,
    function_signature_python: `def twoSum(nums, target):
    # Your solution here
    return []`,
    testCases: [
      { input: '2,7,11,15 9', output: '[0,1]', sample: true },
      { input: '3,2,4 6', output: '[1,2]', sample: false },
      { input: '3,3 6', output: '[0,1]', sample: false }
    ]
  },
  
  {
    title: 'Add Two Numbers',
    description: 'Return the sum of two integers a and b.',
    difficulty: 'easy', 
    points_value: 5,
    function_signature_cpp: `int addTwoNumbers(int a, int b) {
    // Your solution here
    return 0;
}`,
    function_signature_java: `public int addTwoNumbers(int a, int b) {
    // Your solution here
    return 0;
}`,
    function_signature_python: `def addTwoNumbers(a, b):
    # Your solution here
    return 0`,
    testCases: [
      { input: '5 3', output: '8', sample: true },
      { input: '10 -2', output: '8', sample: false },
      { input: '0 0', output: '0', sample: false }
    ]
  },

  {
    title: 'Valid Parentheses',
    description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
    difficulty: 'medium',
    points_value: 15,
    function_signature_cpp: `bool isValid(string s) {
    // Your solution here
    return false;
}`,
    function_signature_java: `public boolean isValid(String s) {
    // Your solution here
    return false;
}`,
    function_signature_python: `def isValid(s):
    # Your solution here
    return False`,
    testCases: [
      { input: '()', output: 'true', sample: true },
      { input: '()[]{}', output: 'true', sample: true },
      { input: '(]', output: 'false', sample: true },
      { input: '([)]', output: 'false', sample: false },
      { input: '{[]}', output: 'true', sample: false }
    ]
  }
];

async function setupLeetCodeDemo() {
  try {
    console.log('🚀 Setting up LeetCode-Style Demo Problems...\n');

    // Run migrations first
    await db.migrate.latest();

    // Create demo contest
    const [contest] = await db('contests').insert({
      contest_name: 'LeetCode-Style Demo Contest',
      description: 'Demo contest showcasing function-signature style problems',
      registration_code: 'LEETCODE',
      start_time: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
      duration: 180, // 3 hours
      freeze_time: 30,
      created_by: 1,
      is_active: true,
      is_registration_open: true,
      created_at: new Date().toISOString()
    }).returning('*');

    console.log(`✅ Created contest: ${contest.contest_name} (Code: ${contest.registration_code})`);

    // Create problems
    for (let i = 0; i < DEMO_PROBLEMS.length; i++) {
      const problemData = DEMO_PROBLEMS[i];
      
      const [problem] = await db('problems').insert({
        contest_id: contest.id,
        problem_letter: String.fromCharCode(65 + i), // A, B, C...
        title: problemData.title,
        description: problemData.description,
        difficulty: problemData.difficulty,
        time_limit: 1000,
        memory_limit: 256,
        points_value: problemData.points_value,
        
        // Function signatures (what users see)
        function_signature_cpp: problemData.function_signature_cpp,
        function_signature_java: problemData.function_signature_java, 
        function_signature_python: problemData.function_signature_python,
        
        // Set as LeetCode-style
        is_leetcode_style: true,
        
        created_at: new Date().toISOString()
      }).returning('*');

      console.log(`✅ Created problem ${problem.problem_letter}: ${problem.title}`);

      // Add test cases
      for (let j = 0; j < problemData.testCases.length; j++) {
        const testCase = problemData.testCases[j];
        
        await db('test_cases').insert({
          problem_id: problem.id,
          input: testCase.input,
          expected_output: testCase.output,
          test_case_order: j + 1,
          is_sample: testCase.sample,
          is_active: true,
          created_at: new Date().toISOString()
        });
      }
      
      console.log(`   Added ${problemData.testCases.length} test cases`);
    }

    console.log('\n🎉 Demo setup complete!');
    console.log('\n📋 What to test:');
    console.log('1. Register a team with code: LEETCODE');
    console.log('2. Navigate to contest problems');
    console.log('3. Try editing the function signatures (users should only see the function)');
    console.log('4. Submit solutions and verify execution works');
    console.log('5. Check that I/O is handled automatically');
    
    console.log('\n🔧 Admin features to test:');
    console.log('1. Edit function signatures for each language');
    console.log('2. Modify I/O wrapper templates');
    console.log('3. Verify user code is saved per team/problem/language');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

async function cleanupDemo() {
  try {
    console.log('🧹 Cleaning up LeetCode demo data...');
    
    const contest = await db('contests').where('registration_code', 'LEETCODE').first();
    if (contest) {
      await db('test_cases')
        .whereIn('problem_id', 
          db('problems').select('id').where('contest_id', contest.id)
        ).del();
      
      await db('problems').where('contest_id', contest.id).del();
      await db('contests').where('id', contest.id).del();
      
      console.log('✅ Cleaned up demo data');
    } else {
      console.log('ℹ️  No demo data found');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'setup') {
  setupLeetCodeDemo();
} else if (command === 'cleanup') {
  cleanupDemo();
} else {
  console.log('Usage:');
  console.log('  node setup-leetcode-demo.js setup   - Create demo problems');
  console.log('  node setup-leetcode-demo.js cleanup - Remove demo data');
  process.exit(1);
}
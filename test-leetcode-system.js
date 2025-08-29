/**
 * Manual Testing Script for LeetCode-Style System
 * Run with: node test-leetcode-system.js
 */

const codeTemplateService = require('./backend/src/services/codeTemplateService');
const { db } = require('./backend/src/utils/db');

async function createTestProblem() {
  console.log('🔧 Creating test problem...');
  
  const [problem] = await db('problems').insert({
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'easy',
    time_limit: 1000,
    memory_limit: 256,
    
    // What users see (clean function signatures)
    function_signature_cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Write your solution here
    // Return a vector with two indices [i, j] where nums[i] + nums[j] == target
    return {};
}`,
    
    function_signature_java: `public int[] twoSum(int[] nums, int target) {
    // Write your solution here  
    // Return an array with two indices [i, j] where nums[i] + nums[j] == target
    return new int[]{};
}`,
    
    function_signature_python: `def twoSum(nums, target):
    # Write your solution here
    # Return a list with two indices [i, j] where nums[i] + nums[j] == target
    return []`,

    // Hidden I/O wrappers (what actually executes)
    io_wrapper_cpp: `#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

{USER_FUNCTION}

int main() {
    // Read input: "2,7,11,15 9"
    string line;
    getline(cin, line);
    
    size_t space_pos = line.find(' ');
    string nums_str = line.substr(0, space_pos);
    int target = stoi(line.substr(space_pos + 1));
    
    // Parse nums array
    vector<int> nums;
    stringstream ss(nums_str);
    string num;
    while (getline(ss, num, ',')) {
        nums.push_back(stoi(num));
    }
    
    // Call user function
    vector<int> result = twoSum(nums, target);
    
    // Output result
    if (result.size() >= 2) {
        cout << "[" << result[0] << "," << result[1] << "]" << endl;
    } else {
        cout << "[]" << endl;
    }
    
    return 0;
}`,

    io_wrapper_java: `import java.util.*;

public class Solution {
    {USER_FUNCTION}
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.nextLine();
        
        // Parse input: "2,7,11,15 9"
        String[] parts = line.split(" ");
        String[] numStrs = parts[0].split(",");
        int target = Integer.parseInt(parts[1]);
        
        int[] nums = new int[numStrs.length];
        for (int i = 0; i < numStrs.length; i++) {
            nums[i] = Integer.parseInt(numStrs[i]);
        }
        
        // Call user function
        Solution sol = new Solution();
        int[] result = sol.twoSum(nums, target);
        
        // Output result
        if (result.length >= 2) {
            System.out.println("[" + result[0] + "," + result[1] + "]");
        } else {
            System.out.println("[]");
        }
        
        sc.close();
    }
}`,

    io_wrapper_python: `{USER_FUNCTION}

if __name__ == "__main__":
    line = input().strip()
    nums_str, target_str = line.split(' ')
    nums = list(map(int, nums_str.split(',')))
    target = int(target_str)
    
    # Call user function
    result = twoSum(nums, target)
    
    # Output result
    if len(result) >= 2:
        print(f"[{result[0]},{result[1]}]")
    else:
        print("[]")`
  }).returning('*');

  // Add test cases
  await db('test_cases').insert([
    {
      problem_id: problem.id,
      input: '2,7,11,15 9',
      expected_output: '[0,1]',
      test_case_order: 1,
      is_sample: true,
      is_active: true
    },
    {
      problem_id: problem.id,
      input: '3,2,4 6',
      expected_output: '[1,2]',
      test_case_order: 2,
      is_sample: false,
      is_active: true
    },
    {
      problem_id: problem.id,
      input: '3,3 6',
      expected_output: '[0,1]',
      test_case_order: 3,
      is_sample: false,
      is_active: true
    }
  ]);

  console.log(`✅ Created problem with ID: ${problem.id}`);
  return problem.id;
}

async function testFunctionSignatures(problemId) {
  console.log('\n📝 Testing Function Signatures...');
  
  const cppSig = await codeTemplateService.getFunctionSignature(problemId, 'cpp');
  const javaSig = await codeTemplateService.getFunctionSignature(problemId, 'java');
  const pythonSig = await codeTemplateService.getFunctionSignature(problemId, 'python');

  console.log('C++ Signature (what user sees):');
  console.log('---');
  console.log(cppSig);
  console.log('---\n');

  console.log('Java Signature (what user sees):');
  console.log('---');
  console.log(javaSig);
  console.log('---\n');

  console.log('Python Signature (what user sees):');
  console.log('---');
  console.log(pythonSig);
  console.log('---\n');
}

async function testCodeGeneration(problemId) {
  console.log('⚙️ Testing Code Generation...');

  // Test correct solutions
  const correctCpp = `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> map;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (map.find(complement) != map.end()) {
            return {map[complement], i};
        }
        map[nums[i]] = i;
    }
    return {};
}`;

  const correctJava = `public int[] twoSum(int[] nums, int target) {
    HashMap<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (map.containsKey(complement)) {
            return new int[]{map.get(complement), i};
        }
        map.put(nums[i], i);
    }
    return new int[]{};
}`;

  const correctPython = `def twoSum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []`;

  // Generate executable code
  const executableCpp = await codeTemplateService.generateExecutableCode(problemId, 'cpp', correctCpp);
  const executableJava = await codeTemplateService.generateExecutableCode(problemId, 'java', correctJava);
  const executablePython = await codeTemplateService.generateExecutableCode(problemId, 'python', correctPython);

  console.log('Generated C++ Executable Code:');
  console.log('---');
  console.log(executableCpp);
  console.log('---\n');

  console.log('Generated Java Executable Code:');
  console.log('---');
  console.log(executableJava);
  console.log('---\n');

  console.log('Generated Python Executable Code:');  
  console.log('---');
  console.log(executablePython);
  console.log('---\n');
}

async function testUserCodeSaving(problemId) {
  console.log('💾 Testing User Code Saving...');

  const teamId = 1;
  const userJavaCode = `public int[] twoSum(int[] nums, int target) {
    // Brute force approach
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] == target) {
                return new int[]{i, j};
            }
        }
    }
    return new int[]{};
}`;

  // Save user's work
  await codeTemplateService.saveUserImplementation(teamId, problemId, 'java', userJavaCode);
  console.log('✅ Saved user Java code');

  // Retrieve saved work
  const retrieved = await codeTemplateService.getUserImplementation(teamId, problemId, 'java');
  console.log('Retrieved saved code:');
  console.log('---');
  console.log(retrieved);
  console.log('---\n');

  // Test that it matches
  if (retrieved === userJavaCode) {
    console.log('✅ Code saving/retrieval working correctly');
  } else {
    console.log('❌ Code saving/retrieval mismatch');
  }
}

async function runAllTests() {
  try {
    console.log('🚀 Testing LeetCode-Style System\n');

    // Run migrations first
    await db.migrate.latest();

    // Create test problem
    const problemId = await createTestProblem();

    // Test function signatures
    await testFunctionSignatures(problemId);

    // Test code generation
    await testCodeGeneration(problemId);

    // Test user code saving
    await testUserCodeSaving(problemId);

    console.log('✅ All manual tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run the Jest tests: npm run test:backend');
    console.log('2. Test the admin interface for creating function signatures');
    console.log('3. Test the frontend code editor with LeetCode-style templates');
    console.log('4. Try submitting solutions through the UI');

    // Cleanup
    await db('test_cases').where('problem_id', problemId).del();
    await db('problems').where('id', problemId).del();
    console.log('🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

// Run tests if script is called directly
if (require.main === module) {
  runAllTests();
}
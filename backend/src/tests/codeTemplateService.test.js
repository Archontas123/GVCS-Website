/**
 * Unit tests for LeetCode-style Code Template Service
 */

const codeTemplateService = require('../services/codeTemplateService');
const { db } = require('../utils/db');

describe('Code Template Service', () => {
  let testProblemId;

  beforeAll(async () => {
    await db.migrate.latest();
    
    // Create test problem with function signatures
    const [problem] = await db('problems').insert({
      title: 'Two Sum Test',
      description: 'Test problem for LeetCode-style templates',
      difficulty: 'easy',
      function_signature_cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}`,
      function_signature_java: `public int[] twoSum(int[] nums, int target) {
    // Your solution here
    return new int[]{};
}`,
      function_signature_python: `def two_sum(nums, target):
    # Your solution here
    return []`,
      io_wrapper_cpp: `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

{USER_FUNCTION}

int main() {
    // Test C++ wrapper
    return 0;
}`,
      io_wrapper_java: `import java.util.*;

public class Solution {
    {USER_FUNCTION}
    
    public static void main(String[] args) {
        // Test Java wrapper
    }
}`,
      io_wrapper_python: `import json

{USER_FUNCTION}

if __name__ == "__main__":
    # Test Python wrapper
    pass`,
      input_format: '{"nums": [2,7,11,15], "target": 9}',
      output_format: '[0,1]'
    }).returning('id');
    
    testProblemId = problem.id;
  });

  afterAll(async () => {
    await db('problems').where('id', testProblemId).del();
    await db.destroy();
  });

  describe('getFunctionSignature', () => {
    test('should return C++ function signature', async () => {
      const signature = await codeTemplateService.getFunctionSignature(testProblemId, 'cpp');
      
      expect(signature).toContain('vector<int> twoSum');
      expect(signature).toContain('vector<int>& nums, int target');
      expect(signature).toContain('// Your solution here');
    });

    test('should return Java function signature', async () => {
      const signature = await codeTemplateService.getFunctionSignature(testProblemId, 'java');
      
      expect(signature).toContain('public int[] twoSum');
      expect(signature).toContain('int[] nums, int target');
      expect(signature).toContain('return new int[]{}');
    });

    test('should return Python function signature', async () => {
      const signature = await codeTemplateService.getFunctionSignature(testProblemId, 'python');
      
      expect(signature).toContain('def two_sum');
      expect(signature).toContain('nums, target');
      expect(signature).toContain('return []');
    });

    test('should return default signature for invalid problem', async () => {
      const signature = await codeTemplateService.getFunctionSignature(99999, 'java');
      
      expect(signature).toContain('public int solution');
      expect(signature).toContain('// Your solution here');
    });
  });

  describe('generateExecutableCode', () => {
    test('should generate complete C++ code with user function', async () => {
      const userCode = `vector<int> twoSum(vector<int>& nums, int target) {
    return {0, 1};
}`;
      
      const executable = await codeTemplateService.generateExecutableCode(
        testProblemId, 
        'cpp', 
        userCode
      );
      
      expect(executable).toContain('#include <iostream>');
      expect(executable).toContain('vector<int> twoSum');
      expect(executable).toContain('return {0, 1}');
      expect(executable).toContain('int main()');
      expect(executable).not.toContain('{USER_FUNCTION}');
    });

    test('should generate complete Java code with user function', async () => {
      const userCode = `public int[] twoSum(int[] nums, int target) {
    return new int[]{0, 1};
}`;
      
      const executable = await codeTemplateService.generateExecutableCode(
        testProblemId, 
        'java', 
        userCode
      );
      
      expect(executable).toContain('import java.util.*');
      expect(executable).toContain('public class Solution');
      expect(executable).toContain('public int[] twoSum');
      expect(executable).toContain('return new int[]{0, 1}');
      expect(executable).toContain('public static void main');
      expect(executable).not.toContain('{USER_FUNCTION}');
    });

    test('should generate complete Python code with user function', async () => {
      const userCode = `def two_sum(nums, target):
    return [0, 1]`;
      
      const executable = await codeTemplateService.generateExecutableCode(
        testProblemId, 
        'python', 
        userCode
      );
      
      expect(executable).toContain('import json');
      expect(executable).toContain('def two_sum(nums, target):');
      expect(executable).toContain('return [0, 1]');
      expect(executable).toContain('if __name__ == "__main__"');
      expect(executable).not.toContain('{USER_FUNCTION}');
    });
  });

  describe('saveUserImplementation', () => {
    test('should save and retrieve user code', async () => {
      const teamId = 1;
      const userCode = `public int[] twoSum(int[] nums, int target) {
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

      // Save user implementation
      await codeTemplateService.saveUserImplementation(
        teamId, 
        testProblemId, 
        'java', 
        userCode
      );

      // Retrieve saved implementation
      const retrieved = await codeTemplateService.getUserImplementation(
        teamId, 
        testProblemId, 
        'java'
      );

      expect(retrieved).toBe(userCode);
    });

    test('should update existing user code', async () => {
      const teamId = 1;
      const originalCode = `def two_sum(nums, target): return []`;
      const updatedCode = `def two_sum(nums, target): return [0, 1]`;

      // Save original
      await codeTemplateService.saveUserImplementation(
        teamId, 
        testProblemId, 
        'python', 
        originalCode
      );

      // Update with new code
      await codeTemplateService.saveUserImplementation(
        teamId, 
        testProblemId, 
        'python', 
        updatedCode
      );

      // Should return updated code
      const retrieved = await codeTemplateService.getUserImplementation(
        teamId, 
        testProblemId, 
        'python'
      );

      expect(retrieved).toBe(updatedCode);
    });
  });

  describe('getDefaultSignature', () => {
    test('should return valid default signatures for all languages', () => {
      const cppDefault = codeTemplateService.getDefaultSignature('cpp');
      const javaDefault = codeTemplateService.getDefaultSignature('java');
      const pythonDefault = codeTemplateService.getDefaultSignature('python');

      expect(cppDefault).toContain('int solution');
      expect(cppDefault).toContain('vector<int>& nums');
      
      expect(javaDefault).toContain('public int solution');
      expect(javaDefault).toContain('int[] nums');
      
      expect(pythonDefault).toContain('def solution');
      expect(pythonDefault).toContain('nums');
    });
  });
});
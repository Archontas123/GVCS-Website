/**
 * Integration tests for LeetCode-style code execution
 * Tests the complete flow: user function -> executable code -> Docker execution
 */

const codeTemplateService = require('../services/codeTemplateService');
const multiLangExecutor = require('../services/multiLangExecutor');
const { db } = require('../utils/db');

describe('LeetCode-Style Code Execution Integration', () => {
  let testProblemId;

  beforeAll(async () => {
    await db.migrate.latest();
    
    // Create a simple "Add Two Numbers" problem
    const [problem] = await db('problems').insert({
      title: 'Add Two Numbers',
      description: 'Return the sum of two integers',
      difficulty: 'easy',
      time_limit: 1000,
      memory_limit: 128,
      
      // Function signatures (what users see)
      function_signature_cpp: `int addTwoNumbers(int a, int b) {
    // Your solution here
    return 0;
}`,
      function_signature_java: `public int addTwoNumbers(int a, int b) {
    // Your solution here
    return 0;
}`,
      function_signature_python: `def add_two_numbers(a, b):
    # Your solution here
    return 0`,

      // I/O wrappers (hidden from users)
      io_wrapper_cpp: `#include <iostream>
#include <sstream>
#include <string>
using namespace std;

{USER_FUNCTION}

int main() {
    string line;
    getline(cin, line);
    
    // Simple parsing: "5 3" -> a=5, b=3
    istringstream iss(line);
    int a, b;
    iss >> a >> b;
    
    int result = addTwoNumbers(a, b);
    cout << result << endl;
    
    return 0;
}`,

      io_wrapper_java: `import java.util.Scanner;

public class Solution {
    {USER_FUNCTION}
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().split(" ");
        int a = Integer.parseInt(parts[0]);
        int b = Integer.parseInt(parts[1]);
        
        Solution sol = new Solution();
        int result = sol.addTwoNumbers(a, b);
        System.out.println(result);
        
        sc.close();
    }
}`,

      io_wrapper_python: `{USER_FUNCTION}

if __name__ == "__main__":
    line = input().strip()
    a, b = map(int, line.split())
    result = add_two_numbers(a, b)
    print(result)`,

      input_format: '{"a": 5, "b": 3}',
      output_format: '8'
    }).returning('id');
    
    testProblemId = problem.id;

    // Create test cases
    await db('test_cases').insert([
      {
        problem_id: problem.id,
        input: '5 3',
        expected_output: '8',
        test_case_order: 1,
        is_sample: true,
        is_active: true
      },
      {
        problem_id: problem.id,
        input: '10 -2',
        expected_output: '8',
        test_case_order: 2,
        is_sample: false,
        is_active: true
      },
      {
        problem_id: problem.id,
        input: '0 0',
        expected_output: '0',
        test_case_order: 3,
        is_sample: false,
        is_active: true
      }
    ]);
  });

  afterAll(async () => {
    await db('test_cases').where('problem_id', testProblemId).del();
    await db('problems').where('id', testProblemId).del();
    await db.destroy();
  });

  describe('C++ LeetCode-Style Execution', () => {
    test('should execute correct C++ solution', async () => {
      const userCode = `int addTwoNumbers(int a, int b) {
    return a + b;
}`;

      // Generate executable code
      const executableCode = await codeTemplateService.generateExecutableCode(
        testProblemId,
        'cpp',
        userCode
      );

      // Test compilation
      const compileResult = await multiLangExecutor.compileCode(executableCode, 'cpp');
      expect(compileResult.success).toBe(true);

      // Test execution with sample input
      const executionResult = await multiLangExecutor.executeCode(
        executableCode,
        'cpp',
        '5 3',
        { timeLimit: 1000, memoryLimit: 128 }
      );

      expect(executionResult.success).toBe(true);
      expect(executionResult.output.trim()).toBe('8');
      expect(executionResult.executionTime).toBeLessThan(1000);
    });

    test('should handle incorrect C++ solution', async () => {
      const userCode = `int addTwoNumbers(int a, int b) {
    return a - b; // Wrong operation
}`;

      const executableCode = await codeTemplateService.generateExecutableCode(
        testProblemId,
        'cpp',
        userCode
      );

      const executionResult = await multiLangExecutor.executeCode(
        executableCode,
        'cpp',
        '5 3',
        { timeLimit: 1000, memoryLimit: 128 }
      );

      expect(executionResult.success).toBe(true);
      expect(executionResult.output.trim()).toBe('2'); // 5-3=2, not 8
    });
  });

  describe('Java LeetCode-Style Execution', () => {
    test('should execute correct Java solution', async () => {
      const userCode = `public int addTwoNumbers(int a, int b) {
    return a + b;
}`;

      const executableCode = await codeTemplateService.generateExecutableCode(
        testProblemId,
        'java',
        userCode
      );

      // Test compilation
      const compileResult = await multiLangExecutor.compileCode(executableCode, 'java');
      expect(compileResult.success).toBe(true);

      // Test execution
      const executionResult = await multiLangExecutor.executeCode(
        executableCode,
        'java',
        '10 -2',
        { timeLimit: 2000, memoryLimit: 256 }
      );

      expect(executionResult.success).toBe(true);
      expect(executionResult.output.trim()).toBe('8');
    });

    test('should handle Java compilation error', async () => {
      const userCode = `public int addTwoNumbers(int a, int b) {
    return a +; // Syntax error
}`;

      const executableCode = await codeTemplateService.generateExecutableCode(
        testProblemId,
        'java',
        userCode
      );

      const compileResult = await multiLangExecutor.compileCode(executableCode, 'java');
      expect(compileResult.success).toBe(false);
      expect(compileResult.error).toContain('error');
    });
  });

  describe('Python LeetCode-Style Execution', () => {
    test('should execute correct Python solution', async () => {
      const userCode = `def add_two_numbers(a, b):
    return a + b`;

      const executableCode = await codeTemplateService.generateExecutableCode(
        testProblemId,
        'python',
        userCode
      );

      const executionResult = await multiLangExecutor.executeCode(
        executableCode,
        'python',
        '0 0',
        { timeLimit: 5000, memoryLimit: 192 }
      );

      expect(executionResult.success).toBe(true);
      expect(executionResult.output.trim()).toBe('0');
    });

    test('should handle Python runtime error', async () => {
      const userCode = `def add_two_numbers(a, b):
    return a / 0  # Division by zero`;

      const executableCode = await codeTemplateService.generateExecutableCode(
        testProblemId,
        'python',
        userCode
      );

      const executionResult = await multiLangExecutor.executeCode(
        executableCode,
        'python',
        '5 3',
        { timeLimit: 5000, memoryLimit: 192 }
      );

      expect(executionResult.success).toBe(false);
      expect(executionResult.error).toContain('ZeroDivisionError');
    });
  });

  describe('Template Generation Validation', () => {
    test('should not expose wrapper code to users', async () => {
      const cppSignature = await codeTemplateService.getFunctionSignature(testProblemId, 'cpp');
      const javaSignature = await codeTemplateService.getFunctionSignature(testProblemId, 'java');
      const pythonSignature = await codeTemplateService.getFunctionSignature(testProblemId, 'python');

      // Users should only see function signatures, not I/O code
      expect(cppSignature).not.toContain('#include');
      expect(cppSignature).not.toContain('main()');
      expect(cppSignature).not.toContain('cin');

      expect(javaSignature).not.toContain('Scanner');
      expect(javaSignature).not.toContain('main(');
      expect(javaSignature).not.toContain('System.out');

      expect(pythonSignature).not.toContain('input()');
      expect(pythonSignature).not.toContain('print(');
      expect(pythonSignature).not.toContain('if __name__');
    });

    test('should generate complete executable code with all necessary imports', async () => {
      const userJavaCode = `public int addTwoNumbers(int a, int b) { return a + b; }`;
      
      const executable = await codeTemplateService.generateExecutableCode(
        testProblemId,
        'java',
        userJavaCode
      );

      // Should contain all necessary boilerplate
      expect(executable).toContain('import java.util.Scanner');
      expect(executable).toContain('public class Solution');
      expect(executable).toContain('public static void main');
      expect(executable).toContain('Scanner sc = new Scanner');
      expect(executable).toContain('System.out.println');
      expect(executable).toContain('public int addTwoNumbers(int a, int b) { return a + b; }');
    });
  });
});
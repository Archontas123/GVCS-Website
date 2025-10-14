/**
 * Seed file for Palindrome Number problem (LeetCode #9)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Get both contests
  const beginnerContest = await knex('contests').where('contest_name', 'Beginner Qual').first();
  const advancedContest = await knex('contests').where('contest_name', 'Advanced Qual').first();

  if (!beginnerContest || !advancedContest) {
    console.log('Contests not found, skipping problem seed data');
    return;
  }

  // Palindrome Number problem for both contests
  const palindromeProblem = {
    problem_letter: 'A',
    title: 'Palindrome Number',
    description: `Given an integer \`x\`, return \`true\` if \`x\` is a palindrome, and \`false\` otherwise.

**Example 1:**
Input: x = 121
Output: true
Explanation: 121 reads as 121 from left to right and from right to left.

**Example 2:**
Input: x = -121
Output: false
Explanation: From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.

**Example 3:**
Input: x = 10
Output: false
Explanation: Reads 01 from right to left. Therefore it is not a palindrome.

**Constraints:**
- -2³¹ <= x <= 2³¹ - 1

**Follow up:** Could you solve it without converting the integer to a string?`,
    input_format: 'Function parameter: x (integer)',
    output_format: 'Boolean value (true/false)',
    constraints: `-2³¹ <= x <= 2³¹ - 1`,
    time_limit: 1000,
    memory_limit: 256,
    difficulty: 'easy',
    max_points: 100,
    uses_leetcode_style: true,
    function_name: 'isPalindrome',
    function_parameters: JSON.stringify([
      { name: 'x', type: 'int', description: 'Integer to check' }
    ]),
    return_type: 'bool',
    parameter_descriptions: 'x: The integer to check if it is a palindrome',

    // Function signatures for each language
    function_signature_cpp: `bool isPalindrome(int x) {
    // Your solution here
    return false;
}`,
    function_signature_java: `public boolean isPalindrome(int x) {
    // Your solution here
    return false;
}`,
    function_signature_python: `def isPalindrome(self, x):
    # Your solution here
    return False`,
    function_signature_javascript: `function isPalindrome(x) {
    // Your solution here
    return false;
}`,

    // I/O wrappers for each language
    io_wrapper_cpp: `#include <iostream>
#include <string>
#include <sstream>
using namespace std;

{USER_FUNCTION}

int main() {
    string line;
    getline(cin, line);

    // Parse JSON-like input: {"x": 121}
    size_t xPos = line.find("\\"x\\":");
    string xStr = line.substr(xPos + 4);
    xStr = xStr.substr(0, xStr.find("}"));
    int x = stoi(xStr);

    bool result = isPalindrome(x);

    cout << (result ? "true" : "false") << endl;

    return 0;
}`,

    io_wrapper_java: `import java.util.*;
import java.io.*;
import com.google.gson.*;

public class Solution {
    {USER_FUNCTION}

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String input = br.readLine();

        Gson gson = new Gson();
        Map<String, Object> data = gson.fromJson(input, Map.class);

        int x = ((Double) data.get("x")).intValue();

        Solution sol = new Solution();
        boolean result = sol.isPalindrome(x);

        System.out.println(gson.toJson(result));
    }
}`,

    io_wrapper_python: `import json
import sys

{USER_FUNCTION}

if __name__ == "__main__":
    input_data = json.loads(input())

    x = input_data["x"]

    sol = Solution()
    result = sol.isPalindrome(x)

    print(json.dumps(result))`,

    io_wrapper_javascript: `{USER_FUNCTION}

// Read input
const input = require('fs').readFileSync(0, 'utf8').trim();
const data = JSON.parse(input);

const result = isPalindrome(data.x);
console.log(JSON.stringify(result));`,

    // Default solutions for each language
    default_solution_cpp: `bool isPalindrome(int x) {
    // Your solution here
    return false;
}`,
    default_solution_java: `public boolean isPalindrome(int x) {
    // Your solution here
    return false;
}`,
    default_solution_python: `def isPalindrome(self, x):
    # Your solution here
    return False`,
    default_solution_javascript: `function isPalindrome(x) {
    // Your solution here
    return false;
}`
  };

  // Insert problem for Beginner Qual
  const beginnerProblem = { ...palindromeProblem, contest_id: beginnerContest.id };
  const [beginnerProblemResult] = await knex('problems').insert(beginnerProblem).returning('id');
  const beginnerProblemId = beginnerProblemResult.id;

  // Insert problem for Advanced Qual
  const advancedProblem = { ...palindromeProblem, contest_id: advancedContest.id };
  const [advancedProblemResult] = await knex('problems').insert(advancedProblem).returning('id');
  const advancedProblemId = advancedProblemResult.id;

  // Test cases for Palindrome Number problem
  const createTestCases = (problemId) => [
    // Sample test cases (3)
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ x: 121 }),
      expected_return: JSON.stringify(true),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Example 1',
      explanation: '121 reads the same forwards and backwards',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ x: -121 }),
      expected_return: JSON.stringify(false),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Example 2',
      explanation: 'Negative numbers are not palindromes',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ x: 10 }),
      expected_return: JSON.stringify(false),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Example 3',
      explanation: '10 reversed is 01, which is not the same',
      converted_to_params: true
    },
    // Hidden test cases (9)
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 0 }),
      expected_return: JSON.stringify(true),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 1',
      explanation: 'Zero is a palindrome',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 1 }),
      expected_return: JSON.stringify(true),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 2',
      explanation: 'Single digit is a palindrome',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 12321 }),
      expected_return: JSON.stringify(true),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 3',
      explanation: 'Odd length palindrome',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 1221 }),
      expected_return: JSON.stringify(true),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 4',
      explanation: 'Even length palindrome',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 123 }),
      expected_return: JSON.stringify(false),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 5',
      explanation: 'Not a palindrome',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 9009 }),
      expected_return: JSON.stringify(true),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 6',
      explanation: 'Palindrome with zeros in middle',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: -1 }),
      expected_return: JSON.stringify(false),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 7',
      explanation: 'Negative single digit',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 1000021 }),
      expected_return: JSON.stringify(false),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 8',
      explanation: 'Large number that is not a palindrome',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 1234321 }),
      expected_return: JSON.stringify(true),
      parameter_types: JSON.stringify([{ name: 'x', type: 'int' }]),
      test_case_name: 'Hidden Test 9',
      explanation: 'Larger palindrome',
      converted_to_params: true
    }
  ];

  // Insert test cases for both problems
  await knex('test_cases').insert(createTestCases(beginnerProblemId));
  await knex('test_cases').insert(createTestCases(advancedProblemId));

  console.log('✅ Palindrome Number problem inserted for both contests');
  console.log('✅ Each problem has 3 sample test cases and 9 hidden test cases');
};

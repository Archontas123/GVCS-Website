/**
 * Seed file for LeetCode-style sample problems and test cases
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Get the first contest for demo problems
  const contest = await knex('contests').first('id');
  if (!contest) {
    console.log('No contests found, skipping LeetCode-style seed data');
    return;
  }

  // Check if LeetCode-style problem already exists
  const existingProblem = await knex('problems')
    .where('contest_id', contest.id)
    .where('problem_letter', 'Z')
    .first();

  if (existingProblem) {
    console.log('LeetCode-style Two Sum problem already exists, updating with new fields...');

    // Update the existing problem with LeetCode-style fields
    await knex('problems')
      .where('id', existingProblem.id)
      .update({
        uses_leetcode_style: true,
        function_name: 'twoSum',
        function_parameters: JSON.stringify([
          { name: 'nums', type: 'int[]', description: 'Array of integers' },
          { name: 'target', type: 'int', description: 'Target sum' }
        ]),
        return_type: 'int[]',
        parameter_descriptions: 'nums: Array of integers to search in\ntarget: The target sum to find',

        function_signature_cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}`,
        function_signature_java: `public int[] twoSum(int[] nums, int target) {
    // Your solution here
    return new int[]{};
}`,
        function_signature_python: `def twoSum(self, nums, target):
    # Your solution here
    return []`,
        function_signature_javascript: `function twoSum(nums, target) {
    // Your solution here
    return [];
}`
      });

    // Delete existing test cases and insert new parameter-based ones
    await knex('test_cases').where('problem_id', existingProblem.id).del();

    const testCases = [
      {
        problem_id: existingProblem.id,
        is_sample: true,
        input_parameters: JSON.stringify({
          nums: [2, 7, 11, 15],
          target: 9
        }),
        expected_return: JSON.stringify([0, 1]),
        parameter_types: JSON.stringify([
          { name: 'nums', type: 'array<int>' },
          { name: 'target', type: 'int' }
        ]),
        test_case_name: 'Example 1',
        explanation: 'Basic case: nums[0] + nums[1] = 2 + 7 = 9 = target',
        converted_to_params: true
      },
      {
        problem_id: existingProblem.id,
        is_sample: true,
        input_parameters: JSON.stringify({
          nums: [3, 2, 4],
          target: 6
        }),
        expected_return: JSON.stringify([1, 2]),
        parameter_types: JSON.stringify([
          { name: 'nums', type: 'array<int>' },
          { name: 'target', type: 'int' }
        ]),
        test_case_name: 'Example 2',
        explanation: 'nums[1] + nums[2] = 2 + 4 = 6 = target',
        converted_to_params: true
      }
    ];

    await knex('test_cases').insert(testCases);
    console.log('✅ Updated existing problem with LeetCode-style fields and test cases');
    return;
  }

  // Sample LeetCode-style problem: Two Sum
  const twoSumProblem = {
    contest_id: contest.id,
    problem_letter: 'Z', // Use Z to avoid conflicts
    title: 'Two Sum',
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

**Example 2:**
Input: nums = [3,2,4], target = 6
Output: [1,2]

**Example 3:**
Input: nums = [3,3], target = 6
Output: [0,1]`,
    input_format: 'Function parameters: nums (array of integers), target (integer)',
    output_format: 'Array of two integers representing indices',
    constraints: `- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
    time_limit: 1000,
    memory_limit: 256,
    difficulty: 'easy',
    max_points: 100,
    uses_leetcode_style: true,
    function_name: 'twoSum',
    function_parameters: JSON.stringify([
      { name: 'nums', type: 'int[]', description: 'Array of integers' },
      { name: 'target', type: 'int', description: 'Target sum' }
    ]),
    return_type: 'int[]',
    parameter_descriptions: 'nums: Array of integers to search in\ntarget: The target sum to find',

    // Function signatures for each language
    function_signature_cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}`,
    function_signature_java: `public int[] twoSum(int[] nums, int target) {
    // Your solution here
    return new int[]{};
}`,
    function_signature_python: `def twoSum(self, nums, target):
    # Your solution here
    return []`,
    function_signature_javascript: `function twoSum(nums, target) {
    // Your solution here
    return [];
}`,

    // I/O wrappers for each language
    io_wrapper_cpp: `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
using namespace std;

{USER_FUNCTION}

int main() {
    string line;
    getline(cin, line);

    // Parse JSON-like input: {"nums": [2,7,11,15], "target": 9}
    // Simple parsing for demo - in production use proper JSON library
    size_t numsStart = line.find("[");
    size_t numsEnd = line.find("]");
    string numsStr = line.substr(numsStart + 1, numsEnd - numsStart - 1);

    vector<int> nums;
    stringstream ss(numsStr);
    string token;
    while (getline(ss, token, ',')) {
        nums.push_back(stoi(token));
    }

    size_t targetPos = line.find("\"target\":");
    string targetStr = line.substr(targetPos + 9);
    targetStr = targetStr.substr(0, targetStr.find("}"));
    int target = stoi(targetStr);

    vector<int> result = twoSum(nums, target);

    cout << "[";
    for (int i = 0; i < result.size(); i++) {
        cout << result[i];
        if (i < result.size() - 1) cout << ",";
    }
    cout << "]" << endl;

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

        List<Double> numsList = (List<Double>) data.get("nums");
        int[] nums = numsList.stream().mapToInt(Double::intValue).toArray();
        int target = ((Double) data.get("target")).intValue();

        Solution sol = new Solution();
        int[] result = sol.twoSum(nums, target);

        System.out.println(gson.toJson(result));
    }
}`,

    io_wrapper_python: `import json
import sys

{USER_FUNCTION}

if __name__ == "__main__":
    input_data = json.loads(input())

    nums = input_data["nums"]
    target = input_data["target"]

    sol = Solution()
    result = sol.twoSum(nums, target)

    print(json.dumps(result))`,

    io_wrapper_javascript: `{USER_FUNCTION}

// Read input
const input = require('fs').readFileSync(0, 'utf8').trim();
const data = JSON.parse(input);

const result = twoSum(data.nums, data.target);
console.log(JSON.stringify(result));`,

    // Default solutions for each language
    default_solution_cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}`,
    default_solution_java: `public int[] twoSum(int[] nums, int target) {
    // Your solution here
    return new int[]{};
}`,
    default_solution_python: `def twoSum(self, nums, target):
    # Your solution here
    return []`,
    default_solution_javascript: `function twoSum(nums, target) {
    // Your solution here
    return [];
}`
  };

  // Insert the problem
  const [problemResult] = await knex('problems').insert(twoSumProblem).returning('id');
  const problemId = problemResult.id;

  // Sample test cases for Two Sum problem
  const testCases = [
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({
        nums: [2, 7, 11, 15],
        target: 9
      }),
      expected_return: JSON.stringify([0, 1]),
      parameter_types: JSON.stringify([
        { name: 'nums', type: 'array<int>' },
        { name: 'target', type: 'int' }
      ]),
      test_case_name: 'Example 1',
      explanation: 'Basic case: nums[0] + nums[1] = 2 + 7 = 9 = target',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({
        nums: [3, 2, 4],
        target: 6
      }),
      expected_return: JSON.stringify([1, 2]),
      parameter_types: JSON.stringify([
        { name: 'nums', type: 'array<int>' },
        { name: 'target', type: 'int' }
      ]),
      test_case_name: 'Example 2',
      explanation: 'nums[1] + nums[2] = 2 + 4 = 6 = target',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({
        nums: [3, 3],
        target: 6
      }),
      expected_return: JSON.stringify([0, 1]),
      parameter_types: JSON.stringify([
        { name: 'nums', type: 'array<int>' },
        { name: 'target', type: 'int' }
      ]),
      test_case_name: 'Example 3',
      explanation: 'Duplicate values: nums[0] + nums[1] = 3 + 3 = 6 = target',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({
        nums: [1, 2, 3, 4, 5],
        target: 8
      }),
      expected_return: JSON.stringify([2, 4]),
      parameter_types: JSON.stringify([
        { name: 'nums', type: 'array<int>' },
        { name: 'target', type: 'int' }
      ]),
      test_case_name: 'Hidden Test 1',
      explanation: 'nums[2] + nums[4] = 3 + 5 = 8 = target',
      converted_to_params: true
    }
  ];

  // Insert test cases
  await knex('test_cases').insert(testCases);

  console.log('✅ LeetCode-style sample data inserted successfully');
};

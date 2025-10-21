/**
 * Seed file for creating a sample contest with classic algorithm problems.
 * Problems: Two Sum (easy), Palindrome Number (medium), Three Sum (hard)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const CONTEST_NAME = 'Sample Test Contest';

const getInsertedId = (result) => {
  if (Array.isArray(result)) {
    const value = result[0];
    if (value === undefined || value === null) {
      return value;
    }
    if (typeof value === 'object' && 'id' in value) {
      return value.id;
    }
    return value;
  }

  if (result && typeof result === 'object' && 'id' in result) {
    return result.id;
  }

  return result;
};

const nowIso = () => new Date().toISOString();

const buildTwoSumProblem = (contestId) => ({
  contest_id: contestId,
  problem_letter: 'A',
  title: 'Two Sum',
  description: `Given an array of integers, return the indices of the two numbers such that they add up to a specific target.

You may assume that each input would have exactly one solution, and you may not use the same element twice. Return the answer in any order.

**Example 1**
- Input: nums = [2,7,11,15], target = 9
- Output: [0,1]

**Example 2**
- Input: nums = [3,2,4], target = 6
- Output: [1,2]

**Example 3**
- Input: nums = [3,3], target = 6
- Output: [0,1]

**Constraints**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Exactly one valid answer exists.`,
  input_format: 'Function parameters: nums (integer array), target (integer)',
  output_format: 'Array of two indices (0-based) that sum to the target',
  constraints: '2 <= nums.length <= 10^4, values range within 32-bit signed integers, one valid answer always exists.',
  sample_input: '{"nums":[2,7,11,15],"target":9}',
  sample_output: '[0,1]',
  explanation: 'Indices 0 (value 2) and 1 (value 7) add up to the target 9.',
  time_limit: 1500,
  memory_limit: 256,
  difficulty: 'easy',
  points_value: 5,
  max_points: 5,
  is_visible: true,
  uses_leetcode_style: true,
  function_name: 'twoSum',
  function_parameters: JSON.stringify([
    { name: 'nums', type: 'int[]', description: 'Array of integers' },
    { name: 'target', type: 'int', description: 'Target sum to find' }
  ]),
  return_type: 'int[]',
  parameter_descriptions: 'nums: Array of integers\n target: Desired sum of two numbers',
  function_signature_cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}`,
  function_signature_java: `public int[] twoSum(int[] nums, int target) {
    // Your solution here
    return new int[0];
}`,
  function_signature_python: `def twoSum(self, nums, target):
    # Your solution here
    return []`,
  function_signature_javascript: `function twoSum(nums, target) {
    // Your solution here
    return [];
}`,
  io_wrapper_cpp: `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

{USER_FUNCTION}

int main() {
    string input;
    if (!getline(cin, input)) {
        return 0;
    }

    vector<int> nums;
    size_t numsStart = input.find("[");
    size_t numsEnd = input.find("]");
    if (numsStart != string::npos && numsEnd != string::npos && numsEnd > numsStart) {
        string numbers = input.substr(numsStart + 1, numsEnd - numsStart - 1);
        stringstream ss(numbers);
        string token;
        while (getline(ss, token, ',')) {
            if (!token.empty()) {
                nums.push_back(stoi(token));
            }
        }
    }

    size_t targetPos = input.find("\"target\"");
    int target = 0;
    if (targetPos != string::npos) {
        size_t colonPos = input.find(":", targetPos);
        size_t endPos = input.find_first_of(",}", colonPos + 1);
        string targetStr = input.substr(colonPos + 1, endPos - colonPos - 1);
        target = stoi(targetStr);
    }

    vector<int> result = twoSum(nums, target);
    cout << "[";
    for (size_t i = 0; i < result.size(); ++i) {
        cout << result[i];
        if (i + 1 < result.size()) cout << ",";
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
        if (input == null || input.trim().isEmpty()) {
            return;
        }

        Gson gson = new Gson();
        Map<String, Object> data = gson.fromJson(input, Map.class);

        List<Double> numsRaw = (List<Double>) data.get("nums");
        int[] nums = new int[numsRaw.size()];
        for (int i = 0; i < numsRaw.size(); i++) {
            nums[i] = numsRaw.get(i).intValue();
        }

        Number targetNumber = (Number) data.get("target");
        int target = targetNumber.intValue();

        Solution sol = new Solution();
        int[] result = sol.twoSum(nums, target);
        System.out.println(gson.toJson(result));
    }
}`,
  io_wrapper_python: `import json
import sys

{USER_FUNCTION}

if __name__ == "__main__":
    line = sys.stdin.readline().strip()
    if not line:
        sys.exit(0)

    data = json.loads(line)
    nums = data["nums"]
    target = data["target"]

    sol = Solution()
    result = sol.twoSum(nums, target)
    print(json.dumps(result))`,
  io_wrapper_javascript: `{USER_FUNCTION}

const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();
if (!input) process.exit(0);

const data = JSON.parse(input);
const result = twoSum(data.nums, data.target);
console.log(JSON.stringify(result));`,
  default_solution_cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Implement a hash map based solution or any approach you prefer.
    // Ensure you return a vector with the two indices.
    return {};
}`,
  default_solution_java: `public int[] twoSum(int[] nums, int target) {
    // Implement a hash map based solution or any approach you prefer.
    // Ensure you return an array with the two indices.
    return new int[0];
}`,
  default_solution_python: `def twoSum(self, nums, target):
    # Implement a hash map based solution or any approach you prefer.
    # Ensure you return a list with the two indices.
    return []`,
  default_solution_javascript: `function twoSum(nums, target) {
    // Implement a hash map based solution or any approach you prefer.
    // Ensure you return an array with the two indices.
    return [];
}`,
  created_at: nowIso(),
  updated_at: nowIso()
});

const buildPalindromeProblem = (contestId) => ({
  contest_id: contestId,
  problem_letter: 'B',
  title: 'Palindrome Number',
  description: `Given an integer x, return true if x is a palindrome and false otherwise.

A palindrome is a number that reads the same backward as forward.

**Example 1**
- Input: x = 121
- Output: true

**Example 2**
- Input: x = -121
- Output: false

**Example 3**
- Input: x = 10
- Output: false

**Constraints**
- -2^31 <= x <= 2^31 - 1`,
  input_format: 'Function parameter: x (integer)',
  output_format: 'Boolean value (true/false)',
  constraints: '-2^31 <= x <= 2^31 - 1',
  sample_input: '{"x":121}',
  sample_output: 'true',
  explanation: '121 reads the same forwards and backwards.',
  time_limit: 1200,
  memory_limit: 256,
  difficulty: 'medium',
  points_value: 10,
  max_points: 10,
  is_visible: true,
  uses_leetcode_style: true,
  function_name: 'isPalindrome',
  function_parameters: JSON.stringify([
    { name: 'x', type: 'int', description: 'Integer to evaluate' }
  ]),
  return_type: 'bool',
  parameter_descriptions: 'x: Integer to check if it is a palindrome',
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
  io_wrapper_cpp: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

{USER_FUNCTION}

int main() {
    string line;
    if (!getline(cin, line)) {
        return 0;
    }

    size_t pos = line.find(":");
    string value = line.substr(pos + 1);
    value.erase(remove(value.begin(), value.end(), '}'), value.end());
    int x = stoi(value);

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
        if (input == null || input.trim().isEmpty()) {
            return;
        }

        Gson gson = new Gson();
        Map<String, Object> data = gson.fromJson(input, Map.class);
        int x = ((Number) data.get("x")).intValue();

        Solution sol = new Solution();
        boolean result = sol.isPalindrome(x);
        System.out.println(gson.toJson(result));
    }
}`,
  io_wrapper_python: `import json
import sys

{USER_FUNCTION}

if __name__ == "__main__":
    line = sys.stdin.readline().strip()
    if not line:
        sys.exit(0)

    data = json.loads(line)
    x = data["x"]

    sol = Solution()
    result = sol.isPalindrome(x)
    print(json.dumps(result))`,
  io_wrapper_javascript: `{USER_FUNCTION}

const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();
if (!input) process.exit(0);

const data = JSON.parse(input);
const result = isPalindrome(data.x);
console.log(JSON.stringify(result));`,
  default_solution_cpp: `bool isPalindrome(int x) {
    // Convert to string or reverse the integer. Any approach that handles overflow is accepted.
    return false;
}`,
  default_solution_java: `public boolean isPalindrome(int x) {
    // Convert to string or reverse the integer. Any approach that handles overflow is accepted.
    return false;
}`,
  default_solution_python: `def isPalindrome(self, x):
    # Convert to string or reverse the integer. Any approach that handles overflow is accepted.
    return False`,
  default_solution_javascript: `function isPalindrome(x) {
    // Convert to string or reverse the integer. Any approach that handles overflow is accepted.
    return false;
}`,
  created_at: nowIso(),
  updated_at: nowIso()
});

const buildThreeSumProblem = (contestId) => ({
  contest_id: contestId,
  problem_letter: 'C',
  title: 'Three Sum',
  description: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets. The order of the triplets does not matter.

**Example 1**
- Input: nums = [-1,0,1,2,-1,-4]
- Output: [[-1,-1,2],[-1,0,1]]

**Example 2**
- Input: nums = [0,1,1]
- Output: []

**Example 3**
- Input: nums = [0,0,0]
- Output: [[0,0,0]]

**Constraints**
- 3 <= nums.length <= 3000
- -10^5 <= nums[i] <= 10^5`,
  input_format: 'Function parameter: nums (array of integers)',
  output_format: 'Array of unique triplets that sum to zero',
  constraints: 'Array length between 3 and 3000, values range within 32-bit integers, output triplets must be unique.',
  sample_input: '{"nums":[-1,0,1,2,-1,-4]}',
  sample_output: '[[-1,-1,2],[-1,0,1]]',
  explanation: 'Triplets [-1,-1,2] and [-1,0,1] sum to zero without duplicates.',
  time_limit: 4000,
  memory_limit: 512,
  difficulty: 'hard',
  points_value: 15,
  max_points: 15,
  is_visible: true,
  uses_leetcode_style: true,
  function_name: 'threeSum',
  function_parameters: JSON.stringify([
    { name: 'nums', type: 'int[]', description: 'Array of integers' }
  ]),
  return_type: 'int[][]',
  parameter_descriptions: 'nums: Array of integers to evaluate for zero-sum triplets',
  function_signature_cpp: `vector<vector<int>> threeSum(vector<int>& nums) {
    // Your solution here
    return {};
}`,
  function_signature_java: `public List<List<Integer>> threeSum(int[] nums) {
    // Your solution here
    return new ArrayList<>();
}`,
  function_signature_python: `def threeSum(self, nums):
    # Your solution here
    return []`,
  function_signature_javascript: `function threeSum(nums) {
    // Your solution here
    return [];
}`,
  io_wrapper_cpp: `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
using namespace std;

{USER_FUNCTION}

int main() {
    string input;
    if (!getline(cin, input)) {
        return 0;
    }

    size_t start = input.find("[");
    size_t end = input.find("]");
    vector<int> nums;
    if (start != string::npos && end != string::npos && end > start) {
        string numsStr = input.substr(start + 1, end - start - 1);
        stringstream ss(numsStr);
        string token;
        while (getline(ss, token, ',')) {
            if (!token.empty()) {
                nums.push_back(stoi(token));
            }
        }
    }

    vector<vector<int>> result = threeSum(nums);
    for (auto& triplet : result) {
        sort(triplet.begin(), triplet.end());
    }
    sort(result.begin(), result.end());

    cout << "[";
    for (size_t i = 0; i < result.size(); ++i) {
        cout << "[";
        for (size_t j = 0; j < result[i].size(); ++j) {
            cout << result[i][j];
            if (j + 1 < result[i].size()) cout << ",";
        }
        cout << "]";
        if (i + 1 < result.size()) cout << ",";
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
        if (input == null || input.trim().isEmpty()) {
            return;
        }

        Gson gson = new Gson();
        Map<String, Object> data = gson.fromJson(input, Map.class);

        List<Double> numsRaw = (List<Double>) data.get("nums");
        int[] nums = new int[numsRaw.size()];
        for (int i = 0; i < numsRaw.size(); i++) {
            nums[i] = numsRaw.get(i).intValue();
        }

        Solution sol = new Solution();
        List<List<Integer>> result = sol.threeSum(nums);

        for (List<Integer> triplet : result) {
            Collections.sort(triplet);
        }
        result.sort((a, b) -> {
            for (int i = 0; i < Math.min(a.size(), b.size()); i++) {
                int cmp = Integer.compare(a.get(i), b.get(i));
                if (cmp != 0) return cmp;
            }
            return Integer.compare(a.size(), b.size());
        });

        System.out.println(gson.toJson(result));
    }
}`,
  io_wrapper_python: `import json
import sys

{USER_FUNCTION}

if __name__ == "__main__":
    line = sys.stdin.readline().strip()
    if not line:
        sys.exit(0)

    data = json.loads(line)
    nums = data["nums"]

    sol = Solution()
    result = sol.threeSum(nums)
    result = [sorted(triplet) for triplet in result]
    result.sort()
    print(json.dumps(result))`,
  io_wrapper_javascript: `{USER_FUNCTION}

const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();
if (!input) process.exit(0);

const data = JSON.parse(input);
let result = threeSum(data.nums);
result = result.map(triplet => triplet.slice().sort((a, b) => a - b));
result.sort((a, b) => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
});
console.log(JSON.stringify(result));`,
  default_solution_cpp: `vector<vector<int>> threeSum(vector<int>& nums) {
    // Implement an O(n^2) solution using sorting and two pointers or any approach you prefer.
    return {};
}`,
  default_solution_java: `public List<List<Integer>> threeSum(int[] nums) {
    // Implement an O(n^2) solution using sorting and two pointers or any approach you prefer.
    return new ArrayList<>();
}`,
  default_solution_python: `def threeSum(self, nums):
    # Implement an O(n^2) solution using sorting and two pointers or any approach you prefer.
    return []`,
  default_solution_javascript: `function threeSum(nums) {
    // Implement an O(n^2) solution using sorting and two pointers or any approach you prefer.
    return [];
}`,
  created_at: nowIso(),
  updated_at: nowIso()
});

const buildTwoSumTestCases = (problemId) => {
  const parameterTypes = JSON.stringify([
    { name: 'nums', type: 'int[]' },
    { name: 'target', type: 'int' }
  ]);

  return [
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ nums: [2, 7, 11, 15], target: 9 }),
      expected_return: JSON.stringify([0, 1]),
      parameter_types: parameterTypes,
      test_case_name: 'Example 1',
      explanation: 'Indices 0 and 1 sum to the target.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ nums: [3, 2, 4], target: 6 }),
      expected_return: JSON.stringify([1, 2]),
      parameter_types: parameterTypes,
      test_case_name: 'Example 2',
      explanation: 'Indices 1 and 2 sum to the target.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ nums: [3, 3], target: 6 }),
      expected_return: JSON.stringify([0, 1]),
      parameter_types: parameterTypes,
      test_case_name: 'Example 3',
      explanation: 'Both elements are equal and sum to the target.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [1, 5, 3, 7], target: 8 }),
      expected_return: JSON.stringify([0, 3]),
      parameter_types: parameterTypes,
      test_case_name: 'Mixed values',
      explanation: '1 + 7 = 8, indices 0 and 3.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [-1, -2, -3, -4, -5], target: -8 }),
      expected_return: JSON.stringify([2, 4]),
      parameter_types: parameterTypes,
      test_case_name: 'Negative numbers',
      explanation: '-3 + -5 = -8, indices 2 and 4.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [0, 4, 3, 0], target: 0 }),
      expected_return: JSON.stringify([0, 3]),
      parameter_types: parameterTypes,
      test_case_name: 'Zeros included',
      explanation: 'Handles duplicates and zero values.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [-3, 4, 3, 90], target: 0 }),
      expected_return: JSON.stringify([0, 2]),
      parameter_types: parameterTypes,
      test_case_name: 'Positive and negative',
      explanation: '-3 + 3 = 0.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [2, 5, 9, 13, 15], target: 20 }),
      expected_return: JSON.stringify([1, 4]),
      parameter_types: parameterTypes,
      test_case_name: 'Larger target',
      explanation: '5 + 15 = 20, indices 1 and 4.',
      converted_to_params: true
    }
  ];
};

const buildPalindromeTestCases = (problemId) => {
  const parameterTypes = JSON.stringify([{ name: 'x', type: 'int' }]);

  return [
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ x: 121 }),
      expected_return: JSON.stringify(true),
      parameter_types: parameterTypes,
      test_case_name: 'Example 1',
      explanation: '121 reads the same forwards and backwards.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ x: -121 }),
      expected_return: JSON.stringify(false),
      parameter_types: parameterTypes,
      test_case_name: 'Example 2',
      explanation: 'Negative numbers are not palindromes.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ x: 10 }),
      expected_return: JSON.stringify(false),
      parameter_types: parameterTypes,
      test_case_name: 'Example 3',
      explanation: '10 reversed is 01, not the same.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 0 }),
      expected_return: JSON.stringify(true),
      parameter_types: parameterTypes,
      test_case_name: 'Zero value',
      explanation: 'Zero is a palindrome number.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 12321 }),
      expected_return: JSON.stringify(true),
      parameter_types: parameterTypes,
      test_case_name: 'Odd length palindrome',
      explanation: 'Symmetric odd-length number.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 1221 }),
      expected_return: JSON.stringify(true),
      parameter_types: parameterTypes,
      test_case_name: 'Even length palindrome',
      explanation: 'Symmetric even-length number.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 123 }),
      expected_return: JSON.stringify(false),
      parameter_types: parameterTypes,
      test_case_name: 'Non-palindrome',
      explanation: 'Simple non-palindrome case.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 9009 }),
      expected_return: JSON.stringify(true),
      parameter_types: parameterTypes,
      test_case_name: 'Zeros inside',
      explanation: 'Palindrome with zeros in the middle.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: -1 }),
      expected_return: JSON.stringify(false),
      parameter_types: parameterTypes,
      test_case_name: 'Negative single digit',
      explanation: 'Negative values fail immediately.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 1000021 }),
      expected_return: JSON.stringify(false),
      parameter_types: parameterTypes,
      test_case_name: 'Non-palindrome large',
      explanation: 'Large non-palindrome for overflow guard.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ x: 123454321 }),
      expected_return: JSON.stringify(true),
      parameter_types: parameterTypes,
      test_case_name: 'Large palindrome',
      explanation: 'Long positive palindrome.',
      converted_to_params: true
    }
  ];
};

const buildThreeSumTestCases = (problemId) => {
  const parameterTypes = JSON.stringify([{ name: 'nums', type: 'int[]' }]);

  return [
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ nums: [-1, 0, 1, 2, -1, -4] }),
      expected_return: JSON.stringify([[-1, -1, 2], [-1, 0, 1]]),
      parameter_types: parameterTypes,
      test_case_name: 'Example 1',
      explanation: 'Two unique triplets that sum to zero.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ nums: [0, 1, 1] }),
      expected_return: JSON.stringify([]),
      parameter_types: parameterTypes,
      test_case_name: 'Example 2',
      explanation: 'No valid triplet.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: true,
      input_parameters: JSON.stringify({ nums: [0, 0, 0] }),
      expected_return: JSON.stringify([[0, 0, 0]]),
      parameter_types: parameterTypes,
      test_case_name: 'Example 3',
      explanation: 'Triplet of zeros is valid.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [-1, 0, 1] }),
      expected_return: JSON.stringify([[-1, 0, 1]]),
      parameter_types: parameterTypes,
      test_case_name: 'Minimum length',
      explanation: 'Just three numbers forming a valid triplet.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [1, 2, 3] }),
      expected_return: JSON.stringify([]),
      parameter_types: parameterTypes,
      test_case_name: 'All positive',
      explanation: 'Positive numbers cannot sum to zero.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [-1, -2, -3] }),
      expected_return: JSON.stringify([]),
      parameter_types: parameterTypes,
      test_case_name: 'All negative',
      explanation: 'Negative numbers cannot sum to zero.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [-2, 0, 1, 1, 2] }),
      expected_return: JSON.stringify([[-2, 0, 2], [-2, 1, 1]]),
      parameter_types: parameterTypes,
      test_case_name: 'Multiple solutions',
      explanation: 'Multiple unique triplets.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6] }),
      expected_return: JSON.stringify([[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]),
      parameter_types: parameterTypes,
      test_case_name: 'Large with duplicates',
      explanation: 'Ensures duplicates are handled correctly.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [0, 0, 0, 0] }),
      expected_return: JSON.stringify([[0, 0, 0]]),
      parameter_types: parameterTypes,
      test_case_name: 'Duplicate zeros',
      explanation: 'Should not duplicate the same triplet.',
      converted_to_params: true
    },
    {
      problem_id: problemId,
      is_sample: false,
      input_parameters: JSON.stringify({ nums: [-1, 0, 1, 2, -1, -4, -2, -3, 3, 0, 4] }),
      expected_return: JSON.stringify([[-4, 0, 4], [-4, 1, 3], [-3, -1, 4], [-3, 0, 3], [-3, 1, 2], [-2, -1, 3], [-2, 0, 2], [-1, -1, 2], [-1, 0, 1]]),
      parameter_types: parameterTypes,
      test_case_name: 'Complex mix',
      explanation: 'Classic comprehensive test case.',
      converted_to_params: true
    }
  ];
};

exports.seed = async function(knex) {
  const adminUser = await knex('admin_users').orderBy('id').first();
  const createdBy = adminUser ? adminUser.id : null;

  const startTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  let contest = await knex('contests').where('contest_name', CONTEST_NAME).first();
  let contestId;

  if (!contest) {
    const contestInsert = await knex('contests')
      .insert({
        contest_name: CONTEST_NAME,
        description: 'Sample programming contest featuring classic LeetCode-style problems for testing the platform.',
        registration_code: 'SAMPLETEST',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: 120,
        freeze_time: 30,
        is_active: false,
        is_registration_open: true,
        is_frozen: false,
        scoring_type: 'icpc',
        created_by: createdBy,
        created_at: nowIso(),
        updated_at: nowIso()
      })
      .returning('id');

    contestId = getInsertedId(contestInsert);
    contest = await knex('contests').where('id', contestId).first();
    console.log(`✅ Created contest "${CONTEST_NAME}" with id ${contestId}`);
  } else {
    contestId = contest.id;
    await knex('contests')
      .where('id', contestId)
      .update({
        description: 'Sample programming contest featuring classic LeetCode-style problems for testing the platform.',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: 120,
        freeze_time: 30,
        updated_at: nowIso()
      });
    console.log(`ℹ️ Updated contest "${CONTEST_NAME}" schedule to keep it fresh.`);
  }

  const problemBuilders = [
    { builder: buildTwoSumProblem, testCases: buildTwoSumTestCases },
    { builder: buildPalindromeProblem, testCases: buildPalindromeTestCases },
    { builder: buildThreeSumProblem, testCases: buildThreeSumTestCases }
  ];

  for (const { builder, testCases } of problemBuilders) {
    const problemData = builder(contestId);
    const existing = await knex('problems')
      .where({ contest_id: contestId, title: problemData.title })
      .first();

    let problemId;

    if (existing) {
      problemId = existing.id;
      await knex('problems')
        .where('id', problemId)
        .update({
          ...problemData,
          contest_id: contestId,
          created_at: existing.created_at,
          updated_at: nowIso()
        });
      await knex('test_cases').where('problem_id', problemId).del();
      console.log(`♻️ Refreshed problem "${problemData.title}" (id ${problemId})`);
    } else {
      const insertResult = await knex('problems')
        .insert(problemData)
        .returning('id');
      problemId = getInsertedId(insertResult);
      console.log(`✅ Added problem "${problemData.title}" (id ${problemId})`);
    }

    const cases = testCases(problemId);
    if (cases.length > 0) {
      await knex('test_cases').insert(cases);
    }
    console.log(`   ↳ Inserted ${cases.length} test cases for "${problemData.title}"`);
  }

  console.log('🎯 Sample test contest seeding complete.');
};

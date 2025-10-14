const { db } = require('./src/utils/db');

const problem3 = {
  contest_id: 15,
  problem_letter: 'C',
  title: '3Sum',
  description: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.

**Example 1:**
Input: nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]
Explanation:
nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0.
nums[1] + nums[2] + nums[4] = 0 + 1 + (-1) = 0.
The distinct triplets are [-1,0,1] and [-1,-1,2].

**Example 2:**
Input: nums = [0,1,1]
Output: []
Explanation: The only possible triplet does not sum up to 0.

**Example 3:**
Input: nums = [0,0,0]
Output: [[0,0,0]]
Explanation: The only possible triplet sums up to 0.

**Constraints:**
- 3 <= nums.length <= 3000
- -10^5 <= nums[i] <= 10^5`,
  input_format: 'Function parameter: nums (array of integers)',
  output_format: '2D array of triplets that sum to zero',
  constraints: '3 <= nums.length <= 3000, -10^5 <= nums[i] <= 10^5',
  time_limit: 2000,
  memory_limit: 256,
  difficulty: 'medium',
  points_value: 4,
  max_points: 100,
  is_visible: true,
  uses_leetcode_style: true,
  function_name: 'threeSum',
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
  function_parameters: JSON.stringify([
    { name: 'nums', type: 'integer[]', description: 'Array of integers' }
  ]),
  return_type: 'integer[][]',
  parameter_descriptions: 'nums: Array of integers',
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

    // Parse JSON: {"nums":[-1,0,1,2,-1,-4]}
    size_t start = line.find("[") + 1;
    size_t end = line.find("]");
    string numsStr = line.substr(start, end - start);

    vector<int> nums;
    stringstream ss(numsStr);
    string token;
    while (getline(ss, token, ',')) {
        nums.push_back(stoi(token));
    }

    vector<vector<int>> result = threeSum(nums);

    // Sort result for consistent output
    for (auto& triplet : result) {
        sort(triplet.begin(), triplet.end());
    }
    sort(result.begin(), result.end());

    cout << "[";
    for (int i = 0; i < result.size(); i++) {
        cout << "[";
        for (int j = 0; j < result[i].size(); j++) {
            cout << result[i][j];
            if (j < result[i].size() - 1) cout << ",";
        }
        cout << "]";
        if (i < result.size() - 1) cout << ",";
    }
    cout << "]" << endl;

    return 0;
}`,
  io_wrapper_java: `import java.util.*;
import java.io.*;

public class Solution {
    {USER_FUNCTION}

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String input = br.readLine();

        // Parse JSON: {"nums":[-1,0,1,2,-1,-4]}
        String numsStr = input.substring(input.indexOf("[") + 1, input.indexOf("]"));
        String[] numStrs = numsStr.split(",");
        int[] nums = new int[numStrs.length];
        for (int i = 0; i < numStrs.length; i++) {
            nums[i] = Integer.parseInt(numStrs[i].trim());
        }

        Solution sol = new Solution();
        List<List<Integer>> result = sol.threeSum(nums);

        // Sort result for consistent output
        for (List<Integer> triplet : result) {
            Collections.sort(triplet);
        }
        result.sort((a, b) -> {
            for (int i = 0; i < Math.min(a.size(), b.size()); i++) {
                int cmp = a.get(i).compareTo(b.get(i));
                if (cmp != 0) return cmp;
            }
            return Integer.compare(a.size(), b.size());
        });

        System.out.print("[");
        for (int i = 0; i < result.size(); i++) {
            System.out.print("[");
            for (int j = 0; j < result.get(i).size(); j++) {
                System.out.print(result.get(i).get(j));
                if (j < result.get(i).size() - 1) System.out.print(",");
            }
            System.out.print("]");
            if (i < result.size() - 1) System.out.print(",");
        }
        System.out.println("]");
    }
}`,
  io_wrapper_python: `import json

{USER_FUNCTION}

if __name__ == "__main__":
    input_data = json.loads(input())
    nums = input_data["nums"]

    sol = Solution()
    result = sol.threeSum(nums)

    # Sort result for consistent output
    result = [sorted(triplet) for triplet in result]
    result.sort()

    print(json.dumps(result))`
};

(async () => {
  try {
    const [problemId] = await db('problems').insert(problem3).returning('id');
    console.log('3Sum problem created with ID:', problemId.id);

    // Create 11 test cases
    const parameterTypes = JSON.stringify([{ name: 'nums', type: 'integer[]' }]);
    const testCases = [
      {
        problem_id: problemId.id,
        is_sample: true,
        input_parameters: JSON.stringify({nums: [-1,0,1,2,-1,-4]}),
        expected_return: JSON.stringify([[-1,-1,2],[-1,0,1]]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Example 1',
        explanation: 'Two valid triplets that sum to 0'
      },
      {
        problem_id: problemId.id,
        is_sample: true,
        input_parameters: JSON.stringify({nums: [0,1,1]}),
        expected_return: JSON.stringify([]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Example 2',
        explanation: 'No valid triplets'
      },
      {
        problem_id: problemId.id,
        is_sample: true,
        input_parameters: JSON.stringify({nums: [0,0,0]}),
        expected_return: JSON.stringify([[0,0,0]]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Example 3',
        explanation: 'Only one valid triplet of all zeros'
      },
      {
        problem_id: problemId.id,
        input_parameters: JSON.stringify({nums: [-1,0,1]}),
        expected_return: JSON.stringify([[-1,0,1]]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Minimum valid case',
        explanation: 'Exactly 3 elements that sum to 0'
      },
      {
        problem_id: problemId.id,
        input_parameters: JSON.stringify({nums: [1,2,3]}),
        expected_return: JSON.stringify([]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'All positive',
        explanation: 'All positive numbers cannot sum to 0'
      },
      {
        problem_id: problemId.id,
        input_parameters: JSON.stringify({nums: [-1,-2,-3]}),
        expected_return: JSON.stringify([]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'All negative',
        explanation: 'All negative numbers cannot sum to 0'
      },
      {
        problem_id: problemId.id,
        input_parameters: JSON.stringify({nums: [-2,0,1,1,2]}),
        expected_return: JSON.stringify([[-2,0,2],[-2,1,1]]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Multiple solutions',
        explanation: 'Multiple valid triplets'
      },
      {
        problem_id: problemId.id,
        input_parameters: JSON.stringify({nums: [-4,-2,-2,-2,0,1,2,2,2,3,3,4,4,6,6]}),
        expected_return: JSON.stringify([[-4,-2,6],[-4,0,4],[-4,1,3],[-4,2,2],[-2,-2,4],[-2,0,2]]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Large case with duplicates',
        explanation: 'Complex case with many duplicates'
      },
      {
        problem_id: problemId.id,
        input_parameters: JSON.stringify({nums: [0,0,0,0]}),
        expected_return: JSON.stringify([[0,0,0]]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Multiple zeros',
        explanation: 'Only one unique triplet despite multiple zeros'
      },
      {
        problem_id: problemId.id,
        input_parameters: JSON.stringify({nums: [-1,0,1,2,-1,-4,-2,-3,3,0,4]}),
        expected_return: JSON.stringify([[-4,0,4],[-4,1,3],[-3,-1,4],[-3,0,3],[-3,1,2],[-2,-1,3],[-2,0,2],[-1,-1,2],[-1,0,1]]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Complex mixed case',
        explanation: 'Many possible combinations'
      },
      {
        problem_id: problemId.id,
        input_parameters: JSON.stringify({nums: [3,0,-2,-1,1,2]}),
        expected_return: JSON.stringify([[-2,-1,3],[-2,0,2],[-1,0,1]]),
        parameter_types: parameterTypes,
        converted_to_params: true,
        test_case_name: 'Mixed order',
        explanation: 'Array not sorted initially'
      }
    ];

    await db('test_cases').insert(testCases);
    console.log('Test cases created successfully for 3Sum problem');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

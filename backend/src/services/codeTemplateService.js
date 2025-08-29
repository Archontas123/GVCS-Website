/**
 * LeetCode-style Code Template Service
 * Generates complete executable code from user's function implementation
 */

const { db } = require('../utils/db');

class CodeTemplateService {
  
  /**
   * Get the function signature that users see for a problem
   * @param {number} problemId - Problem ID
   * @param {string} language - Programming language (cpp, java, python)
   * @returns {Promise<string>} Function signature template
   */
  async getFunctionSignature(problemId, language) {
    try {
      const problem = await db('problems')
        .where('id', problemId)
        .first(`function_signature_${language}`);
        
      if (!problem) {
        throw new Error('Problem not found');
      }
      
      const signature = problem[`function_signature_${language}`];
      if (!signature) {
        return this.getDefaultSignature(language);
      }
      
      return signature;
    } catch (error) {
      console.error('Error getting function signature:', error);
      return this.getDefaultSignature(language);
    }
  }

  /**
   * Get default function signatures for each language
   */
  getDefaultSignature(language) {
    const defaults = {
      cpp: `int solution(vector<int>& nums) {
    // Your solution here
    return 0;
}`,
      java: `public int solution(int[] nums) {
    // Your solution here
    return 0;
}`,
      python: `def solution(nums):
    # Your solution here
    return 0`
    };
    
    return defaults[language] || '// Default solution';
  }

  /**
   * Generate complete executable code by combining user function with I/O wrapper
   * @param {number} problemId - Problem ID
   * @param {string} language - Programming language
   * @param {string} userCode - User's function implementation
   * @returns {Promise<string>} Complete executable code
   */
  async generateExecutableCode(problemId, language, userCode) {
    try {
      const problem = await db('problems')
        .where('id', problemId)
        .first(`io_wrapper_${language}`, 'input_format', 'output_format');
        
      if (!problem) {
        throw new Error('Problem not found');
      }
      
      let wrapper = problem[`io_wrapper_${language}`];
      if (!wrapper) {
        wrapper = this.getDefaultWrapper(language);
      }
      
      // Inject user code into wrapper
      const completeCode = wrapper.replace('{USER_FUNCTION}', userCode);
      
      // Add input/output parsing based on problem format
      return this.addInputOutputParsing(completeCode, language, problem);
      
    } catch (error) {
      console.error('Error generating executable code:', error);
      throw error;
    }
  }

  /**
   * Add JSON input/output parsing to the wrapper code
   */
  addInputOutputParsing(code, language, problem) {
    const inputFormat = problem.input_format || '{}';
    const outputFormat = problem.output_format || '0';
    
    switch (language) {
      case 'cpp':
        return this.addCppParsing(code, inputFormat, outputFormat);
      case 'java': 
        return this.addJavaParsing(code, inputFormat, outputFormat);
      case 'python':
        return this.addPythonParsing(code, inputFormat, outputFormat);
      default:
        return code;
    }
  }

  /**
   * Add C++ JSON parsing (simplified - would need JSON library in production)
   */
  addCppParsing(code, inputFormat, outputFormat) {
    const parsingCode = `
    // Parse input from stdin
    string line;
    getline(cin, line);
    
    // Simple parsing for demo - would use JSON library in production
    istringstream iss(line);
    vector<int> nums;
    int target = 0;
    
    // Call user solution
    int result = solution(nums, target);
    cout << result << endl;
`;
    
    return code.replace('// Parse JSON input and call user function', parsingCode)
               .replace('// Output JSON result', '');
  }

  /**
   * Add Java JSON parsing using Gson
   */
  addJavaParsing(code, inputFormat, outputFormat) {
    const parsingCode = `
        String input = br.readLine();
        Gson gson = new Gson();
        
        // Parse JSON input
        Map<String, Object> data = gson.fromJson(input, Map.class);
        
        // Extract parameters and call user solution
        Solution sol = new Solution();
        Object result = sol.solution(data);
        
        // Output result as JSON
        System.out.println(gson.toJson(result));
`;
    
    return code.replace('// Parse JSON input and call user function', parsingCode)
               .replace('// Output JSON result', '');
  }

  /**
   * Add Python JSON parsing 
   */
  addPythonParsing(code, inputFormat, outputFormat) {
    const parsingCode = `
    input_data = json.loads(input())
    
    # Extract parameters and call user solution
    result = solution(input_data)
    
    # Output result as JSON
    print(json.dumps(result))
`;
    
    return code.replace('# Parse JSON input and call user function', parsingCode)
               .replace('# Output JSON result', '');
  }

  /**
   * Get default I/O wrappers
   */
  getDefaultWrapper(language) {
    const wrappers = {
      cpp: `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

{USER_FUNCTION}

int main() {
    // Parse JSON input and call user function
    // Output JSON result
    return 0;
}`,
      
      java: `import java.util.*;
import java.io.*;

public class Solution {
    {USER_FUNCTION}
    
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // Parse JSON input and call user function
        // Output JSON result
    }
}`,
      
      python: `import json
import sys

{USER_FUNCTION}

if __name__ == "__main__":
    # Parse JSON input and call user function
    # Output JSON result
    pass`
    };
    
    return wrappers[language] || '';
  }

  /**
   * Get user's current implementation for a problem
   * @param {number} teamId - Team ID
   * @param {number} problemId - Problem ID  
   * @param {string} language - Programming language
   * @returns {Promise<string>} User's code or default template
   */
  async getUserImplementation(teamId, problemId, language) {
    try {
      // Check if user has saved work
      const savedCode = await db('team_problem_code')
        .where({
          team_id: teamId,
          problem_id: problemId,
          language: language
        })
        .first('code');
        
      if (savedCode) {
        return savedCode.code;
      }
      
      // Return default implementation
      const problem = await db('problems')
        .where('id', problemId)
        .first(`default_solution_${language}`);
        
      return problem?.[`default_solution_${language}`] || `// Your solution here\nreturn 0;`;
      
    } catch (error) {
      console.error('Error getting user implementation:', error);
      return `// Your solution here\nreturn 0;`;
    }
  }

  /**
   * Save user's implementation 
   * @param {number} teamId - Team ID
   * @param {number} problemId - Problem ID
   * @param {string} language - Programming language
   * @param {string} code - User's function implementation
   */
  async saveUserImplementation(teamId, problemId, language, code) {
    try {
      await db('team_problem_code')
        .insert({
          team_id: teamId,
          problem_id: problemId,
          language: language,
          code: code,
          saved_at: new Date()
        })
        .onConflict(['team_id', 'problem_id', 'language'])
        .merge({
          code: code,
          saved_at: new Date()
        });
        
      console.log(`Saved code for team ${teamId}, problem ${problemId}, language ${language}`);
    } catch (error) {
      console.error('Error saving user implementation:', error);
      throw error;
    }
  }
}

module.exports = new CodeTemplateService();
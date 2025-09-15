const { db } = require('../utils/db');

/**
 * Service for generating executable code from user function implementations
 * Provides code template management for programming contest problems
 */
class CodeTemplateService {
  /**
   * Initialize the code template service
   */
  constructor() {}
  
  /**
   * Get the function signature that users see for a problem
   * @param {number} problemId - Problem ID
   * @param {string} language - Programming language (cpp, java, python)
   * @returns {Promise<string>} Function signature template
   * @throws {Error} When problem is not found or database error occurs
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
      return this.getDefaultSignature(language);
    }
  }

  /**
   * Get default function signatures for each language
   * @param {string} language - Programming language (cpp, java, python)
   * @returns {string} Default function signature template for the specified language
   * @private
   */
  getDefaultSignature(language) {
    const defaults = {
      cpp: `int solution(vector<int>& nums) {
    return 0;
}`,
      java: `public int solution(int[] nums) {
    return 0;
}`,
      python: `def solution(nums):
    return 0`
    };
    
    return defaults[language] || 'Default solution';
  }

  /**
   * Generate complete executable code by combining user function with I/O wrapper
   * @param {number} problemId - Problem ID
   * @param {string} language - Programming language
   * @param {string} userCode - User's function implementation
   * @returns {Promise<string>} Complete executable code
   * @throws {Error} When problem is not found or code generation fails
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
      
      const completeCode = wrapper.replace('{USER_FUNCTION}', userCode);
      
      return this.addInputOutputParsing(completeCode, language, problem);
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add JSON input/output parsing to the wrapper code
   * @param {string} code - The wrapper code to modify
   * @param {string} language - Programming language (cpp, java, python)
   * @param {Object} problem - Problem data containing input/output format
   * @param {string} problem.input_format - Expected input format
   * @param {string} problem.output_format - Expected output format
   * @returns {string} Modified code with input/output parsing added
   * @private
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
   * @param {string} code - The C++ wrapper code to modify
   * @param {string} inputFormat - Expected input format
   * @param {string} outputFormat - Expected output format
   * @returns {string} Modified C++ code with JSON parsing added
   * @private
   */
  addCppParsing(code, inputFormat, outputFormat) {
    const parsingCode = `
    string line;
    getline(cin, line);
    
    istringstream iss(line);
    vector<int> nums;
    int target = 0;
    
    int result = solution(nums, target);
    cout << result << endl;
`;
    
    return code.replace('// Parse JSON input and call user function', parsingCode)
               .replace('// Output JSON result', '');
  }

  /**
   * Add Java JSON parsing using Gson
   * @param {string} code - The Java wrapper code to modify
   * @param {string} inputFormat - Expected input format
   * @param {string} outputFormat - Expected output format
   * @returns {string} Modified Java code with JSON parsing added
   * @private
   */
  addJavaParsing(code, inputFormat, outputFormat) {
    const parsingCode = `
        String input = br.readLine();
        Gson gson = new Gson();
        
        Map<String, Object> data = gson.fromJson(input, Map.class);
        
        Solution sol = new Solution();
        Object result = sol.solution(data);
        
        System.out.println(gson.toJson(result));
`;
    
    return code.replace('// Parse JSON input and call user function', parsingCode)
               .replace('// Output JSON result', '');
  }

  /**
   * Add Python JSON parsing
   * @param {string} code - The Python wrapper code to modify
   * @param {string} inputFormat - Expected input format
   * @param {string} outputFormat - Expected output format
   * @returns {string} Modified Python code with JSON parsing added
   * @private
   */
  addPythonParsing(code, inputFormat, outputFormat) {
    const parsingCode = `
    input_data = json.loads(input())
    
    result = solution(input_data)
    
    print(json.dumps(result))
`;
    
    return code.replace('# Parse JSON input and call user function', parsingCode)
               .replace('# Output JSON result', '');
  }

  /**
   * Get default I/O wrappers for each programming language
   * @param {string} language - Programming language (cpp, java, python)
   * @returns {string} Default I/O wrapper template for the specified language
   * @private
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
      
      const problem = await db('problems')
        .where('id', problemId)
        .first(`default_solution_${language}`);
        
      return problem?.[`default_solution_${language}`] || `// Your solution here\nreturn 0;`;
      
    } catch (error) {
      return `// Your solution here\nreturn 0;`;
    }
  }

  /**
   * Save user's implementation 
   * @param {number} teamId - Team ID
   * @param {number} problemId - Problem ID
   * @param {string} language - Programming language
   * @param {string} code - User's function implementation
   * @returns {Promise<void>}
   * @throws {Error} When database operation fails
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
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CodeTemplateService();
const { db } = require('../utils/db');
const TypeSystemService = require('./typeSystemService');

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
        .first(`function_signature_${language}`, 'function_parameters', 'return_type');

      if (!problem) {
        throw new Error('Problem not found');
      }

      const signature = problem[`function_signature_${language}`];
      if (signature) {
        return signature;
      }

      // Generate dynamic signature if parameters are defined
      if (problem.function_parameters) {
        return this.generateDynamicSignature(problem, language);
      }

      return this.getDefaultSignature(language);
    } catch (error) {
      return this.getDefaultSignature(language);
    }
  }

  /**
   * Generate dynamic function signature based on parameters
   * Uses bracket notation type system (INT, INT[], INT[][], STRING[], etc.)
   * @param {Object} problem - Problem data
   * @param {string} language - Programming language
   * @returns {string} Generated function signature
   * @private
   */
  generateDynamicSignature(problem, language) {
    try {
      // Handle both string JSON and already parsed objects
      const functionParams = typeof problem.function_parameters === 'string'
        ? JSON.parse(problem.function_parameters)
        : problem.function_parameters || [];
      const returnType = problem.return_type || 'INT';

      if (functionParams.length === 0) {
        return this.getDefaultSignature(language);
      }

      // Parse return type with bracket notation
      const { baseType: returnBaseType, dimensions: returnDimensions } = TypeSystemService.parseType(returnType);
      const languageReturnType = TypeSystemService.getLanguageType(returnBaseType, language, returnDimensions);

      const paramStrings = functionParams.map(param => {
        // Parse parameter type with bracket notation
        const { baseType, dimensions } = TypeSystemService.parseType(param.type);
        const langType = TypeSystemService.getLanguageType(baseType, language, dimensions);

        switch (language) {
          case 'cpp':
            // For C++, use reference for arrays/vectors, value for scalars
            const useRef = dimensions > 0;
            return useRef ? `${langType}& ${param.name}` : `${langType} ${param.name}`;
          case 'java':
            return `${langType} ${param.name}`;
          case 'python':
            return param.name;
        }
      });

      switch (language) {
        case 'cpp':
          return `${languageReturnType} solution(${paramStrings.join(', ')}) {\n    // Your code here\n    return ${this.getDefaultReturnValue(returnType, language)};\n}`;
        case 'java':
          return `public ${languageReturnType} solution(${paramStrings.join(', ')}) {\n    // Your code here\n    return ${this.getDefaultReturnValue(returnType, language)};\n}`;
        case 'python':
          return `def solution(${paramStrings.join(', ')}):\n    # Your code here\n    return ${this.getDefaultReturnValue(returnType, language)}`;
        default:
          return this.getDefaultSignature(language);
      }
    } catch (error) {
      console.error('Error generating dynamic signature:', error);
      return this.getDefaultSignature(language);
    }
  }

  /**
   * Get default return value for a type and language
   * Handles bracket notation (INT, INT[], INT[][], etc.)
   * @param {string} typeStr - Type string with bracket notation
   * @param {string} language - Programming language
   * @returns {string} Default return value
   * @private
   */
  getDefaultReturnValue(typeStr, language) {
    // Parse the type to get base type and dimensions
    const { baseType, dimensions } = TypeSystemService.parseType(typeStr);

    // For arrays, return empty array/vector syntax
    if (dimensions > 0) {
      if (language === 'cpp') {
        return '{}';
      } else if (language === 'java') {
        const langType = TypeSystemService.getLanguageType(baseType, language, dimensions);
        return `new ${langType.replace(/\[\]/g, '[0]')}`;
      } else if (language === 'python') {
        return '[]';
      }
    }

    // For scalars, return base type defaults
    const defaults = {
      cpp: {
        'integer': '0',
        'string': '""',
        'boolean': 'false',
        'float': '0.0',
        'character': "'\\0'"
      },
      java: {
        'integer': '0',
        'string': '""',
        'boolean': 'false',
        'float': '0.0',
        'character': "'\\0'"
      },
      python: {
        'integer': '0',
        'string': '""',
        'boolean': 'False',
        'float': '0.0',
        'character': "''"
      }
    };

    return defaults[language]?.[baseType] || defaults[language]?.['integer'] || '0';
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
        .first(`io_wrapper_${language}`, 'input_format', 'output_format', 'function_parameters', 'return_type');

      if (!problem) {
        throw new Error('Problem not found');
      }

      let wrapper = problem[`io_wrapper_${language}`];
      if (!wrapper) {
        wrapper = this.getDefaultWrapper(language);
      }

      const completeCode = wrapper.replace('{USER_FUNCTION}', userCode);

      // Use dynamic parameter parsing based on problem's function_parameters
      return this.addDynamicInputOutputParsing(completeCode, language, problem);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Add dynamic JSON input/output parsing based on function parameters
   * @param {string} code - The wrapper code to modify
   * @param {string} language - Programming language (cpp, java, python)
   * @param {Object} problem - Problem data containing function parameters
   * @param {string} problem.function_parameters - JSON string of parameter definitions
   * @param {string} problem.return_type - Return type of the solution function
   * @returns {string} Modified code with input/output parsing added
   * @private
   */
  addDynamicInputOutputParsing(code, language, problem) {
    try {
      // Get function parameters from the problem - handle both string and object
      const functionParams = problem.function_parameters
        ? (typeof problem.function_parameters === 'string'
          ? JSON.parse(problem.function_parameters)
          : problem.function_parameters)
        : [];

      if (functionParams.length === 0) {
        throw new Error('Problem must have function parameters defined');
      }

      // Get return type from problem
      const returnType = problem.return_type || 'INT';

      // Generate dynamic parsing code using TypeSystemService
      const parsingCode = TypeSystemService.generateParameterParsing(functionParams, language, returnType);

      // Replace placeholder comments with generated parsing code
      const placeholders = {
        cpp: {
          parse: '// Parse JSON input and call user function',
          output: '// Output JSON result'
        },
        java: {
          parse: '// Parse JSON input and call user function',
          output: '// Output JSON result'
        },
        python: {
          parse: '# Parse JSON input and call user function',
          output: '# Output JSON result'
        }
      };

      const placeholder = placeholders[language];
      if (placeholder) {
        return code.replace(placeholder.parse, parsingCode)
                   .replace(placeholder.output, '');
      }

      return code;

    } catch (error) {
      console.error('Error in dynamic parsing generation:', error);
      // Fallback to old static parsing
      return this.addInputOutputParsing(code, language, problem);
    }
  }

  /**
   * Add JSON input/output parsing to the wrapper code (legacy method)
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
   * Add Java JSON parsing (legacy fallback - should not be used for new problems)
   * @param {string} code - The Java wrapper code to modify
   * @param {string} inputFormat - Expected input format
   * @param {string} outputFormat - Expected output format
   * @returns {string} Modified Java code with JSON parsing added
   * @private
   */
  addJavaParsing(code, inputFormat, outputFormat) {
    // Legacy fallback - uses simple manual JSON parsing without external dependencies
    const parsingCode = `
        String input = br.readLine();
        // Simple JSON parsing - extract array from input
        input = input.trim();

        // Remove outer braces if present
        if (input.startsWith("{") && input.endsWith("}")) {
            input = input.substring(1, input.length() - 1);
        }

        // Extract array value (assumes format like {"nums": [1,2,3]})
        int[] nums = null;
        String[] keyValuePairs = input.split(":");
        if (keyValuePairs.length >= 2) {
            String arrayStr = keyValuePairs[1].trim();
            // Remove trailing } if present
            if (arrayStr.endsWith("}")) {
                arrayStr = arrayStr.substring(0, arrayStr.length() - 1).trim();
            }
            // Remove [ and ]
            arrayStr = arrayStr.replaceAll("^\\\\[|\\\\]$", "");
            if (!arrayStr.isEmpty()) {
                String[] parts = arrayStr.split(",");
                nums = new int[parts.length];
                for (int i = 0; i < parts.length; i++) {
                    nums[i] = Integer.parseInt(parts[i].trim());
                }
            } else {
                nums = new int[0];
            }
        }

        Solution sol = new Solution();
        int result = sol.solution(nums);

        System.out.println(result);
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
#include <algorithm>
#include <map>
#include <unordered_map>
#include <set>
#include <unordered_set>
#include <queue>
#include <stack>
#include <deque>
#include <list>
#include <utility>
#include <cmath>
#include <climits>
#include <type_traits>
using namespace std;

// Forward declarations for JSON parsing helpers
string extractValue(const string& json, const string& key);
int extractInt(const string& json, const string& key);
string extractString(const string& json, const string& key);
vector<int> extractIntArray(const string& json, const string& key);

{USER_FUNCTION}

int main() {
    // Parse JSON input and call user function
    // Output JSON result
    return 0;
}

// JSON parsing helper implementations
string extractValue(const string& json, const string& key) {
    size_t keyPos = json.find("\\"" + key + "\\":");
    if (keyPos == string::npos) return "";
    size_t valueStart = json.find(":", keyPos) + 1;
    while (valueStart < json.length() && isspace(json[valueStart])) valueStart++;

    size_t valueEnd;
    if (json[valueStart] == '[') {
        int bracketCount = 0;
        valueEnd = valueStart;
        do {
            if (json[valueEnd] == '[') bracketCount++;
            else if (json[valueEnd] == ']') bracketCount--;
            valueEnd++;
        } while (bracketCount > 0 && valueEnd < json.length());
    } else {
        valueEnd = json.find(",", valueStart);
        if (valueEnd == string::npos) valueEnd = json.length();
    }

    return json.substr(valueStart, valueEnd - valueStart);
}

int extractInt(const string& json, const string& key) {
    string value = extractValue(json, key);
    return stoi(value);
}

string extractString(const string& json, const string& key) {
    string value = extractValue(json, key);
    if (!value.empty() && value.front() == '\\"') {
        value = value.substr(1, value.length() - 2);
    }
    return value;
}

vector<int> extractIntArray(const string& json, const string& key) {
    string value = extractValue(json, key);
    vector<int> result;

    if (!value.empty() && value.front() == '[') {
        value = value.substr(1, value.length() - 2);
    }

    if (value.empty()) return result;

    stringstream ss(value);
    string item;
    while (getline(ss, item, ',')) {
        item.erase(0, item.find_first_not_of(" \\t"));
        item.erase(item.find_last_not_of(" \\t") + 1);
        if (!item.empty()) {
            result.push_back(stoi(item));
        }
    }

    return result;
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
      
      const defaultSolution = problem?.[`default_solution_${language}`];

      if (defaultSolution && !this.isPlaceholderCode(defaultSolution)) {
        return defaultSolution;
      }

      return await this.getFunctionSignature(problemId, language);
      
    } catch (error) {
      return await this.getFunctionSignature(problemId, language);
    }
  }

  /**
   * Determine whether provided code is just a placeholder without a function signature
   * @param {string} code - Code snippet to evaluate
   * @returns {boolean} True if the code is a bare placeholder
   * @private
   */
  isPlaceholderCode(code) {
    const normalized = (code || '').replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      return true;
    }

    if (!normalized.includes('Your solution here')) {
      return false;
    }

    const hasFunctionStructure = /(?:\bclass\b|\bstruct\b|\bdef\b\s+[A-Za-z_]\w*\s*\(|\b[A-Za-z_][\w<>:&\s]*\b\s+[A-Za-z_]\w*\s*\()/m.test(normalized);
    return !hasFunctionStructure;
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
      // Check if record exists for this specific language
      const existing = await db('team_problem_code')
        .where({
          team_id: teamId,
          problem_id: problemId,
          language: language  // Include language in the check
        })
        .first();

      if (existing) {
        // Update existing record
        await db('team_problem_code')
          .where({
            team_id: teamId,
            problem_id: problemId,
            language: language  // Include language in the update
          })
          .update({
            code: code,
            last_updated: new Date()
          });
      } else {
        // Insert new record
        await db('team_problem_code')
          .insert({
            team_id: teamId,
            problem_id: problemId,
            language: language,
            code: code,
            last_updated: new Date()
          });
      }
    } catch (error) {
      console.error('Error saving user implementation:', error);
      throw error;
    }
  }
}

module.exports = new CodeTemplateService();

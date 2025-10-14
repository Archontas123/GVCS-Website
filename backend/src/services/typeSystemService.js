/**
 * Type System Service for Programming Contest Platform
 * Handles type validation, conversion, and code generation with bracket notation
 *
 * Type System Format:
 * - Base types: INTEGER, STRING, FLOAT, BOOLEAN, CHAR
 * - Array notation: INT[] for 1D, INT[][] for 2D, INT[][][] for 3D, etc.
 * - Examples: INT, INT[], STRING[][], FLOAT[][][]
 *
 * Key principle: Type is explicitly declared, not inferred from values
 */
class TypeSystemService {
  /**
   * Supported base parameter types (without array dimensions)
   */
  static BASE_TYPES = {
    'integer': {
      jsonType: 'number',
      validation: 'isInteger',
      displayName: 'Integer'
    },
    'string': {
      jsonType: 'string',
      validation: 'isString',
      displayName: 'String'
    },
    'float': {
      jsonType: 'number',
      validation: 'isFloat',
      displayName: 'Float'
    },
    'boolean': {
      jsonType: 'boolean',
      validation: 'isBoolean',
      displayName: 'Boolean'
    },
    'character': {
      jsonType: 'string',
      validation: 'isCharacter',
      displayName: 'Character'
    }
  };

  /**
   * Legacy type mappings for backward compatibility
   * Maps old composite types to base types
   */
  static LEGACY_TYPE_MAPPINGS = {
    // Legacy basic types
    'int': 'integer',
    'bool': 'boolean',
    'double': 'float',
    'char': 'character',

    // Legacy array types (all map to base type)
    'array_integer': 'integer',
    'array_string': 'string',
    'array_float': 'float',
    'array_boolean': 'boolean',

    // Legacy matrix types
    'matrix_integer': 'integer',
    'matrix_string': 'string',
    'matrix_float': 'float',

    // C++ style types
    'vector<int>': 'integer',
    'vector<string>': 'string',
    'vector<double>': 'float',
    'vector<vector<int>>': 'integer',
    'vector<vector<string>>': 'string',

    // Java style types
    'int[]': 'integer',
    'string[]': 'string',
    'double[]': 'float',
    'int[][]': 'integer',
    'String[]': 'string',
    'String[][]': 'string',

    // Python style types
    'list<int>': 'integer',
    'list<string>': 'string',
    'List[int]': 'integer',
    'List[str]': 'string',
    'List[List[int]]': 'integer'
  };

  /**
   * Parse bracket notation type into base type and dimensions
   * @param {string} typeStr - Type string like "INT[][]" or "STRING"
   * @returns {{baseType: string, dimensions: number}} Parsed type info
   * @example
   *   parseType("INT") => {baseType: "integer", dimensions: 0}
   *   parseType("INT[]") => {baseType: "integer", dimensions: 1}
   *   parseType("STRING[][]") => {baseType: "string", dimensions: 2}
   */
  static parseType(typeStr) {
    if (!typeStr) return { baseType: 'integer', dimensions: 0 };

    // Count brackets to determine dimensions
    const bracketMatches = typeStr.match(/\[\]/g);
    const dimensions = bracketMatches ? bracketMatches.length : 0;

    // Extract base type (everything before the first bracket)
    const baseTypePart = typeStr.replace(/\[\]/g, '').trim().toLowerCase();

    // Normalize to standard base type
    const normalizedBase = this.normalizeType(baseTypePart);

    return { baseType: normalizedBase, dimensions };
  }

  /**
   * Normalize type name to base type (handles legacy formats)
   * @param {string} typeName - Type name (could be legacy composite type)
   * @returns {string} Base type name
   */
  static normalizeType(typeName) {
    if (!typeName) return 'integer'; // Default

    // Remove brackets for base type extraction
    const cleanedType = typeName.replace(/\[\]/g, '').trim().toLowerCase();

    const normalized = this.LEGACY_TYPE_MAPPINGS[cleanedType] || cleanedType;
    return this.BASE_TYPES[normalized] ? normalized : 'integer';
  }

  /**
   * Format type back to bracket notation
   * @param {string} baseType - Base type (integer, string, etc.)
   * @param {number} dimensions - Number of array dimensions
   * @returns {string} Bracket notation (e.g., "INT[][]")
   */
  static formatType(baseType, dimensions) {
    const typeNames = {
      'integer': 'INT',
      'string': 'STRING',
      'float': 'FLOAT',
      'boolean': 'BOOL',
      'character': 'CHAR'
    };

    const baseName = typeNames[baseType] || 'INT';
    const brackets = '[]'.repeat(dimensions);
    return baseName + brackets;
  }

  /**
   * Detect array dimensionality of a value
   * @param {any} value - The value to analyze
   * @returns {number} Number of array dimensions (0 for non-arrays)
   */
  static getArrayDimensions(value) {
    if (!Array.isArray(value)) {
      return 0;
    }

    // Empty array - treat as 1D
    if (value.length === 0) {
      return 1;
    }

    // Check first element recursively
    return 1 + this.getArrayDimensions(value[0]);
  }

  /**
   * Get structure description of a value
   * @param {any} value - The value to describe
   * @param {string} baseType - The base type
   * @returns {string} Human-readable structure description
   */
  static getStructureDescription(value, baseType) {
    const dimensions = this.getArrayDimensions(value);

    if (dimensions === 0) {
      return this.BASE_TYPES[baseType]?.displayName || baseType;
    }

    if (dimensions === 1) {
      const length = Array.isArray(value) ? value.length : 0;
      return `1D array of ${length} ${baseType}${length !== 1 ? 's' : ''}`;
    }

    if (dimensions === 2) {
      const rows = Array.isArray(value) ? value.length : 0;
      const cols = (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) ? value[0].length : 0;
      return `${rows}×${cols} matrix of ${baseType}s`;
    }

    return `${dimensions}D array of ${baseType}s`;
  }

  /**
   * Validate parameter value against its declared type (with bracket notation)
   * @param {any} value - The value to validate
   * @param {string} typeStr - The type string (e.g., "INT[][]", "STRING")
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  static validateParameter(value, typeStr) {
    const { baseType, dimensions: expectedDimensions } = this.parseType(typeStr);
    const typeConfig = this.BASE_TYPES[baseType];

    if (!typeConfig) {
      return { valid: false, error: `Unknown base type: ${baseType}` };
    }

    // Check actual dimensions of the value
    const actualDimensions = this.getArrayDimensions(value);

    // Dimensions must match
    if (actualDimensions !== expectedDimensions) {
      return {
        valid: false,
        error: `Type mismatch: Expected ${this.formatType(baseType, expectedDimensions)} but got ${this.formatType(baseType, actualDimensions)}`
      };
    }

    // Validate the base type of all elements
    const isValidBaseType = this.validateValue(value, baseType);
    if (!isValidBaseType) {
      return {
        valid: false,
        error: this.getValidationError(value, baseType)
      };
    }

    return { valid: true };
  }

  /**
   * Recursively validate a value against a base type
   * @param {any} value - Value to validate
   * @param {string} baseType - Base type to validate against
   * @returns {boolean} True if valid
   */
  static validateValue(value, baseType) {
    // If it's an array, recursively validate all elements
    if (Array.isArray(value)) {
      // Empty arrays are always valid
      if (value.length === 0) {
        return true;
      }

      // All elements must be valid for the base type
      return value.every(item => this.validateValue(item, baseType));
    }

    // Base case: validate primitive value
    const typeConfig = this.BASE_TYPES[baseType];
    if (!typeConfig) {
      return false;
    }

    return this[typeConfig.validation](value);
  }

  /**
   * Get language-specific type for a parameter
   * Automatically detects array dimensions from example value
   *
   * @param {string} baseType - Base type (integer, string, etc.)
   * @param {string} language - Programming language (cpp, java, python)
   * @param {number} dimensions - Number of array dimensions (0 for scalar)
   * @returns {string} Language-specific type
   */
  static getLanguageType(baseType, language, dimensions = 0) {
    const normalizedType = this.normalizeType(baseType);

    // Base type mappings
    const typeMap = {
      'integer': { cpp: 'int', java: 'int', python: 'int' },
      'string': { cpp: 'string', java: 'String', python: 'str' },
      'float': { cpp: 'double', java: 'double', python: 'float' },
      'boolean': { cpp: 'bool', java: 'boolean', python: 'bool' },
      'character': { cpp: 'char', java: 'char', python: 'str' }
    };

    let baseTypeLang = typeMap[normalizedType]?.[language] || normalizedType;

    // Add array dimensions
    if (dimensions === 0) {
      return baseTypeLang;
    }

    // Language-specific array syntax
    if (language === 'cpp') {
      // C++: vector<vector<int>>
      for (let i = 0; i < dimensions; i++) {
        baseTypeLang = `vector<${baseTypeLang}>`;
      }
    } else if (language === 'java') {
      // Java: int[][]
      baseTypeLang += '[]'.repeat(dimensions);
    } else if (language === 'python') {
      // Python: List[List[int]]
      for (let i = 0; i < dimensions; i++) {
        baseTypeLang = `List[${baseTypeLang}]`;
      }
    }

    return baseTypeLang;
  }

  /**
   * Get language-specific type from value
   * @param {string} baseType - Base type
   * @param {any} value - Example value (to detect dimensions)
   * @param {string} language - Programming language
   * @returns {string} Language-specific type
   */
  static getLanguageTypeFromValue(baseType, value, language) {
    const dimensions = this.getArrayDimensions(value);
    return this.getLanguageType(baseType, language, dimensions);
  }

  // Base type validation methods

  static isInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && !isNaN(value);
  }

  static isString(value) {
    return typeof value === 'string';
  }

  static isFloat(value) {
    return typeof value === 'number' && !isNaN(value);
  }

  static isBoolean(value) {
    return typeof value === 'boolean';
  }

  static isCharacter(value) {
    return typeof value === 'string' && value.length === 1;
  }

  /**
   * Get all supported base types
   * @returns {Array<string>} Array of base type names
   */
  static getSupportedTypes() {
    return Object.keys(this.BASE_TYPES);
  }

  /**
   * Get supported types with display names
   * @returns {Array<Object>} Array of {key, displayName}
   */
  static getSupportedTypesWithNames() {
    return Object.entries(this.BASE_TYPES).map(([key, config]) => ({
      key,
      displayName: config.displayName
    }));
  }

  /**
   * Check if a type is supported
   * @param {string} type - Type to check
   * @returns {boolean} True if supported
   */
  static isTypeSupported(type) {
    const normalizedType = this.normalizeType(type);
    return normalizedType in this.BASE_TYPES;
  }

  /**
   * Validate that an array is rectangular (all rows same length)
   * @param {Array} arr - Array to check
   * @returns {boolean} True if rectangular
   */
  static isRectangularMatrix(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      return true;
    }

    if (!Array.isArray(arr[0])) {
      return true; // Not a matrix
    }

    const expectedLength = arr[0].length;
    return arr.every(row => Array.isArray(row) && row.length === expectedLength);
  }

  /**
   * Get detailed validation error message
   * @param {any} value - Value that failed validation
   * @param {string} baseType - Expected base type
   * @returns {string} Error message
   */
  static getValidationError(value, baseType) {
    if (!Array.isArray(value)) {
      return `Expected ${baseType}, got ${typeof value}`;
    }

    const dimensions = this.getArrayDimensions(value);

    // Check for empty array
    if (value.length === 0) {
      return `Empty array (type assumed: ${baseType})`;
    }

    // Find first invalid element
    const findInvalidElement = (arr, depth = 0) => {
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (Array.isArray(item)) {
          const result = findInvalidElement(item, depth + 1);
          if (result) return result;
        } else {
          if (!this.validateValue(item, baseType)) {
            return { value: item, type: typeof item, depth, index: i };
          }
        }
      }
      return null;
    };

    const invalid = findInvalidElement(value);
    if (invalid) {
      return `Expected ${baseType} at depth ${invalid.depth}, index ${invalid.index}, got ${invalid.type}: ${JSON.stringify(invalid.value)}`;
    }

    // Check matrix regularity
    if (dimensions >= 2 && !this.isRectangularMatrix(value)) {
      return `Irregular ${dimensions}D array - all rows must have the same length`;
    }

    return `Invalid ${dimensions}D array of ${baseType}s`;
  }

  /**
   * Generate parameter parsing code for a given language
   * Creates code that reads JSON input and extracts parameters for the solution function
   * @param {Array} functionParams - Array of parameter objects with {name, type}
   * @param {string} language - Programming language (cpp, java, python)
   * @param {string} returnType - Return type of the solution function (e.g., "INT[]", "STRING")
   * @returns {string} Generated parsing code
   */
  static generateParameterParsing(functionParams, language, returnType = 'INT') {
    if (!functionParams || functionParams.length === 0) {
      throw new Error('Function parameters must be provided');
    }

    switch (language) {
      case 'cpp':
        return this.generateCppParsing(functionParams, returnType);
      case 'java':
        return this.generateJavaParsing(functionParams);
      case 'python':
        return this.generatePythonParsing(functionParams);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Generate C++ JSON parsing code
   * @param {Array} functionParams - Array of parameter objects
   * @param {string} returnType - Return type of the solution function
   * @returns {string} C++ parsing code
   * @private
   */
  static generateCppParsing(functionParams, returnType = 'INT') {
    const paramExtractions = functionParams.map(param => {
      const { baseType, dimensions } = this.parseType(param.type);
      const langType = this.getLanguageType(baseType, 'cpp', dimensions);

      if (dimensions === 0) {
        // Scalar types
        if (baseType === 'integer') {
          return `${langType} ${param.name} = extractInt(line, "${param.name}");`;
        } else if (baseType === 'string') {
          return `${langType} ${param.name} = extractString(line, "${param.name}");`;
        } else {
          return `${langType} ${param.name} = extractInt(line, "${param.name}");`;
        }
      } else if (dimensions === 1) {
        // 1D arrays
        return `${langType} ${param.name} = extractIntArray(line, "${param.name}");`;
      } else {
        // Multi-dimensional arrays - handle as needed
        return `${langType} ${param.name}; // TODO: Implement ${dimensions}D array parsing`;
      }
    }).join('\n    ');

    const paramNames = functionParams.map(p => p.name).join(', ');

    // Generate output code based on return type
    const { baseType: returnBaseType, dimensions: returnDimensions } = this.parseType(returnType);
    let outputCode;

    if (returnDimensions === 0) {
      // Scalar return - direct output
      outputCode = 'cout << result << endl;';
    } else if (returnDimensions === 1) {
      // 1D array/vector - print as JSON array
      outputCode = `cout << "[";
    for (size_t i = 0; i < result.size(); i++) {
        if (i > 0) cout << ",";
        cout << result[i];
    }
    cout << "]" << endl;`;
    } else if (returnDimensions === 2) {
      // 2D array/vector - print as nested JSON array
      outputCode = `cout << "[";
    for (size_t i = 0; i < result.size(); i++) {
        if (i > 0) cout << ",";
        cout << "[";
        for (size_t j = 0; j < result[i].size(); j++) {
            if (j > 0) cout << ",";
            cout << result[i][j];
        }
        cout << "]";
    }
    cout << "]" << endl;`;
    } else {
      // Higher dimensions - generic recursive approach
      outputCode = 'cout << result << endl; // TODO: Implement output for 3D+ arrays';
    }

    return `string line;
    getline(cin, line);

    ${paramExtractions}

    auto result = solution(${paramNames});
    ${outputCode}`;
  }

  /**
   * Generate Java JSON parsing code without external dependencies
   * @param {Array} functionParams - Array of parameter objects
   * @returns {string} Java parsing code
   * @private
   */
  static generateJavaParsing(functionParams) {
    const paramDeclarations = functionParams.map(param => {
      const { baseType, dimensions } = this.parseType(param.type);
      const langType = this.getLanguageType(baseType, 'java', dimensions);
      // For primitive types, initialize to 0 instead of null
      const defaultValue = (dimensions === 0 && baseType === 'integer') ? '0' : 'null';
      return `${langType} ${param.name} = ${defaultValue};`;
    }).join('\n        ');

    const paramParsing = functionParams.map((param, index) => {
      const { baseType, dimensions } = this.parseType(param.type);
      const langType = this.getLanguageType(baseType, 'java', dimensions);

      if (dimensions === 0) {
        // Scalar types
        if (baseType === 'integer') {
          return `${param.name} = Integer.parseInt(parts[${index}]);`;
        } else if (baseType === 'string') {
          return `${param.name} = parts[${index}].replaceAll("^\\"|\\"$", "");`;
        } else {
          return `${param.name} = Integer.parseInt(parts[${index}]);`;
        }
      } else if (dimensions === 1) {
        // 1D arrays
        if (baseType === 'integer') {
          return `String arrStr${index} = parts[${index}].replaceAll("^\\\\[|\\\\]$", "");
            String[] arrParts${index} = arrStr${index}.isEmpty() ? new String[0] : arrStr${index}.split(",");
            ${param.name} = new int[arrParts${index}.length];
            for (int i = 0; i < arrParts${index}.length; i++) {
                ${param.name}[i] = Integer.parseInt(arrParts${index}[i].trim());
            }`;
        } else if (baseType === 'string') {
          return `String arrStr${index} = parts[${index}].replaceAll("^\\\\[|\\\\]$", "");
            ${param.name} = arrStr${index}.isEmpty() ? new String[0] : arrStr${index}.split(",");
            for (int i = 0; i < ${param.name}.length; i++) {
                ${param.name}[i] = ${param.name}[i].trim().replaceAll("^\\"|\\"$", "");
            }`;
        }
      } else if (dimensions === 2) {
        // 2D arrays
        if (baseType === 'integer') {
          return `// Parse 2D array for ${param.name}
            String arr2DStr${index} = parts[${index}].trim();
            arr2DStr${index} = arr2DStr${index}.substring(1, arr2DStr${index}.length() - 1); // Remove outer []
            List<int[]> rows${index} = new ArrayList<>();
            int depth${index} = 0;
            StringBuilder rowStr${index} = new StringBuilder();
            for (int i = 0; i < arr2DStr${index}.length(); i++) {
                char c = arr2DStr${index}.charAt(i);
                if (c == '[') depth${index}++;
                else if (c == ']') {
                    depth${index}--;
                    if (depth${index} == 0 && rowStr${index}.length() > 0) {
                        String[] nums = rowStr${index}.toString().split(",");
                        int[] row = new int[nums.length];
                        for (int j = 0; j < nums.length; j++) {
                            row[j] = Integer.parseInt(nums[j].trim());
                        }
                        rows${index}.add(row);
                        rowStr${index} = new StringBuilder();
                    }
                } else if (depth${index} > 0 && c != ',') {
                    rowStr${index}.append(c);
                }
            }
            ${param.name} = rows${index}.toArray(new int[0][]);`;
        }
      }
      return `// TODO: Implement parsing for ${param.name}`;
    }).join('\n            ');

    const paramNames = functionParams.map(p => p.name).join(', ');

    return `String input = br.readLine();
        // Simple JSON-like parsing without external dependencies
        input = input.trim();
        if (input.startsWith("{") && input.endsWith("}")) {
            input = input.substring(1, input.length() - 1);
        }

        // Split by top-level commas (not inside brackets)
        List<String> paramsList = new ArrayList<>();
        int depth = 0;
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            if (c == '[' || c == '{') depth++;
            else if (c == ']' || c == '}') depth--;
            else if (c == ',' && depth == 0) {
                paramsList.add(current.toString().trim());
                current = new StringBuilder();
                continue;
            }
            current.append(c);
        }
        if (current.length() > 0) {
            paramsList.add(current.toString().trim());
        }

        // Extract values (skip keys)
        String[] parts = new String[paramsList.size()];
        for (int i = 0; i < paramsList.size(); i++) {
            String part = paramsList.get(i);
            int colonIdx = part.indexOf(':');
            if (colonIdx >= 0) {
                parts[i] = part.substring(colonIdx + 1).trim();
            } else {
                parts[i] = part.trim();
            }
        }

        // Declare parameters
        ${paramDeclarations}

        // Parse each parameter
        try {
            ${paramParsing}
        } catch (Exception e) {
            System.err.println("Error parsing input: " + e.getMessage());
            e.printStackTrace();
        }

        Solution sol = new Solution();
        Object result = sol.solution(${paramNames});

        // Output result
        if (result instanceof int[]) {
            System.out.print("[");
            int[] arr = (int[]) result;
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) System.out.print(",");
                System.out.print(arr[i]);
            }
            System.out.println("]");
        } else {
            System.out.println(result);
        }`;
  }

  /**
   * Generate Python JSON parsing code
   * @param {Array} functionParams - Array of parameter objects
   * @returns {string} Python parsing code
   * @private
   */
  static generatePythonParsing(functionParams) {
    const paramExtractions = functionParams.map(param => {
      return `${param.name} = input_data.get("${param.name}")`;
    }).join('\n    ');

    const paramNames = functionParams.map(p => p.name).join(', ');

    return `input_data = json.loads(input())

    ${paramExtractions}

    result = solution(${paramNames})

    print(json.dumps(result))`;
  }
}

module.exports = TypeSystemService;

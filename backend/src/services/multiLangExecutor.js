const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

const languageConfigs = require('../config/languages.json');
const templates = require('../config/templates.json');
const codeTemplateService = require('./codeTemplateService');

class MultiLangExecutor {
  /**
   * Initialize the Multi-language Executor Service.
   * Sets up supported languages, temporary directory, and ensures directory structure.
   */
  constructor() {
    this.supportedLanguages = Object.keys(languageConfigs);
    this.tempDir = path.join(os.tmpdir(), 'code-execution');
    this.ensureTempDir();
  }

  /**
   * Ensure temporary directory exists for code execution.
   * @throws {Error} If directory creation fails
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error('Failed to create temp directory:', error);
      }
    }
  }

  /**
   * Get list of supported programming languages
   * @returns {Array} List of supported language keys
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  /**
   * Get configuration for a specific language
   * @param {string} language - Language key (cpp, java, python, etc.)
   * @returns {Object} Language configuration
   */
  getLanguageConfig(language) {
    if (!languageConfigs[language]) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return languageConfigs[language];
  }

  /**
   * Get template code for a language
   * @param {string} language - Language key
   * @returns {string} Template code
   */
  getTemplate(language) {
    const template = templates[language];
    if (!template) {
      throw new Error(`No template available for language: ${language}`);
    }
    return template.template;
  }

  /**
   * Get example code for a language
   * @param {string} language - Language key
   * @returns {string} Example code
   */
  getExample(language) {
    const template = templates[language];
    if (!template) {
      throw new Error(`No example available for language: ${language}`);
    }
    return template.example;
  }

  /**
   * Execute LeetCode-style code (user function + hidden wrapper)
   * @param {number} problemId - Problem ID for template lookup
   * @param {string} userCode - User's function implementation only
   * @param {string} language - Programming language
   * @param {string} input - Input data for test case (JSON format)
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeLeetCodeStyle(problemId, userCode, language, input = '', options = {}) {
    try {
      // Generate complete executable code using template service
      const executableCode = await codeTemplateService.generateExecutableCode(
        problemId,
        language,
        userCode
      );

      // Execute the complete code using standard execution method
      return await this.executeCode(executableCode, language, input, options);
    } catch (error) {
      console.error('LeetCode-style execution failed:', error);
      return {
        success: false,
        verdict: 'System Error',
        error: error.message,
        output: '',
        executionTime: 0,
        memoryUsed: 0
      };
    }
  }

  /**
   * Validate code syntax and structure
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {boolean} True if code appears valid
   */
  validateCode(code, language) {
    if (!code || code.trim().length === 0) {
      return false;
    }

    const config = this.getLanguageConfig(language);
    
    // Basic validation based on language
    switch (language) {
      case 'cpp':
        return code.includes('#include') || code.includes('int main');
      case 'java':
        return code.includes('class') && code.includes('main');
      case 'python':
        return code.length > 0; // Python is more flexible
      default:
        return true;
    }
  }

  /**
   * Generate unique execution ID
   * @returns {string} Unique execution ID
   */
  generateExecutionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create temporary files for code execution
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @param {string} executionId - Unique execution ID
   * @returns {Object} File paths and execution directory
   */
  async createTempFiles(code, language, executionId) {
    const config = this.getLanguageConfig(language);
    const execDir = path.join(this.tempDir, executionId);
    
    await fs.mkdir(execDir, { recursive: true });
    
    const sourceFile = path.join(execDir, config.mainFile);
    await fs.writeFile(sourceFile, code, 'utf8');

    return {
      execDir,
      sourceFile,
      outputFile: config.outputFile ? path.join(execDir, config.outputFile) : null
    };
  }

  /**
   * Clean up temporary files
   * @param {string} execDir - Execution directory to clean up
   */
  async cleanupTempFiles(execDir) {
    try {
      await fs.rm(execDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * Execute a command with timeout and resource limits
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise} Execution result
   */
  async executeCommand(command, args, options = {}) {
    const {
      cwd = process.cwd(),
      input = '',
      timeout = 10000,
      maxBuffer = 1024 * 1024, // 1MB
      pathAdditions = []
    } = options;

    return new Promise((resolve) => {
      const startTime = Date.now();

      // Ensure compiler paths are in PATH for Windows
      const env = { ...process.env };
      const platform = os.platform();
      const pathSeparator = platform === 'win32' ? ';' : ':';
      const existingPathValue = env.PATH || '';
      const existingEntries = existingPathValue
        .split(pathSeparator)
        .map(segment => segment.trim())
        .filter(Boolean);

      const candidatePaths = [];

      if (platform === 'win32') {
        candidatePaths.push(
          'C:\\msys64\\mingw64\\bin',
          'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.7.6-hotspot\\bin',
          'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.14.7-hotspot\\bin'
        );
      }

      if (process.env.JAVA_HOME) {
        candidatePaths.push(path.join(process.env.JAVA_HOME, 'bin'));
      }

      const normalizedPathAdditions = Array.isArray(pathAdditions)
        ? pathAdditions
        : [pathAdditions].filter(Boolean);

      candidatePaths.push(...normalizedPathAdditions);

      const pathsToPrepend = [];
      for (const rawPath of candidatePaths) {
        if (!rawPath || typeof rawPath !== 'string') {
          continue;
        }

        const sanitizedPath = rawPath.replace(/["']/g, '').trim();
        if (!sanitizedPath) {
          continue;
        }

        let resolvedPath = sanitizedPath;
        if (sanitizedPath.startsWith('~')) {
          resolvedPath = path.join(os.homedir(), sanitizedPath.slice(1));
        }

        // Expand environment variables like $JAVA_HOME/bin
        resolvedPath = resolvedPath.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (_, name) => process.env[name] || '');

        try {
          if (!resolvedPath || !fsSync.existsSync(resolvedPath)) {
            continue;
          }
        } catch (error) {
          continue;
        }

        if (!existingEntries.includes(resolvedPath) && !pathsToPrepend.includes(resolvedPath)) {
          pathsToPrepend.push(resolvedPath);
        }
      }

      if (pathsToPrepend.length > 0) {
        env.PATH = [...pathsToPrepend, ...existingEntries].join(pathSeparator);
      } else {
        env.PATH = existingPathValue;
      }

      const child = spawn(command, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        env: env,
        shell: true // Use shell on Windows to properly resolve PATH
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let memoryPeak = 0;

      // Set up timeout
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeout);

      // Handle stdout
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > maxBuffer) {
          child.kill('SIGKILL');
        }
      });

      // Handle stderr
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > maxBuffer) {
          child.kill('SIGKILL');
        }
      });

      // Send input if provided
      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      } else {
        child.stdin.end();
      }

      child.on('error', (error) => {
        clearTimeout(timer);
        const executionTime = Date.now() - startTime;

        console.error(
          `[MultiLangExecutor] Failed to spawn ${command}: ${error.message}. PATH=${env.PATH}`
        );

        resolve({
          success: false,
          error: error.message,
          executionTime,
          memoryUsed: memoryPeak,
          exitCode: -1,
          signal: 'SPAWN_ERROR'
        });
      });

      // Handle process exit
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        const executionTime = Date.now() - startTime;

        if (timedOut) {
          resolve({
            success: false,
            error: 'Time limit exceeded',
            executionTime,
            memoryUsed: memoryPeak,
            exitCode: -1,
            signal: 'SIGKILL'
          });
        } else {
          resolve({
            success: code === 0,
            output: stdout,
            error: stderr,
            executionTime,
            memoryUsed: memoryPeak,
            exitCode: code,
            signal
          });
        }
      });

      // Handle spawn errors
      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          success: false,
          error: error.message,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          exitCode: -1
        });
      });
    });
  }

  /**
   * Compile code if compilation is supported
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @param {Object} options - Compilation options
   * @returns {Promise} Compilation result
   */
  async compileCode(code, language, options = {}) {
    const config = this.getLanguageConfig(language);
    
    if (!config.supportsCompilation) {
      return { success: true, message: 'No compilation required' };
    }

    const executionId = this.generateExecutionId();
    const { execDir, sourceFile } = await this.createTempFiles(code, language, executionId);

    try {
      // Prepare compile command
      const compileCmd = config.compileCmd.replace('{source}', path.basename(sourceFile));
      const [command, ...args] = compileCmd.split(' ');

      // Execute compilation
      const result = await this.executeCommand(command, args, {
        cwd: execDir,
        timeout: config.compileTimeout || 30000,
        pathAdditions: config.pathAdditions || []
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || result.output,
          executionTime: result.executionTime
        };
      }

      return {
        success: true,
        message: 'Compilation successful',
        executionTime: result.executionTime,
        execDir, // Keep directory for execution
        sourceFile
      };

    } catch (error) {
      await this.cleanupTempFiles(execDir);
      throw error;
    }
  }

  /**
   * Execute compiled or interpreted code
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @param {string} input - Input data for the program
   * @param {Object} options - Execution options
   * @returns {Promise} Execution result
   */
  async executeCode(code, language, input = '', options = {}) {
    const config = this.getLanguageConfig(language);
    const {
      timeLimit = 5000,
      memoryLimit = 256,
      enableNetwork = false,
      usePerformanceMonitor = false, // New option for performance monitoring
      language: langForMonitoring = language // Allow override for monitoring
    } = options;

    // Apply language-specific time multiplier
    const adjustedTimeLimit = timeLimit * config.timeMultiplier;

    let execDir, sourceFile, compileResult;

    try {
      // Validate code
      if (!this.validateCode(code, language)) {
        return {
          success: false,
          error: 'Invalid code structure',
          output: '',
          executionTime: 0,
          memoryUsed: 0
        };
      }

      // Compile if necessary
      if (config.supportsCompilation) {
        compileResult = await this.compileCode(code, language, options);
        if (!compileResult.success) {
          return {
            success: false,
            error: compileResult.error,
            output: '',
            executionTime: compileResult.executionTime || 0,
            memoryUsed: 0,
            verdict: 'Compilation Error'
          };
        }
        execDir = compileResult.execDir;
        sourceFile = compileResult.sourceFile;
      } else {
        // Create temp files for interpreted languages
        const executionId = this.generateExecutionId();
        const tempFiles = await this.createTempFiles(code, language, executionId);
        execDir = tempFiles.execDir;
        sourceFile = tempFiles.sourceFile;
      }

      // Prepare execution command
      let executeCmd = config.executeCmd;
      if (executeCmd.includes('{source}')) {
        executeCmd = executeCmd.replace('{source}', path.basename(sourceFile));
      }
      
      const [command, ...args] = executeCmd.split(' ');

      // Execute the program
      const result = await this.executeCommand(command, args, {
        cwd: execDir,
        input,
        timeout: adjustedTimeLimit,
        pathAdditions: config.pathAdditions || []
      });

      // Clean up
      await this.cleanupTempFiles(execDir);

      // Determine verdict
      let verdict = 'Unknown';
      if (result.success) {
        verdict = 'Accepted';
      } else if (result.error && result.error.includes('Time limit exceeded')) {
        verdict = 'Time Limit Exceeded';
      } else if (result.exitCode !== 0) {
        verdict = 'Runtime Error';
      } else {
        verdict = 'Wrong Answer';
      }

      const executionResult = {
        success: result.success,
        output: result.output ?? '',
        error: result.error || '',
        executionTime: result.executionTime || 0,
        memoryUsed: result.memoryUsed || 0,
        exitCode: result.exitCode,
        verdict,
        language,
        timeLimit: adjustedTimeLimit,
        // Performance monitoring data
        netExecutionTime: result.netExecutionTime || result.executionTime || 0,
        containerOverhead: result.containerOverhead || 0,
        monitoring: result.monitoring || {}
      };

      // Store performance metrics if monitoring is enabled
      if (usePerformanceMonitor) {
        try {
          await this.storePerformanceMetrics(executionResult, options);
        } catch (error) {
          console.error('Failed to store performance metrics:', error);
          // Don't fail execution due to monitoring issues
        }
      }

      return executionResult;

    } catch (error) {
      if (execDir) {
        await this.cleanupTempFiles(execDir);
      }
      
      return {
        success: false,
        error: error.message,
        output: '',
        executionTime: 0,
        memoryUsed: 0,
        verdict: 'System Error'
      };
    }
  }


  /**
   * Store performance metrics for execution - Phase 4.4 integration
   * @param {Object} executionResult - Execution result data
   * @param {Object} options - Original execution options
   */
  async storePerformanceMetrics(executionResult, options) {
    try {
      const performanceStatsStorage = require('./performanceStatsStorage');
      
      const metricsData = {
        language: executionResult.language,
        submissionId: options.submissionId,
        contestId: options.contestId,
        teamId: options.teamId,
        executionTime: executionResult.executionTime,
        netExecutionTime: executionResult.netExecutionTime,
        containerOverhead: executionResult.containerOverhead,
        cpuTime: executionResult.monitoring?.actualCpuTime || executionResult.executionTime,
        memoryUsed: executionResult.memoryUsed,
        ioOperations: executionResult.monitoring?.ioOperations || 0,
        systemCalls: executionResult.monitoring?.systemCalls || 0,
        verdict: executionResult.verdict,
        success: executionResult.success,
        additionalMetrics: {
          timeLimit: executionResult.timeLimit,
          memoryLimit: executionResult.memoryLimit,
          exitCode: executionResult.exitCode,
          containerOverhead: executionResult.containerOverhead,
          monitoring: executionResult.monitoring
        }
      };

      await performanceStatsStorage.storeExecutionMetrics(metricsData);
      console.log(`📊 Performance metrics stored for ${executionResult.language} execution`);
      
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
      throw error;
    }
  }


  /**
   * Get language statistics and capabilities
   * @returns {Object} Language statistics
   */
  getLanguageStats() {
    const stats = {};

    for (const [lang, config] of Object.entries(languageConfigs)) {
      stats[lang] = {
        name: config.name,
        supportsCompilation: config.supportsCompilation,
        timeMultiplier: config.timeMultiplier,
        extension: config.extension
      };
    }

    return stats;
  }

  /**
   * Test executor with sample programs
   * @returns {Promise} Test results
   */
  async runSelfTest() {
    const results = {};
    
    for (const language of this.supportedLanguages) {
      try {
        const example = this.getExample(language);
        const result = await this.executeCode(example, language, '5 3\n', {
          timeLimit: 5000,
          memoryLimit: 256
        });
        
        results[language] = {
          success: result.success && result.output.trim() === '8',
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed,
          verdict: result.verdict
        };
      } catch (error) {
        results[language] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return results;
  }
}

module.exports = new MultiLangExecutor();

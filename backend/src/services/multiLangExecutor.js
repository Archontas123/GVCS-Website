/**
 * Multi-language Executor Service - Phase 4.1
 * Handles compilation and execution of code in multiple programming languages
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

// Load language configurations
const languageConfigs = require('../config/languages.json');
const templates = require('../config/templates.json');

class MultiLangExecutor {
  constructor() {
    this.supportedLanguages = Object.keys(languageConfigs);
    this.tempDir = path.join(os.tmpdir(), 'code-execution');
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
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
      maxBuffer = 1024 * 1024 // 1MB
    } = options;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = spawn(command, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
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
        timeout: config.compileTimeout || 30000
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

    // Apply language-specific multipliers
    const adjustedTimeLimit = timeLimit * config.timeMultiplier;
    const adjustedMemoryLimit = memoryLimit * config.memoryMultiplier;

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
        timeout: adjustedTimeLimit
      });

      // Clean up
      await this.cleanupTempFiles(execDir);

      // Determine verdict
      let verdict = 'Unknown';
      if (result.success) {
        verdict = 'Accepted';
      } else if (result.error && result.error.includes('Time limit exceeded')) {
        verdict = 'Time Limit Exceeded';
      } else if (result.error && this.isMemoryLimitExceeded(result.error, result.memoryUsed, adjustedMemoryLimit)) {
        verdict = 'Memory Limit Exceeded';
      } else if (result.exitCode !== 0) {
        verdict = 'Runtime Error';
      } else {
        verdict = 'Wrong Answer';
      }

      const executionResult = {
        success: result.success,
        output: result.output || '',
        error: result.error || '',
        executionTime: result.executionTime || 0,
        memoryUsed: result.memoryUsed || 0,
        exitCode: result.exitCode,
        verdict,
        language,
        timeLimit: adjustedTimeLimit,
        memoryLimit: adjustedMemoryLimit,
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
   * Check if memory limit was exceeded
   * @param {string} error - Error message
   * @param {number} memoryUsed - Memory used in MB
   * @param {number} memoryLimit - Memory limit in MB
   * @returns {boolean} True if memory limit exceeded
   */
  isMemoryLimitExceeded(error, memoryUsed, memoryLimit) {
    return (
      error.includes('out of memory') ||
      error.includes('memory limit') ||
      (memoryUsed > memoryLimit)
    );
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
        memoryMultiplier: config.memoryMultiplier,
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
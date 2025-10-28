const { db } = require('../utils/db');
const crypto = require('crypto');

/**
 * Service for comprehensive static code analysis and quality metrics
 * Provides detailed analysis of submitted code including complexity, style, and security
 */
class CodeAnalysisService {
  /**
   * Initialize code analysis service
   * Sets up analysis caching and supported language definitions
   */
  constructor() {
    this.analysisCache = new Map();
    this.supportedLanguages = ['cpp', 'java', 'python3', 'c', 'javascript'];
  }

  /**
   * Perform comprehensive code analysis on a submission
   * Analyzes metrics, complexity, quality, style, security, and performance
   * @param {number} submissionId - Submission ID to analyze
   * @returns {Promise<Object>} Complete analysis results with all metrics
   * @throws {Error} When submission not found or analysis fails
   */
  async analyzeCode(submissionId) {
    try {
      const submission = await db('submissions')
        .where({ id: submissionId })
        .first();

      if (!submission) {
        throw new Error('Submission not found');
      }


      const analysis = {
        submission_id: submissionId,
        language: submission.language,
        basic_metrics: await this.calculateBasicMetrics(submission.source_code, submission.language),
        complexity_metrics: await this.calculateComplexityMetrics(submission.source_code, submission.language),
        quality_metrics: await this.calculateQualityMetrics(submission.source_code, submission.language),
        style_analysis: await this.analyzeCodeStyle(submission.source_code, submission.language),
        security_analysis: await this.performSecurityAnalysis(submission.source_code, submission.language),
        performance_hints: await this.generatePerformanceHints(submission.source_code, submission.language),
        analyzed_at: new Date().toISOString()
      };

      await this.storeAnalysisResults(submissionId, analysis);

        submissionId, 
        complexity: analysis.complexity_metrics.cyclomatic_complexity,
        quality_score: analysis.quality_metrics.overall_score 
      });

      return analysis;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate basic code metrics including lines, functions, and variables
   * Provides fundamental code measurement statistics
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Basic metrics including LOC, function count, etc.
   */
  async calculateBasicMetrics(code, language) {
    const lines = code.split('\n');
    const cleanCode = this.removeComments(code, language);
    const cleanLines = cleanCode.split('\n').filter(line => line.trim().length > 0);

    return {
      total_lines: lines.length,
      lines_of_code: cleanLines.length,
      blank_lines: lines.filter(line => line.trim().length === 0).length,
      comment_lines: lines.length - cleanLines.length - lines.filter(line => line.trim().length === 0).length,
      character_count: code.length,
      function_count: this.countFunctions(code, language),
      variable_count: this.countVariables(code, language),
      class_count: this.countClasses(code, language)
    };
  }

  /**
   * Calculate complexity metrics including cyclomatic and cognitive complexity
   * Measures code complexity for maintainability assessment
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Complexity metrics including cyclomatic complexity
   */
  async calculateComplexityMetrics(code, language) {
    return {
      cyclomatic_complexity: this.calculateCyclomaticComplexity(code, language),
      cognitive_complexity: this.calculateCognitiveComplexity(code, language),
      nesting_depth: this.calculateMaxNestingDepth(code, language),
      halstead_metrics: this.calculateHalsteadMetrics(code, language)
    };
  }

  /**
   * Calculate code quality metrics including maintainability and readability
   * Assesses overall code quality and documentation standards
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Quality metrics with overall score
   */
  async calculateQualityMetrics(code, language) {
    const metrics = {
      maintainability_index: this.calculateMaintainabilityIndex(code, language),
      readability_score: this.calculateReadabilityScore(code, language),
      documentation_ratio: this.calculateDocumentationRatio(code, language),
      naming_quality: this.analyzeNamingQuality(code, language),
      code_duplication: this.detectCodeDuplication(code, language)
    };

    metrics.overall_score = this.calculateOverallQualityScore(metrics);

    return metrics;
  }

  /**
   * Analyze code style and formatting conventions
   * Checks indentation, naming, spacing, and consistency
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Style analysis results with consistency scores
   */
  async analyzeCodeStyle(code, language) {
    return {
      indentation_style: this.analyzeIndentation(code),
      naming_conventions: this.analyzeNamingConventions(code, language),
      spacing_consistency: this.analyzeSpacing(code),
      bracket_style: this.analyzeBracketStyle(code, language),
      line_length_violations: this.checkLineLengthViolations(code),
      style_consistency_score: this.calculateStyleConsistencyScore(code, language)
    };
  }

  /**
   * Perform basic security analysis to identify potential vulnerabilities
   * Scans for common security patterns and unsafe practices
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Security analysis with issues and risk level
   */
  async performSecurityAnalysis(code, language) {
    const issues = [];

    const securityPatterns = this.getSecurityPatterns(language);
    
    for (const pattern of securityPatterns) {
      const matches = code.match(pattern.regex) || [];
      if (matches.length > 0) {
        issues.push({
          type: pattern.type,
          severity: pattern.severity,
          description: pattern.description,
          occurrences: matches.length,
          lines: this.findPatternLines(code, pattern.regex)
        });
      }
    }

    return {
      security_issues: issues,
      risk_level: this.calculateRiskLevel(issues),
      recommendations: this.generateSecurityRecommendations(issues)
    };
  }

  /**
   * Generate performance optimization hints and complexity estimates
   * Identifies potential performance issues and suggests improvements
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Performance hints with complexity and memory analysis
   */
  async generatePerformanceHints(code, language) {
    const hints = [];
    const performancePatterns = this.getPerformancePatterns(language);

    for (const pattern of performancePatterns) {
      if (pattern.regex.test(code)) {
        hints.push({
          type: pattern.type,
          description: pattern.description,
          impact: pattern.impact,
          suggestion: pattern.suggestion
        });
      }
    }

    return {
      performance_hints: hints,
      estimated_complexity: this.estimateTimeComplexity(code, language),
      memory_usage_hints: this.analyzeMemoryUsage(code, language)
    };
  }

  /**
   * Remove comments from source code based on language syntax
   * Strips single-line and multi-line comments for accurate metrics
   * @param {string} code - Source code with comments
   * @param {string} language - Programming language
   * @returns {string} Code with comments removed
   */
  removeComments(code, language) {
    let cleaned = code;

    if (language === 'cpp' || language === 'java' || language === 'javascript' || language === 'c') {
      cleaned = cleaned.replace(/\/\/.*$/gm, '');
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    } else if (language === 'python3') {
      cleaned = cleaned.replace(/#.*$/gm, '');
      cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
      cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
    }

    return cleaned;
  }

  /**
   * Count function definitions in source code
   * Uses language-specific regex patterns to identify functions
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {number} Number of functions found
   */
  countFunctions(code, language) {
    let functionRegex;

    switch (language) {
      case 'cpp':
      case 'c':
        functionRegex = /^\s*(\w+\s+)+\w+\s*\([^)]*\)\s*\{/gm;
        break;
      case 'java':
        functionRegex = /^\s*(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\([^)]*\)\s*\{/gm;
        break;
      case 'python3':
        functionRegex = /^\s*def\s+\w+\s*\(/gm;
        break;
      case 'javascript':
        functionRegex = /function\s+\w+\s*\(|^\s*\w+\s*:\s*function\s*\(|^\s*const\s+\w+\s*=\s*\(/gm;
        break;
      default:
        return 0;
    }

    const matches = code.match(functionRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Count variable declarations in source code
   * Identifies typed and untyped variable declarations
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {number} Number of variable declarations found
   */
  countVariables(code, language) {
    let variableRegex;

    switch (language) {
      case 'cpp':
      case 'c':
        variableRegex = /^\s*(int|char|float|double|bool|long|short)\s+\w+/gm;
        break;
      case 'java':
        variableRegex = /^\s*(int|boolean|char|byte|short|long|float|double|String)\s+\w+/gm;
        break;
      case 'python3':
        variableRegex = /^\s*\w+\s*=/gm;
        break;
      case 'javascript':
        variableRegex = /^\s*(var|let|const)\s+\w+/gm;
        break;
      default:
        return 0;
    }

    const matches = code.match(variableRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Count class definitions in source code
   * Finds class declarations across different language syntaxes
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {number} Number of class definitions found
   */
  countClasses(code, language) {
    let classRegex;

    switch (language) {
      case 'cpp':
        classRegex = /^\s*class\s+\w+/gm;
        break;
      case 'java':
        classRegex = /^\s*(public|private|protected)?\s*class\s+\w+/gm;
        break;
      case 'python3':
        classRegex = /^\s*class\s+\w+/gm;
        break;
      case 'javascript':
        classRegex = /^\s*class\s+\w+/gm;
        break;
      default:
        return 0;
    }

    const matches = code.match(classRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Calculate cyclomatic complexity of source code
   * Measures complexity based on control flow statements
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {number} Cyclomatic complexity value
   */
  calculateCyclomaticComplexity(code, language) {
    const controlFlowKeywords = this.getControlFlowKeywords(language);
    let complexity = 1;

    for (const keyword of controlFlowKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Get control flow keywords specific to programming language
   * Returns keywords that contribute to cyclomatic complexity
   * @param {string} language - Programming language
   * @returns {Array<string>} Array of control flow keywords
   */
  getControlFlowKeywords(language) {
    const commonKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'];
    
    switch (language) {
      case 'python3':
        return [...commonKeywords, 'elif', 'except', 'finally', 'with'];
      case 'java':
        return [...commonKeywords, 'finally', 'throw', 'throws'];
      case 'javascript':
        return [...commonKeywords, 'finally', 'throw', 'catch'];
      default:
        return commonKeywords;
    }
  }

  /**
   * Calculate cognitive complexity using simplified algorithm
   * Measures code complexity from a readability perspective
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {number} Cognitive complexity score
   */
  calculateCognitiveComplexity(code, language) {
    const lines = code.split('\n');
    let complexity = 0;
    let nestingLevel = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (this.isNestingIncrease(trimmedLine, language)) {
        nestingLevel++;
      }
      
      if (this.isNestingDecrease(trimmedLine, language)) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      if (this.addsComplexity(trimmedLine, language)) {
        complexity += 1 + nestingLevel;
      }
    }

    return complexity;
  }

  /**
   * Calculate maximum nesting depth in source code
   * Measures deepest level of nested control structures
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {number} Maximum nesting depth found
   */
  calculateMaxNestingDepth(code, language) {
    const lines = code.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (this.isNestingIncrease(trimmedLine, language)) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      
      if (this.isNestingDecrease(trimmedLine, language)) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
   * Store comprehensive analysis results in database
   * Persists metrics and analysis data for future retrieval
   * @param {number} submissionId - Submission ID
   * @param {Object} analysis - Complete analysis results
   * @throws {Error} When database storage fails
   */
  async storeAnalysisResults(submissionId, analysis) {
    try {
      const metrics = {
        submission_id: submissionId,
        lines_of_code: analysis.basic_metrics.lines_of_code,
        cyclomatic_complexity: analysis.complexity_metrics.cyclomatic_complexity,
        function_count: analysis.basic_metrics.function_count,
        variable_count: analysis.basic_metrics.variable_count,
        language_features: JSON.stringify({}),
        complexity_breakdown: JSON.stringify(analysis.complexity_metrics),
        readability_score: analysis.quality_metrics.readability_score,
        style_analysis: JSON.stringify(analysis.style_analysis),
        analyzed_at: new Date().toISOString()
      };

      await db('code_analysis_metrics')
        .insert(metrics)
        .onConflict('submission_id')
        .merge();

    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieve stored analysis results for a submission
   * Returns parsed analysis data from database
   * @param {number} submissionId - Submission ID to retrieve
   * @returns {Promise<Object|null>} Analysis results or null if not found
   * @throws {Error} When database query fails
   */
  async getAnalysisResults(submissionId) {
    try {
      const results = await db('code_analysis_metrics')
        .where({ submission_id: submissionId })
        .first();

      if (results) {
        return {
          ...results,
          complexity_breakdown: JSON.parse(results.complexity_breakdown || '{}'),
          style_analysis: JSON.parse(results.style_analysis || '{}')
        };
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch analyze all submissions for an entire contest
   * Processes all submissions and generates summary statistics
   * @param {number} contestId - Contest ID to analyze
   * @returns {Promise<Object>} Contest analysis summary with statistics
   * @throws {Error} When contest analysis fails
   */
  async analyzeContest(contestId) {
    try {

      const submissions = await db('submissions')
        .where({ contest_id: contestId })
        .select('id');

      const results = [];
      let processedCount = 0;

      for (const submission of submissions) {
        try {
          const analysis = await this.analyzeCode(submission.id);
          results.push(analysis);
          processedCount++;

          if (processedCount % 20 === 0) {
          }
        } catch (error) {
        }
      }

        contestId,
        totalSubmissions: submissions.length,
        analyzedSubmissions: results.length
      });

      return {
        contest_id: contestId,
        total_submissions: submissions.length,
        analyzed_count: results.length,
        analysis_summary: this.generateAnalysisSummary(results)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate statistical summary of analysis results
   * Computes averages, extremes, and quality distributions
   * @param {Array} results - Array of analysis results
   * @returns {Object} Statistical summary of analysis data
   */
  generateAnalysisSummary(results) {
    if (results.length === 0) return {};

    const complexities = results.map(r => r.complexity_metrics.cyclomatic_complexity);
    const qualityScores = results.map(r => r.quality_metrics.overall_score);

    return {
      average_complexity: complexities.reduce((a, b) => a + b, 0) / complexities.length,
      max_complexity: Math.max(...complexities),
      min_complexity: Math.min(...complexities),
      average_quality: qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length,
      high_complexity_count: complexities.filter(c => c > 10).length,
      low_quality_count: qualityScores.filter(q => q < 50).length
    };
  }

  /**
   * Calculate Halstead complexity metrics (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Object} Halstead metrics
   */
  calculateHalsteadMetrics(code, language) { return {}; }

  /**
   * Calculate maintainability index (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {number} Maintainability index score
   */
  calculateMaintainabilityIndex(code, language) { return 50; }

  /**
   * Calculate code readability score (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {number} Readability score
   */
  calculateReadabilityScore(code, language) { return 70; }

  /**
   * Calculate documentation to code ratio (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {number} Documentation ratio
   */
  calculateDocumentationRatio(code, language) { return 0.1; }

  /**
   * Analyze naming quality in code (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Object} Naming quality analysis
   */
  analyzeNamingQuality(code, language) { return { score: 80 }; }

  /**
   * Detect code duplication (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Object} Code duplication analysis
   */
  detectCodeDuplication(code, language) { return { percentage: 0 }; }

  /**
   * Calculate overall quality score from metrics (placeholder)
   * @param {Object} metrics - Quality metrics
   * @returns {number} Overall quality score
   */
  calculateOverallQualityScore(metrics) { return 75; }

  /**
   * Analyze indentation style (placeholder)
   * @param {string} code - Source code
   * @returns {Object} Indentation analysis
   */
  analyzeIndentation(code) { return { style: 'spaces', consistency: 90 }; }

  /**
   * Analyze naming conventions (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Object} Naming convention analysis
   */
  analyzeNamingConventions(code, language) { return { score: 85 }; }

  /**
   * Analyze spacing consistency (placeholder)
   * @param {string} code - Source code
   * @returns {Object} Spacing analysis
   */
  analyzeSpacing(code) { return { consistency: 80 }; }

  /**
   * Analyze bracket style (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Object} Bracket style analysis
   */
  analyzeBracketStyle(code, language) { return { style: 'allman', consistency: 95 }; }

  /**
   * Check line length violations (placeholder)
   * @param {string} code - Source code
   * @returns {Object} Line length violation analysis
   */
  checkLineLengthViolations(code) { return { violations: 0, max_length: 80 }; }

  /**
   * Calculate style consistency score (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {number} Style consistency score
   */
  calculateStyleConsistencyScore(code, language) { return 85; }

  /**
   * Get security patterns for language (placeholder)
   * @param {string} language - Programming language
   * @returns {Array} Security patterns
   */
  getSecurityPatterns(language) { return []; }

  /**
   * Calculate risk level from security issues (placeholder)
   * @param {Array} issues - Security issues
   * @returns {string} Risk level
   */
  calculateRiskLevel(issues) { return 'low'; }

  /**
   * Generate security recommendations (placeholder)
   * @param {Array} issues - Security issues
   * @returns {Array} Security recommendations
   */
  generateSecurityRecommendations(issues) { return []; }

  /**
   * Find line numbers for pattern matches (placeholder)
   * @param {string} code - Source code
   * @param {RegExp} regex - Pattern regex
   * @returns {Array} Line numbers
   */
  findPatternLines(code, regex) { return []; }

  /**
   * Get performance patterns for language (placeholder)
   * @param {string} language - Programming language
   * @returns {Array} Performance patterns
   */
  getPerformancePatterns(language) { return []; }

  /**
   * Estimate time complexity (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {string} Time complexity estimate
   */
  estimateTimeComplexity(code, language) { return 'O(n)'; }

  /**
   * Analyze memory usage (placeholder)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Object} Memory usage analysis
   */
  analyzeMemoryUsage(code, language) { return { hints: [] }; }

  /**
   * Check if line increases nesting (placeholder)
   * @param {string} line - Code line
   * @param {string} language - Programming language
   * @returns {boolean} Whether line increases nesting
   */
  isNestingIncrease(line, language) { return line.includes('{') || line.includes(':'); }

  /**
   * Check if line decreases nesting (placeholder)
   * @param {string} line - Code line
   * @param {string} language - Programming language
   * @returns {boolean} Whether line decreases nesting
   */
  isNestingDecrease(line, language) { return line.includes('}'); }

  /**
   * Check if line adds complexity (placeholder)
   * @param {string} line - Code line
   * @param {string} language - Programming language
   * @returns {boolean} Whether line adds complexity
   */
  addsComplexity(line, language) { return /\b(if|for|while|switch)\b/.test(line); }
}

module.exports = new CodeAnalysisService();
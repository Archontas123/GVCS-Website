/**
 * CS Club Hackathon Platform - Code Analysis Service
 * Phase 6.3: Static code analysis and quality metrics
 */

const { db } = require('../utils/db');
const logger = require('../utils/logger');
const crypto = require('crypto');

class CodeAnalysisService {
  constructor() {
    this.analysisCache = new Map();
    this.supportedLanguages = ['cpp', 'java', 'python3', 'c', 'javascript'];
  }

  /**
   * Perform comprehensive code analysis
   */
  async analyzeCode(submissionId) {
    try {
      const submission = await db('submissions')
        .where({ id: submissionId })
        .first();

      if (!submission) {
        throw new Error('Submission not found');
      }

      logger.info('Starting code analysis:', { submissionId });

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

      // Store analysis results
      await this.storeAnalysisResults(submissionId, analysis);

      logger.info('Code analysis completed:', { 
        submissionId, 
        complexity: analysis.complexity_metrics.cyclomatic_complexity,
        quality_score: analysis.quality_metrics.overall_score 
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing code:', error);
      throw error;
    }
  }

  /**
   * Calculate basic code metrics
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
   * Calculate complexity metrics
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
   * Calculate quality metrics
   */
  async calculateQualityMetrics(code, language) {
    const metrics = {
      maintainability_index: this.calculateMaintainabilityIndex(code, language),
      readability_score: this.calculateReadabilityScore(code, language),
      documentation_ratio: this.calculateDocumentationRatio(code, language),
      naming_quality: this.analyzeNamingQuality(code, language),
      code_duplication: this.detectCodeDuplication(code, language)
    };

    // Calculate overall score
    metrics.overall_score = this.calculateOverallQualityScore(metrics);

    return metrics;
  }

  /**
   * Analyze code style
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
   * Perform basic security analysis
   */
  async performSecurityAnalysis(code, language) {
    const issues = [];

    // Check for common security issues
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
   * Generate performance hints
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
   * Remove comments from code
   */
  removeComments(code, language) {
    let cleaned = code;

    if (language === 'cpp' || language === 'java' || language === 'javascript' || language === 'c') {
      // Remove single-line comments
      cleaned = cleaned.replace(/\/\/.*$/gm, '');
      // Remove multi-line comments
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    } else if (language === 'python3') {
      // Remove single-line comments
      cleaned = cleaned.replace(/#.*$/gm, '');
      // Remove multi-line comments (triple quotes)
      cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
      cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
    }

    return cleaned;
  }

  /**
   * Count functions in code
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
   * Count variables in code
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
   * Count classes in code
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
   * Calculate cyclomatic complexity
   */
  calculateCyclomaticComplexity(code, language) {
    const controlFlowKeywords = this.getControlFlowKeywords(language);
    let complexity = 1; // Base complexity

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
   * Get control flow keywords for language
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
   * Calculate cognitive complexity (simplified)
   */
  calculateCognitiveComplexity(code, language) {
    // Simplified cognitive complexity calculation
    const lines = code.split('\n');
    let complexity = 0;
    let nestingLevel = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for nesting increase
      if (this.isNestingIncrease(trimmedLine, language)) {
        nestingLevel++;
      }
      
      // Check for nesting decrease
      if (this.isNestingDecrease(trimmedLine, language)) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      // Check for complexity-adding constructs
      if (this.addsComplexity(trimmedLine, language)) {
        complexity += 1 + nestingLevel;
      }
    }

    return complexity;
  }

  /**
   * Calculate maximum nesting depth
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
   * Store analysis results in database
   */
  async storeAnalysisResults(submissionId, analysis) {
    try {
      const metrics = {
        submission_id: submissionId,
        lines_of_code: analysis.basic_metrics.lines_of_code,
        cyclomatic_complexity: analysis.complexity_metrics.cyclomatic_complexity,
        function_count: analysis.basic_metrics.function_count,
        variable_count: analysis.basic_metrics.variable_count,
        language_features: JSON.stringify({}), // Could be expanded
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
      logger.error('Error storing analysis results:', error);
      throw error;
    }
  }

  /**
   * Get analysis results for a submission
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
      logger.error('Error getting analysis results:', error);
      throw error;
    }
  }

  /**
   * Batch analyze all submissions for a contest
   */
  async analyzeContest(contestId) {
    try {
      logger.info('Starting batch code analysis for contest:', { contestId });

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
            logger.info(`Analyzed ${processedCount}/${submissions.length} submissions`);
          }
        } catch (error) {
          logger.error(`Error analyzing submission ${submission.id}:`, error);
        }
      }

      logger.info('Contest code analysis completed:', {
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
      logger.error('Error analyzing contest:', error);
      throw error;
    }
  }

  /**
   * Generate analysis summary
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

  // Placeholder methods - would implement full functionality in production
  calculateHalsteadMetrics(code, language) { return {}; }
  calculateMaintainabilityIndex(code, language) { return 50; }
  calculateReadabilityScore(code, language) { return 70; }
  calculateDocumentationRatio(code, language) { return 0.1; }
  analyzeNamingQuality(code, language) { return { score: 80 }; }
  detectCodeDuplication(code, language) { return { percentage: 0 }; }
  calculateOverallQualityScore(metrics) { return 75; }
  analyzeIndentation(code) { return { style: 'spaces', consistency: 90 }; }
  analyzeNamingConventions(code, language) { return { score: 85 }; }
  analyzeSpacing(code) { return { consistency: 80 }; }
  analyzeBracketStyle(code, language) { return { style: 'allman', consistency: 95 }; }
  checkLineLengthViolations(code) { return { violations: 0, max_length: 80 }; }
  calculateStyleConsistencyScore(code, language) { return 85; }
  getSecurityPatterns(language) { return []; }
  calculateRiskLevel(issues) { return 'low'; }
  generateSecurityRecommendations(issues) { return []; }
  findPatternLines(code, regex) { return []; }
  getPerformancePatterns(language) { return []; }
  estimateTimeComplexity(code, language) { return 'O(n)'; }
  analyzeMemoryUsage(code, language) { return { hints: [] }; }
  isNestingIncrease(line, language) { return line.includes('{') || line.includes(':'); }
  isNestingDecrease(line, language) { return line.includes('}'); }
  addsComplexity(line, language) { return /\b(if|for|while|switch)\b/.test(line); }
}

module.exports = new CodeAnalysisService();
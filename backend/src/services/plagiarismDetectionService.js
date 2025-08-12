/**
 * CS Club Hackathon Platform - Plagiarism Detection Service
 * Phase 6.3: Code similarity analysis and plagiarism detection
 */

const { db } = require('../utils/db');
const logger = require('../utils/logger');
const crypto = require('crypto');

class PlagiarismDetectionService {
  constructor() {
    this.similarityThreshold = 0.8; // 80% similarity threshold
    this.suspiciousThreshold = 0.6; // 60% for flagging suspicious submissions
    this.analysisCache = new Map();
    this.tokenizers = this.initializeTokenizers();
  }

  /**
   * Initialize code tokenizers for different languages
   */
  initializeTokenizers() {
    return {
      cpp: {
        keywords: ['int', 'char', 'bool', 'float', 'double', 'void', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'class', 'struct', 'public', 'private', 'protected'],
        operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--'],
        delimiters: ['{', '}', '(', ')', '[', ']', ';', ',', '.']
      },
      java: {
        keywords: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'int', 'boolean', 'char', 'byte', 'short', 'long', 'float', 'double', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return'],
        operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--'],
        delimiters: ['{', '}', '(', ')', '[', ']', ';', ',', '.']
      },
      python3: {
        keywords: ['and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'exec', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'not', 'or', 'pass', 'print', 'raise', 'return', 'try', 'while', 'with', 'yield'],
        operators: ['+', '-', '*', '/', '//', '%', '**', '=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not'],
        delimiters: ['(', ')', '[', ']', '{', '}', ':', ',', '.']
      }
    };
  }

  /**
   * Analyze submission for plagiarism against all other submissions
   */
  async analyzeSubmission(submissionId) {
    try {
      const submission = await db('submissions')
        .where({ id: submissionId })
        .first();

      if (!submission) {
        throw new Error('Submission not found');
      }

      logger.info('Starting plagiarism analysis:', { submissionId });

      // Get all other submissions for the same problem
      const otherSubmissions = await db('submissions')
        .where({ 
          problem_id: submission.problem_id,
          contest_id: submission.contest_id
        })
        .where('id', '!=', submissionId)
        .where('team_id', '!=', submission.team_id) // Don't compare with same team
        .select('*');

      const analysisResults = [];

      // Compare with each other submission
      for (const otherSubmission of otherSubmissions) {
        const similarity = await this.calculateSimilarity(
          submission.source_code,
          otherSubmission.source_code,
          submission.language
        );

        if (similarity.score >= this.suspiciousThreshold) {
          analysisResults.push({
            compared_with: otherSubmission.id,
            compared_team: otherSubmission.team_id,
            similarity_score: similarity.score,
            similarity_details: similarity.details,
            status: similarity.score >= this.similarityThreshold ? 'highly_suspicious' : 'suspicious'
          });
        }
      }

      // Store analysis results
      await this.storeAnalysisResults(submissionId, analysisResults);

      // Update submission with plagiarism flags if needed
      if (analysisResults.length > 0) {
        const maxSimilarity = Math.max(...analysisResults.map(r => r.similarity_score));
        await db('submissions')
          .where({ id: submissionId })
          .update({
            is_plagiarized: maxSimilarity >= this.similarityThreshold,
            similarity_score: maxSimilarity
          });
      }

      logger.info('Plagiarism analysis completed:', {
        submissionId,
        suspiciousMatches: analysisResults.length,
        maxSimilarity: analysisResults.length > 0 ? Math.max(...analysisResults.map(r => r.similarity_score)) : 0
      });

      return {
        submission_id: submissionId,
        analysis_results: analysisResults,
        is_suspicious: analysisResults.length > 0,
        max_similarity: analysisResults.length > 0 ? Math.max(...analysisResults.map(r => r.similarity_score)) : 0
      };
    } catch (error) {
      logger.error('Error analyzing submission for plagiarism:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two code snippets
   */
  async calculateSimilarity(code1, code2, language) {
    try {
      // Normalize both code snippets
      const normalized1 = this.normalizeCode(code1, language);
      const normalized2 = this.normalizeCode(code2, language);

      // Tokenize both codes
      const tokens1 = this.tokenizeCode(normalized1, language);
      const tokens2 = this.tokenizeCode(normalized2, language);

      // Calculate various similarity metrics
      const structuralSimilarity = this.calculateStructuralSimilarity(tokens1, tokens2);
      const sequenceSimilarity = this.calculateSequenceSimilarity(tokens1, tokens2);
      const semanticSimilarity = this.calculateSemanticSimilarity(code1, code2, language);

      // Weighted combination of similarities
      const combinedScore = (
        structuralSimilarity * 0.4 +
        sequenceSimilarity * 0.4 +
        semanticSimilarity * 0.2
      );

      return {
        score: combinedScore,
        details: {
          structural_similarity: structuralSimilarity,
          sequence_similarity: sequenceSimilarity,
          semantic_similarity: semanticSimilarity,
          token_count_1: tokens1.length,
          token_count_2: tokens2.length,
          common_tokens: this.getCommonTokens(tokens1, tokens2).length
        }
      };
    } catch (error) {
      logger.error('Error calculating code similarity:', error);
      return { score: 0, details: {} };
    }
  }

  /**
   * Normalize code by removing comments, extra whitespace, and variable names
   */
  normalizeCode(code, language) {
    let normalized = code;

    // Remove single-line comments
    if (language === 'cpp' || language === 'java') {
      normalized = normalized.replace(/\/\/.*$/gm, '');
      normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
    } else if (language === 'python3') {
      normalized = normalized.replace(/#.*$/gm, '');
    }

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Remove string literals (replace with placeholder)
    normalized = normalized.replace(/"[^"]*"/g, '"STRING"');
    normalized = normalized.replace(/'[^']*'/g, "'CHAR'");

    // Normalize variable names (basic approach)
    normalized = this.normalizeVariableNames(normalized, language);

    return normalized;
  }

  /**
   * Basic variable name normalization
   */
  normalizeVariableNames(code, language) {
    const tokenizer = this.tokenizers[language];
    if (!tokenizer) return code;

    let normalized = code;
    const variableMap = new Map();
    let variableCounter = 1;

    // Simple regex to find potential variable names
    const variableRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    const matches = code.match(variableRegex) || [];

    for (const match of matches) {
      if (!tokenizer.keywords.includes(match.toLowerCase()) && 
          !tokenizer.operators.includes(match) &&
          match.length > 2) {
        
        if (!variableMap.has(match)) {
          variableMap.set(match, `var${variableCounter++}`);
        }
      }
    }

    // Replace variable names
    for (const [original, replacement] of variableMap.entries()) {
      const regex = new RegExp(`\\b${original}\\b`, 'g');
      normalized = normalized.replace(regex, replacement);
    }

    return normalized;
  }

  /**
   * Tokenize code into meaningful tokens
   */
  tokenizeCode(code, language) {
    const tokenizer = this.tokenizers[language];
    if (!tokenizer) return code.split(/\s+/);

    const tokens = [];
    let current = '';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (tokenizer.delimiters.includes(char)) {
        if (current.trim()) tokens.push(current.trim());
        tokens.push(char);
        current = '';
      } else if (char === ' ' || char === '\t' || char === '\n') {
        if (current.trim()) tokens.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) tokens.push(current.trim());
    return tokens.filter(token => token.length > 0);
  }

  /**
   * Calculate structural similarity based on control flow
   */
  calculateStructuralSimilarity(tokens1, tokens2) {
    const structure1 = this.extractStructure(tokens1);
    const structure2 = this.extractStructure(tokens2);

    if (structure1.length === 0 && structure2.length === 0) return 1.0;
    if (structure1.length === 0 || structure2.length === 0) return 0.0;

    // Simple Jaccard similarity for structure
    const set1 = new Set(structure1);
    const set2 = new Set(structure2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Extract structural elements from tokens
   */
  extractStructure(tokens) {
    const structure = [];
    const structuralKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'function', 'def', 'class'];
    
    for (let i = 0; i < tokens.length; i++) {
      if (structuralKeywords.includes(tokens[i].toLowerCase())) {
        structure.push(tokens[i].toLowerCase());
      }
    }

    return structure;
  }

  /**
   * Calculate sequence similarity using longest common subsequence
   */
  calculateSequenceSimilarity(tokens1, tokens2) {
    const lcs = this.longestCommonSubsequence(tokens1, tokens2);
    const maxLength = Math.max(tokens1.length, tokens2.length);
    
    if (maxLength === 0) return 1.0;
    return lcs / maxLength;
  }

  /**
   * Calculate longest common subsequence length
   */
  longestCommonSubsequence(seq1, seq2) {
    const m = seq1.length;
    const n = seq2.length;
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (seq1[i - 1] === seq2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate semantic similarity (simplified)
   */
  calculateSemanticSimilarity(code1, code2, language) {
    // Simplified semantic analysis - count similar function patterns
    const functions1 = this.extractFunctions(code1, language);
    const functions2 = this.extractFunctions(code2, language);

    if (functions1.length === 0 && functions2.length === 0) return 1.0;
    if (functions1.length === 0 || functions2.length === 0) return 0.0;

    let similarities = 0;
    let comparisons = 0;

    for (const func1 of functions1) {
      for (const func2 of functions2) {
        comparisons++;
        if (this.compareFunctionStructure(func1, func2)) {
          similarities++;
        }
      }
    }

    return comparisons > 0 ? similarities / comparisons : 0;
  }

  /**
   * Extract function patterns from code
   */
  extractFunctions(code, language) {
    const functions = [];
    
    if (language === 'cpp' || language === 'java') {
      const functionRegex = /(\w+\s+)*\w+\s*\([^)]*\)\s*\{/g;
      const matches = code.match(functionRegex) || [];
      functions.push(...matches);
    } else if (language === 'python3') {
      const functionRegex = /def\s+\w+\s*\([^)]*\):/g;
      const matches = code.match(functionRegex) || [];
      functions.push(...matches);
    }

    return functions;
  }

  /**
   * Compare function structures
   */
  compareFunctionStructure(func1, func2) {
    // Simplified comparison - check parameter count and basic structure
    const params1 = this.extractParameters(func1);
    const params2 = this.extractParameters(func2);
    
    return Math.abs(params1.length - params2.length) <= 1;
  }

  /**
   * Extract parameters from function signature
   */
  extractParameters(functionSig) {
    const paramMatch = functionSig.match(/\(([^)]*)\)/);
    if (!paramMatch) return [];
    
    const params = paramMatch[1].split(',').map(p => p.trim()).filter(p => p.length > 0);
    return params;
  }

  /**
   * Get common tokens between two token arrays
   */
  getCommonTokens(tokens1, tokens2) {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    return [...set1].filter(token => set2.has(token));
  }

  /**
   * Store plagiarism analysis results
   */
  async storeAnalysisResults(submissionId, results) {
    try {
      // Remove existing results for this submission
      await db('plagiarism_analysis_results')
        .where({ submission_id: submissionId })
        .delete();

      // Insert new results
      if (results.length > 0) {
        const analysisRecords = results.map(result => ({
          submission_id: submissionId,
          compared_submission_id: result.compared_with,
          similarity_score: result.similarity_score,
          analysis_details: JSON.stringify(result.similarity_details),
          status: result.status,
          analyzed_at: new Date().toISOString()
        }));

        await db('plagiarism_analysis_results').insert(analysisRecords);
      }
    } catch (error) {
      logger.error('Error storing analysis results:', error);
      throw error;
    }
  }

  /**
   * Batch analyze all submissions for a contest
   */
  async analyzeContest(contestId) {
    try {
      logger.info('Starting batch plagiarism analysis for contest:', { contestId });

      const submissions = await db('submissions')
        .where({ contest_id: contestId })
        .where('verdict', 'AC') // Only analyze accepted submissions
        .select('id');

      const results = [];
      let processedCount = 0;

      for (const submission of submissions) {
        try {
          const analysisResult = await this.analyzeSubmission(submission.id);
          if (analysisResult.is_suspicious) {
            results.push(analysisResult);
          }
          processedCount++;

          if (processedCount % 10 === 0) {
            logger.info(`Processed ${processedCount}/${submissions.length} submissions`);
          }
        } catch (error) {
          logger.error(`Error analyzing submission ${submission.id}:`, error);
        }
      }

      logger.info('Contest plagiarism analysis completed:', {
        contestId,
        totalSubmissions: submissions.length,
        suspiciousSubmissions: results.length
      });

      return {
        contest_id: contestId,
        total_analyzed: submissions.length,
        suspicious_count: results.length,
        suspicious_submissions: results
      };
    } catch (error) {
      logger.error('Error analyzing contest for plagiarism:', error);
      throw error;
    }
  }

  /**
   * Get plagiarism report for contest
   */
  async getContestPlagiarismReport(contestId) {
    try {
      const report = await db('plagiarism_analysis_results')
        .join('submissions as s1', 'plagiarism_analysis_results.submission_id', 's1.id')
        .join('submissions as s2', 'plagiarism_analysis_results.compared_submission_id', 's2.id')
        .join('teams as t1', 's1.team_id', 't1.id')
        .join('teams as t2', 's2.team_id', 't2.id')
        .join('problems', 's1.problem_id', 'problems.id')
        .where('s1.contest_id', contestId)
        .select(
          'plagiarism_analysis_results.*',
          's1.team_id as team1_id',
          's2.team_id as team2_id',
          't1.team_name as team1_name',
          't2.team_name as team2_name',
          'problems.problem_letter',
          'problems.title as problem_title',
          's1.submitted_at as submission1_time',
          's2.submitted_at as submission2_time'
        )
        .orderBy('similarity_score', 'desc');

      return report;
    } catch (error) {
      logger.error('Error getting plagiarism report:', error);
      throw error;
    }
  }

  /**
   * Mark submissions as reviewed
   */
  async markAsReviewed(analysisId, reviewedBy, decision, notes = '') {
    try {
      await db('plagiarism_analysis_results')
        .where({ id: analysisId })
        .update({
          reviewed_by: reviewedBy,
          review_decision: decision,
          review_notes: notes,
          reviewed_at: new Date().toISOString()
        });

      logger.info('Plagiarism analysis marked as reviewed:', { analysisId, decision });
      return true;
    } catch (error) {
      logger.error('Error marking analysis as reviewed:', error);
      throw error;
    }
  }

  /**
   * Get similarity statistics for a contest
   */
  async getSimilarityStatistics(contestId) {
    try {
      const stats = await db('plagiarism_analysis_results')
        .join('submissions', 'plagiarism_analysis_results.submission_id', 'submissions.id')
        .where('submissions.contest_id', contestId)
        .select(
          db.raw('COUNT(*) as total_flags'),
          db.raw('COUNT(CASE WHEN status = \'highly_suspicious\' THEN 1 END) as highly_suspicious'),
          db.raw('COUNT(CASE WHEN status = \'suspicious\' THEN 1 END) as suspicious'),
          db.raw('AVG(similarity_score) as average_similarity'),
          db.raw('MAX(similarity_score) as max_similarity')
        )
        .first();

      return stats;
    } catch (error) {
      logger.error('Error getting similarity statistics:', error);
      return {};
    }
  }
}

module.exports = new PlagiarismDetectionService();
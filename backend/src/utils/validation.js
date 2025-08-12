const Joi = require('joi');
const { ValidationError } = require('./errors');

/**
 * Joi Schemas for Request Validation
 */
const teamRegistrationSchema = Joi.object({
  team_name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .required()
    .messages({
      'string.min': 'Team name must be at least 3 characters long',
      'string.max': 'Team name must not exceed 50 characters',
      'string.pattern.base': 'Team name can only contain letters, numbers, spaces, hyphens, and underscores',
      'any.required': 'Team name is required'
    }),
  
  contest_code: Joi.string()
    .trim()
    .length(8)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.length': 'Contest code must be exactly 8 characters',
      'string.pattern.base': 'Contest code must contain only uppercase letters and numbers',
      'any.required': 'Contest code is required'
    })
});

const teamLoginSchema = Joi.object({
  team_name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'Team name must be at least 3 characters long',
      'string.max': 'Team name must not exceed 50 characters',
      'any.required': 'Team name is required'
    }),
  
  contest_code: Joi.string()
    .trim()
    .length(8)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.length': 'Contest code must be exactly 8 characters',
      'string.pattern.base': 'Contest code must contain only uppercase letters and numbers',
      'any.required': 'Contest code is required'
    })
});

const codeSubmissionSchema = Joi.object({
  problem_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Problem ID must be a number',
      'number.positive': 'Problem ID must be positive',
      'any.required': 'Problem ID is required'
    }),
  
  language: Joi.string()
    .valid('cpp', 'java', 'python', 'c')
    .required()
    .messages({
      'any.only': 'Language must be one of: cpp, java, python, c',
      'any.required': 'Language is required'
    }),
  
  code: Joi.string()
    .trim()
    .min(1)
    .max(1024 * 1024) // 1MB limit
    .required()
    .messages({
      'string.empty': 'Code cannot be empty',
      'string.max': 'Code exceeds maximum size limit (1MB)',
      'any.required': 'Code is required'
    })
});

/**
 * Joi validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = new ValidationError('Validation failed', error.details);
      return next(validationError);
    }
    
    req.body = value;
    next();
  };
};

/**
 * Additional Validation Utilities
 */

/**
 * Validate and sanitize team name
 * @param {string} teamName - Team name to validate
 * @returns {string} Sanitized team name
 * @throws {ValidationError} If validation fails
 */
function validateTeamName(teamName) {
  if (!teamName || typeof teamName !== 'string') {
    throw new ValidationError('Team name is required');
  }
  
  const trimmed = teamName.trim();
  if (trimmed.length < 3) {
    throw new ValidationError('Team name must be at least 3 characters long');
  }
  
  if (trimmed.length > 50) {
    throw new ValidationError('Team name must not exceed 50 characters');
  }
  
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    throw new ValidationError('Team name can only contain letters, numbers, spaces, hyphens, and underscores');
  }
  
  return trimmed;
}

/**
 * Validate contest code format
 * @param {string} contestCode - Contest code to validate
 * @returns {string} Normalized contest code
 * @throws {ValidationError} If validation fails
 */
function validateContestCode(contestCode) {
  if (!contestCode || typeof contestCode !== 'string') {
    throw new ValidationError('Contest code is required');
  }
  
  const trimmed = contestCode.trim().toUpperCase();
  if (trimmed.length !== 8) {
    throw new ValidationError('Contest code must be exactly 8 characters');
  }
  
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    throw new ValidationError('Contest code must contain only uppercase letters and numbers');
  }
  
  return trimmed;
}

/**
 * Validate programming language
 * @param {string} language - Programming language to validate
 * @returns {string} Normalized language
 * @throws {ValidationError} If validation fails
 */
function validateLanguage(language) {
  const supportedLanguages = ['cpp', 'java', 'python', 'c'];
  
  if (!language || typeof language !== 'string') {
    throw new ValidationError('Programming language is required');
  }
  
  const normalizedLanguage = language.toLowerCase().trim();
  if (!supportedLanguages.includes(normalizedLanguage)) {
    throw new ValidationError(`Unsupported language: ${language}. Supported languages: ${supportedLanguages.join(', ')}`);
  }
  
  return normalizedLanguage;
}

/**
 * Validate source code
 * @param {string} code - Source code to validate
 * @returns {string} Trimmed source code
 * @throws {ValidationError} If validation fails
 */
function validateSourceCode(code) {
  if (!code || typeof code !== 'string') {
    throw new ValidationError('Source code is required');
  }
  
  const trimmed = code.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Source code cannot be empty');
  }
  
  // Check file size limit (1MB)
  const maxSize = 1024 * 1024; // 1MB in bytes
  if (Buffer.byteLength(trimmed, 'utf8') > maxSize) {
    throw new ValidationError('Source code exceeds maximum size limit (1MB)');
  }
  
  return trimmed;
}

/**
 * Validate problem ID
 * @param {string|number} problemId - Problem ID to validate
 * @returns {number} Validated problem ID
 * @throws {ValidationError} If validation fails
 */
function validateProblemId(problemId) {
  if (!problemId) {
    throw new ValidationError('Problem ID is required');
  }
  
  const id = parseInt(problemId, 10);
  if (isNaN(id) || id <= 0) {
    throw new ValidationError('Problem ID must be a positive integer');
  }
  
  return id;
}

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate pagination parameters
 * @param {string|number} page - Page number
 * @param {string|number} limit - Items per page
 * @returns {Object} Validated pagination object
 * @throws {ValidationError} If validation fails
 */
function validatePagination(page = 1, limit = 10) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  
  if (pageNum < 1) {
    throw new ValidationError('Page number must be greater than 0');
  }
  
  if (limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }
  
  return {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum
  };
}

module.exports = {
  // Joi Schemas
  teamRegistrationSchema,
  teamLoginSchema,
  codeSubmissionSchema,
  validate,
  
  // Validation Functions
  validateTeamName,
  validateContestCode,
  validateLanguage,
  validateSourceCode,
  validateProblemId,
  sanitizeString,
  validatePagination
};
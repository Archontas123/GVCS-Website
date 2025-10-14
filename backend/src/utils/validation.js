const Joi = require('joi');
const { ValidationError } = require('./errors');

/**
 * Joi schema for team registration validation.
 * @constant {Object} teamRegistrationSchema
 * @description Validates team registration data including team name, contest code, password, school name, and member names
 */
const teamRegistrationSchema = Joi.object({
  teamName: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .pattern(/^[a-zA-Z0-9_\s\-\.\(\)\',]+$/)
    .required()
    .messages({
      'string.min': 'Team name must be at least 3 characters long',
      'string.max': 'Team name must not exceed 100 characters',
      'string.pattern.base': 'Team name can only contain letters, numbers, spaces, hyphens, underscores, periods, parentheses, apostrophes, and commas',
      'any.required': 'Team name is required'
    }),
  
  contestCode: Joi.string()
    .trim()
    .length(8)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.length': 'Contest code must be exactly 8 characters',
      'string.pattern.base': 'Contest code must contain only uppercase letters and numbers',
      'any.required': 'Contest code is required'
    }),

  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required'
    }),

  schoolName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-\.'&]+$/)
    .required()
    .messages({
      'string.min': 'School name must be at least 2 characters long',
      'string.max': 'School name must not exceed 100 characters',
      'string.pattern.base': 'School name can only contain letters, numbers, spaces, hyphens, apostrophes, periods, and ampersands',
      'any.required': 'School name is required'
    }),

  members: Joi.array()
    .items(
      Joi.object({
        firstName: Joi.string()
          .trim()
          .min(2)
          .max(50)
          .pattern(/^[a-zA-Z\s\-\.']+$/)
          .required()
          .messages({
            'string.min': 'First name must be at least 2 characters long',
            'string.max': 'First name must not exceed 50 characters',
            'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
            'any.required': 'First name is required'
          }),
        lastName: Joi.string()
          .trim()
          .min(2)
          .max(50)
          .pattern(/^[a-zA-Z\s\-\.']+$/)
          .required()
          .messages({
            'string.min': 'Last name must be at least 2 characters long',
            'string.max': 'Last name must not exceed 50 characters',
            'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
            'any.required': 'Last name is required'
          })
      })
    )
    .min(1)
    .max(3)
    .required()
    .messages({
      'array.min': 'At least one team member is required',
      'array.max': 'Maximum of 3 team members allowed',
      'any.required': 'Team members are required'
    })
});

/**
 * Joi schema for team login validation.
 * @constant {Object} teamLoginSchema
 * @description Validates team login credentials including team name and password
 */
const teamLoginSchema = Joi.object({
  teamName: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Team name must be at least 3 characters long',
      'string.max': 'Team name must not exceed 100 characters',
      'any.required': 'Team name is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required'
    })
});

/**
 * Joi schema for code submission validation.
 * @constant {Object} codeSubmissionSchema
 * @description Validates code submission data including problem ID, language, and source code
 */
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
    .max(1024 * 1024) 
    .required()
    .messages({
      'string.empty': 'Code cannot be empty',
      'string.max': 'Code exceeds maximum size limit (1MB)',
      'any.required': 'Code is required'
    })
});

/**
 * Creates an Express middleware function for request validation using Joi schemas.
 * @param {Object} schema - The Joi schema to validate against
 * @returns {Function} Express middleware function
 * @example
 * app.post('/register', validate(teamRegistrationSchema), registerHandler);
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
 * Validates and sanitizes a team name.
 * @param {string} teamName - The team name to validate
 * @returns {string} The trimmed and validated team name
 * @throws {ValidationError} When team name is invalid
 * @example
 * const validName = validateTeamName('  Team Alpha  ');
 */
function validateTeamName(teamName) {
  if (!teamName || typeof teamName !== 'string') {
    throw new ValidationError('Team name is required');
  }
  
  const trimmed = teamName.trim();
  if (trimmed.length < 3) {
    throw new ValidationError('Team name must be at least 3 characters long');
  }
  
  if (trimmed.length > 100) {
    throw new ValidationError('Team name must not exceed 100 characters');
  }
  
  if (!/^[a-zA-Z0-9_\s\-\.\(\)\',]+$/.test(trimmed)) {
    throw new ValidationError('Team name can only contain letters, numbers, spaces, hyphens, underscores, periods, parentheses, apostrophes, and commas');
  }
  
  return trimmed;
}

/**
 * Validates and normalizes a contest code.
 * @param {string} contestCode - The contest code to validate
 * @returns {string} The normalized contest code in uppercase
 * @throws {ValidationError} When contest code is invalid
 * @example
 * const validCode = validateContestCode('abc123xy');
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
 * Validates a programming language selection.
 * @param {string} language - The programming language to validate
 * @returns {string} The normalized language in lowercase
 * @throws {ValidationError} When language is not supported
 * @example
 * const validLang = validateLanguage('Python');
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
 * Validates source code content and size.
 * @param {string} code - The source code to validate
 * @returns {string} The trimmed source code
 * @throws {ValidationError} When source code is invalid or too large
 * @example
 * const validCode = validateSourceCode('console.log("Hello World");');
 */
function validateSourceCode(code) {
  if (!code || typeof code !== 'string') {
    throw new ValidationError('Source code is required');
  }
  
  const trimmed = code.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Source code cannot be empty');
  }
  
  const maxSize = 1024 * 1024; 
  if (Buffer.byteLength(trimmed, 'utf8') > maxSize) {
    throw new ValidationError('Source code exceeds maximum size limit (1MB)');
  }
  
  return trimmed;
}

/**
 * Validates a problem ID.
 * @param {string|number} problemId - The problem ID to validate
 * @returns {number} The validated problem ID as a positive integer
 * @throws {ValidationError} When problem ID is invalid
 * @example
 * const validId = validateProblemId('123');
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
 * Sanitizes a string by removing potentially dangerous characters.
 * @param {string} input - The string to sanitize
 * @returns {string} The sanitized string
 * @example
 * const clean = sanitizeString('<script>alert("xss")</script>');
 */
function sanitizeString(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') 
    .replace(/javascript:/gi, '') 
    .replace(/on\w+=/gi, ''); 
}

/**
 * Validates and normalizes pagination parameters.
 * @param {string|number} [page=1] - The page number
 * @param {string|number} [limit=10] - The items per page limit
 * @returns {Object} Object with validated page, limit, and calculated offset
 * @throws {ValidationError} When pagination parameters are invalid
 * @example
 * const { page, limit, offset } = validatePagination('2', '20');
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
  teamRegistrationSchema,
  teamLoginSchema,
  codeSubmissionSchema,
  validate,
  
  validateTeamName,
  validateContestCode,
  validateLanguage,
  validateSourceCode,
  validateProblemId,
  sanitizeString,
  validatePagination
};
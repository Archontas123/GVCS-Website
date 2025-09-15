

/**
 * Error thrown when input validation fails.
 * @class ValidationError
 * @extends Error
 * @property {string} name - Error name 'ValidationError'
 * @property {*} details - Additional validation error details
 * @property {number} statusCode - HTTP status code 400
 */
class ValidationError extends Error {
  /**
   * Creates a validation error.
   * @param {string} message - Error message
   * @param {*} details - Additional error details (optional)
   */
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.statusCode = 400;
    Error.captureStackTrace(this, ValidationError);
  }
}

/**
 * Error thrown when authentication fails.
 * @class AuthenticationError
 * @extends Error
 * @property {string} name - Error name 'AuthenticationError'
 * @property {number} statusCode - HTTP status code 401
 */
class AuthenticationError extends Error {
  /**
   * Creates an authentication error.
   * @param {string} [message='Authentication failed'] - Error message
   */
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
    Error.captureStackTrace(this, AuthenticationError);
  }
}

/**
 * Error thrown when authorization/access control fails.
 * @class AuthorizationError
 * @extends Error
 * @property {string} name - Error name 'AuthorizationError'
 * @property {number} statusCode - HTTP status code 403
 */
class AuthorizationError extends Error {
  /**
   * Creates an authorization error.
   * @param {string} [message='Access forbidden'] - Error message
   */
  constructor(message = 'Access forbidden') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    Error.captureStackTrace(this, AuthorizationError);
  }
}

/**
 * Error thrown when database operations fail.
 * @class DatabaseError
 * @extends Error
 * @property {string} name - Error name 'DatabaseError'
 * @property {Error} originalError - The original database error
 * @property {number} statusCode - HTTP status code 500
 */
class DatabaseError extends Error {
  /**
   * Creates a database error.
   * @param {string} message - Error message
   * @param {Error} [originalError=null] - The original error that caused this
   */
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    this.statusCode = 500;
    Error.captureStackTrace(this, DatabaseError);
  }
}

/**
 * Error thrown when a requested resource is not found.
 * @class NotFoundError
 * @extends Error
 * @property {string} name - Error name 'NotFoundError'
 * @property {number} statusCode - HTTP status code 404
 */
class NotFoundError extends Error {
  /**
   * Creates a not found error.
   * @param {string} [message='Resource not found'] - Error message
   */
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    Error.captureStackTrace(this, NotFoundError);
  }
}

/**
 * Error thrown when there's a conflict with existing resources.
 * @class ConflictError
 * @extends Error
 * @property {string} name - Error name 'ConflictError'
 * @property {number} statusCode - HTTP status code 409
 */
class ConflictError extends Error {
  /**
   * Creates a conflict error.
   * @param {string} [message='Resource conflict'] - Error message
   */
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
    Error.captureStackTrace(this, ConflictError);
  }
}

/**
 * Error thrown when rate limiting is exceeded.
 * @class RateLimitError
 * @extends Error
 * @property {string} name - Error name 'RateLimitError'
 * @property {number} statusCode - HTTP status code 429
 */
class RateLimitError extends Error {
  /**
   * Creates a rate limit error.
   * @param {string} [message='Too many requests'] - Error message
   */
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    Error.captureStackTrace(this, RateLimitError);
  }
}

module.exports = {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  NotFoundError,
  ConflictError,
  RateLimitError
};
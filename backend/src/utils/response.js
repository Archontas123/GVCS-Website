

/**
 * Creates a standardized success response object.
 * @param {*} [data=null] - The response data
 * @param {string} [message='Success'] - Success message
 * @param {Object} [metadata=null] - Additional metadata like pagination info
 * @returns {Object} Formatted success response
 * @example
 * const response = successResponse({ id: 1, name: 'Team' }, 'Team created');
 */
function successResponse(data = null, message = 'Success', metadata = null) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (metadata !== null) {
    response.metadata = metadata;
  }

  return response;
}

/**
 * Creates a standardized error response object.
 * @param {string} [message='An error occurred'] - Error message
 * @param {Array} [errors=null] - Array of specific error details
 * @param {string} [type='error'] - Error type classification
 * @returns {Object} Formatted error response
 * @example
 * const response = errorResponse('Validation failed', ['Name required'], 'validation');
 */
function errorResponse(message = 'An error occurred', errors = null, type = 'error') {
  const response = {
    success: false,
    message,
    type,
    timestamp: new Date().toISOString()
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return response;
}


/**
 * Creates a standardized paginated response with pagination metadata.
 * @param {Array} data - Array of data items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} [message='Success'] - Success message
 * @returns {Object} Formatted paginated response with metadata
 * @example
 * const response = paginatedResponse(teams, 1, 10, 25, 'Teams retrieved');
 */
function paginatedResponse(data, page, limit, total, message = 'Success') {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return successResponse(data, message, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  });
}

/**
 * Express middleware that adds response helper methods to the response object.
 * Extends the Express response object with convenient methods for sending
 * standardized success, error, and specialized responses.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @example
 * app.use(responseHelpers);
 * 
 * // In route handler:
 * res.success({ message: 'Hello' });
 * res.error('Something went wrong', 400);
 */
function responseHelpers(req, res, next) {
  /**
   * Send success response
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  res.success = (data = null, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json(successResponse(data, message));
  };

  /**
   * Send error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Array} errors - Specific error messages
   * @param {string} type - Error type
   */
  res.error = (message = 'An error occurred', statusCode = 500, errors = null, type = 'error') => {
    res.status(statusCode).json(errorResponse(message, errors, type));
  };

  /**
   * Send paginated response
   * @param {Array} data - Array of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total items
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  res.paginated = (data, page, limit, total, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json(paginatedResponse(data, page, limit, total, message));
  };

  /**
   * Send created response (201)
   * @param {Object} data - Created resource data
   * @param {string} message - Success message
   */
  res.created = (data = null, message = 'Resource created successfully') => {
    res.success(data, message, 201);
  };

  /**
   * Send no content response (204)
   */
  res.noContent = () => {
    res.status(204).send();
  };

  /**
   * Send validation error response (400)
   * @param {Array} errors - Validation errors
   * @param {string} message - Error message
   */
  res.validationError = (errors = [], message = 'Validation failed') => {
    res.error(message, 400, errors, 'validation_error');
  };

  /**
   * Send unauthorized response (401)
   * @param {string} message - Error message
   */
  res.unauthorized = (message = 'Authentication required') => {
    res.error(message, 401, null, 'authentication_error');
  };

  /**
   * Send forbidden response (403)
   * @param {string} message - Error message
   */
  res.forbidden = (message = 'Access forbidden') => {
    res.error(message, 403, null, 'authorization_error');
  };

  /**
   * Send not found response (404)
   * @param {string} message - Error message
   */
  res.notFound = (message = 'Resource not found') => {
    res.error(message, 404, null, 'not_found_error');
  };

  /**
   * Send conflict response (409)
   * @param {string} message - Error message
   */
  res.conflict = (message = 'Resource conflict') => {
    res.error(message, 409, null, 'conflict_error');
  };

  /**
   * Send too many requests response (429)
   * @param {string} message - Error message
   */
  res.tooManyRequests = (message = 'Too many requests') => {
    res.error(message, 429, null, 'rate_limit_error');
  };

  next();
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  responseHelpers
};
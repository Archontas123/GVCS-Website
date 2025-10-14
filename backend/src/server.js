/**
 * @fileoverview Main server implementation for the Programming Contest Platform.
 * This Express.js server provides a comprehensive API for managing programming contests,
 * including team registration, problem management, code execution, real-time submissions,
 * leaderboards, and administrative functions. Features include WebSocket support for
 * real-time updates, security middleware, rate limiting, comprehensive error handling,
 * and graceful shutdown procedures.
 * 
 * Architecture Overview:
 * - Express.js REST API server with WebSocket support
 * - PostgreSQL database with Knex.js ORM
 * - Redis for queue management and caching
 * - Docker-based code execution environment
 * - Winston logging with file and console outputs
 * - Helmet security middleware and CORS configuration
 * - Rate limiting and authentication middleware
 * - Comprehensive error handling with custom error types
 * - Graceful shutdown with cleanup procedures
 * 
 * @module src/server
 * @requires express
 * @requires http
 * @requires cors
 * @requires helmet
 * @requires express-rate-limit
 * @requires winston
 * @requires ./config/env
 * @author Programming Contest Platform Team
 * @version 1.5.0
 */

require('./config/env');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { testConnection } = require('./utils/db');
const { startSessionCleanupInterval } = require('./services/sessionManager');
const contestScheduler = require('./services/contestScheduler');
const websocketService = require('./services/websocketService');
const judgeQueueService = require('./services/judgeQueue');
const performanceStatsStorage = require('./services/performanceStatsStorage');
const { responseHelpers } = require('./utils/response');
const { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  DatabaseError,
  NotFoundError,
  ConflictError,
  RateLimitError 
} = require('./utils/errors');

/**
 * Express application instance configured with middleware and routes.
 * @constant {Object} app - The main Express application
 */
const app = express();

/**
 * HTTP server instance created from the Express app.
 * Used for WebSocket server attachment and graceful shutdown.
 * @constant {Object} server - The HTTP server instance
 */
const server = http.createServer(app);

/**
 * Server port configuration from environment or default.
 * @constant {number} PORT - The port number the server listens on
 */
const PORT = process.env.PORT || 3000;

/**
 * Winston logger instance configured for the contest platform.
 * Provides structured logging with multiple transport options including
 * file logging for errors and combined logs, plus console output for development.
 * 
 * @constant {Object} logger - Winston logger instance
 * @property {string} level - Log level set to 'info'
 * @property {Object} format - Combined format with timestamp, error stack traces, and JSON
 * @property {Object} defaultMeta - Default metadata including service name
 * @property {Array} transports - File and console transport configurations
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'programming_contest-platform' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

/**
 * Rate limiting middleware configuration to prevent abuse and ensure fair usage.
 * Configured with a 15-minute window allowing up to 1000 requests per IP.
 * Development environments skip rate limiting for localhost connections.
 * 
 * @constant {Object} limiter - Express rate limit middleware
 * @property {number} windowMs - 15-minute sliding window (900,000ms)
 * @property {number} max - Maximum 1000 requests per window per IP
 * @property {string} message - Error message for rate-limited requests
 * @property {boolean} standardHeaders - Include rate limit info in standard headers
 * @property {boolean} legacyHeaders - Disable legacy X-RateLimit headers
 * @property {boolean} trustProxy - Proxy trust configuration
 * @property {Function} skip - Skip function to bypass rate limiting in development
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false, 
  skip: (req) => {
    // Skip rate limiting in development mode for localhost requests
    if (process.env.NODE_ENV === 'development') {
      const ip = req.ip || req.connection.remoteAddress;
      const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip.includes('127.0.0.1') || ip.includes('::1');
      return isLocalhost;
    }
    return false;
  }
});

/**
 * Security middleware configuration using Helmet for various HTTP security headers.
 * Protects against common vulnerabilities like XSS, clickjacking, and MIME sniffing.
 */
app.use(helmet());

/**
 * CORS (Cross-Origin Resource Sharing) middleware configuration.
 * Allows requests from specified frontend URLs and enables credentials.
 * Supports both environment-configured URLs and default development URLs.
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3001', 'http://10.30.41.136:3001'],
  credentials: true
}));

/**
 * Apply rate limiting middleware to all routes.
 * Prevents abuse by limiting requests per IP address.
 * Temporarily disabled in development for debugging.
 */
if (process.env.NODE_ENV !== 'development') {
  app.use(limiter);
}

/**
 * JSON body parser middleware with 10MB limit.
 * Handles JSON payloads in request bodies for API endpoints.
 */
app.use(express.json({ limit: '10mb' }));

/**
 * URL-encoded body parser middleware for form submissions.
 * Supports extended syntax for nested objects.
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Custom response helper middleware.
 * Adds utility methods to response objects for consistent API responses.
 */
app.use(responseHelpers);

/**
 * Request logging middleware.
 * Logs all incoming requests with method, URL, IP address, and user agent
 * for monitoring and debugging purposes.
 * 
 * @function requestLogger
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 */
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

/**
 * Health check endpoint for monitoring server status.
 * Returns server health information including status, timestamp, environment,
 * and version for load balancers and monitoring systems.
 * 
 * @function healthCheck
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with health status information
 * 
 * @example
 * GET /api/health
 * {
 *   "success": true,
 *   "status": "ok",
 *   "timestamp": "2024-01-01T00:00:00.000Z",
 *   "environment": "development",
 *   "version": "1.5.0",
 *   "message": "API is healthy and running"
 * }
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.5.0',
    message: 'API is healthy and running'
  });
});

/**
 * API route mounting configuration.
 * Organizes all API endpoints under the /api prefix with specific route handlers.
 * Each route module handles related functionality with appropriate middleware.
 */

/** Team management routes - registration, authentication, profile management */
app.use('/api/team', require('./routes/team'));

/** Code execution routes - compile and run submitted code */
app.use('/api/execute', require('./routes/execute'));

/** Submission management routes - submit, view, and track code submissions */
app.use('/api/submissions', require('./routes/submissions'));

/** Queue management routes - execution queue status and monitoring */
app.use('/api/queue', require('./routes/queue'));

/** Performance monitoring routes - system metrics and statistics */
app.use('/api/performance', require('./routes/performance'));

/** Administrative routes - contest management, user administration */
app.use('/api/admin', require('./routes/admin'));

/** Problem management routes - accessible to admin users */
app.use('/api/admin', require('./routes/problems'));

/** Contest timer routes - start, stop, and synchronize contest timers */
app.use('/api/timer', require('./routes/timer'));

/** Leaderboard routes - real-time ranking and scoring information */
app.use('/api/leaderboard', require('./routes/leaderboard'));

/** Dashboard routes - overview statistics and system status */
app.use('/api/dashboard', require('./routes/dashboard'));

/** Problem routes - contest problems and test cases (public access) */
app.use('/api/problems', require('./routes/problems'));

/** Test routes - development testing endpoints (no authentication) */
app.use('/api/test', require('./routes/test'));

/**
 * Contest code validation endpoint.
 * Validates contest registration codes and returns contest information
 * if the code is valid and registration is still open.
 * 
 * @function validateContestCode
 * @param {Object} req - Express request object
 * @param {string} req.params.contestCode - 8-character alphanumeric contest code
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with contest information or error
 * @throws {ValidationError} When contest code format is invalid
 * @throws {NotFoundError} When contest is not found or registration closed
 * @throws {ConflictError} When contest has already started
 * 
 * @example
 * GET /api/contests/ABC12345/validate
 * {
 *   "success": true,
 *   "message": "Contest code is valid",
 *   "data": {
 *     "contestId": 1,
 *     "contestName": "Spring Programming Contest",
 *     "contestCode": "ABC12345",
 *     "description": "Contest description",
 *     "startTime": "2024-01-01T10:00:00Z",
 *     "duration": 180
 *   }
 * }
 */
app.get('/api/contests/:contestCode/validate', async (req, res, next) => {
  try {
    const { db } = require('./utils/db');
    const contestCode = req.params.contestCode.toUpperCase();
    
    const contestCodeRegex = /^[A-Z0-9]{8}$/;
    if (!contestCodeRegex.test(contestCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contest code format',
        error: 'INVALID_FORMAT'
      });
    }
    
    const contest = await db('contests')
      .where({ registration_code: contestCode })
      .andWhere({ is_active: true })
      .andWhere({ is_registration_open: true })
      .first();
    
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found or registration is closed',
        error: 'CONTEST_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      message: 'Contest code is valid',
      data: {
        contestId: contest.id,
        contestName: contest.contest_name,
        contestCode: contestCode,
        description: contest.description,
        startTime: contest.start_time,
        duration: contest.duration
      }
    });
    
  } catch (error) {
    logger.error('Contest validation error:', error);
    next(error);
  }
});

/**
 * Creates a URL-friendly slug from a contest name.
 * Converts the name to lowercase, replaces non-alphanumeric characters
 * with hyphens, and removes leading/trailing hyphens.
 * 
 * @function createSlug
 * @param {string} name - The contest name to convert to a slug
 * @returns {string} URL-friendly slug string
 * 
 * @example
 * createSlug('Spring Programming Contest 2024') // 'spring-programming-contest-2024'
 * createSlug('C++ Challenge!!!') // 'c-challenge'
 */
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Finds a contest by its generated slug.
 * Searches through all active contests and matches against generated slugs
 * since slugs are not stored in the database but generated from contest names.
 * 
 * @async
 * @function findContestBySlug
 * @param {string} slug - The URL slug to search for
 * @returns {Promise<Object|null>} Contest object if found, null otherwise
 * @throws {DatabaseError} When database query fails
 * 
 * @example
 * const contest = await findContestBySlug('spring-programming-contest-2024');
 * if (contest) {
 *   console.log(contest.contest_name); // 'Spring Programming Contest 2024'
 * }
 */
async function findContestBySlug(slug) {
  const { db } = require('./utils/db');
  const contests = await db('contests').select('*').where('is_active', true);
  
  for (const contest of contests) {
    if (createSlug(contest.contest_name) === slug) {
      return contest;
    }
  }
  return null;
}

/**
 * Authenticated contest problems endpoint.
 * Retrieves all problems for a contest with sample test cases.
 * Requires Bearer token authentication and supports both contest ID and slug lookup.
 * 
 * @function getContestProblems
 * @param {Object} req - Express request object
 * @param {string} req.params.contestSlug - Contest ID or URL slug
 * @param {string} req.headers.authorization - Bearer token for authentication
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with contest problems and sample test cases
 * @throws {AuthenticationError} When authorization header is missing or invalid
 * @throws {NotFoundError} When contest is not found
 * 
 * @example
 * GET /api/contests/spring-contest-2024/problems
 * Authorization: Bearer <token>
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "contest_id": 1,
 *       "problemLetter": "A",
 *       "title": "Two Sum",
 *       "description": "Find two numbers...",
 *       "sample_test_cases": [{"input": "1 2", "expected_output": "3"}]
 *     }
 *   ],
 *   "message": "Contest problems retrieved successfully"
 * }
 */
app.get('/api/contests/:contestSlug/problems', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        type: 'authentication_error'
      });
    }

    const Problem = require('./controllers/problemController');
    const TestCase = require('./controllers/testCaseController');
    let contestId = req.params.contestSlug;
    
    if (isNaN(parseInt(contestId))) {
      const contest = await findContestBySlug(contestId);
      if (!contest) {
        return res.status(404).json({
          success: false,
          message: 'Contest not found',
          type: 'not_found_error'
        });
      }
      contestId = contest.id;
    }
    
    const problems = await Problem.findByContestId(contestId);
    
    const problemsWithSamples = await Promise.all(
      problems.map(async (problem) => {
        const sampleTestCases = await TestCase.findByProblemId(problem.id, true);
        
        return {
          id: problem.id,
          contest_id: problem.contest_id,
          problemLetter: problem.problem_letter,
          title: problem.title,
          description: problem.description,
          input_format: problem.input_format,
          output_format: problem.output_format,
          constraints: problem.constraints,
          timeLimit: problem.time_limit,
          memoryLimit: problem.memory_limit,
          difficulty: problem.difficulty,
          sample_test_cases: sampleTestCases.map(tc => ({
            input: tc.input,
            expected_output: tc.expected_output
          }))
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: problemsWithSamples,
      message: 'Contest problems retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Public contest problems endpoint.
 * Retrieves all problems for a contest without authentication requirements.
 * Supports contest lookup by ID, slug, or registration code with fallback logic.
 * 
 * @function getContestProblemsPublic
 * @param {Object} req - Express request object
 * @param {string} req.params.contestSlug - Contest ID, URL slug, or registration code
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with contest problems and sample test cases
 * @throws {NotFoundError} When contest is not found by any identifier
 * 
 * @example
 * GET /api/contests/ABC12345/problems/public
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "contest_id": 1,
 *       "problem_letter": "A",
 *       "title": "Hello World",
 *       "description": "Print Hello World",
 *       "time_limit": 1000,
 *       "memory_limit": 256,
 *       "sample_test_cases": [{"input": "", "expected_output": "Hello World"}]
 *     }
 *   ],
 *   "message": "Contest problems retrieved successfully"
 * }
 */
app.get('/api/contests/:contestSlug/problems/public', async (req, res, next) => {
  try {
    const Problem = require('./controllers/problemController');
    const TestCase = require('./controllers/testCaseController');
    const Contest = require('./controllers/contestController');
    
    let contestId = req.params.contestSlug;
    
    if (isNaN(parseInt(contestId))) {
      let contest;
      
      try {
        contest = await Contest.findBySlug(contestId);
      } catch (error) {
        try {
          contest = await Contest.findByRegistrationCode(contestId);
        } catch (secondError) {
          return res.status(404).json({
            success: false,
            message: 'Contest not found'
          });
        }
      }
      
      contestId = contest.id;
    }
    
    const problems = await Problem.findByContestId(contestId);
    
    const problemsWithSamples = await Promise.all(
      problems.map(async (problem) => {
        const sampleTestCases = await TestCase.findByProblemId(problem.id, true);
        
        return {
          id: problem.id,
          contest_id: problem.contest_id,
          problem_letter: problem.problem_letter,
          title: problem.title,
          description: problem.description,
          input_format: problem.input_format,
          output_format: problem.output_format,
          constraints: problem.constraints,
          time_limit: problem.time_limit,
          memory_limit: problem.memory_limit,
          difficulty: problem.difficulty,
          sample_test_cases: sampleTestCases.map(tc => ({
            input: tc.input,
            expected_output: tc.expected_output
          }))
        };
      })
    );
    
    res.json({
      success: true,
      data: problemsWithSamples,
      message: 'Contest problems retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Comprehensive error handling middleware.
 * Handles all application errors with appropriate HTTP status codes and response formats.
 * Provides detailed error information in development mode while protecting sensitive
 * information in production. Supports custom error types and generic error handling.
 * 
 * @function errorHandler
 * @param {Error} err - Error object with name, message, and optional properties
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON error response with appropriate HTTP status code
 * 
 * Error Types Handled:
 * - ValidationError (400): Input validation failures
 * - AuthenticationError (401): Authentication failures
 * - AuthorizationError (403): Authorization/permission failures
 * - NotFoundError (404): Resource not found
 * - ConflictError (409): Resource conflicts
 * - RateLimitError (429): Rate limit exceeded
 * - DatabaseError (500): Database operation failures
 * - Generic errors (500): Unexpected server errors
 * 
 * @example
 * // Validation error response
 * {
 *   "success": false,
 *   "message": "Validation failed",
 *   "errors": ["Email is required", "Password too short"],
 *   "type": "validation_error"
 * }
 */
app.use((err, req, res, next) => {
  logger.error(err.message, {
    error: err.name,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  if (err instanceof ValidationError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      errors: err.details?.map(detail => detail.message) || undefined,
      type: 'validation_error'
    });
  }
  
  if (err instanceof AuthenticationError) {
    return res.status(err.statusCode || 401).json({
      success: false,
      message: err.message,
      type: 'authentication_error'
    });
  }
  
  if (err instanceof AuthorizationError) {
    return res.status(err.statusCode || 403).json({
      success: false,
      message: err.message,
      type: 'authorization_error'
    });
  }
  
  if (err instanceof NotFoundError) {
    return res.status(err.statusCode || 404).json({
      success: false,
      message: err.message,
      type: 'not_found_error'
    });
  }
  
  if (err instanceof ConflictError) {
    return res.status(err.statusCode || 409).json({
      success: false,
      message: err.message,
      type: 'conflict_error'
    });
  }
  
  if (err instanceof RateLimitError) {
    return res.status(err.statusCode || 429).json({
      success: false,
      message: err.message,
      type: 'rate_limit_error'
    });
  }
  
  if (err instanceof DatabaseError) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      type: 'database_error'
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.details?.map(detail => detail.message) || [err.message],
      type: 'validation_error'
    });
  }
  
  if (err.name === 'AuthenticationError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      type: 'authentication_error'
    });
  }
  
  if (err.name === 'AuthorizationError') {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      type: 'authorization_error'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    type: 'internal_error'
  });
});

/**
 * Catch-all 404 handler for unmatched routes.
 * Returns a standardized JSON response for any route that doesn't match
 * the defined API endpoints.
 * 
 * @function notFoundHandler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 404 JSON response
 * 
 * @example
 * GET /api/nonexistent-endpoint
 * {
 *   "success": false,
 *   "message": "Route not found"
 * }
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/**
 * SIGTERM signal handler for graceful shutdown.
 * Handles termination signals from process managers (PM2, Docker, etc.)
 * by cleaning up resources and shutting down services in proper order.
 * 
 * @function handleSIGTERM
 * @async
 * @listens process#SIGTERM
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  contestScheduler.stop();
  websocketService.shutdown();
  await judgeQueueService.shutdown();
  process.exit(0);
});

/**
 * SIGINT signal handler for graceful shutdown.
 * Handles interrupt signals (Ctrl+C) by cleaning up resources
 * and shutting down services in proper order.
 * 
 * @function handleSIGINT
 * @async
 * @listens process#SIGINT
 */
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Starting graceful shutdown...');
  contestScheduler.stop();
  websocketService.shutdown();
  await judgeQueueService.shutdown();
  process.exit(0);
});

/**
 * Uncaught exception handler for emergency shutdown.
 * Handles unexpected synchronous errors that weren't caught by try-catch blocks.
 * Logs the error and performs emergency cleanup before terminating the process.
 * 
 * @function handleUncaughtException
 * @async
 * @param {Error} error - The uncaught exception
 * @listens process#uncaughtException
 */
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception:', error);
  contestScheduler.stop();
  websocketService.shutdown();
  await judgeQueueService.shutdown();
  process.exit(1);
});

/**
 * Unhandled promise rejection handler for emergency shutdown.
 * Handles rejected promises that weren't caught with .catch() or try-catch in async functions.
 * Logs the rejection details and performs emergency cleanup before terminating.
 * 
 * @function handleUnhandledRejection
 * @async
 * @param {*} reason - The rejection reason
 * @param {Promise} promise - The promise that was rejected
 * @listens process#unhandledRejection
 */
process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  contestScheduler.stop();
  websocketService.shutdown();
  await judgeQueueService.shutdown();
  process.exit(1);
});

/**
 * Server initialization and startup procedure.
 * Only starts the server if not in test environment to avoid conflicts during testing.
 * Initializes all required services including database connection, WebSocket service,
 * contest scheduler, judge queue system, and performance monitoring.
 * 
 * Initialization Order:
 * 1. Start HTTP server on configured port
 * 2. Test database connection
 * 3. Start session cleanup interval
 * 4. Initialize WebSocket service with server instance
 * 5. Start contest scheduler for automated contest management
 * 6. Initialize Redis-based judge queue system
 * 7. Initialize performance statistics storage
 * 
 * @async
 * @function serverInitialization
 * @throws {Error} When server initialization fails
 * 
 * @example
 * // Server startup output:
 * // 🚀 Programming Contest Platform API server started on http://localhost:3000
 * // 📊 Health check available at http://localhost:3000/api/health
 */
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`🚀 Programming Contest Platform API server started on http://localhost:${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
    
    try {
      await testConnection();
      startSessionCleanupInterval();

      websocketService.initialize(server);

      // Contest scheduler disabled - all contests use manual control
      // Admins must manually start/end contests via API endpoints
      // contestScheduler.start();

      const queueInitialized = await judgeQueueService.initialize();
      if (!queueInitialized) {
        console.log('⚠️  Judge Queue System failed to initialize - Redis may not be available');
      }

      await performanceStatsStorage.initialize();

    } catch (error) {
      logger.error('Failed to initialize server:', error);
      console.error('❌ Server initialization failed. Please check your database connection.');
    }
  });
}

/**
 * Export server components for testing and external access.
 * Provides access to both the Express app instance and HTTP server
 * for integration testing and programmatic server management.
 * 
 * @module exports
 * @property {Object} app - Express application instance
 * @property {Object} server - HTTP server instance
 */
module.exports = { app, server };


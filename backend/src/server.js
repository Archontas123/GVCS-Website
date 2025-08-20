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
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hackathon-platform' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for both development and production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false, // Explicitly set to false for development
  skip: (req) => {
    // Skip rate limiting in development for localhost
    if (process.env.NODE_ENV === 'development' && (req.ip === '::1' || req.ip === '127.0.0.1')) {
      return true;
    }
    return false;
  }
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(responseHelpers);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

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

app.use('/api/team', require('./routes/team'));
app.use('/api/execute', require('./routes/execute'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/problems'));
app.use('/api/timer', require('./routes/timer'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Contest validation route (public)
app.get('/api/contests/:contestCode/validate', async (req, res, next) => {
  try {
    const { db } = require('./utils/db');
    const contestCode = req.params.contestCode.toUpperCase();
    
    // Validate contest code format
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
    
    // Check if contest has already started
    const now = new Date();
    if (contest.start_time && new Date(contest.start_time) <= now) {
      return res.status(400).json({
        success: false,
        message: 'Contest has already started. Registration is closed.',
        error: 'CONTEST_STARTED'
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

// Utility function to create URL-friendly slugs
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Utility function to find contest by slug
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

// Contest problems route - requires authentication
app.get('/api/contests/:contestSlug/problems', async (req, res, next) => {
  try {
    // Check for authentication token
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
    
    // If contestSlug is not a number, treat it as a contest name slug
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
    
    // For each problem, get only sample test cases
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

// Public contest problems route (no authentication required)
app.get('/api/contests/:contestSlug/problems/public', async (req, res, next) => {
  try {
    const Problem = require('./controllers/problemController');
    const TestCase = require('./controllers/testCaseController');
    const Contest = require('./controllers/contestController');
    
    let contestId = req.params.contestSlug;
    
    // If not a number, try to find contest by slug or registration code
    if (isNaN(parseInt(contestId))) {
      let contest;
      
      try {
        // First try to find by slug (generated from name)
        contest = await Contest.findBySlug(contestId);
      } catch (error) {
        try {
          // If not found by slug, try registration code
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
    
    // For each problem, get only sample test cases
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

app.use((err, req, res, next) => {
  logger.error(err.message, {
    error: err.name,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  // Handle custom error types with their status codes
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
  
  // Handle legacy error names for backward compatibility
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
  
  // Handle unknown errors
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    type: 'internal_error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  contestScheduler.stop();
  websocketService.shutdown();
  await judgeQueueService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Starting graceful shutdown...');
  contestScheduler.stop();
  websocketService.shutdown();
  await judgeQueueService.shutdown();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception:', error);
  contestScheduler.stop();
  websocketService.shutdown();
  await judgeQueueService.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  contestScheduler.stop();
  websocketService.shutdown();
  await judgeQueueService.shutdown();
  process.exit(1);
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`🚀 Hackathon Platform API server started on http://localhost:${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
    
    try {
      await testConnection();
      startSessionCleanupInterval();
      
      // Initialize WebSocket service
      websocketService.initialize(server);
      
      // Start contest scheduler for auto-start/end functionality
      contestScheduler.start();
      
      // Initialize judge queue service
      const queueInitialized = await judgeQueueService.initialize();
      if (!queueInitialized) {
        console.log('⚠️  Judge Queue System failed to initialize - Redis may not be available');
      }
      
      // Initialize performance monitoring storage
      await performanceStatsStorage.initialize();
      
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      console.error('❌ Server initialization failed. Please check your database connection.');
    }
  });
}

module.exports = { app, server };
/**
 * Code Execution Routes Module
 * Provides Docker-based code execution endpoints for testing and submission
 * including multi-language support, templates, and system status monitoring
 * @module routes/execute
 */

const express = require('express');
const router = express.Router();
const multiLangExecutor = require('../services/multiLangExecutor');
const { authenticateTeam } = require('../middleware/auth');
const Joi = require('joi');

/**
 * Joi schema for code execution validation
 * @type {Joi.ObjectSchema}
 */
const executeSchema = Joi.object({
    language: Joi.string().valid('cpp', 'java', 'python').required(),
    code: Joi.string().min(1).max(50000).required(),
    input: Joi.string().max(10000).allow('').default(''),
    timeLimit: Joi.number().integer().min(1).max(30).default(5),
    memoryLimit: Joi.number().integer().min(32).max(512).default(256)
});

/**
 * Joi schema for template language validation
 * @type {Joi.ObjectSchema}
 */
const templateSchema = Joi.object({
    language: Joi.string().valid('cpp', 'java', 'python').required()
});

/**
 * Get Docker executor system status
 * @route GET /api/execute/status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with system status information
 * @throws {InternalServerError} 500 - System status check failed
 * @example
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "activeContainers": 0,
 *     "maxConcurrentContainers": 10,
 *     "supportedLanguages": ["cpp", "java", "python"],
 *     "systemTime": "2024-01-15T14:30:00.000Z",
 *     "uptime": 3600.5
 *   }
 * }
 */
router.get('/status', async (req, res) => {
    try {
        const status = {
            activeContainers: 0,
            maxConcurrentContainers: 10,
            supportedLanguages: multiLangExecutor.getSupportedLanguages(),
            systemTime: new Date().toISOString(),
            uptime: process.uptime()
        };
        
        res.json({
            success: true,
            data: {
                ...status,
                systemTime: new Date().toISOString(),
                uptime: process.uptime()
            }
        });
    } catch (error) {
        console.error('Status check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get system status',
            details: error.message
        });
    }
});

/**
 * Get code template for specified programming language
 * @route GET /api/execute/template/:language
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.language - Programming language (cpp, java, python)
 * @param {Object} res - Express response object
 * @returns {Object} Response with language template code
 * @throws {ValidationError} 400 - Invalid language parameter
 * @throws {InternalServerError} 500 - Template retrieval failed
 * @example
 * // GET /api/execute/template/cpp
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "language": "cpp",
 *     "template": "#include <iostream>\nint main() {\n    // Your code here\n    return 0;\n}"
 *   }
 * }
 */
router.get('/template/:language', (req, res) => {
    try {
        const { error } = templateSchema.validate({ language: req.params.language });
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid language',
                details: error.details[0].message
            });
        }

        const template = multiLangExecutor.getTemplate(req.params.language);
        
        res.json({
            success: true,
            data: {
                language: req.params.language,
                template: template
            }
        });
    } catch (error) {
        console.error('Template retrieval failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get language template',
            details: error.message
        });
    }
});

/**
 * Execute code in Docker container for testing purposes
 * @route POST /api/execute/test
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.language - Programming language (cpp, java, python)
 * @param {string} req.body.code - Source code to execute (1-50000 characters)
 * @param {string} [req.body.input=''] - Input data for the program (max 10000 characters)
 * @param {number} [req.body.timeLimit=5] - Time limit in seconds (1-30)
 * @param {number} [req.body.memoryLimit=256] - Memory limit in MB (32-512)
 * @param {Object} res - Express response object
 * @returns {Object} Response with execution results
 * @throws {ValidationError} 400 - Invalid input parameters
 * @throws {InternalServerError} 500 - Code execution failed
 * @example
 * // Request body:
 * {
 *   "language": "python",
 *   "code": "print('Hello World')",
 *   "input": "",
 *   "timeLimit": 5,
 *   "memoryLimit": 256
 * }
 * 
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "output": "Hello World\n",
 *     "executionTime": 0.02,
 *     "memoryUsed": 1024,
 *     "exitCode": 0,
 *     "verdict": "accepted"
 *   }
 * }
 */
router.post('/test', async (req, res) => {
    try {
        const { error, value } = executeSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid input',
                details: error.details[0].message
            });
        }

        const { language, code, input, timeLimit, memoryLimit } = value;
        
        console.log(`Test execution request: ${language}, ${code.length} chars`);
        
        const result = await multiLangExecutor.executeCode(
            code,
            language,
            input,
            {
                timeLimit: timeLimit * 1000,
                memoryLimit: memoryLimit
            }
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Test execution failed:', error);
        res.status(500).json({
            success: false,
            error: 'Execution failed',
            details: error.message
        });
    }
});

/**
 * Deprecated submission endpoint (use /api/submissions/submit instead)
 * @route POST /api/execute/submit
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Deprecation notice with migration information
 * @requires authenticateTeam - Team authentication required
 * @throws {BadRequestError} 400 - Endpoint deprecated
 * @deprecated This endpoint is deprecated. Use /api/submissions/submit for contest submissions.
 */
router.post('/submit', authenticateTeam, async (req, res) => {
    res.status(400).json({
        success: false,
        error: 'This endpoint is deprecated. Please use /api/submissions/submit for contest submissions.',
        migration: {
            oldEndpoint: 'POST /api/execute/submit',
            newEndpoint: 'POST /api/submissions/submit',
            note: 'The new endpoint uses proper queue-based processing and requires problemId instead of custom input'
        }
    });
});

/**
 * Get list of supported programming languages with specifications
 * @route GET /api/execute/languages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with array of supported languages
 * @throws {InternalServerError} 500 - Failed to get supported languages
 * @example
 * // Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "cpp",
 *       "name": "C++",
 *       "version": "g++ (GCC) with C++17",
 *       "timeMultiplier": 1.0,
 *       "memoryMultiplier": 1.0,
 *       "fileExtension": ".cpp"
 *     },
 *     {
 *       "id": "java",
 *       "name": "Java",
 *       "version": "OpenJDK 11",
 *       "timeMultiplier": 2.0,
 *       "memoryMultiplier": 1.5,
 *       "fileExtension": ".java"
 *     },
 *     {
 *       "id": "python",
 *       "name": "Python",
 *       "version": "Python 3.8+",
 *       "timeMultiplier": 5.0,
 *       "memoryMultiplier": 1.2,
 *       "fileExtension": ".py"
 *     }
 *   ]
 * }
 */
router.get('/languages', (req, res) => {
    try {
        const languages = [
            {
                id: 'cpp',
                name: 'C++',
                version: 'g++ (GCC) with C++17',
                timeMultiplier: 1.0,
                memoryMultiplier: 1.0,
                fileExtension: '.cpp'
            },
            {
                id: 'java',
                name: 'Java',
                version: 'OpenJDK 11',
                timeMultiplier: 2.0,
                memoryMultiplier: 1.5,
                fileExtension: '.java'
            },
            {
                id: 'python',
                name: 'Python',
                version: 'Python 3.8+',
                timeMultiplier: 5.0,
                memoryMultiplier: 1.2,
                fileExtension: '.py'
            }
        ];

        res.json({
            success: true,
            data: languages
        });
    } catch (error) {
        console.error('Languages list failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get supported languages',
            details: error.message
        });
    }
});

/**
 * Graceful shutdown handler for SIGINT signal
 * @param {string} signal - The signal received
 */
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    process.exit(0);
});

/**
 * Graceful shutdown handler for SIGTERM signal
 * @param {string} signal - The signal received
 */
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    process.exit(0);
});

module.exports = router;
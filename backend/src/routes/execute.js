/**
 * CS Club Hackathon Platform - Code Execution API
 * Phase 1.3: Docker execution endpoints for testing and submission
 */

const express = require('express');
const router = express.Router();
const multiLangExecutor = require('../services/multiLangExecutor');
const { authenticateTeam } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const executeSchema = Joi.object({
    language: Joi.string().valid('cpp', 'java', 'python').required(),
    code: Joi.string().min(1).max(50000).required(),
    input: Joi.string().max(10000).allow('').default(''),
    timeLimit: Joi.number().integer().min(1).max(30).default(5),
    memoryLimit: Joi.number().integer().min(32).max(512).default(256)
});

const templateSchema = Joi.object({
    language: Joi.string().valid('cpp', 'java', 'python').required()
});

/**
 * GET /api/execute/status
 * Get Docker executor system status
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
 * GET /api/execute/template/:language
 * Get code template for specified language
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
 * POST /api/execute/test
 * Test code execution (for development/testing purposes)
 * Note: In production, this should be removed or secured
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
                timeLimit: timeLimit * 1000, // Convert to milliseconds
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
 * POST /api/execute/submit
 * DEPRECATED: Use /api/submissions/submit instead
 * This endpoint is kept for backward compatibility during transition
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
 * GET /api/execute/languages
 * Get list of supported programming languages
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

// MultiLangExecutor is ready to use - no initialization needed

// Graceful shutdown - no cleanup needed for multiLangExecutor
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    process.exit(0);
});

module.exports = router;
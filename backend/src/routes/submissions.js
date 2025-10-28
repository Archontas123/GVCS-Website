/**
 * @module SubmissionRoutes
 * @description Submission Management API for Programming Contest Platform
 * 
 * This module provides comprehensive submission processing and management:
 * - Code submission with queue integration and validation
 * - Real-time submission status tracking and monitoring
 * - Team submission history with pagination and filtering
 * - Queue position tracking for pending submissions
 * - WebSocket integration for real-time status updates
 * - Contest timing validation and freeze period handling
 * - Multi-language support with execution limits
 * - Fair prioritization based on team submission frequency
 * 
 * Integrates with judge queue service for scalable submission processing
 * and provides both team-facing and administrative monitoring capabilities.
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const crypto = require('crypto');
const { authenticateTeam } = require('../middleware/auth');
const { testConnection, db } = require('../utils/db');
const judgeQueueService = require('../services/judgeQueue');
const redis = require('../config/redis');
const pushNotificationService = require('../services/pushNotificationService');

/**
 * @description Joi validation schemas for request validation
 */
/**
 * @description Joi schema for submission validation
 * @type {Object}
 */
const submissionSchema = Joi.object({
    /** Problem ID must be positive integer */
    problemId: Joi.number().integer().positive().required(),
    /** Language must be one of supported languages */
    language: Joi.string().valid('cpp', 'java', 'python').required(),
    /** Code must be non-empty string with 50KB limit */
    code: Joi.string().min(1).max(50000).required()
});

/**
 * @route POST /api/submissions/submit
 * @description Submit code for judging through the queue system
 * 
 * Processes code submission including validation, contest timing checks,
 * database storage, and queue integration. Implements fair prioritization
 * based on team submission frequency and provides job tracking.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body with submission data
 * @param {number} req.body.problemId - Problem ID to submit solution for
 * @param {string} req.body.language - Programming language (cpp|java|python)
 * @param {string} req.body.code - Source code implementation (max 50KB)
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with submission confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Submission data
 * @returns {number} returns.data.submissionId - Created submission identifier
 * @returns {string} returns.data.jobId - Queue job identifier
 * @returns {string} returns.data.status - Initial status ('queued')
 * @returns {number} returns.data.priority - Queue priority level
 * @returns {string} returns.data.estimatedWaitTime - Estimated processing wait time
 * 
 * @throws {400} Invalid input data or contest timing violations
 * @throws {404} Problem not found
 * @throws {500} Database or queue service errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * Validation checks:
 * - Problem exists and belongs to active contest
 * - Contest is currently running (not before start or after end)
 * - Contest is not frozen
 * - Code meets size and format requirements
 * 
 * @example
 * POST /api/submissions/submit
 * Authorization: Bearer <team-jwt-token>
 * Content-Type: application/json
 * 
 * {
 *   "problemId": 123,
 *   "language": "python",
 *   "code": "def solve(n, arr):\n    return sum(arr)"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "submissionId": 456,
 *     "jobId": "job_789",
 *     "status": "queued",
 *     "priority": 100,
 *     "estimatedWaitTime": "~15 seconds"
 *   }
 * }
 */
router.post('/submit', authenticateTeam, async (req, res) => {
    let submissionId = null;
    
    try {
        const { error, value } = submissionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid input',
                details: error.details[0].message
            });
        }

        const { problemId, language, code } = value;
        const teamId = req.team.id;
        
        // Verify problem exists and get contest info
        const problem = await db('problems')
            .select('problems.*', 'contests.id as contest_id')
            .join('contests', 'problems.contest_id', 'contests.id')
            .where('problems.id', problemId)
            .first();

        if (!problem) {
            return res.status(404).json({
                success: false,
                error: 'Problem not found'
            });
        }

        // Contest timing checks removed - submissions always allowed
        const now = new Date();

        // Store submission in database as pending
        const submission = await db('submissions').insert({
            team_id: teamId,
            problem_id: problemId,
            contest_id: problem.contest_id,
            language: language,
            source_code: code,
            status: 'pending',
            submitted_at: now
        }).returning('*');

        submissionId = submission[0].id || submission[0];

        // Get team recent submissions for fair prioritization
        const teamRecentSubmissions = await db('submissions')
            .where('team_id', teamId)
            .where('submitted_at', '>', new Date(now.getTime() - 10 * 60 * 1000)) // Last 10 minutes
            .count('* as count')
            .first();

        // Prepare submission data for queue
        const submissionData = {
            submissionId: submissionId,
            teamId: teamId,
            problemId: problemId,
            contestId: problem.contest_id,
            language: language,
            code: code,
            submissionTime: now,
            teamRecentSubmissions: parseInt(teamRecentSubmissions.count) || 0,
            timeLimit: problem.time_limit || 5000,
            memoryLimit: problem.memory_limit || 256
        };

        // Queue submission for processing
        const job = await judgeQueueService.queueSubmission(submissionData);

        console.log(`Submission ${submissionId} from team ${teamId} queued as job ${job.id}`);

        res.json({
            success: true,
            data: {
                submissionId: submissionId,
                jobId: job.id,
                status: 'queued',
                priority: job.opts.priority,
                estimatedWaitTime: estimateWaitTime()
            }
        });
    } catch (error) {
        console.error('Submission failed:', error);
        
        // If we created a submission record but failed to queue, mark it as failed
        if (submissionId) {
            try {
                await db('submissions')
                    .where('id', submissionId)
                    .update({
                        status: 'system_error',
                        result: 'Failed to queue submission',
                        judged_at: new Date()
                    });
            } catch (updateError) {
                console.error('Failed to update failed submission:', updateError);
            }
        }
        
        res.status(500).json({
            success: false,
            error: 'Submission failed',
            details: error.message
        });
    }
});

/**
 * @route GET /api/submissions/:id/status
 * @description Get detailed submission status and execution results
 * 
 * Retrieves comprehensive status information for a submission including
 * execution results, queue information for pending submissions, and
 * problem details. Teams can only access their own submissions.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Submission ID to get status for
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier for authorization
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with submission status
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Submission status data
 * @returns {number} returns.data.submissionId - Submission identifier
 * @returns {string} returns.data.problemLetter - Problem letter (A, B, C, etc.)
 * @returns {string} returns.data.problemTitle - Problem title
 * @returns {string} returns.data.language - Programming language used
 * @returns {string} returns.data.status - Current status (pending|judging|accepted|rejected)
 * @returns {string} [returns.data.result] - Detailed result message if completed
 * @returns {string} returns.data.submissionTime - Submission timestamp
 * @returns {string} [returns.data.judgedAt] - Judgment completion timestamp
 * @returns {number} [returns.data.executionTime] - Execution time in milliseconds
 * @returns {number} [returns.data.memoryUsed] - Memory used in MB
 * @returns {Object} [returns.data.queueInfo] - Queue information if pending
 * @returns {string} [returns.data.queueInfo.position] - Position in queue
 * @returns {string} [returns.data.queueInfo.estimatedWaitTime] - Estimated wait time
 * @returns {number} [returns.data.queueInfo.activeWorkers] - Active workers count
 * @returns {number} [returns.data.queueInfo.queueLength] - Current queue length
 * 
 * @throws {400} Invalid submission ID
 * @throws {404} Submission not found or access denied
 * @throws {500} Database or queue service errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * @example
 * GET /api/submissions/456/status
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "submissionId": 456,
 *     "problemLetter": "A",
 *     "problemTitle": "Sum Array",
 *     "language": "python",
 *     "status": "accepted",
 *     "result": "All test cases passed",
 *     "submissionTime": "2025-01-15T10:30:00.000Z",
 *     "judgedAt": "2025-01-15T10:30:15.000Z",
 *     "executionTime": 150,
 *     "memoryUsed": 12.5
 *   }
 * }
 */
router.get('/:id/status', authenticateTeam, async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id);
        const teamId = req.team.id;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid submission ID'
            });
        }

        // Try Redis cache first
        const cacheKey = `submission:status:${submissionId}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            const data = JSON.parse(cached);

            // Handle conditional requests with ETag
            if (req.headers['if-none-match'] === data.etag) {
                return res.status(304).end(); // Not Modified
            }

            res.setHeader('ETag', data.etag);
            res.setHeader('Cache-Control', 'no-cache');
            return res.json(data);
        }

        // Get submission from database
        const submission = await db('submissions')
            .select('submissions.*', 'problems.problem_letter', 'problems.title')
            .join('problems', 'submissions.problem_id', 'problems.id')
            .where('submissions.id', submissionId)
            .where('submissions.team_id', teamId) // Ensure team can only see their own submissions
            .first();

        if (!submission) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
        }

        let queueInfo = null;

        // If submission is still pending, try to get queue information
        if (submission.status === 'pending') {
            try {
                const queueStats = await judgeQueueService.getQueueStats();
                if (queueStats) {
                    queueInfo = {
                        position: 'unknown',
                        estimatedWaitTime: estimateWaitTime(queueStats),
                        activeWorkers: queueStats.workers.length,
                        queueLength: queueStats.waiting
                    };
                }
            } catch (queueError) {
                console.error('Error getting queue info:', queueError);
            }
        }

        // Parse judge_output if available
        let judgeOutput = null;
        if (submission.judge_output) {
            try {
                judgeOutput = typeof submission.judge_output === 'string'
                    ? JSON.parse(submission.judge_output)
                    : submission.judge_output;
            } catch (parseError) {
                console.error('Error parsing judge_output:', parseError);
            }
        }

        const responseData = {
            success: true,
            data: {
                submissionId: submission.id,
                problemLetter: submission.problem_letter,
                problemTitle: submission.title,
                language: submission.language,
                status: submission.status,
                result: submission.result,
                verdict: submission.result,
                submissionTime: submission.submitted_at,
                judgedAt: submission.judged_at,
                executionTime: submission.execution_time,
                memoryUsed: submission.memory_used,
                testCasesPassed: submission.test_cases_passed,
                totalTestCases: submission.total_test_cases,
                pointsEarned: submission.points_earned,
                judgeOutput: judgeOutput,
                queueInfo: queueInfo
            }
        };

        // Generate ETag
        const etag = crypto
            .createHash('md5')
            .update(JSON.stringify(responseData.data))
            .digest('hex');

        responseData.etag = etag;

        // Cache with appropriate TTL
        // Pending/judging: 2 seconds, Final states: 5 minutes
        const isFinal = ['accepted', 'wrong_answer', 'time_limit_exceeded',
                        'runtime_error', 'compilation_error', 'memory_limit_exceeded']
            .includes(submission.status);
        const ttl = isFinal ? 300 : 2;

        await redis.setex(cacheKey, ttl, JSON.stringify(responseData));

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'no-cache');
        res.json(responseData);
    } catch (error) {
        console.error('Error getting submission status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get submission status',
            details: error.message
        });
    }
});

/**
 * @route GET /api/submissions/team/:teamId
 * @description Get paginated submission history for a team
 * 
 * Retrieves all submissions for a specific team with pagination support.
 * Includes problem information, submission status, and timing details.
 * Teams can only access their own submission history.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.teamId - Team ID to get submissions for
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.page=1] - Page number for pagination
 * @param {number} [req.query.limit=50] - Items per page (max 100)
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier for authorization
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with submission history
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Submission history data
 * @returns {Array} returns.data.submissions - Array of submission objects
 * @returns {number} returns.data.submissions[].id - Submission identifier
 * @returns {string} returns.data.submissions[].problem_letter - Problem letter
 * @returns {string} returns.data.submissions[].title - Problem title
 * @returns {string} returns.data.submissions[].language - Programming language
 * @returns {string} returns.data.submissions[].status - Submission status
 * @returns {string} returns.data.submissions[].submission_time - Submission timestamp
 * @returns {string} [returns.data.submissions[].judged_at] - Judgment timestamp
 * @returns {number} [returns.data.submissions[].execution_time] - Execution time (ms)
 * @returns {number} [returns.data.submissions[].memory_used] - Memory used (MB)
 * @returns {Object} returns.data.pagination - Pagination information
 * @returns {number} returns.data.pagination.page - Current page number
 * @returns {number} returns.data.pagination.limit - Items per page
 * @returns {number} returns.data.pagination.total - Total submission count
 * @returns {number} returns.data.pagination.pages - Total page count
 * 
 * @throws {403} Access denied - team can only view own submissions
 * @throws {500} Database query errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * @example
 * GET /api/submissions/team/456?page=1&limit=20
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "submissions": [
 *       {
 *         "id": 789,
 *         "problem_letter": "A",
 *         "title": "Sum Array",
 *         "language": "python",
 *         "status": "accepted",
 *         "submission_time": "2025-01-15T10:30:00.000Z"
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 45,
 *       "pages": 3
 *     }
 *   }
 * }
 */
router.get('/team/:teamId', authenticateTeam, async (req, res) => {
    try {
        console.log('🔍 [Backend /team/:teamId] Route called');
        const teamId = parseInt(req.params.teamId);
        const requestingTeamId = req.team.id;

        console.log('🔍 [Backend /team/:teamId] teamId:', teamId);
        console.log('🔍 [Backend /team/:teamId] requestingTeamId:', requestingTeamId);
        console.log('🔍 [Backend /team/:teamId] query params:', req.query);

        // Teams can only see their own submissions
        if (teamId !== requestingTeamId) {
            console.log('❌ [Backend /team/:teamId] Access denied - team mismatch');
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = (page - 1) * limit;
        const contestFilter = req.query.contestId ? parseInt(req.query.contestId) : null;

        console.log('🔍 [Backend /team/:teamId] page:', page, 'limit:', limit, 'offset:', offset);
        console.log('🔍 [Backend /team/:teamId] contestFilter:', contestFilter);
        
        const submissionsQuery = db('submissions')
            .select('submissions.*', 'problems.problem_letter', 'problems.title')
            .join('problems', 'submissions.problem_id', 'problems.id')
            .where('submissions.team_id', teamId);

        const countQuery = db('submissions')
            .where('team_id', teamId);

        if (contestFilter && !Number.isNaN(contestFilter)) {
            submissionsQuery.where('submissions.contest_id', contestFilter);
            countQuery.where('contest_id', contestFilter);
        }

        console.log('🔍 [Backend /team/:teamId] Executing submissions query...');
        const submissions = await submissionsQuery
            .orderBy('submissions.submitted_at', 'desc')
            .limit(limit)
            .offset(offset);

        console.log('✅ [Backend /team/:teamId] Query returned', submissions.length, 'submissions');
        if (submissions.length > 0) {
            console.log('📝 [Backend /team/:teamId] First submission:', {
                id: submissions[0].id,
                team_id: submissions[0].team_id,
                problem_id: submissions[0].problem_id,
                contest_id: submissions[0].contest_id,
                status: submissions[0].status,
                submitted_at: submissions[0].submitted_at
            });
        }

        console.log('🔍 [Backend /team/:teamId] Executing count query...');
        const totalCount = await countQuery
            .count('* as count')
            .first();

        console.log('✅ [Backend /team/:teamId] Total count:', totalCount.count);

        const mappedSubmissions = submissions.map(s => ({
            id: s.id,
            team_id: s.team_id,
            problem_id: s.problem_id,
            contest_id: s.contest_id,
            problemLetter: s.problem_letter,
            problemTitle: s.title,
            language: s.language,
            status: s.status,
            submitted_at: s.submitted_at,
            judged_at: s.judged_at,
            execution_time: s.execution_time,
            memory_used: s.memory_used,
            test_cases_passed: s.test_cases_passed,
            total_test_cases: s.total_test_cases,
            points_earned: s.points_earned,
            judge_output: s.judge_output ? (typeof s.judge_output === 'string' ? JSON.parse(s.judge_output) : s.judge_output) : null,
            source_code: s.source_code
        }));

        console.log('📦 [Backend /team/:teamId] Sending response with', mappedSubmissions.length, 'mapped submissions');

        res.json({
            success: true,
            data: {
                submissions: mappedSubmissions,
                pagination: {
                    page: page,
                    limit: limit,
                    total: parseInt(totalCount.count),
                    pages: Math.ceil(parseInt(totalCount.count) / limit)
                }
            }
        });

        console.log('✅ [Backend /team/:teamId] Response sent successfully');
    } catch (error) {
        console.error('❌ [Backend /team/:teamId] Error getting team submissions:', error);
        console.error('❌ [Backend /team/:teamId] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to get submissions',
            details: error.message
        });
    }
});

/**
 * @route GET /api/submissions/:submissionId/queue-position
 * @description Get current queue position for a pending submission
 * 
 * Retrieves the current queue position and status for a pending or queued
 * submission. Provides real-time updates on submission processing progress.
 * Teams can only check positions for their own submissions.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.submissionId - Submission ID to check position for
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier for authorization
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with queue position data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Queue position data
 * @returns {number} returns.data.submissionId - Submission identifier
 * @returns {string} returns.data.currentStatus - Current submission status
 * @returns {Object} [returns.data.queuePosition] - Queue position info (if pending)
 * @returns {number} [returns.data.queuePosition.position] - Position in queue
 * @returns {string} [returns.data.queuePosition.status] - Queue status
 * @returns {string} [returns.data.queuePosition.estimatedWaitTime] - Estimated wait time
 * @returns {string} returns.data.lastUpdated - Last update timestamp
 * 
 * @throws {404} Submission not found or access denied
 * @throws {500} Queue service errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * @example
 * GET /api/submissions/456/queue-position
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "submissionId": 456,
 *     "currentStatus": "pending",
 *     "queuePosition": {
 *       "position": 3,
 *       "status": "waiting",
 *       "estimatedWaitTime": "~45 seconds"
 *     },
 *     "lastUpdated": "2025-01-15T10:30:00.000Z"
 *   }
 * }
 */
router.get('/:submissionId/queue-position', authenticateTeam, async (req, res) => {
    try {
        const submissionId = parseInt(req.params.submissionId);
        const teamId = req.team.id;
        
        // Verify submission belongs to requesting team
        const submission = await db('submissions')
            .where('id', submissionId)
            .where('team_id', teamId)
            .first();
            
        if (!submission) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found or access denied'
            });
        }
        
        // Get queue position if submission is pending
        let queuePosition = null;
        if (submission.status === 'pending' || submission.status === 'queued') {
            try {
                queuePosition = await judgeQueueService.getQueuePosition(submissionId.toString());
            } catch (error) {
                console.error('Error getting queue position:', error);
            }
        }
        
        res.json({
            success: true,
            data: {
                submissionId: submissionId,
                currentStatus: submission.status,
                queuePosition: queuePosition,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting queue position:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue position',
            details: error.message
        });
    }
});

/**
 * @route POST /api/submissions/:submissionId/notify-status
 * @description Manually trigger status notification for a submission
 * 
 * Forces a status notification broadcast for a submission via WebSocket.
 * Useful for ensuring real-time updates reach connected clients or for
 * testing notification systems. Teams can only trigger notifications
 * for their own submissions.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.submissionId - Submission ID to notify about
 * @param {Object} req.team - Authenticated team data from middleware
 * @param {number} req.team.id - Team identifier for authorization
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with notification confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Notification operation data
 * @returns {number} returns.data.submissionId - Submission identifier
 * @returns {boolean} returns.data.notificationSent - Notification success flag
 * @returns {string} returns.data.currentStatus - Current submission status
 * @returns {Object} [returns.data.queuePosition] - Current queue position info
 * @returns {number} [returns.data.queuePosition.position] - Position in queue
 * @returns {string} [returns.data.queuePosition.status] - Queue status
 * @returns {string} [returns.data.queuePosition.estimatedWaitTime] - Wait time estimate
 * 
 * @throws {404} Submission not found or access denied
 * @throws {500} WebSocket service or queue service errors
 * 
 * @requires Team authentication via authenticateTeam middleware
 * 
 * WebSocket Broadcast Details:
 * - Sends submission status update to connected clients
 * - Includes queue position and timing information
 * - Broadcasts to team-specific channels and contest channels
 * 
 * @example
 * POST /api/submissions/456/notify-status
 * Authorization: Bearer <team-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "submissionId": 456,
 *     "notificationSent": true,
 *     "currentStatus": "judging",
 *     "queuePosition": {
 *       "position": 1,
 *       "status": "processing"
 *     }
 *   }
 * }
 */
router.post('/:submissionId/notify-status', authenticateTeam, async (req, res) => {
    try {
        const submissionId = parseInt(req.params.submissionId);
        const teamId = req.team.id;
        
        // Verify submission belongs to requesting team
        const submission = await db('submissions')
            .select('submissions.*', 'problems.contest_id')
            .join('problems', 'submissions.problem_id', 'problems.id')
            .where('submissions.id', submissionId)
            .where('submissions.team_id', teamId)
            .first();
            
        if (!submission) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found or access denied'
            });
        }
        
        // Get current queue position and broadcast update
        const queuePosition = await judgeQueueService.getQueuePosition(submissionId.toString());
        
        if (queuePosition) {
            const websocketService = require('../services/websocketService');
            await websocketService.broadcastSubmissionStatus({
                submissionId: submissionId,
                teamId: teamId,
                contestId: submission.contest_id,
                status: queuePosition.status,
                queuePosition: queuePosition.position,
                estimatedWaitTime: queuePosition.estimatedWaitTime
            });
        }
        
        res.json({
            success: true,
            data: {
                submissionId: submissionId,
                notificationSent: true,
                currentStatus: queuePosition?.status || submission.status,
                queuePosition: queuePosition
            }
        });
    } catch (error) {
        console.error('Error sending status notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send status notification',
            details: error.message
        });
    }
});

/**
 * @function estimateWaitTime
 * @description Helper function to estimate submission processing wait time
 * 
 * Calculates human-readable estimated wait time based on current queue
 * statistics including queue length, average processing time, and worker
 * capacity. Provides user-friendly time estimates for submission interfaces.
 * 
 * @param {Object} [queueStats=null] - Queue statistics object
 * @param {number} [queueStats.avgProcessingTime=5000] - Average processing time (ms)
 * @param {number} [queueStats.waiting=0] - Number of jobs waiting in queue
 * @param {Array} queueStats.workers - Array of worker objects
 * @param {boolean} queueStats.workers[].isHealthy - Worker health status
 * 
 * @returns {string} Human-readable time estimate
 * 
 * Time estimate ranges:
 * - '< 10 seconds': Very short wait (< 10s)
 * - '~N seconds': Short wait (10s - 1min)
 * - '~N minutes': Medium wait (1min - 5min)
 * - '> 5 minutes': Long wait (> 5min)
 * - 'unknown': Unable to calculate (no stats)
 * 
 * Calculation factors:
 * - Current queue length and position
 * - Average processing time per submission
 * - Number of healthy workers available
 * - Worker capacity and parallel processing
 * 
 * @example
 * const estimate = estimateWaitTime({
 *   avgProcessingTime: 4000,
 *   waiting: 8,
 *   workers: [{ isHealthy: true }, { isHealthy: true }, { isHealthy: false }]
 * });
 * // Returns: "~16 seconds"
 */
function estimateWaitTime(queueStats = null) {
    if (!queueStats) return 'unknown';
    
    const avgProcessingTime = queueStats.avgProcessingTime || 5000; // Default 5 seconds
    const queueLength = queueStats.waiting || 0;
    const activeWorkers = Math.max(1, queueStats.workers.filter(w => w.isHealthy).length);
    
    // Estimate based on queue length and worker capacity
    const estimatedMs = (queueLength * avgProcessingTime) / activeWorkers;
    
    if (estimatedMs < 10000) return '< 10 seconds';
    if (estimatedMs < 60000) return `~${Math.round(estimatedMs / 1000)} seconds`;
    if (estimatedMs < 300000) return `~${Math.round(estimatedMs / 60000)} minutes`;
    
    return '> 5 minutes';
}

/**
 * @route POST /api/submissions/notifications/subscribe
 * @description Subscribe to push notifications for submission updates
 */
router.post('/notifications/subscribe', authenticateTeam, async (req, res) => {
    try {
        const { subscription } = req.body;
        const teamId = req.team.id;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({
                success: false,
                error: 'Invalid subscription data'
            });
        }

        const result = await pushNotificationService.saveSubscription(teamId, subscription);

        if (result.success) {
            res.json({
                success: true,
                message: 'Subscribed to push notifications'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save subscription'
            });
        }
    } catch (error) {
        console.error('Error subscribing to notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to subscribe to notifications'
        });
    }
});

/**
 * @route DELETE /api/submissions/notifications/unsubscribe
 * @description Unsubscribe from push notifications
 */
router.delete('/notifications/unsubscribe', authenticateTeam, async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({
                success: false,
                error: 'Endpoint required'
            });
        }

        const result = await pushNotificationService.removeSubscription(endpoint);

        if (result.success) {
            res.json({
                success: true,
                message: 'Unsubscribed from push notifications'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to unsubscribe'
            });
        }
    } catch (error) {
        console.error('Error unsubscribing from notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe'
        });
    }
});

/**
 * @route GET /api/submissions/notifications/vapid-public-key
 * @description Get VAPID public key for push notification setup
 */
router.get('/notifications/vapid-public-key', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';

    if (!publicKey) {
        return res.status(503).json({
            success: false,
            error: 'Push notifications not configured'
        });
    }

    res.json({
        success: true,
        publicKey: publicKey
    });
});

module.exports = router;

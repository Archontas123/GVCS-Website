/**
 * CS Club Hackathon Platform - Submission Management API  
 * Phase 4.3: Queue-integrated submission processing
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticateTeam } = require('../middleware/auth');
const { testConnection, db } = require('../utils/db');
const judgeQueueService = require('../services/judgeQueue');

// Validation schemas
const submissionSchema = Joi.object({
    problemId: Joi.number().integer().positive().required(),
    language: Joi.string().valid('cpp', 'java', 'python').required(),
    code: Joi.string().min(1).max(50000).required()
});

/**
 * POST /api/submissions/submit
 * Submit code for judging through queue system
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
            .select('problems.*', 'contests.id as contest_id', 'contests.start_time', 'contests.duration', 'contests.is_frozen')
            .join('contests', 'problems.contest_id', 'contests.id')
            .where('problems.id', problemId)
            .first();
            
        if (!problem) {
            return res.status(404).json({
                success: false,
                error: 'Problem not found'
            });
        }

        // Check if contest is active and not frozen
        const now = new Date();
        const contestStart = new Date(problem.start_time);
        const contestEnd = new Date(contestStart.getTime() + problem.duration * 60 * 1000);
        
        if (now < contestStart) {
            return res.status(400).json({
                success: false,
                error: 'Contest has not started yet'
            });
        }
        
        if (now > contestEnd) {
            return res.status(400).json({
                success: false,
                error: 'Contest has ended'
            });
        }

        if (problem.is_frozen) {
            return res.status(400).json({
                success: false,
                error: 'Contest is frozen - no new submissions accepted'
            });
        }

        // Store submission in database as pending
        const submission = await db('submissions').insert({
            team_id: teamId,
            problem_id: problemId,
            language: language,
            code: code,
            status: 'pending',
            submission_time: now,
            created_at: now
        }).returning('*');

        submissionId = submission[0].id || submission[0];
        
        // Get team recent submissions for fair prioritization
        const teamRecentSubmissions = await db('submissions')
            .where('team_id', teamId)
            .where('submission_time', '>', new Date(now.getTime() - 10 * 60 * 1000)) // Last 10 minutes
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
            contestEndTime: contestEnd,
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
 * GET /api/submissions/:id/status
 * Get submission status and result
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
                        position: 'unknown', // Would need to track job IDs to determine exact position
                        estimatedWaitTime: estimateWaitTime(queueStats),
                        activeWorkers: queueStats.workers.length,
                        queueLength: queueStats.waiting
                    };
                }
            } catch (queueError) {
                console.error('Error getting queue info:', queueError);
            }
        }
        
        res.json({
            success: true,
            data: {
                submissionId: submission.id,
                problemLetter: submission.problem_letter,
                problemTitle: submission.title,
                language: submission.language,
                status: submission.status,
                result: submission.result,
                submissionTime: submission.submission_time,
                judgedAt: submission.judged_at,
                executionTime: submission.execution_time,
                memoryUsed: submission.memory_used,
                queueInfo: queueInfo
            }
        });
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
 * GET /api/submissions/team/:teamId
 * Get all submissions for a team (with pagination)
 */
router.get('/team/:teamId', authenticateTeam, async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        const requestingTeamId = req.team.id;
        
        // Teams can only see their own submissions
        if (teamId !== requestingTeamId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = (page - 1) * limit;
        
        const submissions = await db('submissions')
            .select('submissions.*', 'problems.problem_letter', 'problems.title')
            .join('problems', 'submissions.problem_id', 'problems.id')
            .where('submissions.team_id', teamId)
            .orderBy('submissions.submission_time', 'desc')
            .limit(limit)
            .offset(offset);
            
        const totalCount = await db('submissions')
            .where('team_id', teamId)
            .count('* as count')
            .first();
        
        res.json({
            success: true,
            data: {
                submissions: submissions,
                pagination: {
                    page: page,
                    limit: limit,
                    total: parseInt(totalCount.count),
                    pages: Math.ceil(parseInt(totalCount.count) / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error getting team submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get submissions',
            details: error.message
        });
    }
});

/**
 * GET /api/submissions/:submissionId/queue-position
 * Get current queue position for a submission - Phase 4.5
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
 * POST /api/submissions/:submissionId/notify-status  
 * Manually trigger status notification for a submission - Phase 4.5
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
 * Helper function to estimate wait time based on queue stats
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

module.exports = router;
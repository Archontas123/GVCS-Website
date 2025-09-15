/**
 * @module QueueRoutes
 * @description Queue Management API for Programming Contest Platform
 * 
 * This module provides comprehensive judge queue management and monitoring:
 * - Real-time queue status and statistics monitoring
 * - Administrative queue control operations (pause, resume, clear)
 * - Worker health monitoring and performance tracking
 * - Queue cleanup and maintenance operations
 * - Performance metrics in Prometheus format
 * - Estimated wait time calculations for user experience
 * - Detailed queue analytics for system optimization
 * 
 * Supports both public endpoints for basic queue information and administrative
 * endpoints for complete queue management and troubleshooting.
 */

const express = require('express');
const router = express.Router();
const judgeQueueService = require('../services/judgeQueue');
const { verifyAdminToken } = require('../middleware/adminAuth');

/**
 * @route GET /api/queue/status
 * @description Get current queue status and basic statistics
 * 
 * Retrieves public queue information including current queue length,
 * processing statistics, worker health status, and estimated wait times.
 * Designed for team-facing displays and general system status.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with queue status
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Queue status data
 * @returns {Object} returns.data.queueStatus - Current queue statistics
 * @returns {number} returns.data.queueStatus.waiting - Jobs waiting in queue
 * @returns {number} returns.data.queueStatus.active - Jobs currently processing
 * @returns {number} returns.data.queueStatus.totalProcessed - Total jobs processed
 * @returns {number} returns.data.queueStatus.avgProcessingTime - Average processing time (ms)
 * @returns {number} returns.data.queueStatus.healthyWorkers - Number of healthy workers
 * @returns {number} returns.data.queueStatus.totalWorkers - Total number of workers
 * @returns {string} returns.data.estimatedWaitTime - Human-readable wait time estimate
 * @returns {string} returns.data.lastUpdated - Status timestamp
 * 
 * @throws {503} Queue service not available
 * @throws {500} Queue service errors
 * 
 * @example
 * GET /api/queue/status
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "queueStatus": {
 *       "waiting": 5,
 *       "active": 2,
 *       "totalProcessed": 1250,
 *       "avgProcessingTime": 3500,
 *       "healthyWorkers": 4,
 *       "totalWorkers": 4
 *     },
 *     "estimatedWaitTime": "~15 seconds",
 *     "lastUpdated": "2025-01-15T10:30:00.000Z"
 *   }
 * }
 */
router.get('/status', async (req, res) => {
    try {
        const queueStats = await judgeQueueService.getQueueStats();
        
        if (!queueStats) {
            return res.status(503).json({
                success: false,
                error: 'Queue service not available'
            });
        }
        
        // Return public information only
        res.json({
            success: true,
            data: {
                queueStatus: {
                    waiting: queueStats.waiting,
                    active: queueStats.active,
                    totalProcessed: queueStats.totalProcessed,
                    avgProcessingTime: Math.round(queueStats.avgProcessingTime),
                    healthyWorkers: queueStats.workers.filter(w => w.isHealthy).length,
                    totalWorkers: queueStats.workers.length
                },
                estimatedWaitTime: estimateWaitTime(queueStats),
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting queue status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue status',
            details: error.message
        });
    }
});

/**
 * @route GET /api/queue/detailed
 * @description Get comprehensive queue statistics and system information
 * 
 * Retrieves detailed queue statistics including complete worker information,
 * system resource usage, performance metrics, and internal queue state.
 * Provides administrative visibility into queue health and performance.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with detailed queue data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Detailed queue information
 * @returns {Object} returns.data.queueStats - Complete queue statistics
 * @returns {Array} returns.data.queueStats.workers - Detailed worker information
 * @returns {Object} returns.data.queueStats.processingRates - Processing rate metrics
 * @returns {Object} returns.data.queueStats.errorRates - Error rate statistics
 * @returns {Object} returns.data.systemInfo - System resource information
 * @returns {number} returns.data.systemInfo.uptime - Process uptime (seconds)
 * @returns {Object} returns.data.systemInfo.memoryUsage - Memory usage details
 * @returns {number} returns.data.systemInfo.cpuCount - Number of CPU cores
 * @returns {Array} returns.data.systemInfo.loadAverage - System load averages
 * @returns {string} returns.data.lastUpdated - Status timestamp
 * 
 * @throws {503} Queue service not available
 * @throws {500} Queue service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * GET /api/queue/detailed
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "queueStats": {
 *       "workers": [...],
 *       "processingRates": {...}
 *     },
 *     "systemInfo": {
 *       "uptime": 86400,
 *       "memoryUsage": {...},
 *       "cpuCount": 4,
 *       "loadAverage": [0.5, 0.7, 0.8]
 *     }
 *   }
 * }
 */
router.get('/detailed', verifyAdminToken, async (req, res) => {
    try {
        const queueStats = await judgeQueueService.getQueueStats();
        
        if (!queueStats) {
            return res.status(503).json({
                success: false,
                error: 'Queue service not available'
            });
        }
        
        res.json({
            success: true,
            data: {
                queueStats: queueStats,
                systemInfo: {
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    cpuCount: require('os').cpus().length,
                    loadAverage: require('os').loadavg()
                },
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting detailed queue status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get detailed queue status',
            details: error.message
        });
    }
});

/**
 * @route POST /api/queue/pause
 * @description Pause the judge queue to stop processing new submissions
 * 
 * Pauses the judge queue, preventing new submissions from being processed
 * while allowing currently active jobs to complete. Useful for maintenance,
 * system updates, or emergency situations.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with pause confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {string} returns.message - Pause confirmation message
 * @returns {string} returns.timestamp - Pause operation timestamp
 * 
 * @throws {500} Queue service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * POST /api/queue/pause
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Judge queue paused successfully",
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
 */
router.post('/pause', verifyAdminToken, async (req, res) => {
    try {
        await judgeQueueService.pauseQueue();
        
        res.json({
            success: true,
            message: 'Judge queue paused successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error pausing queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to pause queue',
            details: error.message
        });
    }
});

/**
 * @route POST /api/queue/resume
 * @description Resume the judge queue to continue processing submissions
 * 
 * Resumes the judge queue after it has been paused, allowing queued
 * and new submissions to be processed normally. Workers will begin
 * picking up jobs from the queue.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with resume confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {string} returns.message - Resume confirmation message
 * @returns {string} returns.timestamp - Resume operation timestamp
 * 
 * @throws {500} Queue service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * POST /api/queue/resume
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Judge queue resumed successfully",
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
 */
router.post('/resume', verifyAdminToken, async (req, res) => {
    try {
        await judgeQueueService.resumeQueue();
        
        res.json({
            success: true,
            message: 'Judge queue resumed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error resuming queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resume queue',
            details: error.message
        });
    }
});

/**
 * @route POST /api/queue/clear
 * @description Clear all pending jobs from the queue
 * 
 * Removes all pending (waiting) jobs from the queue. Active jobs will
 * continue to completion. This is a destructive operation that cannot
 * be undone - use with caution during emergency situations.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with clear confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {string} returns.message - Clear confirmation message
 * @returns {string} returns.timestamp - Clear operation timestamp
 * 
 * @throws {500} Queue service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @warning This is a destructive operation that removes all pending submissions
 * 
 * @example
 * POST /api/queue/clear
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Judge queue cleared successfully",
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
 */
router.post('/clear', verifyAdminToken, async (req, res) => {
    try {
        await judgeQueueService.clearQueue();
        
        res.json({
            success: true,
            message: 'Judge queue cleared successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error clearing queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear queue',
            details: error.message
        });
    }
});

/**
 * @route POST /api/queue/cleanup
 * @description Cleanup stuck jobs and handle unhealthy workers
 * 
 * Performs maintenance operations to handle stuck jobs, restart unhealthy
 * workers, and clean up queue inconsistencies. Reports the number of
 * jobs that were cleaned up during the operation.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with cleanup results
 * @returns {boolean} returns.success - Operation success status
 * @returns {string} returns.message - Cleanup completion message with count
 * @returns {Object} returns.data - Cleanup operation data
 * @returns {number} returns.data.cleanedJobs - Number of stuck jobs cleaned
 * @returns {string} returns.timestamp - Cleanup operation timestamp
 * 
 * @throws {500} Queue service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * Operations performed:
 * - Identify and requeue stuck jobs
 * - Restart unhealthy workers
 * - Clean up orphaned queue entries
 * - Reset worker statistics if needed
 * 
 * @example
 * POST /api/queue/cleanup
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Queue cleanup completed. Cleaned up 3 stuck jobs.",
 *   "data": {
 *     "cleanedJobs": 3
 *   },
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
 */
router.post('/cleanup', verifyAdminToken, async (req, res) => {
    try {
        const cleanedJobs = await judgeQueueService.handleStuckJobs();
        
        res.json({
            success: true,
            message: `Queue cleanup completed. Cleaned up ${cleanedJobs} stuck jobs.`,
            data: {
                cleanedJobs: cleanedJobs
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error cleaning up queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup queue',
            details: error.message
        });
    }
});

/**
 * @route GET /api/queue/workers
 * @description Get detailed worker status and performance information
 * 
 * Retrieves comprehensive information about all queue workers including
 * health status, performance metrics, job processing statistics, and
 * uptime information. Includes both individual worker data and summary statistics.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with worker information
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Worker status data
 * @returns {Array} returns.data.workers - Individual worker information
 * @returns {string} returns.data.workers[].id - Worker identifier
 * @returns {boolean} returns.data.workers[].isHealthy - Worker health status
 * @returns {number} returns.data.workers[].processedJobs - Jobs processed by worker
 * @returns {number} returns.data.workers[].failedJobs - Jobs failed by worker
 * @returns {number} returns.data.workers[].uptime - Worker uptime (ms)
 * @returns {number} returns.data.workers[].uptimeHours - Worker uptime (hours)
 * @returns {number} returns.data.workers[].successRate - Worker success rate percentage
 * @returns {Object} returns.data.summary - Worker summary statistics
 * @returns {number} returns.data.summary.totalWorkers - Total number of workers
 * @returns {number} returns.data.summary.healthyWorkers - Number of healthy workers
 * @returns {number} returns.data.summary.totalProcessedJobs - Total jobs processed
 * @returns {number} returns.data.summary.totalFailedJobs - Total jobs failed
 * 
 * @throws {503} Worker information not available
 * @throws {500} Queue service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * GET /api/queue/workers
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "workers": [
 *       {
 *         "id": "worker-1",
 *         "isHealthy": true,
 *         "processedJobs": 150,
 *         "failedJobs": 2,
 *         "uptimeHours": 24.5,
 *         "successRate": 98.67
 *       }
 *     ],
 *     "summary": {
 *       "totalWorkers": 4,
 *       "healthyWorkers": 4,
 *       "totalProcessedJobs": 600,
 *       "totalFailedJobs": 8
 *     }
 *   }
 * }
 */
router.get('/workers', verifyAdminToken, async (req, res) => {
    try {
        const queueStats = await judgeQueueService.getQueueStats();
        
        if (!queueStats || !queueStats.workers) {
            return res.status(503).json({
                success: false,
                error: 'Worker information not available'
            });
        }
        
        res.json({
            success: true,
            data: {
                workers: queueStats.workers.map(worker => ({
                    ...worker,
                    uptimeHours: Math.round(worker.uptime / (1000 * 60 * 60) * 100) / 100,
                    successRate: worker.processedJobs > 0 ? 
                        Math.round((1 - worker.failedJobs / worker.processedJobs) * 100 * 100) / 100 : 100
                })),
                summary: {
                    totalWorkers: queueStats.workers.length,
                    healthyWorkers: queueStats.workers.filter(w => w.isHealthy).length,
                    totalProcessedJobs: queueStats.workers.reduce((sum, w) => sum + w.processedJobs, 0),
                    totalFailedJobs: queueStats.workers.reduce((sum, w) => sum + w.failedJobs, 0)
                }
            }
        });
    } catch (error) {
        console.error('Error getting worker status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get worker status',
            details: error.message
        });
    }
});

/**
 * @route GET /api/queue/metrics
 * @description Get queue performance metrics in Prometheus format
 * 
 * Provides queue performance metrics in Prometheus-compatible format for
 * integration with monitoring systems like Grafana, Prometheus, or other
 * time-series monitoring platforms.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {string} Prometheus-formatted metrics text
 * @returns Content-Type: text/plain; version=0.0.4
 * 
 * Metrics provided:
 * - judge_queue_waiting: Number of jobs waiting in queue (gauge)
 * - judge_queue_active: Number of jobs currently being processed (gauge)
 * - judge_queue_completed: Total number of completed jobs (counter)
 * - judge_queue_failed: Total number of failed jobs (counter)
 * - judge_queue_avg_processing_time: Average job processing time in milliseconds (gauge)
 * - judge_queue_workers_healthy: Number of healthy workers (gauge)
 * - judge_queue_workers_total: Total number of workers (gauge)
 * 
 * @throws {503} Queue metrics not available
 * @throws {500} Queue service errors
 * 
 * @example
 * GET /api/queue/metrics
 * 
 * Response (text/plain):
 * # HELP judge_queue_waiting Number of jobs waiting in queue
 * # TYPE judge_queue_waiting gauge
 * judge_queue_waiting 5
 * 
 * # HELP judge_queue_active Number of jobs currently being processed
 * # TYPE judge_queue_active gauge
 * judge_queue_active 2
 * 
 * # HELP judge_queue_completed Total number of completed jobs
 * # TYPE judge_queue_completed counter
 * judge_queue_completed 1250
 */
router.get('/metrics', async (req, res) => {
    try {
        const queueStats = await judgeQueueService.getQueueStats();
        
        if (!queueStats) {
            return res.status(503).json({
                success: false,
                error: 'Queue metrics not available'
            });
        }
        
        // Return metrics in Prometheus-style format for monitoring systems
        const metrics = [
            `# HELP judge_queue_waiting Number of jobs waiting in queue`,
            `# TYPE judge_queue_waiting gauge`,
            `judge_queue_waiting ${queueStats.waiting}`,
            ``,
            `# HELP judge_queue_active Number of jobs currently being processed`,
            `# TYPE judge_queue_active gauge`, 
            `judge_queue_active ${queueStats.active}`,
            ``,
            `# HELP judge_queue_completed Total number of completed jobs`,
            `# TYPE judge_queue_completed counter`,
            `judge_queue_completed ${queueStats.completed}`,
            ``,
            `# HELP judge_queue_failed Total number of failed jobs`,
            `# TYPE judge_queue_failed counter`,
            `judge_queue_failed ${queueStats.failed}`,
            ``,
            `# HELP judge_queue_avg_processing_time Average job processing time in milliseconds`,
            `# TYPE judge_queue_avg_processing_time gauge`,
            `judge_queue_avg_processing_time ${queueStats.avgProcessingTime}`,
            ``,
            `# HELP judge_queue_workers_healthy Number of healthy workers`,
            `# TYPE judge_queue_workers_healthy gauge`,
            `judge_queue_workers_healthy ${queueStats.workers.filter(w => w.isHealthy).length}`,
            ``,
            `# HELP judge_queue_workers_total Total number of workers`,
            `# TYPE judge_queue_workers_total gauge`,
            `judge_queue_workers_total ${queueStats.workers.length}`,
        ].join('\n');
        
        res.set('Content-Type', 'text/plain; version=0.0.4');
        res.send(metrics);
    } catch (error) {
        console.error('Error getting queue metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue metrics',
            details: error.message
        });
    }
});

/**
 * @function estimateWaitTime
 * @description Helper function to calculate estimated wait time for queue
 * 
 * Calculates human-readable estimated wait time based on current queue length,
 * average processing time, and number of healthy workers. Provides user-friendly
 * time estimates for display in user interfaces.
 * 
 * @param {Object} queueStats - Queue statistics object
 * @param {number} [queueStats.avgProcessingTime=5000] - Average processing time (ms)
 * @param {number} [queueStats.waiting=0] - Number of jobs waiting in queue
 * @param {Array} queueStats.workers - Array of worker objects
 * @param {boolean} queueStats.workers[].isHealthy - Worker health status
 * 
 * @returns {string} Human-readable time estimate
 * 
 * Time estimate ranges:
 * - 'immediate': No queue
 * - '< 10 seconds': Very short wait
 * - '~N seconds': Short wait (10s - 1min)
 * - '~N minutes': Medium wait (1min - 5min)
 * - '> 5 minutes': Long wait
 * - 'unknown': Unable to calculate
 * 
 * @example
 * const estimate = estimateWaitTime({
 *   avgProcessingTime: 3000,
 *   waiting: 5,
 *   workers: [{ isHealthy: true }, { isHealthy: true }]
 * });
 * // Returns: "~8 seconds"
 */
function estimateWaitTime(queueStats) {
    if (!queueStats) return 'unknown';
    
    const avgProcessingTime = queueStats.avgProcessingTime || 5000;
    const queueLength = queueStats.waiting || 0;
    const activeWorkers = Math.max(1, queueStats.workers.filter(w => w.isHealthy).length);
    
    if (queueLength === 0) return 'immediate';
    
    const estimatedMs = (queueLength * avgProcessingTime) / activeWorkers;
    
    if (estimatedMs < 10000) return '< 10 seconds';
    if (estimatedMs < 60000) return `~${Math.round(estimatedMs / 1000)} seconds`;
    if (estimatedMs < 300000) return `~${Math.round(estimatedMs / 60000)} minutes`;
    
    return '> 5 minutes';
}

module.exports = router;
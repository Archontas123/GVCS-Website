/**
 * CS Club Hackathon Platform - Queue Management API
 * Phase 4.3: Queue monitoring and administration endpoints
 */

const express = require('express');
const router = express.Router();
const judgeQueueService = require('../services/judgeQueue');
const { verifyAdminToken } = require('../middleware/adminAuth');

/**
 * GET /api/queue/status
 * Get current queue status and statistics
 * Public endpoint for basic queue info
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
 * GET /api/queue/detailed
 * Get detailed queue statistics (admin only)
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
 * POST /api/queue/pause
 * Pause the judge queue (admin only)
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
 * POST /api/queue/resume
 * Resume the judge queue (admin only)
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
 * POST /api/queue/clear
 * Clear all pending jobs from queue (admin only)
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
 * POST /api/queue/cleanup
 * Handle stuck jobs and restart unhealthy workers (admin only)
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
 * GET /api/queue/workers
 * Get worker status information (admin only)
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
 * GET /api/queue/metrics
 * Get queue performance metrics for monitoring
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
 * Helper function to estimate wait time
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
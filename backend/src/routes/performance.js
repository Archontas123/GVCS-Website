/**
 * CS Club Hackathon Platform - Performance Monitoring API
 * Phase 4.4: Performance monitoring and statistics endpoints
 */

const express = require('express');
const router = express.Router();
const { verifyAdminToken, optionalAdminAuth } = require('../middleware/adminAuth');
const performanceStatsStorage = require('../services/performanceStatsStorage');
const ExecutionMonitor = require('../services/executionMonitor');
const ICPCJudge = require('../services/icpcJudge');
const judgeQueueService = require('../services/judgeQueue');

// Initialize services
const executionMonitor = new ExecutionMonitor();
const icpcJudge = new ICPCJudge();

/**
 * GET /api/performance/overview
 * Get comprehensive performance overview
 */
router.get('/overview', optionalAdminAuth, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '24h';
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const [
      aggregatedStats,
      executionStats,
      judgeStats,
      queueStats,
      systemResources
    ] = await Promise.all([
      performanceStatsStorage.getAggregatedStats(startTime, now),
      executionMonitor.getPerformanceStats(),
      icpcJudge.getJudgePerformanceMetrics(),
      judgeQueueService.getProcessingRateStats(),
      executionMonitor.getSystemResources()
    ]);

    res.json({
      success: true,
      data: {
        timeRange: timeRange,
        overview: {
          totalExecutions: aggregatedStats.execution?.total_executions || 0,
          averageExecutionTime: aggregatedStats.execution?.avg_execution_time || 0,
          successRate: aggregatedStats.execution?.success_count > 0 ? 
            (aggregatedStats.execution.success_count / (aggregatedStats.execution.success_count + aggregatedStats.execution.error_count)) * 100 : 0,
          avgProcessingRate: queueStats.currentPerMinute || 0,
          systemLoad: systemResources.loadAverage?.[0] || 0
        },
        execution: executionStats,
        judge: judgeStats,
        queue: queueStats,
        system: systemResources,
        aggregated: aggregatedStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting performance overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance overview',
      details: error.message
    });
  }
});

/**
 * GET /api/performance/execution
 * Get execution performance metrics
 */
router.get('/execution', optionalAdminAuth, async (req, res) => {
  try {
    const language = req.query.language;
    const timeRange = req.query.timeRange || '24h';
    
    if (language) {
      const [stats, langStats] = await Promise.all([
        executionMonitor.getLanguagePerformanceStats(language),
        performanceStatsStorage.getLanguageStats(language, getStartTime(timeRange), new Date())
      ]);
      
      res.json({
        success: true,
        data: {
          language: language,
          realTime: stats,
          historical: langStats,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      const stats = executionMonitor.getPerformanceStats();
      
      res.json({
        success: true,
        data: {
          ...stats,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error getting execution metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get execution metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/performance/queue
 * Get queue performance metrics
 */
router.get('/queue', optionalAdminAuth, async (req, res) => {
  try {
    const [queueStats, processingRates] = await Promise.all([
      judgeQueueService.getQueueStats(),
      judgeQueueService.getProcessingRateStats()
    ]);

    res.json({
      success: true,
      data: {
        currentState: queueStats,
        processingRates: processingRates,
        timestamp: new Date().toISOString()
      }
    });
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
 * GET /api/performance/judge
 * Get judge performance metrics
 */
router.get('/judge', optionalAdminAuth, async (req, res) => {
  try {
    const judgeMetrics = icpcJudge.getJudgePerformanceMetrics();

    res.json({
      success: true,
      data: {
        ...judgeMetrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting judge metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get judge metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/performance/system
 * Get system performance metrics
 */
router.get('/system', optionalAdminAuth, async (req, res) => {
  try {
    const systemMetrics = executionMonitor.getSystemResources();
    const monitoringStats = executionMonitor.getMonitoringStats();

    res.json({
      success: true,
      data: {
        resources: systemMetrics,
        monitoring: monitoringStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/performance/languages
 * Get language-specific performance statistics
 */
router.get('/languages', optionalAdminAuth, async (req, res) => {
  try {
    const stats = executionMonitor.getPerformanceStats();
    const languages = Object.keys(stats.languageStats || {});
    
    const languageMetrics = [];
    
    for (const language of languages) {
      const [realTimeStats, historicalStats] = await Promise.all([
        executionMonitor.getLanguagePerformanceStats(language),
        performanceStatsStorage.getLanguageStats(language, getStartTime('7d'), new Date())
      ]);
      
      languageMetrics.push({
        language: language,
        realTime: realTimeStats,
        historical: historicalStats
      });
    }

    res.json({
      success: true,
      data: {
        languages: languageMetrics,
        summary: stats.languageStats,
        errorRates: stats.errorRates,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting language metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get language metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/performance/historical
 * Get historical performance data
 */
router.get('/historical', verifyAdminToken, async (req, res) => {
  try {
    const { startTime, endTime, metricType = 'execution', limit = 1000 } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'startTime and endTime are required'
      });
    }

    const metrics = await performanceStatsStorage.getMetrics(
      metricType, 
      new Date(startTime), 
      new Date(endTime),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        metrics: metrics,
        metricType: metricType,
        timeRange: { startTime, endTime },
        count: metrics.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting historical metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get historical metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/performance/metrics/prometheus
 * Get metrics in Prometheus format for monitoring systems
 */
router.get('/metrics/prometheus', async (req, res) => {
  try {
    const [executionStats, queueStats, systemResources] = await Promise.all([
      executionMonitor.getPerformanceStats(),
      judgeQueueService.getProcessingRateStats(),
      executionMonitor.getSystemResources()
    ]);

    const metrics = [
      `# HELP hackathon_executions_total Total number of code executions`,
      `# TYPE hackathon_executions_total counter`,
      `hackathon_executions_total ${executionStats.totalExecutions}`,
      ``,
      `# HELP hackathon_execution_time_avg Average execution time in milliseconds`,
      `# TYPE hackathon_execution_time_avg gauge`,
      `hackathon_execution_time_avg ${executionStats.averageExecutionTime}`,
      ``,
      `# HELP hackathon_memory_usage_peak Peak memory usage in MB`,
      `# TYPE hackathon_memory_usage_peak gauge`,
      `hackathon_memory_usage_peak ${executionStats.peakMemoryUsage}`,
      ``,
      `# HELP hackathon_queue_processing_rate Processing rate per minute`,
      `# TYPE hackathon_queue_processing_rate gauge`,
      `hackathon_queue_processing_rate ${queueStats.currentPerMinute}`,
      ``,
      `# HELP hackathon_queue_length Current queue length`,
      `# TYPE hackathon_queue_length gauge`,
      `hackathon_queue_length ${queueStats.queueThroughput?.submissions || 0}`,
      ``,
      `# HELP hackathon_system_load System load average`,
      `# TYPE hackathon_system_load gauge`,
      `hackathon_system_load ${systemResources.loadAverage?.[0] || 0}`,
      ``,
      `# HELP hackathon_system_memory_usage System memory usage in GB`,
      `# TYPE hackathon_system_memory_usage gauge`,
      `hackathon_system_memory_usage ${(systemResources.totalMemory - systemResources.freeMemory)}`,
      ``
    ];

    // Add language-specific metrics
    if (executionStats.languageStats) {
      for (const [language, stats] of Object.entries(executionStats.languageStats)) {
        metrics.push(
          `# HELP hackathon_language_executions_total Total executions per language`,
          `# TYPE hackathon_language_executions_total counter`,
          `hackathon_language_executions_total{language="${language}"} ${stats.executions}`,
          ``,
          `# HELP hackathon_language_error_rate Error rate per language`,
          `# TYPE hackathon_language_error_rate gauge`,
          `hackathon_language_error_rate{language="${language}"} ${stats.errorRate}`,
          ``
        );
      }
    }

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics.join('\n'));
  } catch (error) {
    console.error('Error generating Prometheus metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics',
      details: error.message
    });
  }
});

/**
 * POST /api/performance/reset
 * Reset performance statistics (admin only)
 */
router.post('/reset', verifyAdminToken, async (req, res) => {
  try {
    const { type } = req.body;
    
    if (type === 'execution' || type === 'all') {
      executionMonitor.resetPerformanceStats();
    }
    
    if (type === 'judge' || type === 'all') {
      icpcJudge.resetPerformanceStats();
    }

    res.json({
      success: true,
      message: `Performance statistics reset: ${type || 'all'}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance statistics',
      details: error.message
    });
  }
});

/**
 * DELETE /api/performance/cleanup
 * Cleanup old performance data (admin only)
 */
router.delete('/cleanup', verifyAdminToken, async (req, res) => {
  try {
    const { olderThanDays = 30 } = req.query;
    
    const deleted = await performanceStatsStorage.cleanupOldMetrics(parseInt(olderThanDays));

    res.json({
      success: true,
      message: `Cleaned up ${deleted} old performance records`,
      olderThanDays: parseInt(olderThanDays),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cleaning up performance data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup performance data',
      details: error.message
    });
  }
});

/**
 * Helper function to get start time based on time range
 */
function getStartTime(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

module.exports = router;
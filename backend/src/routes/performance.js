/**
 * @module PerformanceRoutes
 * @description Performance Monitoring API for Programming Contest Platform
 * 
 * This module provides comprehensive performance monitoring and analytics:
 * - Real-time execution performance metrics and statistics
 * - Queue processing rates and throughput monitoring
 * - Judge engine performance tracking and optimization data
 * - System resource monitoring (CPU, memory, load)
 * - Language-specific performance analysis and comparisons
 * - Historical performance data collection and analysis
 * - Prometheus-compatible metrics export for monitoring systems
 * - Administrative controls for performance management
 * 
 * Supports both real-time monitoring for active contests and historical
 * analysis for performance optimization and capacity planning.
 */

const express = require('express');
const router = express.Router();
const { verifyAdminToken, optionalAdminAuth } = require('../middleware/adminAuth');
const performanceStatsStorage = require('../services/performanceStatsStorage');
const ExecutionMonitor = require('../services/executionMonitor');
const JudgeEngine = require('../services/judgeEngine');
const judgeQueueService = require('../services/judgeQueue');

// Initialize services
const executionMonitor = new ExecutionMonitor();
const judgeEngine = new JudgeEngine();

/**
 * @route GET /api/performance/overview
 * @description Get comprehensive performance overview with aggregated metrics
 * 
 * Retrieves a complete performance overview including execution statistics,
 * queue processing rates, judge performance, and system resource utilization.
 * Supports configurable time ranges for historical analysis.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.timeRange='24h'] - Time range (1h|24h|7d|30d)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with performance overview
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Performance overview data
 * @returns {string} returns.data.timeRange - Selected time range
 * @returns {Object} returns.data.overview - High-level performance summary
 * @returns {number} returns.data.overview.totalExecutions - Total code executions
 * @returns {number} returns.data.overview.averageExecutionTime - Average execution time (ms)
 * @returns {number} returns.data.overview.successRate - Success rate percentage
 * @returns {number} returns.data.overview.avgProcessingRate - Processing rate per minute
 * @returns {number} returns.data.overview.systemLoad - Current system load average
 * @returns {Object} returns.data.execution - Detailed execution metrics
 * @returns {Object} returns.data.judge - Judge engine performance metrics
 * @returns {Object} returns.data.queue - Queue processing statistics
 * @returns {Object} returns.data.system - System resource utilization
 * @returns {Object} returns.data.aggregated - Time-aggregated statistics
 * 
 * @throws {500} Performance monitoring service errors
 * 
 * @example
 * GET /api/performance/overview?timeRange=7d
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "timeRange": "7d",
 *     "overview": {
 *       "totalExecutions": 5000,
 *       "averageExecutionTime": 2500,
 *       "successRate": 89.5,
 *       "avgProcessingRate": 45.2,
 *       "systemLoad": 0.75
 *     }
 *   }
 * }
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
      judgeEngine.getJudgePerformanceMetrics(),
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
 * @route GET /api/performance/execution
 * @description Get detailed execution performance metrics
 * 
 * Retrieves comprehensive execution performance data including language-specific
 * statistics, execution times, memory usage, and error rates. Can filter by
 * specific programming language or return aggregate data.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.language] - Specific language to filter by (cpp|java|python)
 * @param {string} [req.query.timeRange='24h'] - Time range for historical data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with execution metrics
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Execution performance data
 * @returns {string} [returns.data.language] - Language filter if specified
 * @returns {Object} [returns.data.realTime] - Real-time language statistics
 * @returns {Object} [returns.data.historical] - Historical language statistics
 * @returns {Object} returns.data.languageStats - Per-language execution stats
 * @returns {Object} returns.data.errorRates - Error rates by language and type
 * @returns {number} returns.data.totalExecutions - Total executions count
 * @returns {number} returns.data.averageExecutionTime - Average execution time (ms)
 * @returns {number} returns.data.peakMemoryUsage - Peak memory usage (MB)
 * 
 * @throws {500} Execution monitoring service errors
 * 
 * @example
 * GET /api/performance/execution?language=python&timeRange=24h
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "language": "python",
 *     "realTime": {
 *       "executions": 150,
 *       "averageTime": 3200,
 *       "errorRate": 12.5
 *     },
 *     "historical": {
 *       "trend": "improving"
 *     }
 *   }
 * }
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
 * @route GET /api/performance/queue
 * @description Get comprehensive queue performance metrics
 * 
 * Retrieves detailed queue processing statistics including current queue state,
 * processing rates, throughput metrics, and worker performance data.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with queue performance data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Queue performance metrics
 * @returns {Object} returns.data.currentState - Current queue statistics
 * @returns {number} returns.data.currentState.waiting - Jobs waiting in queue
 * @returns {number} returns.data.currentState.active - Jobs currently processing
 * @returns {number} returns.data.currentState.completed - Total completed jobs
 * @returns {number} returns.data.currentState.failed - Total failed jobs
 * @returns {Object} returns.data.processingRates - Processing rate statistics
 * @returns {number} returns.data.processingRates.currentPerMinute - Current rate per minute
 * @returns {number} returns.data.processingRates.averagePerHour - Average rate per hour
 * @returns {Array} returns.data.processingRates.workers - Individual worker stats
 * 
 * @throws {500} Queue service errors
 * 
 * @example
 * GET /api/performance/queue
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "currentState": {
 *       "waiting": 5,
 *       "active": 3,
 *       "completed": 1250
 *     },
 *     "processingRates": {
 *       "currentPerMinute": 45.2
 *     }
 *   }
 * }
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
 * @route GET /api/performance/judge
 * @description Get detailed judge engine performance metrics
 * 
 * Retrieves comprehensive judge engine performance data including
 * judging times, accuracy rates, test case processing, and engine health.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with judge performance data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Judge performance metrics
 * @returns {number} returns.data.totalJudgments - Total judgments processed
 * @returns {number} returns.data.averageJudgingTime - Average judging time (ms)
 * @returns {number} returns.data.accuracyRate - Judge accuracy percentage
 * @returns {Object} returns.data.testCaseStats - Test case processing statistics
 * @returns {Object} returns.data.errorRates - Error rates by type
 * @returns {Array} returns.data.languagePerformance - Performance by language
 * @returns {string} returns.data.timestamp - Metrics timestamp
 * 
 * @throws {500} Judge engine service errors
 * 
 * @example
 * GET /api/performance/judge
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalJudgments": 2500,
 *     "averageJudgingTime": 1850,
 *     "accuracyRate": 99.2,
 *     "testCaseStats": {
 *       "averageTestCases": 15,
 *       "maxTestCases": 50
 *     }
 *   }
 * }
 */
router.get('/judge', optionalAdminAuth, async (req, res) => {
  try {
    const judgeMetrics = judgeEngine.getJudgePerformanceMetrics();

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
 * @route GET /api/performance/system
 * @description Get comprehensive system resource and performance metrics
 * 
 * Retrieves detailed system performance data including CPU usage, memory
 * utilization, load averages, and system monitoring statistics.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with system performance data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - System performance metrics
 * @returns {Object} returns.data.resources - System resource utilization
 * @returns {Array} returns.data.resources.loadAverage - System load averages (1m, 5m, 15m)
 * @returns {number} returns.data.resources.totalMemory - Total system memory (bytes)
 * @returns {number} returns.data.resources.freeMemory - Free system memory (bytes)
 * @returns {number} returns.data.resources.usedMemory - Used system memory (bytes)
 * @returns {number} returns.data.resources.cpuCount - Number of CPU cores
 * @returns {Object} returns.data.monitoring - Monitoring system statistics
 * @returns {number} returns.data.monitoring.uptime - System uptime (seconds)
 * @returns {Object} returns.data.monitoring.processMemory - Process memory usage
 * @returns {string} returns.data.timestamp - Metrics timestamp
 * 
 * @throws {500} System monitoring service errors
 * 
 * @example
 * GET /api/performance/system
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "resources": {
 *       "loadAverage": [0.75, 0.82, 0.91],
 *       "totalMemory": 8589934592,
 *       "freeMemory": 2147483648,
 *       "cpuCount": 4
 *     },
 *     "monitoring": {
 *       "uptime": 86400
 *     }
 *   }
 * }
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
 * @route GET /api/performance/languages
 * @description Get comprehensive language-specific performance statistics
 * 
 * Retrieves detailed performance metrics for all supported programming languages
 * including execution times, memory usage, error rates, and comparative analysis.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with language performance data
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Language performance metrics
 * @returns {Array} returns.data.languages - Per-language detailed metrics
 * @returns {string} returns.data.languages[].language - Language identifier
 * @returns {Object} returns.data.languages[].realTime - Real-time statistics
 * @returns {Object} returns.data.languages[].historical - Historical statistics (7 days)
 * @returns {Object} returns.data.summary - Summary statistics across languages
 * @returns {Object} returns.data.errorRates - Error rates by language
 * @returns {string} returns.data.timestamp - Metrics timestamp
 * 
 * @throws {500} Performance monitoring service errors
 * 
 * @example
 * GET /api/performance/languages
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "languages": [
 *       {
 *         "language": "python",
 *         "realTime": {
 *           "executions": 500,
 *           "averageTime": 3200,
 *           "averageMemory": 25.6
 *         },
 *         "historical": {
 *           "trend": "stable"
 *         }
 *       }
 *     ],
 *     "summary": {
 *       "cpp": { "executions": 800 },
 *       "java": { "executions": 600 },
 *       "python": { "executions": 500 }
 *     }
 *   }
 * }
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
 * @route GET /api/performance/historical
 * @description Get detailed historical performance data with time-based filtering
 * 
 * Retrieves historical performance metrics for specified time ranges and metric
 * types. Supports various metric types and configurable time windows for
 * performance analysis and trend identification.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.startTime - Start time (ISO 8601 format)
 * @param {string} req.query.endTime - End time (ISO 8601 format)
 * @param {string} [req.query.metricType='execution'] - Metric type to retrieve
 * @param {number} [req.query.limit=1000] - Maximum number of records (max 1000)
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with historical metrics
 * @returns {boolean} returns.success - Operation success status
 * @returns {Object} returns.data - Historical performance data
 * @returns {Array} returns.data.metrics - Time-series metrics data
 * @returns {string} returns.data.metricType - Type of metrics returned
 * @returns {Object} returns.data.timeRange - Time range of data
 * @returns {string} returns.data.timeRange.startTime - Start time of data
 * @returns {string} returns.data.timeRange.endTime - End time of data
 * @returns {number} returns.data.count - Number of records returned
 * @returns {string} returns.data.timestamp - Response timestamp
 * 
 * @throws {400} Missing required startTime or endTime parameters
 * @throws {500} Performance storage service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * GET /api/performance/historical?startTime=2025-01-01T00:00:00Z&endTime=2025-01-02T00:00:00Z&metricType=queue&limit=500
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "metrics": [
 *       {
 *         "timestamp": "2025-01-01T12:00:00Z",
 *         "value": 45.2,
 *         "type": "queue_throughput"
 *       }
 *     ],
 *     "metricType": "queue",
 *     "count": 250
 *   }
 * }
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
 * @route GET /api/performance/metrics/prometheus
 * @description Export performance metrics in Prometheus format for monitoring
 * 
 * Provides performance metrics in Prometheus-compatible format for integration
 * with monitoring and alerting systems. Includes execution metrics, queue stats,
 * system resources, and language-specific performance data.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {string} Prometheus-formatted metrics text
 * @returns Content-Type: text/plain; version=0.0.4
 * 
 * Metrics included:
 * - programming_contest_executions_total: Total code executions counter
 * - programming_contest_execution_time_avg: Average execution time gauge (ms)
 * - programming_contest_memory_usage_peak: Peak memory usage gauge (MB)
 * - programming_contest_queue_processing_rate: Processing rate gauge (per minute)
 * - programming_contest_queue_length: Current queue length gauge
 * - programming_contest_system_load: System load average gauge
 * - programming_contest_system_memory_usage: System memory usage gauge (GB)
 * - programming_contest_language_executions_total: Executions per language counter
 * - programming_contest_language_error_rate: Error rate per language gauge
 * 
 * @throws {500} Performance monitoring service errors
 * 
 * @example
 * GET /api/performance/metrics/prometheus
 * 
 * Response (text/plain):
 * # HELP programming_contest_executions_total Total number of code executions
 * # TYPE programming_contest_executions_total counter
 * programming_contest_executions_total 5000
 * 
 * # HELP programming_contest_execution_time_avg Average execution time in milliseconds
 * # TYPE programming_contest_execution_time_avg gauge
 * programming_contest_execution_time_avg 2500
 */
router.get('/metrics/prometheus', async (req, res) => {
  try {
    const [executionStats, queueStats, systemResources] = await Promise.all([
      executionMonitor.getPerformanceStats(),
      judgeQueueService.getProcessingRateStats(),
      executionMonitor.getSystemResources()
    ]);

    const metrics = [
      `# HELP programming_contest_executions_total Total number of code executions`,
      `# TYPE programming_contest_executions_total counter`,
      `programming_contest_executions_total ${executionStats.totalExecutions}`,
      ``,
      `# HELP programming_contest_execution_time_avg Average execution time in milliseconds`,
      `# TYPE programming_contest_execution_time_avg gauge`,
      `programming_contest_execution_time_avg ${executionStats.averageExecutionTime}`,
      ``,
      `# HELP programming_contest_memory_usage_peak Peak memory usage in MB`,
      `# TYPE programming_contest_memory_usage_peak gauge`,
      `programming_contest_memory_usage_peak ${executionStats.peakMemoryUsage}`,
      ``,
      `# HELP programming_contest_queue_processing_rate Processing rate per minute`,
      `# TYPE programming_contest_queue_processing_rate gauge`,
      `programming_contest_queue_processing_rate ${queueStats.currentPerMinute}`,
      ``,
      `# HELP programming_contest_queue_length Current queue length`,
      `# TYPE programming_contest_queue_length gauge`,
      `programming_contest_queue_length ${queueStats.queueThroughput?.submissions || 0}`,
      ``,
      `# HELP programming_contest_system_load System load average`,
      `# TYPE programming_contest_system_load gauge`,
      `programming_contest_system_load ${systemResources.loadAverage?.[0] || 0}`,
      ``,
      `# HELP programming_contest_system_memory_usage System memory usage in GB`,
      `# TYPE programming_contest_system_memory_usage gauge`,
      `programming_contest_system_memory_usage ${(systemResources.totalMemory - systemResources.freeMemory)}`,
      ``
    ];

    // Add language-specific metrics
    if (executionStats.languageStats) {
      for (const [language, stats] of Object.entries(executionStats.languageStats)) {
        metrics.push(
          `# HELP programming_contest_language_executions_total Total executions per language`,
          `# TYPE programming_contest_language_executions_total counter`,
          `programming_contest_language_executions_total{language="${language}"} ${stats.executions}`,
          ``,
          `# HELP programming_contest_language_error_rate Error rate per language`,
          `# TYPE programming_contest_language_error_rate gauge`,
          `programming_contest_language_error_rate{language="${language}"} ${stats.errorRate}`,
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
 * @route POST /api/performance/reset
 * @description Reset performance statistics and monitoring data
 * 
 * Resets performance statistics for specified components or all components.
 * This clears accumulated metrics and restarts performance tracking from zero.
 * Useful for testing or after maintenance periods.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} [req.body.type='all'] - Type to reset (execution|judge|all)
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with reset confirmation
 * @returns {boolean} returns.success - Operation success status
 * @returns {string} returns.message - Reset confirmation message
 * @returns {string} returns.timestamp - Reset timestamp
 * 
 * Reset types:
 * - 'execution': Resets execution monitor performance stats
 * - 'judge': Resets judge engine performance stats
 * - 'all': Resets all performance statistics
 * 
 * @throws {500} Performance monitoring service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * POST /api/performance/reset
 * Authorization: Bearer <admin-jwt-token>
 * Content-Type: application/json
 * 
 * {
 *   "type": "execution"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Performance statistics reset: execution",
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
 */
router.post('/reset', verifyAdminToken, async (req, res) => {
  try {
    const { type } = req.body;
    
    if (type === 'execution' || type === 'all') {
      executionMonitor.resetPerformanceStats();
    }
    
    if (type === 'judge' || type === 'all') {
      judgeEngine.resetPerformanceStats();
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
 * @route DELETE /api/performance/cleanup
 * @description Cleanup old performance data to manage storage
 * 
 * Removes historical performance data older than the specified number of days.
 * This helps manage database size and improve query performance while maintaining
 * recent performance history for analysis.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.olderThanDays=30] - Delete data older than N days
 * @param {Object} req.admin - Admin user data from middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} Response object with cleanup results
 * @returns {boolean} returns.success - Operation success status
 * @returns {string} returns.message - Cleanup confirmation message
 * @returns {number} returns.olderThanDays - Days threshold used for cleanup
 * @returns {string} returns.timestamp - Cleanup timestamp
 * 
 * @throws {500} Performance storage service errors
 * 
 * @requires Admin authentication via verifyAdminToken middleware
 * 
 * @example
 * DELETE /api/performance/cleanup?olderThanDays=60
 * Authorization: Bearer <admin-jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Cleaned up 1500 old performance records",
 *   "olderThanDays": 60,
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
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
 * @function getStartTime
 * @description Helper function to calculate start time based on time range string
 * 
 * Converts time range strings into Date objects for performance metric queries.
 * Supports common time ranges used throughout the performance monitoring system.
 * 
 * @param {string} timeRange - Time range identifier
 * @returns {Date} Start time calculated from current time minus range
 * 
 * Supported time ranges:
 * - '1h': 1 hour ago
 * - '24h': 24 hours ago (default)
 * - '7d': 7 days ago
 * - '30d': 30 days ago
 * 
 * @example
 * const startTime = getStartTime('7d');
 * // Returns Date object for 7 days ago
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
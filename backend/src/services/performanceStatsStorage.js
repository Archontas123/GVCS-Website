const { db } = require('../utils/db');

class PerformanceStatsStorage {
  constructor() {
    this.tableName = 'performance_metrics';
    this.initialized = false;
  }

  /**
   * Initialize performance metrics storage
   */
  async initialize() {
    try {
      await this.ensurePerformanceMetricsTable();
      this.initialized = true;
      console.log('Performance metrics storage initialized');
    } catch (error) {
      console.error('Failed to initialize performance metrics storage:', error);
      this.initialized = false;
    }
  }

  /**
   * Ensure performance metrics table exists
   */
  async ensurePerformanceMetricsTable() {
    const tableExists = await db.schema.hasTable(this.tableName);
    
    if (!tableExists) {
      await db.schema.createTable(this.tableName, (table) => {
        table.increments('id').primary();
        table.string('metric_type').notNullable(); // 'execution', 'queue', 'judge', 'system'
        table.string('language').nullable();
        table.integer('submission_id').nullable();
        table.integer('contest_id').nullable();
        table.integer('team_id').nullable();
        
        // Execution metrics
        table.decimal('execution_time_ms', 10, 3).nullable();
        table.decimal('net_execution_time_ms', 10, 3).nullable();
        table.decimal('container_overhead_ms', 10, 3).nullable();
        table.decimal('cpu_time_ms', 10, 3).nullable();
        table.decimal('memory_used_mb', 10, 3).nullable();
        table.integer('io_operations').nullable();
        table.integer('system_calls').nullable();
        
        // Verdict and status
        table.string('verdict').nullable();
        table.boolean('success').nullable();
        
        // Queue metrics
        table.decimal('queue_wait_time_ms', 10, 3).nullable();
        table.decimal('processing_rate_per_minute', 8, 3).nullable();
        table.integer('queue_length').nullable();
        
        // System metrics
        table.decimal('cpu_usage_percent', 5, 2).nullable();
        table.decimal('memory_usage_mb', 10, 3).nullable();
        table.decimal('disk_usage_mb', 10, 3).nullable();
        
        // Performance flags
        table.boolean('memory_limit_exceeded').defaultTo(false);
        table.boolean('time_limit_exceeded').defaultTo(false);
        table.boolean('compilation_error').defaultTo(false);
        
        // Additional metrics as JSON
        table.json('additional_metrics').nullable();
        
        // Timestamps
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('measured_at').nullable();
        
        // Indexes
        table.index(['metric_type', 'created_at']);
        table.index(['language', 'created_at']);
        table.index(['contest_id', 'created_at']);
        table.index(['submission_id']);
        table.index(['verdict', 'created_at']);
      });
      
      console.log(`Created performance metrics table: ${this.tableName}`);
    }
  }

  /**
   * Store execution performance metrics
   */
  async storeExecutionMetrics(executionData) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const metrics = {
        metric_type: 'execution',
        language: executionData.language,
        submission_id: executionData.submissionId,
        contest_id: executionData.contestId,
        team_id: executionData.teamId,
        execution_time_ms: executionData.executionTime,
        net_execution_time_ms: executionData.netExecutionTime,
        container_overhead_ms: executionData.containerOverhead,
        cpu_time_ms: executionData.cpuTime,
        memory_used_mb: executionData.memoryUsed,
        io_operations: executionData.ioOperations,
        system_calls: executionData.systemCalls,
        verdict: executionData.verdict,
        success: executionData.success,
        memory_limit_exceeded: executionData.verdict === 'Memory Limit Exceeded',
        time_limit_exceeded: executionData.verdict === 'Time Limit Exceeded',
        compilation_error: executionData.verdict === 'Compilation Error',
        additional_metrics: JSON.stringify(executionData.additionalMetrics || {}),
        measured_at: new Date()
      };

      const result = await db(this.tableName).insert(metrics).returning('id');
      return Array.isArray(result) ? (result[0]?.id || result[0]) : result;
    } catch (error) {
      console.error('Error storing execution metrics:', error);
      throw error;
    }
  }

  /**
   * Store queue performance metrics
   */
  async storeQueueMetrics(queueData) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const metrics = {
        metric_type: 'queue',
        queue_wait_time_ms: queueData.waitTime,
        processing_rate_per_minute: queueData.processingRate,
        queue_length: queueData.queueLength,
        additional_metrics: JSON.stringify({
          activeWorkers: queueData.activeWorkers,
          failedJobs: queueData.failedJobs,
          completedJobs: queueData.completedJobs,
          throughput: queueData.throughput
        }),
        measured_at: new Date()
      };

      const result = await db(this.tableName).insert(metrics).returning('id');
      return Array.isArray(result) ? (result[0]?.id || result[0]) : result;
    } catch (error) {
      console.error('Error storing queue metrics:', error);
      throw error;
    }
  }

  /**
   * Store judge performance metrics
   */
  async storeJudgeMetrics(judgeData) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const metrics = {
        metric_type: 'judge',
        language: judgeData.language,
        contest_id: judgeData.contestId,
        execution_time_ms: judgeData.averageJudgingTime,
        memory_used_mb: judgeData.peakMemoryUsage,
        additional_metrics: JSON.stringify({
          totalSubmissionsJudged: judgeData.totalSubmissionsJudged,
          languageBreakdown: judgeData.languageBreakdown,
          errorRates: judgeData.errorRates,
          containerOverheadStats: judgeData.containerOverheadStats
        }),
        measured_at: new Date()
      };

      const result = await db(this.tableName).insert(metrics).returning('id');
      return Array.isArray(result) ? (result[0]?.id || result[0]) : result;
    } catch (error) {
      console.error('Error storing judge metrics:', error);
      throw error;
    }
  }

  /**
   * Store system performance metrics
   */
  async storeSystemMetrics(systemData) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const metrics = {
        metric_type: 'system',
        cpu_usage_percent: systemData.cpuUsage,
        memory_usage_mb: systemData.memoryUsage,
        disk_usage_mb: systemData.diskUsage,
        additional_metrics: JSON.stringify({
          loadAverage: systemData.loadAverage,
          uptime: systemData.uptime,
          totalMemory: systemData.totalMemory,
          freeMemory: systemData.freeMemory
        }),
        measured_at: new Date()
      };

      const result = await db(this.tableName).insert(metrics).returning('id');
      return Array.isArray(result) ? (result[0]?.id || result[0]) : result;
    } catch (error) {
      console.error('Error storing system metrics:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics by type and time range
   */
  async getMetrics(metricType, startTime, endTime, limit = 1000) {
    try {
      let query = db(this.tableName)
        .where('metric_type', metricType)
        .orderBy('created_at', 'desc')
        .limit(limit);

      if (startTime) {
        query = query.where('created_at', '>=', startTime);
      }

      if (endTime) {
        query = query.where('created_at', '<=', endTime);
      }

      return await query;
    } catch (error) {
      console.error('Error retrieving metrics:', error);
      throw error;
    }
  }

  /**
   * Get language performance statistics
   */
  async getLanguageStats(language, startTime, endTime) {
    try {
      const stats = await db(this.tableName)
        .select([
          db.raw('COUNT(*) as total_executions'),
          db.raw('AVG(execution_time_ms) as avg_execution_time'),
          db.raw('AVG(memory_used_mb) as avg_memory_usage'),
          db.raw('COUNT(CASE WHEN success = true THEN 1 END) as success_count'),
          db.raw('COUNT(CASE WHEN success = false THEN 1 END) as error_count'),
          db.raw('AVG(container_overhead_ms) as avg_container_overhead')
        ])
        .where('metric_type', 'execution')
        .where('language', language)
        .modify((query) => {
          if (startTime) query.where('created_at', '>=', startTime);
          if (endTime) query.where('created_at', '<=', endTime);
        })
        .first();

      if (stats && stats.total_executions > 0) {
        stats.error_rate = (stats.error_count / stats.total_executions) * 100;
        stats.success_rate = (stats.success_count / stats.total_executions) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Error getting language stats:', error);
      throw error;
    }
  }

  /**
   * Get aggregated performance statistics
   */
  async getAggregatedStats(startTime, endTime) {
    try {
      const [executionStats, queueStats, systemStats] = await Promise.all([
        // Execution statistics
        db(this.tableName)
          .select([
            db.raw('COUNT(*) as total_executions'),
            db.raw('AVG(execution_time_ms) as avg_execution_time'),
            db.raw('AVG(memory_used_mb) as avg_memory_usage'),
            db.raw('SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count'),
            db.raw('SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as error_count')
          ])
          .where('metric_type', 'execution')
          .modify((query) => {
            if (startTime) query.where('created_at', '>=', startTime);
            if (endTime) query.where('created_at', '<=', endTime);
          })
          .first(),

        // Queue statistics
        db(this.tableName)
          .select([
            db.raw('AVG(processing_rate_per_minute) as avg_processing_rate'),
            db.raw('AVG(queue_length) as avg_queue_length'),
            db.raw('AVG(queue_wait_time_ms) as avg_wait_time')
          ])
          .where('metric_type', 'queue')
          .modify((query) => {
            if (startTime) query.where('created_at', '>=', startTime);
            if (endTime) query.where('created_at', '<=', endTime);
          })
          .first(),

        // System statistics
        db(this.tableName)
          .select([
            db.raw('AVG(cpu_usage_percent) as avg_cpu_usage'),
            db.raw('AVG(memory_usage_mb) as avg_memory_usage'),
            db.raw('AVG(disk_usage_mb) as avg_disk_usage')
          ])
          .where('metric_type', 'system')
          .modify((query) => {
            if (startTime) query.where('created_at', '>=', startTime);
            if (endTime) query.where('created_at', '<=', endTime);
          })
          .first()
      ]);

      return {
        execution: executionStats,
        queue: queueStats,
        system: systemStats,
        timeRange: { startTime, endTime }
      };
    } catch (error) {
      console.error('Error getting aggregated stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old performance metrics
   */
  async cleanupOldMetrics(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deleted = await db(this.tableName)
        .where('created_at', '<', cutoffDate)
        .del();

      console.log(`Cleaned up ${deleted} old performance metrics older than ${olderThanDays} days`);
      return deleted;
    } catch (error) {
      console.error('Error cleaning up old metrics:', error);
      throw error;
    }
  }
}

// Create singleton instance
const performanceStatsStorage = new PerformanceStatsStorage();

module.exports = performanceStatsStorage;
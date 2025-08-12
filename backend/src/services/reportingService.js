/**
 * CS Club Hackathon Platform - Advanced Reporting Service
 * Phase 6.3: Report generation and data export
 */

const { db } = require('../utils/db');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const analyticsService = require('./analyticsService');

class ReportingService {
  constructor() {
    this.exportDirectory = path.join(process.cwd(), 'exports');
    this.ensureExportDirectory();
  }

  /**
   * Ensure export directory exists
   */
  async ensureExportDirectory() {
    try {
      await fs.mkdir(this.exportDirectory, { recursive: true });
    } catch (error) {
      logger.error('Error creating export directory:', error);
    }
  }

  /**
   * Generate comprehensive platform report
   */
  async generatePlatformReport(options = {}) {
    try {
      const reportId = `platform_${Date.now()}`;
      const dateRange = options.dateRange || 30;

      logger.info('Generating platform report:', { reportId, dateRange });

      const [
        overview,
        contestStats,
        teamStats,
        submissionStats,
        usageMetrics,
        performanceMetrics
      ] = await Promise.all([
        analyticsService.getPlatformOverview(dateRange),
        this.getContestStatistics(dateRange),
        this.getTeamStatistics(dateRange),
        this.getSubmissionStatistics(dateRange),
        this.getUsageMetrics(dateRange),
        this.getPerformanceMetrics(dateRange)
      ]);

      const report = {
        report_id: reportId,
        report_type: 'platform',
        generated_at: new Date().toISOString(),
        date_range: dateRange,
        overview,
        statistics: {
          contests: contestStats,
          teams: teamStats,
          submissions: submissionStats
        },
        usage_metrics: usageMetrics,
        performance_metrics: performanceMetrics,
        trends: await this.calculateTrends(dateRange),
        recommendations: await this.generateRecommendations(overview, usageMetrics)
      };

      // Save report to database
      await db('analytics_reports').insert({
        report_type: 'platform',
        entity_id: null,
        report_data: JSON.stringify(report),
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      });

      logger.info('Platform report generated successfully:', { reportId });
      return report;
    } catch (error) {
      logger.error('Error generating platform report:', error);
      throw error;
    }
  }

  /**
   * Generate detailed contest report
   */
  async generateDetailedContestReport(contestId, options = {}) {
    try {
      const reportId = `contest_${contestId}_${Date.now()}`;
      
      logger.info('Generating detailed contest report:', { contestId, reportId });

      const [
        basicAnalytics,
        detailedMetrics,
        teamRankings,
        problemAnalysis,
        timelineAnalysis,
        participationAnalysis
      ] = await Promise.all([
        analyticsService.getContestAnalytics(contestId),
        this.getDetailedContestMetrics(contestId),
        this.getDetailedTeamRankings(contestId),
        this.getDetailedProblemAnalysis(contestId),
        this.getContestTimelineAnalysis(contestId),
        this.getParticipationAnalysis(contestId)
      ]);

      const report = {
        report_id: reportId,
        report_type: 'contest',
        contest_id: contestId,
        generated_at: new Date().toISOString(),
        basic_analytics: basicAnalytics,
        detailed_metrics: detailedMetrics,
        team_rankings: teamRankings,
        problem_analysis: problemAnalysis,
        timeline_analysis: timelineAnalysis,
        participation_analysis: participationAnalysis,
        executive_summary: this.generateExecutiveSummary(basicAnalytics, detailedMetrics),
        insights: await this.generateContestInsights(contestId)
      };

      await db('analytics_reports').insert({
        report_type: 'contest',
        entity_id: contestId,
        report_data: JSON.stringify(report),
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 180 days
      });

      logger.info('Detailed contest report generated:', { contestId, reportId });
      return report;
    } catch (error) {
      logger.error('Error generating detailed contest report:', error);
      throw error;
    }
  }

  /**
   * Export contest data to various formats
   */
  async exportContestData(contestId, format = 'json', includeSubmissions = true) {
    try {
      const exportId = `contest_export_${contestId}_${Date.now()}`;
      const fileName = `${exportId}.${format}`;
      const filePath = path.join(this.exportDirectory, fileName);

      // Record export request
      const exportRequest = await db('data_export_requests').insert({
        export_type: 'contest_data',
        export_parameters: JSON.stringify({ contestId, includeSubmissions }),
        export_format: format,
        status: 'processing',
        requested_at: new Date().toISOString()
      }).returning('*');

      const requestId = exportRequest[0].id;

      try {
        // Gather all contest data
        const contestData = await this.gatherContestData(contestId, includeSubmissions);

        // Export in requested format
        let exportedData;
        switch (format) {
          case 'csv':
            exportedData = await this.exportToCSV(contestData);
            break;
          case 'xlsx':
            exportedData = await this.exportToExcel(contestData);
            break;
          default:
            exportedData = JSON.stringify(contestData, null, 2);
        }

        // Write to file
        await fs.writeFile(filePath, exportedData);
        const stats = await fs.stat(filePath);

        // Update export request
        await db('data_export_requests')
          .where({ id: requestId })
          .update({
            status: 'completed',
            file_path: filePath,
            file_size: stats.size,
            completed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          });

        logger.info('Contest data exported successfully:', { contestId, format, filePath });
        return { filePath, fileSize: stats.size, exportId };
      } catch (exportError) {
        // Update export request with error
        await db('data_export_requests')
          .where({ id: requestId })
          .update({
            status: 'failed',
            error_message: exportError.message
          });
        throw exportError;
      }
    } catch (error) {
      logger.error('Error exporting contest data:', error);
      throw error;
    }
  }

  /**
   * Generate live contest dashboard data
   */
  async generateLiveDashboard(contestId) {
    try {
      const [
        realTimeStats,
        currentStandings,
        submissionFeed,
        activityMetrics,
        systemHealth
      ] = await Promise.all([
        this.getRealTimeContestStats(contestId),
        analyticsService.getCurrentStandings(contestId),
        this.getLiveSubmissionFeed(contestId),
        this.getActivityMetrics(contestId),
        this.getSystemHealthMetrics()
      ]);

      return {
        contest_id: contestId,
        timestamp: new Date().toISOString(),
        real_time_stats: realTimeStats,
        current_standings: currentStandings,
        submission_feed: submissionFeed,
        activity_metrics: activityMetrics,
        system_health: systemHealth
      };
    } catch (error) {
      logger.error('Error generating live dashboard:', error);
      throw error;
    }
  }

  /**
   * Generate team performance report
   */
  async generateTeamReport(teamId, options = {}) {
    try {
      const reportId = `team_${teamId}_${Date.now()}`;
      
      const [
        basicAnalytics,
        performanceHistory,
        strengthsWeaknesses,
        comparisonData,
        recommendations
      ] = await Promise.all([
        analyticsService.getTeamAnalytics(teamId),
        this.getTeamPerformanceHistory(teamId),
        this.analyzeTeamStrengthsWeaknesses(teamId),
        this.getTeamComparisonData(teamId),
        this.generateTeamRecommendations(teamId)
      ]);

      const report = {
        report_id: reportId,
        report_type: 'team',
        team_id: teamId,
        generated_at: new Date().toISOString(),
        basic_analytics: basicAnalytics,
        performance_history: performanceHistory,
        strengths_weaknesses: strengthsWeaknesses,
        peer_comparison: comparisonData,
        recommendations: recommendations
      };

      await db('analytics_reports').insert({
        report_type: 'team',
        entity_id: teamId,
        report_data: JSON.stringify(report),
        generated_at: new Date().toISOString()
      });

      return report;
    } catch (error) {
      logger.error('Error generating team report:', error);
      throw error;
    }
  }

  /**
   * Schedule automated report generation
   */
  async scheduleReport(reportConfig) {
    try {
      const task = {
        task_name: reportConfig.name,
        task_type: 'report_generation',
        cron_expression: reportConfig.schedule,
        task_parameters: JSON.stringify(reportConfig.parameters),
        is_active: true,
        next_execution: this.calculateNextExecution(reportConfig.schedule),
        created_at: new Date().toISOString()
      };

      const result = await db('analytics_tasks').insert(task).returning('*');
      
      logger.info('Report scheduled:', { taskId: result[0].id, name: reportConfig.name });
      return result[0];
    } catch (error) {
      logger.error('Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * Helper methods for data gathering and analysis
   */

  async getContestStatistics(days) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      return await db('contests')
        .where('created_at', '>', cutoffDate)
        .select(
          db.raw('COUNT(*) as total_contests'),
          db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_contests'),
          db.raw('AVG(duration) as avg_duration'),
          db.raw('COUNT(DISTINCT template_id) as unique_templates')
        )
        .first();
    } catch (error) {
      logger.error('Error getting contest statistics:', error);
      return {};
    }
  }

  async getTeamStatistics(days) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      return await db('teams')
        .where('created_at', '>', cutoffDate)
        .select(
          db.raw('COUNT(*) as total_teams'),
          db.raw('COUNT(DISTINCT contest_id) as contests_with_teams'),
          db.raw('AVG(CAST(total_contests_participated as DECIMAL)) as avg_participation')
        )
        .first();
    } catch (error) {
      logger.error('Error getting team statistics:', error);
      return {};
    }
  }

  async getSubmissionStatistics(days) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      return await db('submissions')
        .where('submitted_at', '>', cutoffDate)
        .select(
          db.raw('COUNT(*) as total_submissions'),
          db.raw('COUNT(CASE WHEN verdict = \'AC\' THEN 1 END) as accepted_submissions'),
          db.raw('COUNT(DISTINCT team_id) as active_teams'),
          db.raw('COUNT(DISTINCT problem_id) as problems_attempted')
        )
        .first();
    } catch (error) {
      logger.error('Error getting submission statistics:', error);
      return {};
    }
  }

  async gatherContestData(contestId, includeSubmissions) {
    const contest = await db('contests').where({ id: contestId }).first();
    const teams = await db('teams').where({ contest_id: contestId }).select('*');
    const problems = await db('problems').where({ contest_id: contestId }).select('*');
    
    let submissions = [];
    if (includeSubmissions) {
      submissions = await db('submissions')
        .where({ contest_id: contestId })
        .join('teams', 'submissions.team_id', 'teams.id')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .select('submissions.*', 'teams.team_name', 'problems.problem_letter');
    }

    return { contest, teams, problems, submissions };
  }

  generateExecutiveSummary(basicAnalytics, detailedMetrics) {
    return {
      total_participants: basicAnalytics.summary.total_teams,
      participation_rate: detailedMetrics.participation_rate || 0,
      average_score: detailedMetrics.average_score || 0,
      completion_rate: detailedMetrics.completion_rate || 0,
      key_insights: [
        `${basicAnalytics.summary.total_teams} teams participated`,
        `${basicAnalytics.summary.total_submissions} total submissions`,
        `${basicAnalytics.problems?.length || 0} problems presented`
      ]
    };
  }

  calculateNextExecution(cronExpression) {
    // Simplified - in production, use a proper cron parser
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  // Placeholder methods - would implement full functionality
  async getUsageMetrics(days) { return {}; }
  async getPerformanceMetrics(days) { return {}; }
  async calculateTrends(days) { return {}; }
  async generateRecommendations(overview, metrics) { return []; }
  async getDetailedContestMetrics(contestId) { return {}; }
  async getDetailedTeamRankings(contestId) { return []; }
  async getDetailedProblemAnalysis(contestId) { return {}; }
  async getContestTimelineAnalysis(contestId) { return {}; }
  async getParticipationAnalysis(contestId) { return {}; }
  async generateContestInsights(contestId) { return []; }
  async exportToCSV(data) { return JSON.stringify(data); }
  async exportToExcel(data) { return JSON.stringify(data); }
  async getRealTimeContestStats(contestId) { return {}; }
  async getLiveSubmissionFeed(contestId) { return []; }
  async getActivityMetrics(contestId) { return {}; }
  async getSystemHealthMetrics() { return {}; }
  async getTeamPerformanceHistory(teamId) { return []; }
  async analyzeTeamStrengthsWeaknesses(teamId) { return {}; }
  async getTeamComparisonData(teamId) { return {}; }
  async generateTeamRecommendations(teamId) { return []; }
}

module.exports = new ReportingService();
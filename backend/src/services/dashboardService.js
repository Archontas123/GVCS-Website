const { db } = require('../utils/db');
const logger = require('../utils/logger');
const websocketService = require('./websocketService');
const analyticsService = require('./analyticsService');

/**
 * Dashboard Service for real-time analytics and data visualization
 * Manages dashboard configurations, widgets, and live data updates
 */
class DashboardService {
  /**
   * Initialize dashboard service with tracking maps and default settings
   */
  constructor() {
    this.activeDashboards = new Map();
    this.updateIntervals = new Map();
    this.defaultRefreshRate = 30000;
  }

  /**
   * Create or update dashboard configuration
   * @param {Object} dashboardConfig - Dashboard configuration data
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Created dashboard object
   * @throws {Error} When creation fails
   */
  async createDashboard(dashboardConfig, adminId) {
    try {
      const dashboard = {
        dashboard_name: dashboardConfig.name,
        dashboard_description: dashboardConfig.description || '',
        dashboard_config: JSON.stringify({
          widgets: dashboardConfig.widgets || [],
          layout: dashboardConfig.layout || {},
          filters: dashboardConfig.filters || {},
          refresh_rate: dashboardConfig.refresh_rate || this.defaultRefreshRate,
          theme: dashboardConfig.theme || 'default'
        }),
        dashboard_type: dashboardConfig.type,
        access_permissions: JSON.stringify(dashboardConfig.permissions || {}),
        created_by: adminId,
        is_default: dashboardConfig.is_default || false,
        is_public: dashboardConfig.is_public || false,
        created_at: new Date().toISOString()
      };

      const result = await db('analytics_dashboards').insert(dashboard).returning('*');
      const createdDashboard = result[0];

      logger.info('Dashboard created:', {
        dashboardId: createdDashboard.id,
        name: dashboardConfig.name,
        type: dashboardConfig.type
      });

      return createdDashboard;
    } catch (error) {
      logger.error('Error creating dashboard:', error);
      throw error;
    }
  }

  /**
   * Get dashboard configuration with parsed JSON fields
   * @param {number} dashboardId - Dashboard ID
   * @returns {Promise<Object>} Dashboard configuration object
   * @throws {Error} When dashboard not found
   */
  async getDashboard(dashboardId) {
    try {
      const dashboard = await db('analytics_dashboards')
        .where({ id: dashboardId })
        .first();

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      return {
        ...dashboard,
        dashboard_config: JSON.parse(dashboard.dashboard_config),
        access_permissions: JSON.parse(dashboard.access_permissions || '{}')
      };
    } catch (error) {
      logger.error('Error getting dashboard:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data for real-time updates
   * @param {number} dashboardId - Dashboard ID
   * @param {number|null} contestId - Optional contest ID filter
   * @returns {Promise<Object>} Dashboard data with widget results
   * @throws {Error} When data retrieval fails
   */
  async getDashboardData(dashboardId, contestId = null) {
    try {
      const dashboard = await this.getDashboard(dashboardId);
      const config = dashboard.dashboard_config;
      const data = {};

      // Process each widget and get its data
      for (const widget of config.widgets) {
        try {
          data[widget.id] = await this.getWidgetData(widget, contestId, config.filters);
        } catch (widgetError) {
          logger.error(`Error getting data for widget ${widget.id}:`, widgetError);
          data[widget.id] = { error: widgetError.message };
        }
      }

      return {
        dashboard_id: dashboardId,
        timestamp: new Date().toISOString(),
        data,
        filters: config.filters
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Start real-time dashboard updates
   */
  async startLiveDashboard(dashboardId, socketId, contestId = null) {
    try {
      const dashboard = await this.getDashboard(dashboardId);
      const refreshRate = dashboard.dashboard_config.refresh_rate || this.defaultRefreshRate;
      
      // Store active dashboard
      this.activeDashboards.set(socketId, {
        dashboardId,
        contestId,
        lastUpdate: Date.now()
      });

      // Initial data load
      const initialData = await this.getDashboardData(dashboardId, contestId);
      websocketService.sendToSocket(socketId, {
        type: 'dashboard_data',
        data: initialData
      });

      // Set up periodic updates
      const intervalId = setInterval(async () => {
        try {
          const dashboardData = await this.getDashboardData(dashboardId, contestId);
          websocketService.sendToSocket(socketId, {
            type: 'dashboard_update',
            data: dashboardData
          });
        } catch (error) {
          logger.error('Error in dashboard update interval:', error);
        }
      }, refreshRate);

      this.updateIntervals.set(socketId, intervalId);

      logger.info('Live dashboard started:', { dashboardId, socketId });
    } catch (error) {
      logger.error('Error starting live dashboard:', error);
      throw error;
    }
  }

  /**
   * Stop real-time dashboard updates
   */
  stopLiveDashboard(socketId) {
    try {
      // Clear interval
      const intervalId = this.updateIntervals.get(socketId);
      if (intervalId) {
        clearInterval(intervalId);
        this.updateIntervals.delete(socketId);
      }

      // Remove from active dashboards
      this.activeDashboards.delete(socketId);

      logger.info('Live dashboard stopped:', { socketId });
    } catch (error) {
      logger.error('Error stopping live dashboard:', error);
    }
  }

  /**
   * Get data for specific widget types
   */
  async getWidgetData(widget, contestId, filters) {
    const { type, config } = widget;

    switch (type) {
      case 'metric_card':
        return await this.getMetricCardData(config, contestId, filters);
      
      case 'line_chart':
        return await this.getLineChartData(config, contestId, filters);
      
      case 'bar_chart':
        return await this.getBarChartData(config, contestId, filters);
      
      case 'pie_chart':
        return await this.getPieChartData(config, contestId, filters);
      
      case 'standings_table':
        return await this.getStandingsTableData(config, contestId, filters);
      
      case 'activity_feed':
        return await this.getActivityFeedData(config, contestId, filters);
      
      case 'heatmap':
        return await this.getHeatmapData(config, contestId, filters);
      
      case 'gauge':
        return await this.getGaugeData(config, contestId, filters);
      
      case 'leaderboard':
        return await this.getLeaderboardData(config, contestId, filters);
      
      case 'progress_tracker':
        return await this.getProgressTrackerData(config, contestId, filters);
      
      default:
        throw new Error(`Unknown widget type: ${type}`);
    }
  }

  /**
   * Widget data methods
   */
  async getMetricCardData(config, contestId, filters) {
    const metric = config.metric;
    
    switch (metric) {
      case 'total_submissions':
        const submissionCount = contestId 
          ? await db('submissions').where({ contest_id: contestId }).count('* as count').first()
          : await db('submissions').count('* as count').first();
        return { value: parseInt(submissionCount.count), trend: '+5%' };
      
      case 'active_teams':
        if (!contestId) throw new Error('Contest ID required for active teams metric');
        const activeTeams = await db('teams').where({ contest_id: contestId }).count('* as count').first();
        return { value: parseInt(activeTeams.count), trend: '+2%' };
      
      case 'acceptance_rate':
        let query = db('submissions').select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN status = \'AC\' THEN 1 END) as accepted')
        );
        if (contestId) query = query.where({ contest_id: contestId });
        
        const rates = await query.first();
        const rate = rates.total > 0 ? ((rates.accepted / rates.total) * 100).toFixed(1) : 0;
        return { value: `${rate}%`, trend: '+1.2%' };
      
      default:
        return { value: 0, trend: '0%' };
    }
  }

  async getLineChartData(config, contestId, filters) {
    const metric = config.metric;
    const timeRange = config.timeRange || '24h';
    
    // Generate time series data based on metric
    switch (metric) {
      case 'submissions_over_time':
        return await this.getSubmissionsTimeSeries(contestId, timeRange);
      case 'team_registrations':
        return await this.getRegistrationsTimeSeries(contestId, timeRange);
      default:
        return { labels: [], datasets: [{ data: [] }] };
    }
  }

  async getBarChartData(config, contestId, filters) {
    const metric = config.metric;
    
    switch (metric) {
      case 'language_usage':
        return await analyticsService.getLanguageStatistics(contestId);
      case 'problem_attempts':
        return await this.getProblemAttemptStats(contestId);
      default:
        return { labels: [], data: [] };
    }
  }

  async getPieChartData(config, contestId, filters) {
    const metric = config.metric;
    
    switch (metric) {
      case 'verdict_distribution':
        return await this.getVerdictDistribution(contestId);
      case 'team_sizes':
        return await this.getTeamSizeDistribution(contestId);
      default:
        return { labels: [], data: [] };
    }
  }

  async getStandingsTableData(config, contestId, filters) {
    if (!contestId) throw new Error('Contest ID required for standings');
    return await analyticsService.getCurrentStandings(contestId);
  }

  async getActivityFeedData(config, contestId, filters) {
    const limit = config.limit || 50;
    return await analyticsService.getRecentSubmissions(contestId, limit);
  }

  async getHeatmapData(config, contestId, filters) {
    // Implementation for submission heatmap by time/team
    return { data: [] };
  }

  async getGaugeData(config, contestId, filters) {
    const metric = config.metric;
    // Return gauge value (0-100)
    return { value: 75, max: 100, label: metric };
  }

  async getLeaderboardData(config, contestId, filters) {
    const type = config.type || 'teams';
    const limit = config.limit || 10;
    
    if (type === 'teams') {
      return await analyticsService.getCurrentStandings(contestId);
    }
    
    return [];
  }

  async getProgressTrackerData(config, contestId, filters) {
    if (!contestId) throw new Error('Contest ID required for progress tracking');
    
    const problems = await db('problems').where({ contest_id: contestId }).select('*');
    const solvedCounts = await db('submissions')
      .where({ contest_id: contestId, status: 'AC' })
      .select('problem_id')
      .countDistinct('team_id as solved_by')
      .groupBy('problem_id');
    
    return problems.map(problem => {
      const solved = solvedCounts.find(s => s.problem_id === problem.id);
      return {
        problem_letter: problem.problem_letter,
        title: problem.title,
        solved_by: solved ? parseInt(solved.solved_by) : 0
      };
    });
  }

  /**
   * Helper methods for time series data
   */
  async getSubmissionsTimeSeries(contestId, timeRange) {
    const hours = this.parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    let query = db('submissions')
      .where('submitted_at', '>', startTime.toISOString())
      .select(db.raw('DATE_TRUNC(\'hour\', submitted_at) as hour'))
      .count('* as count')
      .groupBy('hour')
      .orderBy('hour');
    
    if (contestId) {
      query = query.where({ contest_id: contestId });
    }
    
    const data = await query;
    
    return {
      labels: data.map(d => new Date(d.hour).toLocaleTimeString()),
      datasets: [{
        label: 'Submissions',
        data: data.map(d => parseInt(d.count))
      }]
    };
  }

  parseTimeRange(range) {
    switch (range) {
      case '1h': return 1;
      case '6h': return 6;
      case '24h': return 24;
      case '7d': return 24 * 7;
      default: return 24;
    }
  }

  /**
   * Get list of available dashboards
   */
  async getDashboards(userId, userType = 'admin') {
    try {
      let query = db('analytics_dashboards')
        .select('*')
        .where('is_public', true)
        .orWhere('created_by', userId);
      
      const dashboards = await query.orderBy('created_at', 'desc');
      
      return dashboards.map(dashboard => ({
        ...dashboard,
        dashboard_config: JSON.parse(dashboard.dashboard_config),
        access_permissions: JSON.parse(dashboard.access_permissions || '{}')
      }));
    } catch (error) {
      logger.error('Error getting dashboards:', error);
      throw error;
    }
  }

  /**
   * Clone existing dashboard
   */
  async cloneDashboard(dashboardId, newName, adminId) {
    try {
      const originalDashboard = await this.getDashboard(dashboardId);
      
      const clonedDashboard = {
        ...originalDashboard,
        dashboard_name: newName,
        created_by: adminId,
        created_at: new Date().toISOString(),
        is_default: false
      };
      
      delete clonedDashboard.id;
      delete clonedDashboard.updated_at;
      
      return await this.createDashboard(clonedDashboard, adminId);
    } catch (error) {
      logger.error('Error cloning dashboard:', error);
      throw error;
    }
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboard(dashboardId, updates, adminId) {
    try {
      const updateData = {
        ...updates,
        dashboard_config: updates.dashboard_config ? JSON.stringify(updates.dashboard_config) : undefined,
        access_permissions: updates.access_permissions ? JSON.stringify(updates.access_permissions) : undefined,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      await db('analytics_dashboards')
        .where({ id: dashboardId })
        .update(updateData);
      
      logger.info('Dashboard updated:', { dashboardId, adminId });
      return await this.getDashboard(dashboardId);
    } catch (error) {
      logger.error('Error updating dashboard:', error);
      throw error;
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId, adminId) {
    try {
      await db('analytics_dashboards')
        .where({ id: dashboardId })
        .delete();
      
      logger.info('Dashboard deleted:', { dashboardId, adminId });
      return true;
    } catch (error) {
      logger.error('Error deleting dashboard:', error);
      throw error;
    }
  }

  // Additional helper methods...
  async getRegistrationsTimeSeries(contestId, timeRange) { return { labels: [], datasets: [] }; }
  async getProblemAttemptStats(contestId) { return { labels: [], data: [] }; }
  async getVerdictDistribution(contestId) { return { labels: [], data: [] }; }
  async getTeamSizeDistribution(contestId) { return { labels: [], data: [] }; }
}

module.exports = new DashboardService();
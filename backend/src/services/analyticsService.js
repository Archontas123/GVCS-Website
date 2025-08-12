/**
 * CS Club Hackathon Platform - Advanced Analytics Service
 * Phase 6.3: Analytics and reporting system
 */

const { db } = require('../utils/db');
const logger = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get platform overview statistics
   */
  async getPlatformOverview(dateRange = 30) {
    const cacheKey = `platform_overview_${dateRange}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const cutoffDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString();

      // Concurrent queries for better performance
      const [
        totalContests,
        activeContests,
        totalTeams,
        totalSubmissions,
        recentContests,
        recentTeams,
        recentSubmissions
      ] = await Promise.all([
        db('contests').count('* as count').first(),
        db('contests').where('status', 'active').count('* as count').first(),
        db('teams').count('* as count').first(),
        db('submissions').count('* as count').first(),
        db('contests').where('created_at', '>', cutoffDate).count('* as count').first(),
        db('teams').where('created_at', '>', cutoffDate).count('* as count').first(),
        db('submissions').where('submitted_at', '>', cutoffDate).count('* as count').first()
      ]);

      const overview = {
        total_contests: parseInt(totalContests.count),
        active_contests: parseInt(activeContests.count),
        total_teams: parseInt(totalTeams.count),
        total_submissions: parseInt(totalSubmissions.count),
        recent_contests: parseInt(recentContests.count),
        recent_teams: parseInt(recentTeams.count),
        recent_submissions: parseInt(recentSubmissions.count),
        growth_rate: {
          contests: await this.calculateGrowthRate('contests', 'created_at', dateRange),
          teams: await this.calculateGrowthRate('teams', 'created_at', dateRange),
          submissions: await this.calculateGrowthRate('submissions', 'submitted_at', dateRange)
        }
      };

      this.cache.set(cacheKey, { data: overview, timestamp: Date.now() });
      return overview;
    } catch (error) {
      logger.error('Error getting platform overview:', error);
      throw error;
    }
  }

  /**
   * Get contest performance analytics
   */
  async getContestAnalytics(contestId) {
    try {
      const contest = await db('contests').where({ id: contestId }).first();
      if (!contest) {
        throw new Error('Contest not found');
      }

      // Get contest statistics
      const [
        teamCount,
        submissionCount,
        problemCount,
        participationData,
        submissionTrends,
        languageStats,
        problemStats
      ] = await Promise.all([
        db('teams').where({ contest_id: contestId }).count('* as count').first(),
        db('submissions').where({ contest_id: contestId }).count('* as count').first(),
        db('problems').where({ contest_id: contestId }).count('* as count').first(),
        this.getParticipationData(contestId),
        this.getSubmissionTrends(contestId),
        this.getLanguageStatistics(contestId),
        this.getProblemStatistics(contestId)
      ]);

      return {
        contest_info: {
          id: contestId,
          name: contest.contest_name,
          status: contest.status,
          duration: contest.duration,
          start_time: contest.start_time,
          created_at: contest.created_at
        },
        summary: {
          total_teams: parseInt(teamCount.count),
          total_submissions: parseInt(submissionCount.count),
          total_problems: parseInt(problemCount.count),
          average_submissions_per_team: teamCount.count > 0 ? (submissionCount.count / teamCount.count).toFixed(2) : 0
        },
        participation: participationData,
        trends: submissionTrends,
        languages: languageStats,
        problems: problemStats
      };
    } catch (error) {
      logger.error('Error getting contest analytics:', error);
      throw error;
    }
  }

  /**
   * Get team performance analytics
   */
  async getTeamAnalytics(teamId, contestId = null) {
    try {
      let query = db('teams').where({ id: teamId });
      if (contestId) {
        query = query.where({ contest_id: contestId });
      }
      
      const team = await query.first();
      if (!team) {
        throw new Error('Team not found');
      }

      // Get team statistics
      const [
        submissionHistory,
        problemSolveStats,
        rankingHistory,
        languagePreferences,
        timePatterns
      ] = await Promise.all([
        this.getTeamSubmissionHistory(teamId, contestId),
        this.getTeamProblemStats(teamId, contestId),
        this.getTeamRankingHistory(teamId, contestId),
        this.getTeamLanguagePreferences(teamId, contestId),
        this.getTeamTimePatterns(teamId, contestId)
      ]);

      return {
        team_info: {
          id: teamId,
          name: team.team_name,
          contest_id: team.contest_id,
          created_at: team.created_at
        },
        submission_history: submissionHistory,
        problem_solving: problemSolveStats,
        ranking_history: rankingHistory,
        language_preferences: languagePreferences,
        time_patterns: timePatterns
      };
    } catch (error) {
      logger.error('Error getting team analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time contest dashboard data
   */
  async getContestDashboard(contestId) {
    try {
      const [
        currentStandings,
        recentSubmissions,
        submissionRate,
        problemSolveRate,
        teamActivity
      ] = await Promise.all([
        this.getCurrentStandings(contestId),
        this.getRecentSubmissions(contestId, 20),
        this.getSubmissionRate(contestId),
        this.getProblemSolveRate(contestId),
        this.getTeamActivity(contestId)
      ]);

      return {
        standings: currentStandings,
        recent_activity: recentSubmissions,
        metrics: {
          submission_rate: submissionRate,
          solve_rate: problemSolveRate,
          active_teams: teamActivity.active_count,
          total_teams: teamActivity.total_count
        },
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting contest dashboard:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive contest report
   */
  async generateContestReport(contestId) {
    try {
      const [
        analytics,
        detailedStats,
        teamPerformances,
        problemAnalysis
      ] = await Promise.all([
        this.getContestAnalytics(contestId),
        this.getDetailedContestStats(contestId),
        this.getAllTeamPerformances(contestId),
        this.getDetailedProblemAnalysis(contestId)
      ]);

      const report = {
        contest: analytics.contest_info,
        summary: analytics.summary,
        detailed_statistics: detailedStats,
        team_performances: teamPerformances,
        problem_analysis: problemAnalysis,
        trends_and_patterns: {
          submission_patterns: analytics.trends,
          language_usage: analytics.languages,
          participation_patterns: analytics.participation
        },
        generated_at: new Date().toISOString()
      };

      // Store report in database for future access
      await this.saveReport('contest', contestId, report);

      logger.info('Contest report generated:', { contestId });
      return report;
    } catch (error) {
      logger.error('Error generating contest report:', error);
      throw error;
    }
  }

  /**
   * Get participation data for contest
   */
  async getParticipationData(contestId) {
    try {
      const participationByHour = await db('submissions')
        .where({ contest_id: contestId })
        .select(db.raw('DATE_TRUNC(\'hour\', submitted_at) as hour'))
        .count('* as submissions')
        .groupBy('hour')
        .orderBy('hour');

      const uniqueTeams = await db('submissions')
        .where({ contest_id: contestId })
        .countDistinct('team_id as active_teams')
        .first();

      return {
        hourly_submissions: participationByHour,
        active_teams: parseInt(uniqueTeams.active_teams)
      };
    } catch (error) {
      logger.error('Error getting participation data:', error);
      return { hourly_submissions: [], active_teams: 0 };
    }
  }

  /**
   * Get submission trends over time
   */
  async getSubmissionTrends(contestId) {
    try {
      const trends = await db('submissions')
        .where({ contest_id: contestId })
        .select(
          db.raw('DATE_TRUNC(\'hour\', submitted_at) as time_period'),
          db.raw('COUNT(*) as total_submissions'),
          db.raw('COUNT(CASE WHEN verdict = \'AC\' THEN 1 END) as accepted_submissions'),
          db.raw('COUNT(DISTINCT team_id) as active_teams')
        )
        .groupBy('time_period')
        .orderBy('time_period');

      return trends;
    } catch (error) {
      logger.error('Error getting submission trends:', error);
      return [];
    }
  }

  /**
   * Get language usage statistics
   */
  async getLanguageStatistics(contestId) {
    try {
      const stats = await db('submissions')
        .where({ contest_id: contestId })
        .select('language')
        .count('* as count')
        .countDistinct('team_id as teams')
        .groupBy('language')
        .orderBy('count', 'desc');

      const total = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);

      return stats.map(stat => ({
        language: stat.language,
        submissions: parseInt(stat.count),
        teams: parseInt(stat.teams),
        percentage: total > 0 ? ((stat.count / total) * 100).toFixed(2) : 0
      }));
    } catch (error) {
      logger.error('Error getting language statistics:', error);
      return [];
    }
  }

  /**
   * Get problem-wise statistics
   */
  async getProblemStatistics(contestId) {
    try {
      const problems = await db('problems')
        .where({ contest_id: contestId })
        .leftJoin('submissions', 'problems.id', 'submissions.problem_id')
        .select(
          'problems.id',
          'problems.problem_letter',
          'problems.title',
          'problems.difficulty'
        )
        .count('submissions.id as total_submissions')
        .count(db.raw('CASE WHEN submissions.verdict = \'AC\' THEN 1 END as accepted_submissions'))
        .countDistinct('submissions.team_id as teams_attempted')
        .groupBy('problems.id', 'problems.problem_letter', 'problems.title', 'problems.difficulty')
        .orderBy('problems.problem_letter');

      return problems.map(problem => ({
        id: problem.id,
        letter: problem.problem_letter,
        title: problem.title,
        difficulty: problem.difficulty,
        total_submissions: parseInt(problem.total_submissions || 0),
        accepted_submissions: parseInt(problem.accepted_submissions || 0),
        teams_attempted: parseInt(problem.teams_attempted || 0),
        acceptance_rate: problem.total_submissions > 0 
          ? ((problem.accepted_submissions / problem.total_submissions) * 100).toFixed(2)
          : 0
      }));
    } catch (error) {
      logger.error('Error getting problem statistics:', error);
      return [];
    }
  }

  /**
   * Calculate growth rate for a metric
   */
  async calculateGrowthRate(table, dateColumn, days) {
    try {
      const currentPeriod = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const previousPeriod = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000).toISOString();

      const [current, previous] = await Promise.all([
        db(table).where(dateColumn, '>', currentPeriod).count('* as count').first(),
        db(table).where(dateColumn, '>', previousPeriod).where(dateColumn, '<=', currentPeriod).count('* as count').first()
      ]);

      const currentCount = parseInt(current.count);
      const previousCount = parseInt(previous.count);

      if (previousCount === 0) return currentCount > 0 ? 100 : 0;
      return ((currentCount - previousCount) / previousCount * 100).toFixed(2);
    } catch (error) {
      logger.error('Error calculating growth rate:', error);
      return 0;
    }
  }

  /**
   * Get team submission history
   */
  async getTeamSubmissionHistory(teamId, contestId = null) {
    try {
      let query = db('submissions')
        .where({ team_id: teamId })
        .select('*')
        .orderBy('submitted_at', 'desc')
        .limit(100);

      if (contestId) {
        query = query.where({ contest_id: contestId });
      }

      return await query;
    } catch (error) {
      logger.error('Error getting team submission history:', error);
      return [];
    }
  }

  /**
   * Get current standings for contest
   */
  async getCurrentStandings(contestId) {
    try {
      // This is a simplified version - actual implementation would use the ICPC scoring service
      const standings = await db('teams')
        .where({ contest_id: contestId })
        .leftJoin('submissions', 'teams.id', 'submissions.team_id')
        .select('teams.id', 'teams.team_name')
        .count('submissions.id as total_submissions')
        .count(db.raw('CASE WHEN submissions.verdict = \'AC\' THEN 1 END as solved_problems'))
        .groupBy('teams.id', 'teams.team_name')
        .orderBy('solved_problems', 'desc')
        .orderBy('total_submissions', 'asc')
        .limit(50);

      return standings.map((team, index) => ({
        rank: index + 1,
        team_id: team.id,
        team_name: team.team_name,
        solved_problems: parseInt(team.solved_problems || 0),
        total_submissions: parseInt(team.total_submissions || 0)
      }));
    } catch (error) {
      logger.error('Error getting current standings:', error);
      return [];
    }
  }

  /**
   * Get recent submissions for contest
   */
  async getRecentSubmissions(contestId, limit = 20) {
    try {
      return await db('submissions')
        .where({ contest_id: contestId })
        .join('teams', 'submissions.team_id', 'teams.id')
        .join('problems', 'submissions.problem_id', 'problems.id')
        .select(
          'submissions.*',
          'teams.team_name',
          'problems.problem_letter',
          'problems.title as problem_title'
        )
        .orderBy('submissions.submitted_at', 'desc')
        .limit(limit);
    } catch (error) {
      logger.error('Error getting recent submissions:', error);
      return [];
    }
  }

  /**
   * Save generated report
   */
  async saveReport(reportType, entityId, reportData) {
    try {
      await db('analytics_reports').insert({
        report_type: reportType,
        entity_id: entityId,
        report_data: JSON.stringify(reportData),
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error saving report:', error);
    }
  }

  /**
   * Clean up old cached data
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  // Additional helper methods would be implemented here...
  async getSubmissionRate(contestId) { return { current: 0, trend: 'stable' }; }
  async getProblemSolveRate(contestId) { return { rate: 0, trend: 'stable' }; }
  async getTeamActivity(contestId) { return { active_count: 0, total_count: 0 }; }
  async getDetailedContestStats(contestId) { return {}; }
  async getAllTeamPerformances(contestId) { return []; }
  async getDetailedProblemAnalysis(contestId) { return {}; }
  async getTeamProblemStats(teamId, contestId) { return {}; }
  async getTeamRankingHistory(teamId, contestId) { return []; }
  async getTeamLanguagePreferences(teamId, contestId) { return []; }
  async getTeamTimePatterns(teamId, contestId) { return {}; }
}

module.exports = new AnalyticsService();
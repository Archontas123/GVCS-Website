/**
 * Phase 2.4 Contest Timing System Tests
 * Tests for auto-start, auto-end, timer synchronization, and duration management
 */

const request = require('supertest');
const app = require('../server');
const { db } = require('../utils/db');
const contestScheduler = require('../services/contestScheduler');
const Contest = require('../controllers/contestController');

describe('Phase 2.4 - Contest Timing System', () => {
  beforeAll(async () => {
    // Make sure we're using test database
    process.env.NODE_ENV = 'test';
    
    // Clean up database
    await db('contest_results').del();
    await db('submissions').del();
    await db('test_cases').del();
    await db('problems').del();
    await db('teams').del();
    await db('contests').del();
    await db('admins').del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Contest Status and Timing', () => {
    test('should calculate contest status correctly', () => {
      const now = new Date();
      const contest = {
        start_time: new Date(now.getTime() + 60000), // 1 minute future
        duration: 120, // 2 hours
        freeze_time: 30, // 30 minutes
        is_frozen: false
      };

      const status = Contest.getContestStatus(contest);
      
      expect(status.status).toBe('not_started');
      expect(status.time_until_start_seconds).toBeGreaterThan(0);
      expect(status.time_remaining_seconds).toBeNull();
      expect(status.duration_minutes).toBe(120);
      expect(status.freeze_time_minutes).toBe(30);
    });

    test('should handle running contest status', () => {
      const now = new Date();
      const contest = {
        start_time: new Date(now.getTime() - 60000), // 1 minute ago
        duration: 120, // 2 hours
        freeze_time: 30, // 30 minutes
        is_frozen: false
      };

      const status = Contest.getContestStatus(contest);
      
      expect(status.status).toBe('running');
      expect(status.time_remaining_seconds).toBeGreaterThan(0);
      expect(status.time_elapsed_seconds).toBeGreaterThan(0);
      expect(status.progress_percentage).toBeGreaterThan(0);
    });

    test('should handle frozen contest status', () => {
      const now = new Date();
      const contest = {
        start_time: new Date(now.getTime() - 60000), // 1 minute ago
        duration: 120, // 2 hours
        freeze_time: 30, // 30 minutes
        is_frozen: true,
        frozen_at: now
      };

      const status = Contest.getContestStatus(contest);
      
      expect(status.status).toBe('frozen');
      expect(status.is_frozen).toBe(true);
      expect(status.frozen_at).toBeDefined();
    });

    test('should handle ended contest status', () => {
      const now = new Date();
      const contest = {
        start_time: new Date(now.getTime() - 7200000), // 2 hours ago
        duration: 120, // 2 hours
        freeze_time: 30, // 30 minutes
        is_frozen: false
      };

      const status = Contest.getContestStatus(contest);
      
      expect(status.status).toBe('ended');
      expect(status.progress_percentage).toBe(100);
    });
  });

  describe('Duration Management', () => {
    test('should validate contest duration correctly', () => {
      // Valid duration
      expect(() => {
        Contest.validateContestData({
          contest_name: 'Test Contest',
          start_time: new Date(Date.now() + 360000).toISOString(),
          duration: 180,
          freeze_time: 30
        });
      }).not.toThrow();

      // Invalid duration - too short
      expect(() => {
        Contest.validateContestData({
          contest_name: 'Test Contest',
          start_time: new Date(Date.now() + 360000).toISOString(),
          duration: 10, // Too short
          freeze_time: 30
        });
      }).toThrow('Contest validation failed');

      // Invalid duration - too long
      expect(() => {
        Contest.validateContestData({
          contest_name: 'Test Contest',
          start_time: new Date(Date.now() + 360000).toISOString(),
          duration: 2000, // Too long
          freeze_time: 30
        });
      }).toThrow('Contest validation failed');
    });

    test('should validate freeze time correctly', () => {
      // Valid freeze time
      expect(() => {
        Contest.validateContestData({
          contest_name: 'Test Contest',
          start_time: new Date(Date.now() + 360000).toISOString(),
          duration: 180,
          freeze_time: 30
        });
      }).not.toThrow();

      // Invalid freeze time - exceeds duration
      expect(() => {
        Contest.validateContestData({
          contest_name: 'Test Contest',
          start_time: new Date(Date.now() + 360000).toISOString(),
          duration: 60,
          freeze_time: 90 // Exceeds duration
        });
      }).toThrow('Contest validation failed');

      // Invalid freeze time - negative
      expect(() => {
        Contest.validateContestData({
          contest_name: 'Test Contest',
          start_time: new Date(Date.now() + 360000).toISOString(),
          duration: 180,
          freeze_time: -10 // Negative
        });
      }).toThrow('Contest validation failed');
    });

    test('should get duration recommendations', () => {
      const standardRec = Contest.getDurationRecommendations('standard');
      expect(standardRec.duration).toBe(180);
      expect(standardRec.freeze_time).toBe(60);
      expect(standardRec.description).toContain('3 hours');

      const beginnerRec = Contest.getDurationRecommendations('beginner');
      expect(beginnerRec.duration).toBe(90);
      expect(beginnerRec.freeze_time).toBe(15);
    });

    test('should calculate optimal freeze time', () => {
      expect(Contest.calculateOptimalFreezeTime(60)).toBe(10);
      expect(Contest.calculateOptimalFreezeTime(120)).toBe(30);
      expect(Contest.calculateOptimalFreezeTime(180)).toBe(60);
      expect(Contest.calculateOptimalFreezeTime(300)).toBe(90);
    });
  });

  describe('Timer API Endpoints', () => {
    test('should get server time synchronization', async () => {
      const response = await request(app)
        .get('/api/timer/sync')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.server_time).toBeDefined();
      expect(response.body.data.timestamp_ms).toBeDefined();
      expect(response.body.data.sync_id).toBeDefined();
      expect(typeof response.body.data.timestamp_ms).toBe('number');
    });

    test('should get duration recommendations', async () => {
      const response = await request(app)
        .get('/api/timer/duration/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requested_type).toBe('standard');
      expect(response.body.data.recommendation.duration).toBe(180);
      expect(response.body.data.all_recommendations).toBeDefined();
      expect(response.body.data.all_recommendations.beginner).toBeDefined();
    });

    test('should calculate optimal freeze time via API', async () => {
      const response = await request(app)
        .get('/api/timer/duration/optimal-freeze?duration=180')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.duration_minutes).toBe(180);
      expect(response.body.data.optimal_freeze_time_minutes).toBe(60);
      expect(response.body.data.freeze_percentage).toBe(33);
    });

    test('should validate duration parameter for optimal freeze', async () => {
      await request(app)
        .get('/api/timer/duration/optimal-freeze?duration=10')
        .expect(400);

      await request(app)
        .get('/api/timer/duration/optimal-freeze')
        .expect(400);
    });
  });

  describe('Contest Scheduler', () => {
    test('should start and stop scheduler', () => {
      expect(contestScheduler.isRunning).toBe(false);
      
      contestScheduler.start();
      expect(contestScheduler.isRunning).toBe(true);
      
      contestScheduler.stop();
      expect(contestScheduler.isRunning).toBe(false);
    });

    test('should handle scheduler status', () => {
      const status = contestScheduler.getStatus();
      expect(status.isRunning).toBeDefined();
      expect(status.scheduledTasks).toBeDefined();
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.scheduledTasks).toBe('number');
    });

    test('should validate contest can start', async () => {
      const contest = {
        id: 1,
        contest_name: 'Test Contest',
        registration_code: 'TEST123'
      };

      const validation = await contestScheduler.validateContestCanStart(contest);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('no problems');
    });
  });

  describe('Enhanced Contest Status', () => {
    test('should provide detailed timing information', () => {
      const now = new Date();
      const contest = {
        start_time: new Date(now.getTime() - 3600000), // 1 hour ago
        duration: 180, // 3 hours
        freeze_time: 60, // 1 hour
        is_frozen: false,
        ended_at: null,
        archived_at: null
      };

      const status = Contest.getContestStatus(contest);
      
      expect(status.current_server_time).toBeDefined();
      expect(status.progress_percentage).toBeGreaterThan(0);
      expect(status.progress_percentage).toBeLessThan(100);
      expect(status.time_elapsed_seconds).toBeGreaterThan(0);
      expect(status.time_until_freeze_seconds).toBeGreaterThan(0);
    });
  });
});
/**
 * Phase 2.1 - Contest Creation System Tests
 */

const request = require('supertest');
const app = require('../server');
const { db } = require('../utils/db');

describe('Phase 2.1 - Contest Creation System', () => {
  let adminToken;
  let contestId;

  beforeAll(async () => {
    // Clean up database
    if (process.env.NODE_ENV === 'test') {
      await db.migrate.latest();
      await db.seed.run();
    }
  });

  afterAll(async () => {
    if (process.env.NODE_ENV === 'test') {
      await db.destroy();
    }
  });

  describe('Admin Authentication', () => {
    test('should login admin successfully', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'admin',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.admin.username).toBe('admin');
      expect(response.body.data.admin.role).toBe('super_admin');

      adminToken = response.body.data.token;
    });

    test('should fail login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('authentication_error');
    });

    test('should get admin profile', async () => {
      const response = await request(app)
        .get('/api/admin/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('admin');
      expect(response.body.data.statistics).toBeDefined();
    });
  });

  describe('Contest Management', () => {
    test('should create a new contest', async () => {
      const contestData = {
        contest_name: 'Test Contest',
        description: 'A test contest for automated testing',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        duration: 120,
        freeze_time: 30,
        is_registration_open: true
      };

      const response = await request(app)
        .post('/api/admin/contests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(contestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contest_name).toBe('Test Contest');
      expect(response.body.data.registration_code).toBeDefined();
      expect(response.body.data.registration_code).toHaveLength(8);
      expect(response.body.data.statistics).toBeDefined();

      contestId = response.body.data.id;
    });

    test('should get all contests', async () => {
      const response = await request(app)
        .get('/api/admin/contests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const contest = response.body.data.find(c => c.id === contestId);
      expect(contest).toBeDefined();
      expect(contest.statistics).toBeDefined();
    });

    test('should get specific contest details', async () => {
      const response = await request(app)
        .get(`/api/admin/contests/${contestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(contestId);
      expect(response.body.data.contest_name).toBe('Test Contest');
      expect(response.body.data.statistics).toBeDefined();
    });

    test('should update contest', async () => {
      const updateData = {
        description: 'Updated description for test contest',
        freeze_time: 45
      };

      const response = await request(app)
        .put(`/api/admin/contests/${contestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('Updated description for test contest');
      expect(response.body.data.freeze_time).toBe(45);
    });

    test('should start contest immediately', async () => {
      const response = await request(app)
        .post(`/api/admin/contests/${contestId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.start_time)).toBeLessThanOrEqual(new Date());
    });

    test('should freeze contest', async () => {
      // Wait a moment to ensure contest has started
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .post(`/api/admin/contests/${contestId}/freeze`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_frozen).toBe(true);
      expect(response.body.data.frozen_at).toBeDefined();
    });

    test('should end contest', async () => {
      const response = await request(app)
        .post(`/api/admin/contests/${contestId}/end`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Contest duration should be updated to actual duration
      expect(response.body.data.duration).toBeLessThan(120);
      expect(response.body.data.is_registration_open).toBe(false);
    });
  });

  describe('Validation Tests', () => {
    test('should fail to create contest with invalid data', async () => {
      const invalidData = {
        contest_name: 'A', // Too short
        start_time: 'invalid-date',
        duration: 10 // Too short
      };

      const response = await request(app)
        .post('/api/admin/contests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('validation_error');
    });

    test('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/contests')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('authentication_error');
    });
  });

  describe('Registration Code Management', () => {
    test('should generate unique registration codes', async () => {
      const codes = new Set();
      
      for (let i = 0; i < 5; i++) {
        const contestData = {
          contest_name: `Test Contest ${i}`,
          start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          duration: 60
        };

        const response = await request(app)
          .post('/api/admin/contests')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(contestData)
          .expect(201);

        const code = response.body.data.registration_code;
        expect(code).toHaveLength(8);
        expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }

      expect(codes.size).toBe(5);
    });
  });
});
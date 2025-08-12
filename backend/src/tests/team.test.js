const request = require('supertest');
const app = require('../server');
const { db } = require('../utils/db');

describe('Team Authentication API', () => {
  let testContest;
  let testTeam;
  let authToken;

  beforeAll(async () => {
    await db.migrate.latest();
    
    // Create a contest that starts 2 hours in the future to ensure it's not_started
    const futureStartTime = new Date(Date.now() + (2 * 60 * 60 * 1000));
    
    testContest = await db('contests').insert({
      contest_name: 'Test Contest',
      description: 'Test contest for API testing',
      registration_code: 'TEST2024',
      start_time: futureStartTime.toISOString(), // Use ISO string for SQLite compatibility
      duration: 180, // 3 hours
      freeze_time: 60,
      created_by: 1,
      is_active: true,
      is_registration_open: true,
      created_at: new Date().toISOString()
    }).returning('*');
  });

  afterAll(async () => {
    await db('contest_results').where('contest_id', testContest[0].id).del();
    await db('team_contests').where('contest_id', testContest[0].id).del();
    await db('teams').where('contest_code', 'TEST2024').del();
    await db('contests').where('id', testContest[0].id).del();
    await db.destroy();
  });

  describe('POST /api/team/register', () => {
    test('should register a new team successfully', async () => {
      const teamData = {
        team_name: 'Test Team Alpha',
        contest_code: 'TEST2024'
      };

      const response = await request(app)
        .post('/api/team/register')
        .send(teamData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team registered successfully');
      expect(response.body.data).toMatchObject({
        teamName: teamData.team_name,
        contestCode: teamData.contest_code,
        contestName: 'Test Contest'
      });
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.teamId).toBeDefined();

      testTeam = response.body.data;
      authToken = response.body.data.token;
    });

    test('should reject duplicate team names', async () => {
      const teamData = {
        team_name: 'Test Team Alpha', // Same as above
        contest_code: 'TEST2024'
      };

      const response = await request(app)
        .post('/api/team/register')
        .send(teamData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DUPLICATE_TEAM_NAME');
    });

    test('should reject invalid contest code', async () => {
      const teamData = {
        team_name: 'Test Team Beta',
        contest_code: 'INVALID1'
      };

      const response = await request(app)
        .post('/api/team/register')
        .send(teamData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_CONTEST_CODE');
    });

    test('should validate team name format', async () => {
      const testCases = [
        { team_name: 'AB', contest_code: 'TEST2024' }, // Too short
        { team_name: 'A'.repeat(51), contest_code: 'TEST2024' }, // Too long
        { team_name: 'Team@#$%', contest_code: 'TEST2024' }, // Invalid characters
        { team_name: '', contest_code: 'TEST2024' }, // Empty
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/team/register')
          .send(testCase)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
      }
    });

    test('should validate contest code format', async () => {
      const testCases = [
        { team_name: 'Valid Team', contest_code: 'SHORT' }, // Too short
        { team_name: 'Valid Team', contest_code: 'TOOLONG123' }, // Too long
        { team_name: 'Valid Team', contest_code: 'test2024' }, // Lowercase
        { team_name: 'Valid Team', contest_code: 'TEST@#$%' }, // Invalid characters
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/team/register')
          .send(testCase)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
      }
    });
  });

  describe('POST /api/team/login', () => {
    test('should login existing team successfully', async () => {
      const loginData = {
        team_name: 'Test Team Alpha',
        contest_code: 'TEST2024'
      };

      const response = await request(app)
        .post('/api/team/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toMatchObject({
        teamName: loginData.team_name,
        contestCode: loginData.contest_code,
        contestName: 'Test Contest'
      });
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.teamId).toBeDefined();

      // Update auth token for subsequent tests
      authToken = response.body.data.token;
    });

    test('should reject non-existent team', async () => {
      const loginData = {
        team_name: 'Non Existent Team',
        contest_code: 'TEST2024'
      };

      const response = await request(app)
        .post('/api/team/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });

    test('should reject invalid contest code', async () => {
      const loginData = {
        team_name: 'Test Team Alpha',
        contest_code: 'WRONGCOD'
      };

      const response = await request(app)
        .post('/api/team/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/team/status', () => {
    test('should get team status with valid token', async () => {
      const response = await request(app)
        .get('/api/team/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.team).toMatchObject({
        name: 'Test Team Alpha'
      });
      // Debug: log the actual contest data
      console.log('Contest data:', JSON.stringify(response.body.data.contest, null, 2));
      console.log('Contest start time:', response.body.data.contest.startTime);
      console.log('Current time:', new Date().toISOString());
      
      expect(response.body.data.contest).toMatchObject({
        name: 'Test Contest',
        code: 'TEST2024',
        status: 'not_started'
      });
      expect(response.body.data.results).toMatchObject({
        problemsSolved: 0,
        penaltyTime: 0,
        totalSubmissions: 0
      });
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/team/status')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication failed');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/team/status')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication failed');
    });
  });

  describe('POST /api/team/logout', () => {
    test('should logout team successfully', async () => {
      const response = await request(app)
        .post('/api/team/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    test('should reject status request after logout', async () => {
      const response = await request(app)
        .get('/api/team/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication failed');
    });
  });

  describe('Health Check', () => {
    test('should return server health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.environment).toBeDefined();
    });
  });
});
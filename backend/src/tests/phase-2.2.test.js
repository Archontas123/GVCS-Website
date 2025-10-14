/**
 * Phase 2.2 - Problem Management Tests
 */

const request = require('supertest');
const { app } = require('../server');
const { db } = require('../utils/db');

describe('Phase 2.2 - Problem Management', () => {
  let adminToken;
  let contestId;
  let problemId;
  let testCaseId;

  beforeAll(async () => {
    // Clean up database and login as admin
    if (process.env.NODE_ENV === 'test') {
      await db.migrate.latest();
      await db.seed.run();
    }

    // Login as admin
    const loginResponse = await request(app)
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: 'AdminPass123!'
      });

    adminToken = loginResponse.body.data.token;

    // Create a contest for testing
    const contestResponse = await request(app)
      .post('/api/admin/contests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        contest_name: 'Problem Management Test Contest',
        description: 'Contest for testing problem management',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: 120,
        freeze_time: 30
      });

    contestId = contestResponse.body.data.id;
  });

  afterAll(async () => {
    if (process.env.NODE_ENV === 'test') {
      await db.destroy();
    }
  });


  describe('Problem CRUD Operations', () => {
    test('should create a new problem', async () => {
      const problemData = {
        title: 'Sum of Two Numbers',
        description: 'Given two integers A and B, compute their sum.',
        input_format: 'Two integers A and B on a single line, separated by a space.',
        output_format: 'Print the sum A + B on a single line.',
        sample_input: '3 5',
        sample_output: '8',
        constraints: '1 ≤ A, B ≤ 1000',
        time_limit: 1000,
        memory_limit: 256,
        difficulty: 'easy'
      };

      const response = await request(app)
        .post(`/api/admin/contests/${contestId}/problems`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(problemData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Sum of Two Numbers');
      expect(response.body.data.problem_letter).toBe('A'); // First problem gets A
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.test_cases_count).toBe(1); // Sample test case created

      problemId = response.body.data.id;
    });

    test('should get all problems for a contest', async () => {
      const response = await request(app)
        .get(`/api/admin/contests/${contestId}/problems`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1); // Only the created problem
      expect(response.body.data[0].problem_letter).toBe('A');
    });

    test('should get all problems with statistics', async () => {
      const response = await request(app)
        .get(`/api/admin/contests/${contestId}/problems?statistics=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].statistics).toBeDefined();
      expect(response.body.data[0].statistics.test_cases_count).toBeGreaterThanOrEqual(0);
    });

    test('should get specific problem details', async () => {
      const response = await request(app)
        .get(`/api/admin/problems/${problemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(problemId);
      expect(response.body.data.title).toBe('Sum of Two Numbers');
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.test_case_statistics).toBeDefined();
    });

    test('should update problem', async () => {
      const updateData = {
        title: 'Updated: Sum of Two Numbers',
        time_limit: 1500,
        difficulty: 'medium'
      };

      const response = await request(app)
        .put(`/api/admin/problems/${problemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated: Sum of Two Numbers');
      expect(response.body.data.time_limit).toBe(1500);
      expect(response.body.data.difficulty).toBe('medium');
    });

    test('should handle problem letter assignment', async () => {
      const problemData = {
        title: 'Problem with Specific Letter',
        description: 'A test problem with a specific letter assignment.',
        input_format: 'No input required.',
        output_format: 'Print "Hello" on a single line.',
        problem_letter: 'Z'
      };

      const response = await request(app)
        .post(`/api/admin/contests/${contestId}/problems`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(problemData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.problem_letter).toBe('Z');
    });

    test('should prevent duplicate problem letters', async () => {
      const problemData = {
        title: 'Duplicate Letter Problem',
        description: 'This should fail due to duplicate letter.',
        input_format: 'No input required.',
        output_format: 'Print "Hello" on a single line.',
        problem_letter: 'A' // Already used by first problem
      };

      const response = await request(app)
        .post(`/api/admin/contests/${contestId}/problems`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(problemData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('conflict_error');
    });
  });

  describe('Test Case Management', () => {
    test('should create a test case', async () => {
      const testCaseData = {
        input: '10 20',
        expected_output: '30',
        is_sample: false
      };

      const response = await request(app)
        .post(`/api/admin/problems/${problemId}/testcases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testCaseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.input).toBe('10 20');
      expect(response.body.data.expected_output).toBe('30');
      expect(response.body.data.is_sample).toBe(false);

      testCaseId = response.body.data.id;
    });

    test('should get all test cases for a problem', async () => {
      const response = await request(app)
        .get(`/api/admin/problems/${problemId}/testcases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // Sample + created test case
    });

    test('should get only sample test cases', async () => {
      const response = await request(app)
        .get(`/api/admin/problems/${problemId}/testcases?sample_only=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1); // Only sample
      expect(response.body.data[0].is_sample).toBe(true);
    });

    test('should update test case', async () => {
      const updateData = {
        input: '15 25',
        expected_output: '40'
      };

      const response = await request(app)
        .put(`/api/admin/testcases/${testCaseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.input).toBe('15 25');
      expect(response.body.data.expected_output).toBe('40');
    });

    test('should create bulk test cases from array', async () => {
      const testCasesData = {
        test_cases: [
          {
            test_case_name: 'Basic addition 1',
            input_parameters: { a: 1, b: 1 },
            expected_return: 2,
            parameter_types: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }],
            is_sample: false
          },
          {
            test_case_name: 'Large numbers',
            input_parameters: { a: 100, b: 200 },
            expected_return: 300,
            parameter_types: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }],
            is_sample: false
          },
          {
            test_case_name: 'Zero addition',
            input_parameters: { a: 0, b: 0 },
            expected_return: 0,
            parameter_types: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }],
            is_sample: false
          }
        ]
      };

      const response = await request(app)
        .post(`/api/admin/problems/${problemId}/testcases/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testCasesData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created_count).toBe(3);
      expect(response.body.data.test_cases).toHaveLength(3);
    });

    test('should create bulk test cases from CSV', async () => {
      const csvData = `test_case_name,input_parameters,expected_return,parameter_types,is_sample
Addition Test 1,"{""a"": 5, ""b"": 10}",15,"[{""name"": ""a"", ""type"": ""int""}, {""name"": ""b"", ""type"": ""int""}]",false
Addition Test 2,"{""a"": 7, ""b"": 8}",15,"[{""name"": ""a"", ""type"": ""int""}, {""name"": ""b"", ""type"": ""int""}]",false
Subtraction Test,"{""a"": -1, ""b"": 1}",0,"[{""name"": ""a"", ""type"": ""int""}, {""name"": ""b"", ""type"": ""int""}]",false`;

      const response = await request(app)
        .post(`/api/admin/problems/${problemId}/testcases/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ csv_data: csvData })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created_count).toBe(3);
    });

    test('should get test case statistics', async () => {
      const response = await request(app)
        .get(`/api/admin/problems/${problemId}/testcases/statistics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_count).toBeGreaterThan(0);
      expect(response.body.data.sample_count).toBeGreaterThanOrEqual(1);
      expect(response.body.data.hidden_count).toBeGreaterThanOrEqual(0);
    });

    test('should validate test case format', async () => {
      const response = await request(app)
        .post(`/api/admin/testcases/${testCaseId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ constraints: {} })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBeDefined();
      expect(response.body.data.warnings).toBeDefined();
    });

    test('should delete test case', async () => {
      const response = await request(app)
        .delete(`/api/admin/testcases/${testCaseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });
  });

  describe('Validation Tests', () => {
    test('should fail to create problem with invalid data', async () => {
      const invalidData = {
        title: 'A', // Too short
        description: 'Short', // Too short
        input_format: 'Bad', // Too short
        output_format: 'Bad', // Too short
        time_limit: 50, // Too low
        memory_limit: 8 // Too low
      };

      const response = await request(app)
        .post(`/api/admin/contests/${contestId}/problems`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('validation_error');
    });

    test('should require admin authentication', async () => {
      const response = await request(app)
        .get(`/api/admin/contests/${contestId}/problems`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('authentication_error');
    });
  });

  describe('Contest Running Restrictions', () => {
    test('should prevent problem modifications during running contest', async () => {
      // Start the contest
      await request(app)
        .post(`/api/admin/contests/${contestId}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to update problem during running contest
      const response = await request(app)
        .put(`/api/admin/problems/${problemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Should not be allowed' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('validation_error');

      // End the contest to clean up
      await request(app)
        .post(`/api/admin/contests/${contestId}/end`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });
});
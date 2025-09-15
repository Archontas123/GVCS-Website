/**
 * Phase 3.2 - Real-time Leaderboard WebSocket Test
 * Test script to verify WebSocket functionality
 */

const http = require('http');
const express = require('express');
const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const { db, testConnection } = require('../utils/db');
const websocketService = require('../services/websocketService');

class WebSocketTester {
  constructor() {
    this.server = null;
    this.app = null;
    this.clients = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Set up test server
   */
  async setupTestServer() {
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Initialize WebSocket service with disabled update batcher for tests  
    websocketService.initialize(this.server, { disableUpdateBatcher: true });
    
    // Start server on test port
    return new Promise((resolve, reject) => {
      this.server.listen(3007, (error) => {
        if (error) {
          console.error('❌ Failed to start server:', error.message);
          reject(error);
        } else {
          console.log('✅ Test WebSocket server started on port 3007');
          resolve();
        }
      });
    });
  }

  /**
   * Create test data
   */
  async createTestData() {
    try {
      // Create test admin
      const adminData = {
        username: 'test_admin',
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        role: 'admin'
      };

      const [adminId] = await db('admins').insert(adminData).returning('id');
      
      // Create test contest
      const contestData = {
        contest_name: 'WebSocket Test Contest',
        description: 'Test contest for WebSocket functionality',
        registration_code: 'WS_TEST_001',
        start_time: new Date(Date.now() - 60 * 60 * 1000), // Started 1 hour ago
        duration: 180, // 3 hours
        freeze_time: 60,
        created_by: adminId,
        is_active: true
      };

      const [contestId] = await db('contests').insert(contestData).returning('id');

      // Create test teams
      const team1Data = {
        team_name: 'Test Team Alpha',
        contest_code: 'WS_TEST_001',
        session_token: 'test_token_1',
        is_active: true
      };

      const team2Data = {
        team_name: 'Test Team Beta',
        contest_code: 'WS_TEST_001', 
        session_token: 'test_token_2',
        is_active: true
      };

      const [team1Id] = await db('teams').insert(team1Data).returning('id');
      const [team2Id] = await db('teams').insert(team2Data).returning('id');

      // Create test problems
      const problemAData = {
        contest_id: contestId,
        problem_letter: 'A',
        title: 'Test Problem A',
        description: 'A simple test problem',
        input_format: 'Integer n',
        output_format: 'Integer result',
        sample_input: '5',
        sample_output: '10',
        time_limit: 1000,
        memory_limit: 256
      };

      const problemBData = {
        contest_id: contestId,
        problem_letter: 'B',
        title: 'Test Problem B',
        description: 'Another test problem',
        input_format: 'String s',
        output_format: 'String result',
        sample_input: 'hello',
        sample_output: 'HELLO',
        time_limit: 2000,
        memory_limit: 256
      };

      const [problemAId] = await db('problems').insert(problemAData).returning('id');
      const [problemBId] = await db('problems').insert(problemBData).returning('id');

      console.log('✅ Test data created successfully');
      
      return {
        adminId,
        contestId,
        team1Id,
        team2Id,
        problemAId,
        problemBId,
        team1Token: this.generateTestToken(team1Id),
        team2Token: this.generateTestToken(team2Id),
        adminToken: this.generateTestAdminToken(adminId)
      };
    } catch (error) {
      console.error('❌ Error creating test data:', error);
      throw error;
    }
  }

  /**
   * Generate test JWT token for team
   */
  generateTestToken(teamId) {
    return jwt.sign(
      { teamId: teamId },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { 
        expiresIn: '1h',
        issuer: 'programming_contest-platform',
        audience: 'team-client'
      }
    );
  }

  /**
   * Generate test JWT token for admin
   */
  generateTestAdminToken(adminId) {
    return jwt.sign(
      { id: adminId, type: 'admin' },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { 
        expiresIn: '1h',
        issuer: 'programming_contest-platform',
        audience: 'team-client'
      }
    );
  }

  /**
   * Create WebSocket client
   */
  createClient() {
    const client = io('http://localhost:3007', {
      transports: ['websocket'],
      timeout: 2000
    });
    
    this.clients.push(client);
    return client;
  }

  /**
   * Run test suite
   */
  async runTests() {
    try {
      console.log('🧪 Starting WebSocket tests...\n');

      await testConnection();
      await this.setupTestServer();
      
      const testData = await this.createTestData();

      // Test 1: Basic connection
      await this.testBasicConnection();

      // Test 2: Team authentication
      await this.testTeamAuthentication(testData);

      // Test 3: Admin authentication  
      await this.testAdminAuthentication(testData);

      // Test 4: Contest room joining
      await this.testContestRoomJoining(testData);

      // Test 5: Leaderboard data retrieval
      await this.testLeaderboardData(testData);

      // Test 6: Real-time updates
      await this.testRealTimeUpdates(testData);

      // Test 7: Multiple clients
      await this.testMultipleClients(testData);

      // Test 8: Connection stats
      await this.testConnectionStats();

      this.printResults();
      await this.cleanup();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      await this.cleanup();
      process.exit(1);
    }
  }

  /**
   * Test basic WebSocket connection
   */
  async testBasicConnection() {
    return new Promise((resolve) => {
      const client = this.createClient();
      
      client.on('connect', () => {
        this.recordTest('Basic Connection', true, 'Client connected successfully');
        client.disconnect();
        resolve();
      });

      client.on('connect_error', (error) => {
        this.recordTest('Basic Connection', false, `Connection failed: ${error.message}`);
        resolve();
      });

      setTimeout(() => {
        this.recordTest('Basic Connection', false, 'Connection timeout');
        client.disconnect();
        resolve();
      }, 2000);
    });
  }

  /**
   * Test team authentication
   */
  async testTeamAuthentication(testData) {
    return new Promise((resolve) => {
      const client = this.createClient();
      
      client.on('connect', () => {
        client.emit('authenticate_team', {
          token: testData.team1Token,
          contestId: testData.contestId
        });
      });

      client.on('authenticated', (data) => {
        if (data.teamId === testData.team1Id && data.contestId === testData.contestId) {
          this.recordTest('Team Authentication', true, 'Team authenticated successfully');
        } else {
          this.recordTest('Team Authentication', false, 'Invalid authentication data');
        }
        client.disconnect();
        resolve();
      });

      client.on('auth_error', (error) => {
        this.recordTest('Team Authentication', false, `Auth error: ${error.message}`);
        client.disconnect();
        resolve();
      });

      setTimeout(() => {
        this.recordTest('Team Authentication', false, 'Authentication timeout');
        client.disconnect();
        resolve();
      }, 5000);
    });
  }

  /**
   * Test admin authentication
   */
  async testAdminAuthentication(testData) {
    return new Promise((resolve) => {
      const client = this.createClient();
      
      client.on('connect', () => {
        client.emit('authenticate_admin', {
          token: testData.adminToken
        });
      });

      client.on('authenticated', (data) => {
        if (data.adminId === testData.adminId && data.type === 'admin') {
          this.recordTest('Admin Authentication', true, 'Admin authenticated successfully');
        } else {
          this.recordTest('Admin Authentication', false, 'Invalid admin authentication data');
        }
        client.disconnect();
        resolve();
      });

      client.on('auth_error', (error) => {
        this.recordTest('Admin Authentication', false, `Admin auth error: ${error.message}`);
        client.disconnect();
        resolve();
      });

      setTimeout(() => {
        this.recordTest('Admin Authentication', false, 'Admin authentication timeout');
        client.disconnect();
        resolve();
      }, 5000);
    });
  }

  /**
   * Test contest room joining
   */
  async testContestRoomJoining(testData) {
    return new Promise((resolve) => {
      const client = this.createClient();
      let authCompleted = false;
      
      client.on('connect', () => {
        client.emit('authenticate_team', {
          token: testData.team1Token,
          contestId: testData.contestId
        });
      });

      client.on('authenticated', () => {
        authCompleted = true;
        client.emit('join_contest', {
          contestId: testData.contestId
        });
      });

      client.on('joined_contest', (data) => {
        if (authCompleted && data.contestId === testData.contestId) {
          this.recordTest('Contest Room Joining', true, 'Successfully joined contest room');
        } else {
          this.recordTest('Contest Room Joining', false, 'Invalid contest join data');
        }
        client.disconnect();
        resolve();
      });

      client.on('join_error', (error) => {
        this.recordTest('Contest Room Joining', false, `Join error: ${error.message}`);
        client.disconnect();
        resolve();
      });

      setTimeout(() => {
        this.recordTest('Contest Room Joining', false, 'Contest join timeout');
        client.disconnect();
        resolve();
      }, 5000);
    });
  }

  /**
   * Test leaderboard data retrieval
   */
  async testLeaderboardData(testData) {
    return new Promise((resolve) => {
      const client = this.createClient();
      let joinedContest = false;
      
      client.on('connect', () => {
        client.emit('authenticate_team', {
          token: testData.team1Token,
          contestId: testData.contestId
        });
      });

      client.on('authenticated', () => {
        client.emit('join_contest', {
          contestId: testData.contestId
        });
      });

      client.on('joined_contest', () => {
        joinedContest = true;
        client.emit('request_leaderboard', {
          contestId: testData.contestId
        });
      });

      client.on('leaderboard_update', (data) => {
        if (joinedContest && data.contestId === testData.contestId && data.contest && data.teams) {
          this.recordTest('Leaderboard Data Retrieval', true, 'Received valid leaderboard data');
        } else {
          this.recordTest('Leaderboard Data Retrieval', false, 'Invalid leaderboard data structure');
        }
        client.disconnect();
        resolve();
      });

      client.on('leaderboard_error', (error) => {
        this.recordTest('Leaderboard Data Retrieval', false, `Leaderboard error: ${error.message}`);
        client.disconnect();
        resolve();
      });

      setTimeout(() => {
        this.recordTest('Leaderboard Data Retrieval', false, 'Leaderboard data timeout');
        client.disconnect();
        resolve();
      }, 8000);
    });
  }

  /**
   * Test real-time updates
   */
  async testRealTimeUpdates(testData) {
    return new Promise(async (resolve) => {
      const client = this.createClient();
      let updateReceived = false;
      
      client.on('connect', () => {
        client.emit('authenticate_team', {
          token: testData.team1Token,
          contestId: testData.contestId
        });
      });

      client.on('authenticated', () => {
        client.emit('join_contest', {
          contestId: testData.contestId
        });
      });

      client.on('joined_contest', async () => {
        // Trigger a score update to test real-time broadcast
        setTimeout(async () => {
          try {
            const scoringService = require('../services/scoringService');
            await scoringService.updateTeamScoreOnSubmission(
              testData.team1Id, 
              testData.problemAId, 
              'accepted'
            );
          } catch (error) {
            console.log('Error triggering score update:', error.message);
          }
        }, 1000);
      });

      client.on('leaderboard_update', (data) => {
        if (!updateReceived) {
          updateReceived = true;
          this.recordTest('Real-time Updates', true, 'Received real-time leaderboard update');
          client.disconnect();
          resolve();
        }
      });

      setTimeout(() => {
        if (!updateReceived) {
          this.recordTest('Real-time Updates', false, 'No real-time update received');
          client.disconnect();
          resolve();
        }
      }, 10000);
    });
  }

  /**
   * Test multiple clients
   */
  async testMultipleClients(testData) {
    return new Promise((resolve) => {
      const client1 = this.createClient();
      const client2 = this.createClient();
      let client1Ready = false;
      let client2Ready = false;
      let bothReceived = false;

      // Client 1 setup
      client1.on('connect', () => {
        client1.emit('authenticate_team', {
          token: testData.team1Token,
          contestId: testData.contestId
        });
      });

      client1.on('authenticated', () => {
        client1.emit('join_contest', { contestId: testData.contestId });
      });

      client1.on('joined_contest', () => {
        client1Ready = true;
        checkBothReady();
      });

      // Client 2 setup
      client2.on('connect', () => {
        client2.emit('authenticate_team', {
          token: testData.team2Token,
          contestId: testData.contestId
        });
      });

      client2.on('authenticated', () => {
        client2.emit('join_contest', { contestId: testData.contestId });
      });

      client2.on('joined_contest', () => {
        client2Ready = true;
        checkBothReady();
      });

      // Check if both clients receive updates
      let client1Received = false;
      let client2Received = false;

      client1.on('leaderboard_update', () => {
        client1Received = true;
        checkBothReceived();
      });

      client2.on('leaderboard_update', () => {
        client2Received = true;
        checkBothReceived();
      });

      function checkBothReady() {
        if (client1Ready && client2Ready) {
          // Trigger update after both clients are ready
          setTimeout(async () => {
            try {
              const scoringService = require('../services/scoringService');
              await scoringService.updateTeamScoreOnSubmission(
                testData.team2Id,
                testData.problemBId,
                'accepted'
              );
            } catch (error) {
              console.log('Error in multiple client test:', error.message);
            }
          }, 1000);
        }
      }

      const checkBothReceived = () => {
        if (client1Received && client2Received && !bothReceived) {
          bothReceived = true;
          this.recordTest('Multiple Clients', true, 'Both clients received updates');
          client1.disconnect();
          client2.disconnect();
          resolve();
        }
      };

      setTimeout(() => {
        if (!bothReceived) {
          this.recordTest('Multiple Clients', false, `Updates received: Client1=${client1Received}, Client2=${client2Received}`);
          client1.disconnect();
          client2.disconnect();
          resolve();
        }
      }, 10000);
    });
  }

  /**
   * Test connection statistics
   */
  async testConnectionStats() {
    const stats = websocketService.getConnectionStats();
    
    if (stats && typeof stats.totalConnections === 'number') {
      this.recordTest('Connection Statistics', true, `Stats retrieved: ${stats.totalConnections} total connections`);
    } else {
      this.recordTest('Connection Statistics', false, 'Invalid statistics structure');
    }
  }

  /**
   * Record test result
   */
  recordTest(testName, passed, message) {
    const result = { testName, passed, message };
    this.testResults.tests.push(result);
    
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 WEBSOCKET TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.testResults.tests.length}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.tests.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));

    if (this.testResults.failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults.tests.filter(t => !t.passed).forEach(test => {
        console.log(`❌ ${test.testName}: ${test.message}`);
      });
    }
  }

  /**
   * Clean up test resources
   */
  async cleanup() {
    try {
      // Disconnect all clients
      this.clients.forEach(client => {
        if (client.connected) {
          client.disconnect();
        }
      });

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Clean up test data
      await db('submissions').where('team_id', 'in', 
        db.select('id').from('teams').where('contest_code', 'WS_TEST_001')
      ).del();
      
      await db('contest_results').where('contest_id', 'in',
        db.select('id').from('contests').where('registration_code', 'WS_TEST_001')
      ).del();
      
      await db('problems').where('contest_id', 'in',
        db.select('id').from('contests').where('registration_code', 'WS_TEST_001')
      ).del();
      
      await db('teams').where('contest_code', 'WS_TEST_001').del();
      await db('contests').where('registration_code', 'WS_TEST_001').del();
      await db('admins').where('username', 'test_admin').del();

      console.log('\n✅ Test cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new WebSocketTester();
  tester.runTests().then(() => {
    console.log('\n🎉 WebSocket test suite completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = WebSocketTester;
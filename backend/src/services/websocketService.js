const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { db } = require('../utils/db');

/**
 * WebSocket service for managing real-time communication in programming contests
 * Handles team authentication, contest room management, and live updates
 */
class WebSocketService {
  /**
   * Initialize WebSocket service
   * Sets up connection tracking, room management, and update queuing
   */
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.contestRooms = new Map();
    this.updateQueue = new Map();
    this.updateInterval = null;
  }

  /**
   * Initialize WebSocket server with Socket.IO
   * Sets up CORS, connection handling, and optional update batching
   * @param {Object} server - HTTP/HTTPS server instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.disableUpdateBatcher - Whether to disable update batching
   * @throws {Error} When server initialization fails
   */
  initialize(server, options = {}) {
    this.io = socketIo(server, {
      cors: {
        origin: [process.env.FRONTEND_URL || "http://localhost:3001", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      path: '/socket.io/'
    });

    this.setupEventHandlers();
    
    if (options.disableUpdateBatcher !== true) {
      this.startUpdateBatcher();
    }
    
    console.log('✅ WebSocket server initialized for programming_contest real-time leaderboard');
  }

  /**
   * Set up Socket.io event handlers for all connection events
   * Configures authentication, room management, and disconnection handling
   * @throws {Error} When event handler setup fails
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      socket.on('authenticate_team', async (data) => {
        try {
          await this.authenticateTeam(socket, data);
        } catch (error) {
          console.error('Team authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      socket.on('authenticate_admin', async (data) => {
        try {
          await this.authenticateAdmin(socket, data);
        } catch (error) {
          console.error('Admin authentication error:', error);
          socket.emit('auth_error', { message: 'Admin authentication failed' });
        }
      });

      socket.on('join_contest', async (data) => {
        try {
          await this.joinContestRoom(socket, data);
        } catch (error) {
          console.error('Join contest error:', error);
          socket.emit('join_error', { message: 'Failed to join contest room' });
        }
      });

      socket.on('leave_contest', (data) => {
        try {
          this.leaveContestRoom(socket, data);
        } catch (error) {
          console.error('Leave contest error:', error);
        }
      });

      socket.on('request_leaderboard', async (data) => {
        try {
          await this.sendCurrentLeaderboard(socket, data);
        } catch (error) {
          console.error('Request leaderboard error:', error);
          socket.emit('leaderboard_error', { message: 'Failed to get leaderboard' });
        }
      });

      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Authenticate team connection using JWT token
   * Verifies team credentials and stores authentication info
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Authentication data
   * @param {string} data.token - JWT authentication token
   * @param {number} data.contestId - Contest ID for authentication
   * @throws {Error} When token is invalid or team not found
   */
  async authenticateTeam(socket, data) {
    const { token, contestId } = data;
    
    if (!token || !contestId) {
      throw new Error('Token and contestId required');
    }

    const { verifyToken } = require('../utils/auth');
    
    const decoded = verifyToken(token);
    if (!decoded.teamId) {
      throw new Error('Invalid token payload - teamId required');
    }
    
    const team = await db('teams').where('id', decoded.teamId).andWhere('is_active', true).first();
    if (!team) {
      throw new Error('Team not found or inactive');
    }

    socket.teamId = team.id;
    socket.contestId = parseInt(contestId);
    socket.userType = 'team';
    socket.teamName = team.team_name;

    this.connectedClients.set(socket.id, {
      type: 'team',
      teamId: team.id,
      contestId: parseInt(contestId),
      teamName: team.team_name,
      connectedAt: new Date()
    });

    socket.emit('authenticated', {
      success: true,
      teamId: team.id,
      teamName: team.team_name,
      contestId: parseInt(contestId)
    });
  }

  /**
   * Authenticate admin connection using JWT token
   * Verifies admin credentials and stores authentication info
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Authentication data
   * @param {string} data.token - Admin JWT authentication token
   * @throws {Error} When token is invalid or admin not found
   */
  async authenticateAdmin(socket, data) {
    const { token } = data;
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const { verifyToken } = require('../utils/auth');
    
    const decoded = verifyToken(token);
    if (decoded.type !== 'admin') {
      throw new Error('Invalid token type - admin token required');
    }
    
    const admin = await db('admins').where('id', decoded.id).first();
    if (!admin) {
      throw new Error('Admin not found');
    }

    socket.adminId = admin.id;
    socket.userType = 'admin';
    socket.adminUsername = admin.username;

    this.connectedClients.set(socket.id, {
      type: 'admin',
      adminId: admin.id,
      adminUsername: admin.username,
      connectedAt: new Date()
    });

    socket.emit('authenticated', {
      success: true,
      adminId: admin.id,
      adminUsername: admin.username,
      type: 'admin'
    });
  }

  /**
   * Join contest room for real-time updates
   * Validates contest registration and adds socket to contest room
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Room joining data
   * @param {number} data.contestId - Contest ID to join
   * @throws {Error} When contest not found or team not registered
   */
  async joinContestRoom(socket, data) {
    const { contestId } = data;
    const parsedContestId = parseInt(contestId);

    if (!parsedContestId || isNaN(parsedContestId)) {
      throw new Error('Valid contest ID required');
    }

    const contest = await db('contests').where('id', parsedContestId).first();
    if (!contest) {
      throw new Error('Contest not found');
    }

    if (socket.userType === 'team') {
      const team = await db('teams').where('id', socket.teamId).first();
      const contestByCode = await db('contests').where('registration_code', team.contest_code).first();
      
      if (!contestByCode || contestByCode.id !== parsedContestId) {
        throw new Error('Team not registered for this contest');
      }
    }

    const roomName = `contest_${parsedContestId}`;
    socket.join(roomName);
    socket.currentContest = parsedContestId;

    if (!this.contestRooms.has(parsedContestId)) {
      this.contestRooms.set(parsedContestId, new Set());
    }
    this.contestRooms.get(parsedContestId).add(socket.id);

    if (this.connectedClients.has(socket.id)) {
      this.connectedClients.get(socket.id).currentContest = parsedContestId;
    }

    socket.emit('joined_contest', {
      success: true,
      contestId: parsedContestId,
      contestName: contest.contest_name
    });

    await this.sendCurrentLeaderboard(socket, { contestId: parsedContestId });
  }

  /**
   * Leave contest room and clean up subscriptions
   * Removes socket from contest room and updates tracking
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Room leaving data (optional)
   */
  leaveContestRoom(socket, data) {
    if (socket.currentContest) {
      const roomName = `contest_${socket.currentContest}`;
      socket.leave(roomName);

      if (this.contestRooms.has(socket.currentContest)) {
        this.contestRooms.get(socket.currentContest).delete(socket.id);
        
        if (this.contestRooms.get(socket.currentContest).size === 0) {
          this.contestRooms.delete(socket.currentContest);
        }
      }

      socket.currentContest = null;
      
      if (this.connectedClients.has(socket.id)) {
        delete this.connectedClients.get(socket.id).currentContest;
      }
    }

    socket.emit('left_contest', { success: true });
  }

  /**
   * Send current leaderboard data to a specific socket
   * Fetches optimized leaderboard data and emits to socket
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Leaderboard request data
   * @param {number} data.contestId - Contest ID for leaderboard
   * @throws {Error} When contest ID is invalid or data fetch fails
   */
  async sendCurrentLeaderboard(socket, data) {
    const { contestId } = data;
    const parsedContestId = parseInt(contestId);

    if (!parsedContestId || isNaN(parsedContestId)) {
      throw new Error('Valid contest ID required');
    }

    try {
      const leaderboardData = await this.getOptimizedLeaderboardData(parsedContestId);
      
      socket.emit('leaderboard_update', {
        contestId: parsedContestId,
        timestamp: new Date().toISOString(),
        ...leaderboardData
      });
    } catch (error) {
      console.error('Error sending leaderboard:', error);
      socket.emit('leaderboard_error', { 
        message: 'Failed to get leaderboard data',
        contestId: parsedContestId 
      });
    }
  }

  /**
   * Handle client disconnection cleanup
   * Removes socket from all rooms and tracking maps
   * @param {Object} socket - Socket.IO socket instance
   */
  handleDisconnection(socket) {
    if (socket.currentContest && this.contestRooms.has(socket.currentContest)) {
      this.contestRooms.get(socket.currentContest).delete(socket.id);
      
      if (this.contestRooms.get(socket.currentContest).size === 0) {
        this.contestRooms.delete(socket.currentContest);
      }
    }

    this.connectedClients.delete(socket.id);
  }

  /**
   * Get optimized leaderboard data with contest and team information
   * Fetches comprehensive leaderboard data including problem status
   * @param {number} contestId - Contest ID to get leaderboard for
   * @returns {Promise<Object>} Optimized leaderboard data structure
   * @throws {Error} When contest not found or data fetch fails
   */
  async getOptimizedLeaderboardData(contestId) {
    try {
      const scoringService = require('./scoringService');
      
      const leaderboard = await scoringService.getLeaderboard(contestId);
      
      const contest = await db('contests')
        .where('id', contestId)
        .first('id', 'contest_name', 'start_time', 'duration', 'freeze_time');

      const problems = await db('problems')
        .where('contest_id', contestId)
        .select('id', 'problem_letter', 'title')
        .orderBy('problem_letter');

      const now = new Date();
      const startTime = new Date(contest.start_time);
      const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
      
      const contestStatus = now < startTime ? 'not_started' : 
                           now > endTime ? 'ended' : 'running';
      
      const timeRemaining = contestStatus === 'running' ? 
        Math.max(0, Math.floor((endTime - now) / 1000)) : 0;

      const teamProblemStatus = await this.getTeamProblemStatusMatrix(contestId, problems);

      const enrichedLeaderboard = leaderboard.map(team => ({
        ...team,
        problemStatus: teamProblemStatus.get(team.team_id) || {}
      }));

      return {
        contest: {
          id: contest.id,
          name: contest.contest_name,
          status: contestStatus,
          timeRemaining: timeRemaining
        },
        problems: problems.map(p => ({
          id: p.id,
          letter: p.problem_letter,
          title: p.title
        })),
        teams: enrichedLeaderboard,
        lastUpdate: new Date().toISOString(),
        totalTeams: leaderboard.length
      };
    } catch (error) {
      console.error('Error getting optimized leaderboard data:', error);
      throw error;
    }
  }

  /**
   * Get problem solve status matrix for all teams in a contest
   * Builds comprehensive status matrix showing submission attempts and results
   * @param {number} contestId - Contest ID to analyze
   * @param {Array} problems - Array of problem objects
   * @returns {Promise<Map>} Map of team IDs to problem status objects
   * @throws {Error} When data fetch fails
   */
  async getTeamProblemStatusMatrix(contestId, problems) {
    const teamProblemStatus = new Map();

    try {
      // Get all submissions for this contest
      const submissions = await db('submissions as s')
        .join('problems as p', 'p.id', 's.problem_id')
        .join('teams as t', 't.id', 's.team_id')
        .join('contests as c', 'c.registration_code', 't.contest_code')
        .where('c.id', contestId)
        .select(
          's.team_id',
          'p.id as problem_id',
          'p.problem_letter',
          's.status',
          's.submission_time'
        )
        .orderBy('s.submission_time');

      // Process submissions to build status matrix
      for (const submission of submissions) {
        if (!teamProblemStatus.has(submission.team_id)) {
          teamProblemStatus.set(submission.team_id, {});
        }

        const teamStatus = teamProblemStatus.get(submission.team_id);
        const problemLetter = submission.problem_letter;

        if (!teamStatus[problemLetter]) {
          teamStatus[problemLetter] = {
            status: 'not_attempted',
            attempts: 0,
            solveTime: null,
            lastAttempt: null
          };
        }

        const problemStatus = teamStatus[problemLetter];
        
        // Only update if not already solved
        if (problemStatus.status !== 'accepted') {
          problemStatus.attempts++;
          problemStatus.lastAttempt = submission.submission_time;

          if (submission.status === 'accepted') {
            problemStatus.status = 'accepted';
            problemStatus.solveTime = submission.submission_time;
          } else if (['wrong_answer', 'time_limit_exceeded', 'runtime_error', 'memory_limit_exceeded'].includes(submission.status)) {
            problemStatus.status = 'attempted';
          } else if (submission.status === 'compilation_error') {
            problemStatus.status = 'compilation_error';
            problemStatus.attempts--; // Don't count compilation errors as attempts
          }
        }
      }

      return teamProblemStatus;
    } catch (error) {
      console.error('Error getting team problem status matrix:', error);
      return new Map();
    }
  }

  /**
   * Broadcast leaderboard update to all clients in contest room
   * Sends optimized leaderboard data to all connected clients
   * @param {number} contestId - Contest ID to broadcast update for
   * @throws {Error} When broadcast fails or data fetch fails
   */
  async broadcastLeaderboardUpdate(contestId) {
    if (!this.io || !this.contestRooms.has(contestId)) {
      return; // No clients connected to this contest
    }

    try {
      const roomName = `contest_${contestId}`;
      const leaderboardData = await this.getOptimizedLeaderboardData(contestId);
      
      this.io.to(roomName).emit('leaderboard_update', {
        contestId: contestId,
        timestamp: new Date().toISOString(),
        ...leaderboardData
      });

      console.log(`Broadcasted leaderboard update to contest ${contestId} room (${this.contestRooms.get(contestId).size} clients)`);
    } catch (error) {
      console.error(`Error broadcasting leaderboard update for contest ${contestId}:`, error);
    }
  }

  /**
   * Queue leaderboard update for batched processing
   * Prevents spam updates by batching requests
   * @param {number} contestId - Contest ID to queue update for
   */
  queueLeaderboardUpdate(contestId) {
    if (!this.updateQueue.has(contestId)) {
      this.updateQueue.set(contestId, {
        contestId: contestId,
        timestamp: new Date(),
        pending: true
      });
    }
  }

  /**
   * Start the update batcher to prevent spam updates
   * Processes queued updates every 5 seconds
   */
  startUpdateBatcher() {
    this.updateInterval = setInterval(async () => {
      const updates = Array.from(this.updateQueue.values());
      this.updateQueue.clear();

      for (const update of updates) {
        if (update.pending) {
          await this.broadcastLeaderboardUpdate(update.contestId);
        }
      }
    }, 5000); // Batch updates every 5 seconds

    console.log('✅ WebSocket update batcher started (5-second intervals)');
  }

  /**
   * Stop the update batcher and clear interval
   * Cleans up the update batching mechanism
   */
  stopUpdateBatcher() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('WebSocket update batcher stopped');
    }
  }

  /**
   * Get current connection statistics
   * Provides overview of connected clients and room occupancy
   * @returns {Object} Connection statistics including counts and room details
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      teamConnections: 0,
      adminConnections: 0,
      contestRooms: this.contestRooms.size,
      roomDetails: {}
    };

    this.connectedClients.forEach(client => {
      if (client.type === 'team') stats.teamConnections++;
      if (client.type === 'admin') stats.adminConnections++;
    });

    this.contestRooms.forEach((clients, contestId) => {
      stats.roomDetails[contestId] = clients.size;
    });

    return stats;
  }

  /**
   * Shutdown the WebSocket service gracefully
   * Stops update batcher and closes Socket.IO server
   */
  shutdown() {
    this.stopUpdateBatcher();
    if (this.io) {
      this.io.close();
      console.log('WebSocket server closed');
    }
  }

  /**
   * Broadcast contest freeze update to all connected clients
   * Notifies participants when contest leaderboard is frozen
   * @param {number} contestId - Contest ID to freeze
   * @param {Object} contestData - Contest information
   * @param {string} contestData.contest_name - Name of the contest
   * @param {string} contestData.frozen_at - Timestamp when frozen
   * @param {number} contestData.freeze_time - Freeze time in minutes
   * @throws {Error} When broadcast fails or WebSocket not initialized
   */
  async broadcastFreezeUpdate(contestId, contestData) {
    try {
      if (!this.io) {
        console.warn('WebSocket service not initialized');
        return;
      }

      const roomName = `contest_${contestId}`;
      
      const freezeData = {
        type: 'contest_frozen',
        contestId: contestId,
        message: `Contest "${contestData.contest_name || 'Contest'}" leaderboard has been frozen!`,
        contest: {
          id: contestId,
          name: contestData.contest_name,
          is_frozen: true,
          frozen_at: contestData.frozen_at,
          freeze_time: contestData.freeze_time
        },
        timestamp: new Date().toISOString()
      };

      this.io.to(roomName).emit('contest_freeze', freezeData);
      
      this.io.to('admin_room').emit('admin_notification', {
        type: 'contest_frozen',
        contestId: contestId,
        message: `Contest ${contestId} leaderboard frozen`,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Broadcasted freeze update for contest ${contestId} to ${roomName}`);
    } catch (error) {
      console.error('Error broadcasting freeze update:', error);
      throw error;
    }
  }

  /**
   * Broadcast contest unfreeze update to all connected clients
   * Notifies participants when contest leaderboard is unfrozen
   * @param {number} contestId - Contest ID to unfreeze
   * @param {Object} contestData - Contest information
   * @param {string} contestData.contest_name - Name of the contest
   * @throws {Error} When broadcast fails or WebSocket not initialized
   */
  async broadcastUnfreezeUpdate(contestId, contestData) {
    try {
      if (!this.io) {
        console.warn('WebSocket service not initialized');
        return;
      }

      const roomName = `contest_${contestId}`;
      
      const unfreezeData = {
        type: 'contest_unfrozen',
        contestId: contestId,
        message: `Contest "${contestData.contest_name || 'Contest'}" leaderboard has been unfrozen!`,
        contest: {
          id: contestId,
          name: contestData.contest_name,
          is_frozen: false,
          frozen_at: null
        },
        timestamp: new Date().toISOString()
      };

      this.io.to(roomName).emit('contest_unfreeze', unfreezeData);
      
      // Trigger immediate leaderboard update to show current standings
      await this.broadcastLeaderboardUpdate(contestId);
      
      // Also broadcast to admin room for monitoring
      this.io.to('admin_room').emit('admin_notification', {
        type: 'contest_unfrozen',
        contestId: contestId,
        message: `Contest ${contestId} leaderboard unfrozen`,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Broadcasted unfreeze update for contest ${contestId} to ${roomName}`);
    } catch (error) {
      console.error('Error broadcasting unfreeze update:', error);
      throw error;
    }
  }

  /**
   * Broadcast freeze time warning to contest participants
   * Warns participants about upcoming leaderboard freeze
   * @param {number} contestId - Contest ID to warn about
   * @param {number} minutesUntilFreeze - Minutes until freeze occurs
   * @throws {Error} When broadcast fails or WebSocket not initialized
   */
  async broadcastFreezeWarning(contestId, minutesUntilFreeze) {
    try {
      if (!this.io) {
        console.warn('WebSocket service not initialized');
        return;
      }

      const roomName = `contest_${contestId}`;
      
      const warningData = {
        type: 'freeze_warning',
        contestId: contestId,
        message: `Leaderboard will freeze in ${minutesUntilFreeze} minutes!`,
        minutesUntilFreeze: minutesUntilFreeze,
        timestamp: new Date().toISOString()
      };

      this.io.to(roomName).emit('freeze_warning', warningData);

      console.log(`✅ Broadcasted freeze warning (${minutesUntilFreeze} min) for contest ${contestId}`);
    } catch (error) {
      console.error('Error broadcasting freeze warning:', error);
    }
  }




  // ===================================================================
  // PHASE 4.5 - VERDICT COMMUNICATION METHODS
  // ===================================================================

  /**
   * Broadcast submission result to team and admins
   * Sends complete judging results to relevant parties
   * @param {Object} submissionResult - Complete judging result
   * @param {number} submissionResult.submissionId - Submission ID
   * @param {number} submissionResult.teamId - Team ID
   * @param {number} submissionResult.contestId - Contest ID
   * @param {number} submissionResult.problemId - Problem ID
   * @param {string} submissionResult.verdict - Verdict string
   * @param {number} submissionResult.executionTime - Execution time in ms
   * @param {number} submissionResult.memoryUsed - Memory used in bytes
   * @param {number} submissionResult.testCasesRun - Number of test cases run
   * @param {number} submissionResult.testCasesPassed - Number of test cases passed
   * @param {number} submissionResult.score - Score achieved
   * @param {boolean} submissionResult.accepted - Whether submission was accepted
   * @param {Array} submissionResult.details - Detailed test case results
   * @param {string} submissionResult.language - Programming language
   * @throws {Error} When broadcast fails or required data missing
   */
  async broadcastSubmissionResult(submissionResult) {
    try {
      if (!this.io) {
        console.warn('WebSocket service not initialized');
        return;
      }

      const {
        submissionId,
        teamId,
        contestId,
        problemId,
        verdict,
        executionTime,
        memoryUsed,
        testCasesRun,
        testCasesPassed,
        score,
        accepted,
        details,
        language
      } = submissionResult;

      // Get team and problem details
      const [team, problem] = await Promise.all([
        db('teams').where('id', teamId).first(),
        db('problems').where('id', problemId).first()
      ]);

      const resultData = {
        type: 'submission_result',
        submissionId: submissionId,
        teamId: teamId,
        teamName: team?.team_name,
        contestId: contestId,
        problemId: problemId,
        problemLetter: problem?.problem_letter,
        problemTitle: problem?.title,
        verdict: verdict,
        accepted: accepted,
        score: score || 0,
        executionTime: executionTime || 0,
        memoryUsed: memoryUsed || 0,
        testCasesRun: testCasesRun || 0,
        testCasesPassed: testCasesPassed || 0,
        language: language,
        judgedAt: new Date().toISOString(),
        message: this.getVerdictMessage(verdict, accepted),
        details: details || []
      };

      // Send to specific team
      const teamSockets = this.getTeamSockets(teamId);
      for (const socketId of teamSockets) {
        this.io.to(socketId).emit('submission_result', resultData);
      }

      // Send to contest room (for spectators)
      const contestRoom = `contest_${contestId}`;
      this.io.to(contestRoom).emit('team_submission_result', {
        ...resultData,
        publicData: {
          teamName: team?.team_name,
          problemLetter: problem?.problem_letter,
          verdict: verdict,
          accepted: accepted,
          executionTime: executionTime
        }
      });

      // Send to admin room
      this.io.to('admin_room').emit('admin_submission_result', resultData);

      console.log(`🏁 Broadcasted submission result: ${verdict} for team ${teamId} problem ${problem?.problem_letter}`);

      // Trigger leaderboard update if accepted
      if (accepted) {
        await this.broadcastLeaderboardUpdate(contestId);
      }

    } catch (error) {
      console.error('Error broadcasting submission result:', error);
      throw error;
    }
  }

  /**
   * Broadcast verdict update for ongoing judging
   * Sends real-time updates during the judging process
   * @param {Object} verdictUpdate - Partial judging status
   * @param {number} verdictUpdate.submissionId - Submission ID
   * @param {number} verdictUpdate.teamId - Team ID
   * @param {number} verdictUpdate.contestId - Contest ID
   * @param {number} verdictUpdate.problemId - Problem ID
   * @param {string} verdictUpdate.status - Current status
   * @param {number} verdictUpdate.currentTestCase - Current test case number
   * @param {number} verdictUpdate.totalTestCases - Total test cases
   * @param {string} verdictUpdate.preliminaryVerdict - Preliminary verdict
   * @throws {Error} When broadcast fails
   */
  async broadcastVerdictUpdate(verdictUpdate) {
    try {
      if (!this.io) {
        console.warn('WebSocket service not initialized');
        return;
      }

      const {
        submissionId,
        teamId,
        contestId,
        problemId,
        status,
        currentTestCase,
        totalTestCases,
        preliminaryVerdict
      } = verdictUpdate;

      const updateData = {
        type: 'verdict_update',
        submissionId: submissionId,
        teamId: teamId,
        contestId: contestId,
        problemId: problemId,
        status: status, // 'queued', 'compiling', 'running', 'judging', 'completed'
        currentTestCase: currentTestCase || 0,
        totalTestCases: totalTestCases || 0,
        preliminaryVerdict: preliminaryVerdict,
        progress: totalTestCases > 0 ? Math.round((currentTestCase / totalTestCases) * 100) : 0,
        message: this.getStatusMessage(status, currentTestCase, totalTestCases),
        timestamp: new Date().toISOString()
      };

      // Send to specific team
      const teamSockets = this.getTeamSockets(teamId);
      for (const socketId of teamSockets) {
        this.io.to(socketId).emit('verdict_update', updateData);
      }

      // Send to admin room
      this.io.to('admin_room').emit('admin_verdict_update', updateData);

      console.log(`🔄 Broadcasted verdict update: ${status} for submission ${submissionId}`);

    } catch (error) {
      console.error('Error broadcasting verdict update:', error);
    }
  }

  /**
   * Broadcast submission status change
   * Notifies about queue position and processing status
   * @param {Object} statusData - Submission status information
   * @param {number} statusData.submissionId - Submission ID
   * @param {number} statusData.teamId - Team ID
   * @param {number} statusData.contestId - Contest ID
   * @param {string} statusData.status - Current status
   * @param {number} statusData.queuePosition - Position in queue
   * @param {number} statusData.estimatedWaitTime - Estimated wait time in seconds
   * @throws {Error} When broadcast fails
   */
  async broadcastSubmissionStatus(statusData) {
    try {
      if (!this.io) {
        console.warn('WebSocket service not initialized');
        return;
      }

      const {
        submissionId,
        teamId,
        contestId,
        status,
        queuePosition,
        estimatedWaitTime
      } = statusData;

      const statusUpdate = {
        type: 'submission_status',
        submissionId: submissionId,
        teamId: teamId,
        contestId: contestId,
        status: status,
        queuePosition: queuePosition,
        estimatedWaitTime: estimatedWaitTime,
        message: this.getQueueMessage(status, queuePosition, estimatedWaitTime),
        timestamp: new Date().toISOString()
      };

      // Send to specific team
      const teamSockets = this.getTeamSockets(teamId);
      for (const socketId of teamSockets) {
        this.io.to(socketId).emit('submission_status', statusUpdate);
      }

      console.log(`📋 Broadcasted submission status: ${status} for submission ${submissionId}`);

    } catch (error) {
      console.error('Error broadcasting submission status:', error);
    }
  }

  /**
   * Send verdict directly to a specific team
   * Sends targeted verdict information to team sockets
   * @param {number} teamId - Team ID to send verdict to
   * @param {Object} verdictData - Verdict information
   * @throws {Error} When team not found or send fails
   */
  async sendVerdictToTeam(teamId, verdictData) {
    try {
      if (!this.io) {
        console.warn('WebSocket service not initialized');
        return;
      }

      const teamSockets = this.getTeamSockets(teamId);
      for (const socketId of teamSockets) {
        this.io.to(socketId).emit('team_verdict', {
          ...verdictData,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`📨 Sent verdict directly to team ${teamId}`);

    } catch (error) {
      console.error('Error sending verdict to team:', error);
    }
  }

  /**
   * Broadcast queue position updates to multiple teams
   * Updates teams about their position in the judging queue
   * @param {number} contestId - Contest ID
   * @param {Array} queueUpdates - Array of queue position updates
   * @param {number} queueUpdates[].submissionId - Submission ID
   * @param {number} queueUpdates[].teamId - Team ID
   * @param {number} queueUpdates[].position - Queue position
   * @param {number} queueUpdates[].estimatedWaitTime - Wait time in seconds
   * @param {number} queueUpdates[].totalInQueue - Total submissions in queue
   * @throws {Error} When broadcast fails
   */
  async broadcastQueuePositionUpdates(contestId, queueUpdates) {
    try {
      if (!this.io) {
        console.warn('WebSocket service not initialized');
        return;
      }

      for (const update of queueUpdates) {
        const {
          submissionId,
          teamId,
          position,
          estimatedWaitTime,
          totalInQueue
        } = update;

        const positionData = {
          type: 'queue_position',
          submissionId: submissionId,
          teamId: teamId,
          contestId: contestId,
          position: position,
          totalInQueue: totalInQueue,
          estimatedWaitTime: estimatedWaitTime,
          message: `Your submission is #${position} in queue (estimated wait: ${estimatedWaitTime}s)`,
          timestamp: new Date().toISOString()
        };

        // Send to specific team
        const teamSockets = this.getTeamSockets(teamId);
        for (const socketId of teamSockets) {
          this.io.to(socketId).emit('queue_position', positionData);
        }
      }

      console.log(`📊 Broadcasted queue position updates for ${queueUpdates.length} submissions`);

    } catch (error) {
      console.error('Error broadcasting queue position updates:', error);
    }
  }

  // ===================================================================
  // HELPER METHODS FOR VERDICT COMMUNICATION
  // ===================================================================

  /**
   * Get team socket IDs for direct communication
   * @param {number} teamId - Team ID
   * @returns {Array} Array of socket IDs for the team
   */
  getTeamSockets(teamId) {
    const teamSockets = [];
    for (const [socketId, clientInfo] of this.connectedClients.entries()) {
      if (clientInfo.type === 'team' && clientInfo.teamId === teamId) {
        teamSockets.push(socketId);
      }
    }
    return teamSockets;
  }

  /**
   * Get human-readable verdict message
   * @param {string} verdict - Verdict code
   * @param {boolean} accepted - Whether submission was accepted
   * @returns {string} Human-readable message
   */
  getVerdictMessage(verdict, accepted) {
    if (accepted) {
      return '🎉 Accepted! Great job!';
    }

    const verdictMessages = {
      'Wrong Answer': '❌ Wrong Answer - Check your logic',
      'Time Limit Exceeded': '⏰ Time Limit Exceeded - Optimize your solution',
      'Runtime Error': '💥 Runtime Error - Check for crashes or exceptions',
      'Memory Limit Exceeded': '💾 Memory Limit Exceeded - Use less memory',
      'Compilation Error': '🔧 Compilation Error - Fix syntax errors',
      'System Error': '⚙️ System Error - Please try again',
      'Presentation Error': '📝 Presentation Error - Check output formatting'
    };

    return verdictMessages[verdict] || `Verdict: ${verdict}`;
  }

  /**
   * Get status message for judging progress
   * @param {string} status - Current status
   * @param {number} currentTestCase - Current test case number
   * @param {number} totalTestCases - Total test cases
   * @returns {string} Status message
   */
  getStatusMessage(status, currentTestCase = 0, totalTestCases = 0) {
    const statusMessages = {
      'queued': '⏳ Your submission is in the judge queue...',
      'compiling': '🔧 Compiling your code...',
      'running': '🏃 Running test cases...',
      'judging': totalTestCases > 0 ? 
        `🔍 Judging: Test case ${currentTestCase}/${totalTestCases}` :
        '🔍 Judging your submission...',
      'completed': '✅ Judging completed!'
    };

    return statusMessages[status] || `Status: ${status}`;
  }

  /**
   * Get queue message with position and wait time
   * @param {string} status - Queue status
   * @param {number} queuePosition - Position in queue
   * @param {number} estimatedWaitTime - Estimated wait time in seconds
   * @returns {string} Queue message
   */
  getQueueMessage(status, queuePosition, estimatedWaitTime) {
    if (status === 'queued' && queuePosition) {
      const waitMinutes = Math.ceil(estimatedWaitTime / 60);
      return `📋 Position #${queuePosition} in queue (≈${waitMinutes} min wait)`;
    }
    
    if (status === 'processing') {
      return '🔄 Your submission is now being processed...';
    }
    
    return `Status: ${status}`;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
module.exports = websocketService;
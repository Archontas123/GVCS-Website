/**
 * Phase 3.2 - Real-time Leaderboard WebSocket Service
 * Handles WebSocket connections for real-time leaderboard updates
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { db } = require('../utils/db');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // Track connected clients
    this.contestRooms = new Map(); // Track contest room subscriptions
    this.updateQueue = new Map(); // Queue updates to batch them
    this.updateInterval = null;
  }

  /**
   * Initialize WebSocket server
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
    
    // Allow disabling update batcher in tests
    if (options.disableUpdateBatcher !== true) {
      this.startUpdateBatcher();
    }
    
    console.log('✅ WebSocket server initialized for real-time leaderboard');
  }

  /**
   * Set up Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Handle team authentication
      socket.on('authenticate_team', async (data) => {
        try {
          await this.authenticateTeam(socket, data);
        } catch (error) {
          console.error('Team authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle admin authentication  
      socket.on('authenticate_admin', async (data) => {
        try {
          await this.authenticateAdmin(socket, data);
        } catch (error) {
          console.error('Admin authentication error:', error);
          socket.emit('auth_error', { message: 'Admin authentication failed' });
        }
      });

      // Handle contest room joining
      socket.on('join_contest', async (data) => {
        try {
          await this.joinContestRoom(socket, data);
        } catch (error) {
          console.error('Join contest error:', error);
          socket.emit('join_error', { message: 'Failed to join contest room' });
        }
      });

      // Handle leaving contest room
      socket.on('leave_contest', (data) => {
        try {
          this.leaveContestRoom(socket, data);
        } catch (error) {
          console.error('Leave contest error:', error);
        }
      });

      // Handle request for current leaderboard
      socket.on('request_leaderboard', async (data) => {
        try {
          await this.sendCurrentLeaderboard(socket, data);
        } catch (error) {
          console.error('Request leaderboard error:', error);
          socket.emit('leaderboard_error', { message: 'Failed to get leaderboard' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Authenticate team connection
   */
  async authenticateTeam(socket, data) {
    const { token, contestId } = data;
    
    if (!token || !contestId) {
      throw new Error('Token and contestId required');
    }

    // Import auth utility
    const { verifyToken } = require('../utils/auth');
    
    // Verify JWT token using the same method as HTTP auth
    const decoded = verifyToken(token);
    
    // Check for teamId in token payload (as used by HTTP auth)
    if (!decoded.teamId) {
      throw new Error('Invalid token payload - teamId required');
    }
    
    // Get team from database
    const team = await db('teams').where('id', decoded.teamId).andWhere('is_active', true).first();
    if (!team) {
      throw new Error('Team not found or inactive');
    }

    // Store authentication info
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
   * Authenticate admin connection
   */
  async authenticateAdmin(socket, data) {
    const { token } = data;
    
    if (!token) {
      throw new Error('Admin token required');
    }

    // Import auth utility
    const { verifyToken } = require('../utils/auth');
    
    // Verify admin JWT token using the same method as HTTP auth
    const decoded = verifyToken(token);
    
    // Check token type (as expected by admin auth)
    if (decoded.type !== 'admin') {
      throw new Error('Invalid token type - admin token required');
    }
    
    // Get admin from database
    const admin = await db('admins').where('id', decoded.id).first();
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Store authentication info
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
   */
  async joinContestRoom(socket, data) {
    const { contestId } = data;
    const parsedContestId = parseInt(contestId);

    if (!parsedContestId || isNaN(parsedContestId)) {
      throw new Error('Valid contest ID required');
    }

    // Verify contest exists
    const contest = await db('contests').where('id', parsedContestId).first();
    if (!contest) {
      throw new Error('Contest not found');
    }

    // For teams, verify they're registered for this contest
    if (socket.userType === 'team') {
      const team = await db('teams').where('id', socket.teamId).first();
      const contestByCode = await db('contests').where('registration_code', team.contest_code).first();
      
      if (!contestByCode || contestByCode.id !== parsedContestId) {
        throw new Error('Team not registered for this contest');
      }
    }

    // Join contest room
    const roomName = `contest_${parsedContestId}`;
    socket.join(roomName);
    socket.currentContest = parsedContestId;

    // Track room subscription
    if (!this.contestRooms.has(parsedContestId)) {
      this.contestRooms.set(parsedContestId, new Set());
    }
    this.contestRooms.get(parsedContestId).add(socket.id);

    // Update client info
    if (this.connectedClients.has(socket.id)) {
      this.connectedClients.get(socket.id).currentContest = parsedContestId;
    }

    socket.emit('joined_contest', {
      success: true,
      contestId: parsedContestId,
      contestName: contest.contest_name
    });

    // Send current leaderboard immediately
    await this.sendCurrentLeaderboard(socket, { contestId: parsedContestId });
  }

  /**
   * Leave contest room
   */
  leaveContestRoom(socket, data) {
    if (socket.currentContest) {
      const roomName = `contest_${socket.currentContest}`;
      socket.leave(roomName);

      // Remove from room tracking
      if (this.contestRooms.has(socket.currentContest)) {
        this.contestRooms.get(socket.currentContest).delete(socket.id);
        
        // Clean up empty room tracking
        if (this.contestRooms.get(socket.currentContest).size === 0) {
          this.contestRooms.delete(socket.currentContest);
        }
      }

      socket.currentContest = null;
      
      // Update client info
      if (this.connectedClients.has(socket.id)) {
        delete this.connectedClients.get(socket.id).currentContest;
      }
    }

    socket.emit('left_contest', { success: true });
  }

  /**
   * Send current leaderboard to a specific socket
   */
  async sendCurrentLeaderboard(socket, data) {
    const { contestId } = data;
    const parsedContestId = parseInt(contestId);

    if (!parsedContestId || isNaN(parsedContestId)) {
      throw new Error('Valid contest ID required');
    }

    try {
      // Get optimized leaderboard data
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
   * Handle client disconnection
   */
  handleDisconnection(socket) {
    // Remove from contest rooms
    if (socket.currentContest && this.contestRooms.has(socket.currentContest)) {
      this.contestRooms.get(socket.currentContest).delete(socket.id);
      
      // Clean up empty room tracking
      if (this.contestRooms.get(socket.currentContest).size === 0) {
        this.contestRooms.delete(socket.currentContest);
      }
    }

    // Remove from connected clients
    this.connectedClients.delete(socket.id);
  }

  /**
   * Get optimized leaderboard data structure
   */
  async getOptimizedLeaderboardData(contestId) {
    try {
      // Lazy import to avoid circular dependency
      const scoringService = require('./scoringService');
      
      // Get leaderboard from unified scoring service
      const leaderboard = await scoringService.getLeaderboard(contestId);
      
      // Get contest info
      const contest = await db('contests')
        .where('id', contestId)
        .first('id', 'contest_name', 'start_time', 'duration', 'freeze_time');

      // Get problems for this contest
      const problems = await db('problems')
        .where('contest_id', contestId)
        .select('id', 'problem_letter', 'title')
        .orderBy('problem_letter');

      // Calculate contest timing
      const now = new Date();
      const startTime = new Date(contest.start_time);
      const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
      
      const contestStatus = now < startTime ? 'not_started' : 
                           now > endTime ? 'ended' : 'running';
      
      const timeRemaining = contestStatus === 'running' ? 
        Math.max(0, Math.floor((endTime - now) / 1000)) : 0;

      // Get problem solve status for each team (optimized)
      const teamProblemStatus = await this.getTeamProblemStatusMatrix(contestId, problems);

      // Combine leaderboard with problem status
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
   * Get problem solve status matrix for all teams
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
   * Broadcast leaderboard update to contest room
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
   * Queue leaderboard update (batched processing)
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
   * Stop the update batcher
   */
  stopUpdateBatcher() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('WebSocket update batcher stopped');
    }
  }

  /**
   * Get connection statistics
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
   * Shutdown the WebSocket service
   */
  shutdown() {
    this.stopUpdateBatcher();
    if (this.io) {
      this.io.close();
      console.log('WebSocket server closed');
    }
  }

  /**
   * Broadcast contest freeze update - Phase 3.4
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
      
      // Also broadcast to admin room for monitoring
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
   * Broadcast contest unfreeze update - Phase 3.4
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
   * Broadcast freeze time warning - Phase 3.4
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
   * Broadcast submission result to team and admins - Phase 4.5
   * @param {Object} submissionResult - Complete judging result
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
   * Broadcast verdict update for ongoing judging - Phase 4.5
   * @param {Object} verdictUpdate - Partial judging status
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
   * Broadcast submission status change - Phase 4.5
   * @param {Object} statusData - Submission status information
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
   * Send verdict directly to a specific team - Phase 4.5
   * @param {number} teamId - Team ID
   * @param {Object} verdictData - Verdict information
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
   * Broadcast queue position updates - Phase 4.5
   * @param {number} contestId - Contest ID
   * @param {Array} queueUpdates - Array of queue position updates
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
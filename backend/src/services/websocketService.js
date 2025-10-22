'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const scoringService = require('./scoringService');
const submissionController = require('../controllers/submissionController');
const Contest = require('../controllers/contestController');
const Admin = require('../controllers/adminController');
const { db } = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const DEFAULT_CORS_ORIGINS = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000', 'http://localhost:3001'];

let ioInstance = null;
let attachedServer = null;
let batcherEnabled = true;
let leaderboardTimer = null;
const leaderboardQueue = new Set();

const socketRegistry = new Map(); // socketId -> metadata
const contestMembership = new Map(); // contestId -> Set(socketId)

const connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  peakConnections: 0,
  totalMessagesSent: 0,
  teamsAuthenticated: 0,
  adminsAuthenticated: 0
};

/**
 * Initialize Socket.IO with the provided server.
 * Supports reinitialization with a new server instance (used in tests).
 */
function initialize(server, options = {}) {
  if (!server) {
    throw new Error('HTTP server instance is required to initialize websocket service');
  }

  // Reuse existing instance when already attached to same server
  if (ioInstance && attachedServer === server) {
    return ioInstance;
  }

  // Clean up previous instance when reattaching to a different server (e.g., tests)
  if (ioInstance) {
    ioInstance.removeAllListeners();
    ioInstance.close();
    ioInstance = null;
    attachedServer = null;
    socketRegistry.clear();
    contestMembership.clear();
    resetCounters();
  }

  batcherEnabled = !options.disableUpdateBatcher;

  ioInstance = new Server(server, {
    cors: {
      origin: options.corsOrigin || DEFAULT_CORS_ORIGINS,
      credentials: true
    }
  });

  attachedServer = server;
  setupConnectionHandlers();

  return ioInstance;
}

/**
 * Set up Socket.IO connection handlers.
 */
function setupConnectionHandlers() {
  if (!ioInstance) {
    return;
  }

  ioInstance.on('connection', (socket) => {
    registerConnection(socket);

    socket.on('authenticate_team', (payload) => {
      handleTeamAuthentication(socket, payload).catch((error) => {
        emitAuthError(socket, error);
      });
    });

    socket.on('authenticate_admin', (payload) => {
      handleAdminAuthentication(socket, payload).catch((error) => {
        emitAuthError(socket, error);
      });
    });

    socket.on('join_contest', (payload) => {
      handleContestJoin(socket, payload);
    });

    socket.on('leave_contest', (payload) => {
      handleContestLeave(socket, payload);
    });

    socket.on('request_leaderboard', (payload) => {
      handleLeaderboardRequest(socket, payload).catch((error) => {
        socket.emit('leaderboard_error', {
          message: error.message || 'Failed to load leaderboard'
        });
      });
    });

    socket.on('disconnect', () => {
      unregisterConnection(socket.id);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });
}

/**
 * Register a new socket connection and update statistics.
 */
function registerConnection(socket) {
  connectionStats.totalConnections += 1;
  connectionStats.activeConnections += 1;
  connectionStats.peakConnections = Math.max(
    connectionStats.peakConnections,
    connectionStats.activeConnections
  );

  socketRegistry.set(socket.id, {
    id: socket.id,
    type: 'guest',
    authenticated: false,
    contests: new Set(),
    connectedAt: Date.now(),
    lastActiveAt: Date.now()
  });
}

/**
 * Remove socket metadata and update counters.
 */
function unregisterConnection(socketId) {
  const metadata = socketRegistry.get(socketId);
  if (!metadata) {
    return;
  }

  metadata.contests.forEach((contestId) => {
    const members = contestMembership.get(contestId);
    if (members) {
      members.delete(socketId);
      if (members.size === 0) {
        contestMembership.delete(contestId);
      }
    }
  });

  socketRegistry.delete(socketId);
  connectionStats.activeConnections = Math.max(connectionStats.activeConnections - 1, 0);
  recalculateAuthCounters();
}

/**
 * Attempt to authenticate a team socket using JWT.
 */
async function handleTeamAuthentication(socket, payload = {}) {
  if (!payload || !payload.token) {
    throw new Error('Authentication token is required');
  }

  const decoded = jwt.verify(payload.token, JWT_SECRET);
  if (!decoded || !decoded.teamId) {
    throw new Error('Invalid authentication payload');
  }

  const team = await db('teams')
    .where('id', decoded.teamId)
    .first();

  if (!team) {
    throw new Error('Team not found');
  }

  let contestId = parseNumber(payload.contestId);

  if (!contestId && team.contest_code) {
    const contestRecord = await db('contests')
      .where('registration_code', team.contest_code)
      .first('id');
    contestId = contestRecord ? contestRecord.id : null;
  }

  if (contestId) {
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw new Error('Contest not found');
    }

    if (contest.registration_code && team.contest_code && contest.registration_code !== team.contest_code) {
      throw new Error('Team is not registered for this contest');
    }
  }

  const metadata = socketRegistry.get(socket.id);
  if (metadata) {
    metadata.type = 'team';
    metadata.teamId = team.id;
    metadata.teamName = team.team_name;
    metadata.authenticated = true;
    metadata.contestId = contestId || null;
    metadata.lastActiveAt = Date.now();
    if (contestId) {
      metadata.contests.add(contestId);
      trackContestMembership(socket.id, contestId);
      socket.join(getContestRoom(contestId));
    }
  }

  socket.join(getTeamRoom(team.id));

  recalculateAuthCounters();

  socket.emit('authenticated', {
    type: 'team',
    teamId: team.id,
    contestId: contestId || null,
    teamName: team.team_name
  });
}

/**
 * Attempt to authenticate an admin socket.
 */
async function handleAdminAuthentication(socket, payload = {}) {
  if (!payload || !payload.token) {
    throw new Error('Authentication token is required');
  }

  const admin = Admin.verifyToken(payload.token);

  const metadata = socketRegistry.get(socket.id);
  if (metadata) {
    metadata.type = 'admin';
    metadata.authenticated = true;
    metadata.adminId = admin.id;
    metadata.username = admin.username;
    metadata.lastActiveAt = Date.now();
  }

  socket.join('admins');
  recalculateAuthCounters();

  socket.emit('authenticated', {
    type: 'admin',
    adminId: admin.id,
    username: admin.username,
    role: admin.role
  });
}

/**
 * Handle contest room join requests.
 */
function handleContestJoin(socket, payload = {}) {
  const contestId = parseNumber(payload.contestId);
  if (!contestId) {
    socket.emit('join_error', { message: 'Valid contest ID is required' });
    return;
  }

  const metadata = socketRegistry.get(socket.id);
  if (!metadata || !metadata.authenticated) {
    socket.emit('join_error', { message: 'Authentication required before joining contests' });
    return;
  }

  if (metadata.type === 'team' && metadata.contestId && metadata.contestId !== contestId) {
    socket.emit('join_error', { message: 'Team is not registered for this contest' });
    return;
  }

  metadata.contests.add(contestId);
  metadata.lastActiveAt = Date.now();
  trackContestMembership(socket.id, contestId);

  socket.join(getContestRoom(contestId));
  socket.emit('joined_contest', { contestId });
}

/**
 * Handle explicit contest leave events.
 */
function handleContestLeave(socket, payload = {}) {
  const contestId = parseNumber(payload.contestId);
  if (!contestId) {
    return;
  }

  const metadata = socketRegistry.get(socket.id);
  if (!metadata) {
    return;
  }

  metadata.contests.delete(contestId);
  metadata.lastActiveAt = Date.now();

  const members = contestMembership.get(contestId);
  if (members) {
    members.delete(socket.id);
    if (members.size === 0) {
      contestMembership.delete(contestId);
    }
  }

  socket.leave(getContestRoom(contestId));
}

/**
 * Handle leaderboard request for a specific contest.
 */
async function handleLeaderboardRequest(socket, payload = {}) {
  const metadata = socketRegistry.get(socket.id);
  if (!metadata || !metadata.authenticated) {
    throw new Error('Authentication required to request leaderboard data');
  }

  let contestId = parseNumber(payload.contestId);
  if (!contestId) {
    if (metadata.contestId) {
      contestId = metadata.contestId;
    } else if (metadata.contests.size > 0) {
      contestId = [...metadata.contests][0];
    }
  }

  if (!contestId) {
    throw new Error('Contest ID is required to retrieve leaderboard');
  }

  const leaderboard = await buildLeaderboardPayload(contestId);
  socket.emit('leaderboard_update', leaderboard);
}

/**
 * Broadcast leaderboard updates to contest participants.
 */
async function broadcastLeaderboardUpdate(contestId, options = {}) {
  if (!ioInstance || !contestId) {
    return false;
  }

  if (batcherEnabled && !options.forceImmediate) {
    leaderboardQueue.add(contestId);
    scheduleLeaderboardBatch();
    return true;
  }

  return await sendLeaderboardToContest(contestId);
}

/**
 * Broadcast submission status updates to relevant rooms.
 */
async function broadcastSubmissionStatus(update = {}) {
  if (!ioInstance || !update) {
    return false;
  }

  const payload = {
    ...update,
    type: update.type || 'submission_update',
    timestamp: new Date().toISOString()
  };

  const eventName = 'submission_update';

  if (update.contestId) {
    emitToContest(update.contestId, eventName, payload);
  }

  if (update.teamId) {
    ioInstance.to(getTeamRoom(update.teamId)).emit(eventName, payload);
    connectionStats.totalMessagesSent += 1;
  }

  ioInstance.to('admins').emit(eventName, payload);
  connectionStats.totalMessagesSent += 1;

  return true;
}

/**
 * Broadcast freeze notification to contest participants and admins.
 */
async function broadcastFreezeUpdate(contestId, contestData = null) {
  if (!ioInstance || !contestId) {
    return false;
  }

  const payload = {
    type: 'contest_frozen',
    contestId,
    contest: normalizeContest(contestData) || (await fetchContestSnapshot(contestId)),
    timestamp: new Date().toISOString()
  };

  emitToContest(contestId, 'contest_frozen', payload);
  ioInstance.to('admins').emit('contest_frozen', payload);
  connectionStats.totalMessagesSent += 1;

  return true;
}

/**
 * Broadcast unfreeze notification to contest participants and admins.
 */
async function broadcastUnfreezeUpdate(contestId, contestData = null) {
  if (!ioInstance || !contestId) {
    return false;
  }

  const payload = {
    type: 'contest_unfrozen',
    contestId,
    contest: normalizeContest(contestData) || (await fetchContestSnapshot(contestId)),
    timestamp: new Date().toISOString()
  };

  emitToContest(contestId, 'contest_unfrozen', payload);
  ioInstance.to('admins').emit('contest_unfrozen', payload);
  connectionStats.totalMessagesSent += 1;

  return true;
}

/**
 * Broadcast arbitrary payload to a room. Event name derived from payload.type when provided.
 */
function broadcastToRoom(roomName, message) {
  if (!ioInstance || !roomName || !message) {
    return false;
  }

  const eventName = message.type || 'room_event';
  const payload = message.data !== undefined ? message.data : { ...message };

  if (message.data === undefined && message.type) {
    payload.type = message.type;
  }

  ioInstance.to(roomName).emit(eventName, payload);
  connectionStats.totalMessagesSent += 1;
  return true;
}

/**
 * Send a payload directly to a specific socket by ID.
 */
function sendToSocket(socketId, message) {
  if (!ioInstance || !socketId || !message) {
    return false;
  }

  const socket = ioInstance.sockets.sockets.get(socketId);
  if (!socket) {
    return false;
  }

  const eventName = message.type || 'message';
  const payload = message.data !== undefined ? message.data : { ...message };

  if (message.data === undefined && message.type) {
    payload.type = message.type;
  }

  socket.emit(eventName, payload);
  connectionStats.totalMessagesSent += 1;
  return true;
}

/**
 * Retrieve current connection statistics snapshot.
 */
function getConnectionStats() {
  const contestStats = {};

  contestMembership.forEach((sockets, contestId) => {
    contestStats[contestId] = {
      activeConnections: sockets.size
    };
  });

  return {
    totalConnections: connectionStats.totalConnections,
    activeConnections: connectionStats.activeConnections,
    peakConnections: connectionStats.peakConnections,
    totalMessagesSent: connectionStats.totalMessagesSent,
    teamsAuthenticated: connectionStats.teamsAuthenticated,
    adminsAuthenticated: connectionStats.adminsAuthenticated,
    contests: contestStats,
    timestamp: new Date().toISOString()
  };
}

/**
 * Ensure contest membership tracking is up to date.
 */
function trackContestMembership(socketId, contestId) {
  if (!contestId) {
    return;
  }

  const members = contestMembership.get(contestId) || new Set();
  members.add(socketId);
  contestMembership.set(contestId, members);
}

/**
 * Schedule batched leaderboard updates to reduce duplicate broadcasts.
 */
function scheduleLeaderboardBatch() {
  if (leaderboardTimer) {
    return;
  }

  leaderboardTimer = setTimeout(async () => {
    const contests = Array.from(leaderboardQueue.values());
    leaderboardQueue.clear();
    leaderboardTimer = null;

    for (const contestId of contests) {
      try {
        await sendLeaderboardToContest(contestId);
      } catch (error) {
        console.error('Failed to broadcast leaderboard update:', error);
      }
    }
  }, 250);
}

/**
 * Fetch leaderboard payload and emit to contest participants.
 */
async function sendLeaderboardToContest(contestId) {
  const payload = await buildLeaderboardPayload(contestId);
  emitToContest(contestId, 'leaderboard_update', payload);
  ioInstance.to('admins').emit('leaderboard_update', payload);
  connectionStats.totalMessagesSent += 1;
  return true;
}

/**
 * Emit helper for contest rooms.
 */
function emitToContest(contestId, eventName, payload) {
  if (!ioInstance || !contestId) {
    return;
  }
  ioInstance.to(getContestRoom(contestId)).emit(eventName, payload);
  connectionStats.totalMessagesSent += 1;
}

/**
 * Build leaderboard payload with contest and statistics.
 */
async function buildLeaderboardPayload(contestId) {
  if (!contestId) {
    throw new Error('Contest ID is required');
  }

  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new Error('Contest not found');
  }

  const teams = await scoringService.getLeaderboard(contestId);
  let statistics = null;

  try {
    statistics = await submissionController.getContestSubmissionStats(contestId);
  } catch (error) {
    console.warn('Failed to load submission statistics for contest', contestId, error.message);
  }

  return {
    contestId,
    contest: normalizeContest(contest),
    teams,
    statistics,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Retrieve minimal contest snapshot from database.
 */
async function fetchContestSnapshot(contestId) {
  const contest = await Contest.findById(contestId);
  return normalizeContest(contest);
}

/**
 * Normalize contest objects (plain DB record or Contest instance).
 */
function normalizeContest(contest) {
  if (!contest) {
    return null;
  }

  return {
    id: contest.id,
    contest_name: contest.contest_name,
    registration_code: contest.registration_code,
    start_time: contest.start_time,
    duration: contest.duration,
    freeze_time: contest.freeze_time,
    is_active: contest.is_active,
    is_frozen: contest.is_frozen,
    frozen_at: contest.frozen_at,
    ended_at: contest.ended_at,
    manual_control: contest.manual_control ?? null
  };
}

/**
 * Emit authentication error to socket.
 */
function emitAuthError(socket, error) {
  socket.emit('auth_error', {
    message: error.message || 'Authentication failed'
  });
}

/**
 * Recalculate authenticated connection counters.
 */
function recalculateAuthCounters() {
  let teams = 0;
  let admins = 0;

  socketRegistry.forEach((metadata) => {
    if (metadata.authenticated && metadata.type === 'team') {
      teams += 1;
    } else if (metadata.authenticated && metadata.type === 'admin') {
      admins += 1;
    }
  });

  connectionStats.teamsAuthenticated = teams;
  connectionStats.adminsAuthenticated = admins;
}

/**
 * Reset statistics counters.
 */
function resetCounters() {
  connectionStats.totalConnections = 0;
  connectionStats.activeConnections = 0;
  connectionStats.peakConnections = 0;
  connectionStats.totalMessagesSent = 0;
  connectionStats.teamsAuthenticated = 0;
  connectionStats.adminsAuthenticated = 0;
}

/**
 * Convert value to number when possible.
 */
function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getContestRoom(contestId) {
  return `contest_${contestId}`;
}

function getTeamRoom(teamId) {
  return `team_${teamId}`;
}

module.exports = {
  initialize,
  broadcastLeaderboardUpdate,
  broadcastSubmissionStatus,
  broadcastFreezeUpdate,
  broadcastUnfreezeUpdate,
  broadcastToRoom,
  sendToSocket,
  getConnectionStats
};


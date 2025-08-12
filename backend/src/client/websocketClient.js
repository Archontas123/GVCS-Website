/**
 * Phase 3.2 - Real-time Leaderboard Client-side WebSocket Integration
 * This is an example client-side service for connecting to the real-time leaderboard
 * Can be used in frontend frameworks like React, Vue, or vanilla JavaScript
 */

class LeaderboardWebSocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.currentContest = null;
    this.eventHandlers = {};
    this.leaderboardData = null;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
  }

  /**
   * Initialize WebSocket connection
   */
  connect(serverUrl = 'http://localhost:3000') {
    try {
      // Note: In a real frontend app, you'd import socket.io-client
      // const io = require('socket.io-client');
      // For this example, we assume io is available globally
      
      if (typeof io === 'undefined') {
        throw new Error('Socket.io client not loaded. Make sure to include socket.io-client in your frontend.');
      }

      this.connectionState = 'connecting';
      this.notifyHandlers('connectionStateChanged', { state: 'connecting' });

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      this.setupEventListeners();
      
      console.log('Connecting to WebSocket server...');
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.connectionState = 'error';
      this.notifyHandlers('connectionStateChanged', { state: 'error', error: error.message });
    }
  }

  /**
   * Set up WebSocket event listeners
   */
  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.connectionState = 'connected';
      this.notifyHandlers('connectionStateChanged', { state: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      this.connectionState = 'disconnected';
      this.notifyHandlers('connectionStateChanged', { state: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.connectionState = 'error';
      this.notifyHandlers('connectionStateChanged', { state: 'error', error: error.message });
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('Authenticated successfully:', data);
      this.notifyHandlers('authenticated', data);
    });

    this.socket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
      this.notifyHandlers('authError', error);
    });

    // Contest room events
    this.socket.on('joined_contest', (data) => {
      console.log('Joined contest room:', data);
      this.currentContest = data.contestId;
      this.notifyHandlers('joinedContest', data);
    });

    this.socket.on('left_contest', (data) => {
      console.log('Left contest room:', data);
      this.currentContest = null;
      this.leaderboardData = null;
      this.notifyHandlers('leftContest', data);
    });

    this.socket.on('join_error', (error) => {
      console.error('Join contest error:', error);
      this.notifyHandlers('joinError', error);
    });

    // Leaderboard events
    this.socket.on('leaderboard_update', (data) => {
      console.log('Received leaderboard update for contest', data.contestId);
      this.leaderboardData = data;
      this.notifyHandlers('leaderboardUpdate', data);
    });

    this.socket.on('leaderboard_error', (error) => {
      console.error('Leaderboard error:', error);
      this.notifyHandlers('leaderboardError', error);
    });
  }

  /**
   * Authenticate as a team
   */
  authenticateTeam(token, contestId) {
    if (!this.isConnected) {
      throw new Error('Not connected to WebSocket server');
    }

    this.socket.emit('authenticate_team', { token, contestId });
  }

  /**
   * Authenticate as an admin
   */
  authenticateAdmin(token) {
    if (!this.isConnected) {
      throw new Error('Not connected to WebSocket server');
    }

    this.socket.emit('authenticate_admin', { token });
  }

  /**
   * Join a contest room for real-time updates
   */
  joinContest(contestId) {
    if (!this.isConnected) {
      throw new Error('Not connected to WebSocket server');
    }

    this.socket.emit('join_contest', { contestId });
  }

  /**
   * Leave current contest room
   */
  leaveContest() {
    if (!this.isConnected) {
      return;
    }

    this.socket.emit('leave_contest', { contestId: this.currentContest });
  }

  /**
   * Request current leaderboard
   */
  requestLeaderboard(contestId = null) {
    if (!this.isConnected) {
      throw new Error('Not connected to WebSocket server');
    }

    const targetContest = contestId || this.currentContest;
    if (!targetContest) {
      throw new Error('No contest specified and not joined to any contest');
    }

    this.socket.emit('request_leaderboard', { contestId: targetContest });
  }

  /**
   * Add event handler
   */
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  /**
   * Notify all handlers for an event
   */
  notifyHandlers(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Get current leaderboard data
   */
  getCurrentLeaderboard() {
    return this.leaderboardData;
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      state: this.connectionState,
      currentContest: this.currentContest,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionState = 'disconnected';
      this.currentContest = null;
      this.leaderboardData = null;
      this.notifyHandlers('connectionStateChanged', { state: 'disconnected' });
      console.log('Disconnected from WebSocket server');
    }
  }

  /**
   * Auto-reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.notifyHandlers('connectionStateChanged', { 
        state: 'error', 
        error: 'Max reconnection attempts reached' 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Example usage functions for different scenarios

/**
 * Example: Team Dashboard Integration
 */
class TeamLeaderboardComponent {
  constructor(teamToken, contestId) {
    this.wsClient = new LeaderboardWebSocketClient();
    this.teamToken = teamToken;
    this.contestId = contestId;
    this.leaderboardElement = null;
    this.statusElement = null;
  }

  initialize() {
    // Set up event handlers
    this.wsClient.on('connectionStateChanged', (data) => {
      this.updateConnectionStatus(data.state);
    });

    this.wsClient.on('authenticated', (data) => {
      console.log('Team authenticated:', data.teamName);
      this.wsClient.joinContest(this.contestId);
    });

    this.wsClient.on('joinedContest', (data) => {
      console.log('Joined contest:', data.contestName);
      this.updateStatus('Connected to contest');
    });

    this.wsClient.on('leaderboardUpdate', (data) => {
      this.updateLeaderboardDisplay(data);
    });

    this.wsClient.on('authError', (error) => {
      this.updateStatus('Authentication failed: ' + error.message);
    });

    // Connect and authenticate
    this.wsClient.connect();
    
    // Wait for connection, then authenticate
    this.wsClient.on('connectionStateChanged', (data) => {
      if (data.state === 'connected') {
        this.wsClient.authenticateTeam(this.teamToken, this.contestId);
      }
    });
  }

  updateConnectionStatus(state) {
    if (this.statusElement) {
      this.statusElement.textContent = `Connection: ${state}`;
      this.statusElement.className = `status ${state}`;
    }
  }

  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }

  updateLeaderboardDisplay(data) {
    if (!this.leaderboardElement) return;

    // Clear existing content
    this.leaderboardElement.innerHTML = '';

    // Create header
    const header = document.createElement('h3');
    header.textContent = `${data.contest.name} - Leaderboard`;
    this.leaderboardElement.appendChild(header);

    // Create time remaining display
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-remaining';
    const timeString = this.formatTimeRemaining(data.contest.timeRemaining);
    timeDisplay.textContent = `Time Remaining: ${timeString}`;
    this.leaderboardElement.appendChild(timeDisplay);

    // Create leaderboard table
    const table = document.createElement('table');
    table.className = 'leaderboard-table';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Rank', 'Team', 'Solved', 'Penalty', ...data.problems.map(p => p.letter)].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    data.teams.forEach(team => {
      const row = document.createElement('tr');
      
      // Rank
      const rankCell = document.createElement('td');
      rankCell.textContent = team.rank;
      row.appendChild(rankCell);
      
      // Team name
      const nameCell = document.createElement('td');
      nameCell.textContent = team.team_name;
      row.appendChild(nameCell);
      
      // Problems solved
      const solvedCell = document.createElement('td');
      solvedCell.textContent = team.problems_solved;
      row.appendChild(solvedCell);
      
      // Penalty time
      const penaltyCell = document.createElement('td');
      penaltyCell.textContent = team.penalty_time;
      row.appendChild(penaltyCell);
      
      // Problem status
      data.problems.forEach(problem => {
        const statusCell = document.createElement('td');
        const problemStatus = team.problemStatus[problem.letter];
        
        if (problemStatus) {
          statusCell.className = `problem-status ${problemStatus.status}`;
          if (problemStatus.status === 'accepted') {
            statusCell.textContent = '✓';
          } else if (problemStatus.status === 'attempted') {
            statusCell.textContent = `✗ ${problemStatus.attempts}`;
          } else if (problemStatus.status === 'compilation_error') {
            statusCell.textContent = 'CE';
          }
        } else {
          statusCell.className = 'problem-status not-attempted';
          statusCell.textContent = '-';
        }
        
        row.appendChild(statusCell);
      });
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    this.leaderboardElement.appendChild(table);

    // Update last updated time
    const lastUpdated = document.createElement('div');
    lastUpdated.className = 'last-updated';
    lastUpdated.textContent = `Last updated: ${new Date(data.timestamp).toLocaleTimeString()}`;
    this.leaderboardElement.appendChild(lastUpdated);
  }

  formatTimeRemaining(seconds) {
    if (seconds <= 0) return 'Contest Ended';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  setLeaderboardElement(element) {
    this.leaderboardElement = element;
  }

  setStatusElement(element) {
    this.statusElement = element;
  }

  destroy() {
    this.wsClient.disconnect();
  }
}

/**
 * Example: Admin Dashboard Integration
 */
class AdminLeaderboardMonitor {
  constructor(adminToken) {
    this.wsClient = new LeaderboardWebSocketClient();
    this.adminToken = adminToken;
    this.monitoringContests = new Set();
  }

  initialize() {
    this.wsClient.on('authenticated', (data) => {
      console.log('Admin authenticated:', data.adminUsername);
    });

    this.wsClient.on('leaderboardUpdate', (data) => {
      this.handleLeaderboardUpdate(data);
    });

    this.wsClient.connect();
    
    this.wsClient.on('connectionStateChanged', (data) => {
      if (data.state === 'connected') {
        this.wsClient.authenticateAdmin(this.adminToken);
      }
    });
  }

  monitorContest(contestId) {
    this.monitoringContests.add(contestId);
    this.wsClient.joinContest(contestId);
  }

  stopMonitoring(contestId) {
    this.monitoringContests.delete(contestId);
    this.wsClient.leaveContest();
  }

  handleLeaderboardUpdate(data) {
    console.log(`Admin: Leaderboard update for contest ${data.contestId}`, {
      totalTeams: data.totalTeams,
      contestStatus: data.contest.status,
      timeRemaining: data.contest.timeRemaining
    });
    
    // Update admin dashboard display
    this.updateAdminDisplay(data);
  }

  updateAdminDisplay(data) {
    // This would integrate with your admin dashboard UI
    console.log('Admin dashboard would be updated here with:', data);
  }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    LeaderboardWebSocketClient,
    TeamLeaderboardComponent,
    AdminLeaderboardMonitor
  };
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.LeaderboardWebSocketClient = LeaderboardWebSocketClient;
  window.TeamLeaderboardComponent = TeamLeaderboardComponent;
  window.AdminLeaderboardMonitor = AdminLeaderboardMonitor;
}
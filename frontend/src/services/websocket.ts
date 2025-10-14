
import io, { Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';

// WebSocket event types
export interface WebSocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
  
  // Contest events
  contestStarted: (data: { contestId: number; startTime: string }) => void;
  contestEnded: (data: { contestId: number; endTime: string }) => void;
  contestFrozen: (data: { contestId: number; freezeTime: string }) => void;
  timeWarning: (data: { timeRemaining: number; message: string }) => void;
  
  // Leaderboard events
  leaderboardUpdate: (data: LeaderboardData) => void;
  rankingChange: (data: { teamId: number; oldRank: number; newRank: number }) => void;
  
  // Submission events
  submissionUpdate: (data: SubmissionStatusUpdate) => void;
  submissionJudged: (data: JudgedSubmission) => void;
  
  firstSolve: (data: FirstSolveNotification) => void;
  
  // System events
  systemNotification: (data: SystemNotification) => void;
  judgeStatus: (data: JudgeStatusUpdate) => void;
}

// Data types for events
export interface LeaderboardData {
  contestId: number;
  teams: LeaderboardTeam[];
  lastUpdate: string;
  isFrozen: boolean;
}

export interface LeaderboardTeam {
  teamId: number;
  teamName: string;
  rank: number;
  problemsSolved: number;
  totalPoints: number;
  lastSubmissionTime: string | null;
  problems: ProblemStatus[];
}

export interface ProblemStatus {
  problemLetter: string;
  solved: boolean;
  attempts: number;
  solveTime: number | null;
  firstToSolve: boolean;
  pointsEarned?: number;
  totalPoints?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  partialCredit?: boolean;
}

export interface SubmissionStatusUpdate {
  submissionId: number;
  teamId: number;
  problemId: number;
  status: 'pending' | 'judging' | 'judged';
  verdict?: string;
  executionTime?: number;
  memoryUsed?: number;
}

export interface JudgedSubmission {
  submissionId: number;
  teamId: number;
  problemId: number;
  status: 'judged';
  verdict: string;
  executionTime: number;
  memoryUsed: number;
  judgedAt: string;
  isAccepted: boolean;
}


export interface FirstSolveNotification {
  teamName: string;
  problemLetter: string;
  solveTime: number;
  timestamp: string;
}

export interface SystemNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  autoClose?: boolean;
}

export interface JudgeStatusUpdate {
  queueSize: number;
  averageJudgingTime: number;
  activeWorkers: number;
  lastUpdate: string;
}

// Connection status type
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// WebSocket service class
class WebSocketService {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private offlineQueue: Array<{ event: string; data: any; timestamp: number }> = [];
  private isAuthenticated = false;

  // Server URL configuration
  private readonly serverUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3000';

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Connect to WebSocket server
   */
  connect(authToken?: string): void {
    if (this.socket && this.socket.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.setConnectionStatus('connecting');
    
    try {
      this.socket = io(this.serverUrl, {
        auth: authToken ? { token: authToken } : undefined,
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        forceNew: true,
      });

      this.setupSocketEventHandlers();
      this.startHeartbeat();
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.setConnectionStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopHeartbeat();
    this.setConnectionStatus('disconnected');
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to WebSocket events
   */
  on<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue events when offline
      this.offlineQueue.push({
        event,
        data,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Join contest room for real-time updates
   */
  joinContest(contestId: number): void {
    this.emit('joinContest', { contestId });
  }

  /**
   * Leave contest room
   */
  leaveContest(contestId: number): void {
    this.emit('leaveContest', { contestId });
  }

  /**
   * Request leaderboard update
   */
  requestLeaderboardUpdate(contestId: number): void {
    this.emit('requestLeaderboard', { contestId });
  }

  /**
   * Request submission status update
   */
  requestSubmissionStatus(submissionId: number): void {
    this.emit('requestSubmissionStatus', { submissionId });
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get connection health metrics
   */
  getConnectionHealth(): {
    status: ConnectionStatus;
    lastPing: number;
    reconnectAttempts: number;
    queuedEvents: number;
    isAuthenticated: boolean;
  } {
    return {
      status: this.connectionStatus,
      lastPing: this.lastPingTime,
      reconnectAttempts: this.reconnectAttempts,
      queuedEvents: this.offlineQueue.length,
      isAuthenticated: this.isAuthenticated,
    };
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.setConnectionStatus('connected');
      this.isAuthenticated = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
      this.processOfflineQueue();
      this.emitEvent('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.setConnectionStatus('disconnected');
      this.isAuthenticated = false;
      this.emitEvent('disconnect');
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't auto-reconnect
        this.reconnectAttempts = this.maxReconnectAttempts;
      } else {
        // Client disconnect, attempt to reconnect
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.setConnectionStatus('error');
      this.emitEvent('error', error);
      this.scheduleReconnect();
    });

    // Ping/pong for connection health
    this.socket.on('pong', () => {
      this.lastPingTime = Date.now();
    });

    // Contest events
    this.socket.on('contestStarted', (data) => this.emitEvent('contestStarted', data));
    this.socket.on('contestEnded', (data) => this.emitEvent('contestEnded', data));
    this.socket.on('contestFrozen', (data) => this.emitEvent('contestFrozen', data));
    this.socket.on('timeWarning', (data) => this.emitEvent('timeWarning', data));

    // Leaderboard events
    this.socket.on('leaderboardUpdate', (data) => this.emitEvent('leaderboardUpdate', data));
    this.socket.on('rankingChange', (data) => this.emitEvent('rankingChange', data));

    // Submission events
    this.socket.on('submissionUpdate', (data) => this.emitEvent('submissionUpdate', data));
    this.socket.on('submissionJudged', (data) => this.emitEvent('submissionJudged', data));
    // Listen for actual backend events
    this.socket.on('submission_result', (data) => this.emitEvent('submissionUpdate', data));
    this.socket.on('team_submission_result', (data) => this.emitEvent('submissionUpdate', data));
    this.socket.on('verdict_update', (data) => this.emitEvent('submissionUpdate', data));
    this.socket.on('submission_status', (data) => this.emitEvent('submissionUpdate', data));

    this.socket.on('firstSolve', (data) => this.emitEvent('firstSolve', data));

    // System events
    this.socket.on('systemNotification', (data) => this.emitEvent('systemNotification', data));
    this.socket.on('judgeStatus', (data) => this.emitEvent('judgeStatus', data));
  }

  /**
   * Setup event listener cleanup
   */
  private setupEventListeners(): void {
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });

    // Handle visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab hidden, reduce activity
        this.stopHeartbeat();
      } else {
        // Tab visible again, resume activity
        if (this.socket && this.socket.connected) {
          this.startHeartbeat();
        } else if (this.connectionStatus === 'disconnected') {
          // Attempt to reconnect when tab becomes visible
          this.connect();
        }
      }
    });
  }

  /**
   * Start heartbeat to monitor connection health
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Set connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      const oldStatus = this.connectionStatus;
      this.connectionStatus = status;
      console.log(`WebSocket status changed: ${oldStatus} → ${status}`);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.setConnectionStatus('error');
      return;
    }

    this.setConnectionStatus('reconnecting');
    this.reconnectAttempts++;
    
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.connectionStatus === 'reconnecting') {
        this.connect();
      }
    }, delay);
  }

  /**
   * Process queued events when connection is restored
   */
  private processOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;

    console.log(`Processing ${this.offlineQueue.length} queued events`);
    
    // Remove events older than 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    this.offlineQueue = this.offlineQueue.filter(item => item.timestamp > fiveMinutesAgo);
    
    // Process remaining events
    this.offlineQueue.forEach(({ event, data }) => {
      if (this.socket && this.socket.connected) {
        this.socket.emit(event, data);
      }
    });
    
    this.offlineQueue = [];
  }

  /**
   * Emit event to registered handlers
   */
  private emitEvent<K extends keyof WebSocketEvents>(event: K, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as any)(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
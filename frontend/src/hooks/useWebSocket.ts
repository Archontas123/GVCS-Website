import { useEffect, useState, useCallback, useRef } from 'react';
import webSocketService, { 
  ConnectionStatus, 
  WebSocketEvents,
  LeaderboardData,
  SubmissionStatusUpdate,
  SystemNotification 
} from '../services/websocket';
import { useAuth } from './useAuth';

interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus;
  connectionHealth: {
    status: ConnectionStatus;
    lastPing: number;
    reconnectAttempts: number;
    queuedEvents: number;
    isAuthenticated: boolean;
  };
  connect: () => void;
  disconnect: () => void;
  joinContest: (contestId: number) => void;
  leaveContest: (contestId: number) => void;
  requestLeaderboardUpdate: (contestId: number) => void;
  requestSubmissionStatus: (submissionId: number) => void;
  on: <K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]) => void;
  off: <K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]) => void;
  emit: (event: string, data?: any) => void;
}

interface UseRealTimeDataReturn {
  leaderboard: LeaderboardData | null;
  lastLeaderboardUpdate: Date | null;
  submissionUpdates: SubmissionStatusUpdate[];
  notifications: SystemNotification[];
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  clearNotifications: () => void;
  markNotificationRead: (index: number) => void;
}


export const useWebSocket = (): UseWebSocketReturn => {
  const { team } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionHealth, setConnectionHealth] = useState(webSocketService.getConnectionHealth());
  const handlersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    const updateStatus = () => {
      setConnectionStatus(webSocketService.getConnectionStatus());
      setConnectionHealth(webSocketService.getConnectionHealth());
    };

    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (team && team.sessionToken) {
      if (connectionStatus === 'disconnected') {
        console.log('🔌 WebSocket auto-connecting with team token...');
        webSocketService.connect(team.sessionToken);
      }
    }
  }, [team, connectionStatus]);

  const connect = useCallback(() => {
    const token = team?.sessionToken;
    webSocketService.connect(token);
  }, [team]);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  const joinContest = useCallback((contestId: number) => {
    webSocketService.joinContest(contestId);
  }, []);

  const leaveContest = useCallback((contestId: number) => {
    webSocketService.leaveContest(contestId);
  }, []);

  const requestLeaderboardUpdate = useCallback((contestId: number) => {
    webSocketService.requestLeaderboardUpdate(contestId);
  }, []);

  const requestSubmissionStatus = useCallback((submissionId: number) => {
    webSocketService.requestSubmissionStatus(submissionId);
  }, []);

  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K, 
    handler: WebSocketEvents[K]
  ) => {
    webSocketService.on(event, handler);
    handlersRef.current.set(`${event}_${Date.now()}`, handler);
  }, []);

  const off = useCallback(<K extends keyof WebSocketEvents>(
    event: K, 
    handler: WebSocketEvents[K]
  ) => {
    webSocketService.off(event, handler);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    webSocketService.emit(event, data);
  }, []);

  useEffect(() => {
    return () => {
      handlersRef.current.forEach((handler, key) => {
        const [event] = key.split('_');
        webSocketService.off(event as keyof WebSocketEvents, handler as any);
      });
      handlersRef.current.clear();
    };
  }, []);

  return {
    connectionStatus,
    connectionHealth,
    connect,
    disconnect,
    joinContest,
    leaveContest,
    requestLeaderboardUpdate,
    requestSubmissionStatus,
    on,
    off,
    emit,
  };
};


export const useRealTimeData = (contestId?: number): UseRealTimeDataReturn => {
  const { connectionStatus, on, off, joinContest, leaveContest } = useWebSocket();
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [lastLeaderboardUpdate, setLastLeaderboardUpdate] = useState<Date | null>(null);
  const [submissionUpdates, setSubmissionUpdates] = useState<SubmissionStatusUpdate[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    if (contestId && connectionStatus === 'connected') {
      joinContest(contestId);
      return () => leaveContest(contestId);
    }
  }, [contestId, connectionStatus, joinContest, leaveContest]);

  useEffect(() => {
    const handleLeaderboardUpdate = (data: LeaderboardData) => {
      setLeaderboard(data);
      setLastLeaderboardUpdate(new Date());
    };

    const handleSubmissionUpdate = (data: SubmissionStatusUpdate) => {
      setSubmissionUpdates(prev => {
        const updated = [data, ...prev.filter(s => s.submissionId !== data.submissionId)];
        return updated.slice(0, 50);
      });
    };

    const handleSystemNotification = (data: SystemNotification) => {
      setNotifications(prev => [data, ...prev]);
      
      if (data.autoClose !== false) {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.timestamp !== data.timestamp));
        }, 5 * 60 * 1000);
      }
    };

    const handleTimeWarning = (data: { timeRemaining: number; message: string }) => {
      const notification: SystemNotification = {
        type: 'warning',
        title: 'Contest Time Warning',
        message: data.message,
        timestamp: new Date().toISOString(),
        autoClose: true,
      };
      handleSystemNotification(notification);
    };

    const handleContestStarted = (data: { contestId: number; startTime: string }) => {
      const notification: SystemNotification = {
        type: 'success',
        title: 'Contest Started!',
        message: 'The contest has officially begun. Good luck!',
        timestamp: new Date().toISOString(),
        autoClose: true,
      };
      handleSystemNotification(notification);
    };

    const handleContestEnded = (data: { contestId: number; endTime: string }) => {
      const notification: SystemNotification = {
        type: 'info',
        title: 'Contest Ended',
        message: 'The contest has ended. Thank you for participating!',
        timestamp: new Date().toISOString(),
        autoClose: false,
      };
      handleSystemNotification(notification);
    };

    const handleContestFrozen = (data: { contestId: number; freezeTime: string }) => {
      const notification: SystemNotification = {
        type: 'info',
        title: 'Leaderboard Frozen',
        message: 'The leaderboard has been frozen. Final rankings will be revealed after the contest.',
        timestamp: new Date().toISOString(),
        autoClose: false,
      };
      handleSystemNotification(notification);
    };


    on('leaderboardUpdate', handleLeaderboardUpdate);
    on('submissionUpdate', handleSubmissionUpdate);
    on('systemNotification', handleSystemNotification);
    on('timeWarning', handleTimeWarning);
    on('contestStarted', handleContestStarted);
    on('contestEnded', handleContestEnded);
    on('contestFrozen', handleContestFrozen);

    return () => {
      off('leaderboardUpdate', handleLeaderboardUpdate);
      off('submissionUpdate', handleSubmissionUpdate);
      off('systemNotification', handleSystemNotification);
      off('timeWarning', handleTimeWarning);
      off('contestStarted', handleContestStarted);
      off('contestEnded', handleContestEnded);
      off('contestFrozen', handleContestFrozen);
    };
  }, [on, off]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markNotificationRead = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    leaderboard,
    lastLeaderboardUpdate,
    submissionUpdates,
    notifications,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    clearNotifications,
    markNotificationRead,
  };
};

export const useSubmissionTracking = (submissionIds: number[]) => {
  const { on, off, requestSubmissionStatus } = useWebSocket();
  const [submissionStatuses, setSubmissionStatuses] = useState<Map<number, SubmissionStatusUpdate>>(new Map());

  useEffect(() => {
    const handleSubmissionUpdate = (data: SubmissionStatusUpdate) => {
      if (submissionIds.includes(data.submissionId)) {
        setSubmissionStatuses(prev => new Map(prev.set(data.submissionId, data)));
      }
    };

    on('submissionUpdate', handleSubmissionUpdate);
    on('submissionJudged', handleSubmissionUpdate);

    submissionIds.forEach(id => requestSubmissionStatus(id));

    return () => {
      off('submissionUpdate', handleSubmissionUpdate);
      off('submissionJudged', handleSubmissionUpdate);
    };
  }, [submissionIds, on, off, requestSubmissionStatus]);

  return submissionStatuses;
};
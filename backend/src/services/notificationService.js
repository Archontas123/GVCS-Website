class NotificationService {
  /**
   * Initialize notification service with empty WebSocket reference
   */
  constructor() {
    this.io = null;
  }

  /**
   * Initialize with Socket.IO instance for WebSocket communication
   * @param {Object} io - Socket.IO server instance
   */
  initialize(io) {
    this.io = io;
  }

  /**
   * Notify all teams in a contest about contest status change
   * @param {number} contestId - Contest ID
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data to broadcast
   */
  notifyContestUpdate(contestId, eventType, data) {
    if (!this.io) {
      console.warn('WebSocket not initialized, skipping notification');
      return;
    }

    const roomName = `contest_${contestId}`;
    
    this.io.to(roomName).emit('contest_update', {
      type: eventType,
      contestId,
      data,
      timestamp: new Date().toISOString()
    });

    console.log(`Notified teams in contest ${contestId} about ${eventType}`);
  }

  /**
   * Notify specific team about an event
   */
  notifyTeam(teamId, eventType, data) {
    if (!this.io) {
      console.warn('WebSocket not initialized, skipping notification');
      return;
    }

    const roomName = `team_${teamId}`;
    
    this.io.to(roomName).emit('team_notification', {
      type: eventType,
      teamId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify about contest start
   */
  notifyContestStart(contestId, contestData) {
    this.notifyContestUpdate(contestId, 'contest_started', {
      contest_name: contestData.contest_name,
      start_time: contestData.start_time,
      duration: contestData.duration
    });
  }

  /**
   * Notify about contest freeze
   */
  notifyContestFreeze(contestId, contestData) {
    this.notifyContestUpdate(contestId, 'contest_frozen', {
      contest_name: contestData.contest_name,
      frozen_at: contestData.frozen_at
    });
  }

  /**
   * Notify about contest end
   */
  notifyContestEnd(contestId, contestData) {
    this.notifyContestUpdate(contestId, 'contest_ended', {
      contest_name: contestData.contest_name,
      final_duration: contestData.duration
    });
  }

  /**
   * Broadcast system-wide notification
   */
  broadcastSystemNotification(eventType, data) {
    if (!this.io) {
      console.warn('WebSocket not initialized, skipping notification');
      return;
    }

    this.io.emit('system_notification', {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
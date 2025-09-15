const { db } = require('../utils/db');
const logger = require('../utils/logger');
const websocketService = require('./websocketService');
const crypto = require('crypto');

class TeamCollaborationService {
  constructor() {
    this.activeRooms = new Map();
    this.codeSnippets = new Map();
    this.collaborativeSessions = new Map();
  }

  /**
   * Create team chat room
   */
  async createTeamChatRoom(contestId, teamId, settings = {}) {
    try {
      const roomData = {
        contest_id: contestId,
        team_id: teamId,
        room_name: settings.room_name || 'Team Chat',
        room_type: 'team_private',
        settings: JSON.stringify({
          max_participants: settings.max_participants || 10,
          allow_file_sharing: settings.allow_file_sharing !== false,
          allow_code_sharing: settings.allow_code_sharing !== false,
          message_history_limit: settings.message_history_limit || 1000,
          auto_delete_after: settings.auto_delete_after || null
        }),
        created_at: new Date().toISOString(),
        is_active: true
      };

      const result = await db('chat_rooms').insert(roomData).returning('*');
      const chatRoom = result[0];

      // Create room in active rooms map
      this.activeRooms.set(chatRoom.id, {
        ...chatRoom,
        participants: new Set(),
        messageQueue: []
      });

      logger.info('Team chat room created:', {
        roomId: chatRoom.id,
        contestId,
        teamId
      });

      return chatRoom;
    } catch (error) {
      logger.error('Error creating team chat room:', error);
      throw error;
    }
  }

  /**
   * Join team chat room
   */
  async joinChatRoom(roomId, userId, userType = 'team_member') {
    try {
      // Verify user can access this room
      const room = await this.getChatRoom(roomId);
      if (!room) {
        throw new Error('Chat room not found');
      }

      // Check if user is team member
      if (userType === 'team_member') {
        const teamMember = await db('team_members')
          .where({ team_id: room.team_id, user_id: userId })
          .first();

        if (!teamMember) {
          throw new Error('User is not a team member');
        }
      }

      // Add participant to room
      const participantData = {
        room_id: roomId,
        user_id: userId,
        user_type: userType,
        joined_at: new Date().toISOString(),
        is_active: true
      };

      await db('chat_participants').insert(participantData).on('conflict', ['room_id', 'user_id']).merge({
        is_active: true,
        last_active: new Date().toISOString()
      });

      // Update active rooms
      const activeRoom = this.activeRooms.get(roomId);
      if (activeRoom) {
        activeRoom.participants.add(userId);
      }

      // Notify other participants
      websocketService.broadcastToRoom(`chat_${roomId}`, {
        type: 'user_joined',
        user_id: userId,
        timestamp: new Date().toISOString()
      });

      logger.info('User joined chat room:', { roomId, userId });
      return true;
    } catch (error) {
      logger.error('Error joining chat room:', error);
      throw error;
    }
  }

  /**
   * Send chat message
   */
  async sendMessage(roomId, senderId, message, messageType = 'text') {
    try {
      // Validate user is in room
      const participant = await db('chat_participants')
        .where({ room_id: roomId, user_id: senderId, is_active: true })
        .first();

      if (!participant) {
        throw new Error('User is not in this chat room');
      }

      const messageData = {
        room_id: roomId,
        sender_id: senderId,
        message_type: messageType,
        content: message.content,
        metadata: JSON.stringify(message.metadata || {}),
        sent_at: new Date().toISOString(),
        is_deleted: false
      };

      const result = await db('chat_messages').insert(messageData).returning('*');
      const chatMessage = result[0];

      // Update room last activity
      await db('chat_rooms')
        .where({ id: roomId })
        .update({ last_activity: new Date().toISOString() });

      // Broadcast message to room participants
      const messagePayload = {
        type: 'chat_message',
        message: {
          id: chatMessage.id,
          sender_id: senderId,
          message_type: messageType,
          content: message.content,
          metadata: message.metadata,
          sent_at: chatMessage.sent_at
        }
      };

      websocketService.broadcastToRoom(`chat_${roomId}`, messagePayload);

      // Handle special message types
      if (messageType === 'code_snippet') {
        await this.handleCodeSnippet(roomId, chatMessage.id, message.metadata);
      } else if (messageType === 'file_share') {
        await this.handleFileShare(roomId, chatMessage.id, message.metadata);
      }

      logger.info('Chat message sent:', {
        roomId,
        messageId: chatMessage.id,
        senderId,
        messageType
      });

      return chatMessage;
    } catch (error) {
      logger.error('Error sending chat message:', error);
      throw error;
    }
  }

  /**
   * Share code snippet
   */
  async shareCodeSnippet(roomId, senderId, codeData) {
    try {
      const snippetId = crypto.randomUUID();
      const snippet = {
        id: snippetId,
        room_id: roomId,
        shared_by: senderId,
        title: codeData.title || 'Code Snippet',
        language: codeData.language || 'text',
        code: codeData.code,
        description: codeData.description || '',
        is_public: codeData.is_public || false,
        created_at: new Date().toISOString()
      };

      // Store snippet
      await db('code_snippets').insert(snippet);
      this.codeSnippets.set(snippetId, snippet);

      // Send as chat message
      const message = {
        content: `Shared code snippet: ${snippet.title}`,
        metadata: {
          snippet_id: snippetId,
          language: snippet.language,
          title: snippet.title,
          preview: snippet.code.substring(0, 200)
        }
      };

      await this.sendMessage(roomId, senderId, message, 'code_snippet');

      logger.info('Code snippet shared:', { snippetId, roomId, senderId });
      return snippet;
    } catch (error) {
      logger.error('Error sharing code snippet:', error);
      throw error;
    }
  }

  /**
   * Start collaborative coding session
   */
  async startCollaborativeSession(roomId, initiatorId, sessionData) {
    try {
      const sessionId = crypto.randomUUID();
      const session = {
        id: sessionId,
        room_id: roomId,
        initiator_id: initiatorId,
        title: sessionData.title || 'Collaborative Coding',
        language: sessionData.language || 'cpp',
        initial_code: sessionData.initial_code || '',
        current_code: sessionData.initial_code || '',
        settings: JSON.stringify({
          max_participants: sessionData.max_participants || 5,
          allow_execution: sessionData.allow_execution !== false,
          auto_save_interval: sessionData.auto_save_interval || 30
        }),
        created_at: new Date().toISOString(),
        is_active: true
      };

      await db('collaborative_sessions').insert(session);
      this.collaborativeSessions.set(sessionId, {
        ...session,
        participants: new Set([initiatorId]),
        codeHistory: [],
        cursors: new Map()
      });

      // Notify room participants
      const message = {
        content: `Started collaborative coding session: ${session.title}`,
        metadata: {
          session_id: sessionId,
          language: session.language,
          title: session.title
        }
      };

      await this.sendMessage(roomId, initiatorId, message, 'collaboration_start');

      logger.info('Collaborative session started:', { sessionId, roomId, initiatorId });
      return session;
    } catch (error) {
      logger.error('Error starting collaborative session:', error);
      throw error;
    }
  }

  /**
   * Join collaborative session
   */
  async joinCollaborativeSession(sessionId, userId) {
    try {
      const session = this.collaborativeSessions.get(sessionId);
      if (!session || !session.is_active) {
        throw new Error('Collaborative session not found or inactive');
      }

      // Add participant
      session.participants.add(userId);

      // Add participant to database
      await db('collaboration_participants').insert({
        session_id: sessionId,
        user_id: userId,
        joined_at: new Date().toISOString(),
        is_active: true
      }).on('conflict', ['session_id', 'user_id']).merge({
        is_active: true,
        last_active: new Date().toISOString()
      });

      // Notify other participants
      websocketService.broadcastToRoom(`collaboration_${sessionId}`, {
        type: 'participant_joined',
        user_id: userId,
        current_code: session.current_code,
        timestamp: new Date().toISOString()
      });

      logger.info('User joined collaborative session:', { sessionId, userId });
      return session;
    } catch (error) {
      logger.error('Error joining collaborative session:', error);
      throw error;
    }
  }

  /**
   * Update collaborative code
   */
  async updateCollaborativeCode(sessionId, userId, changes) {
    try {
      const session = this.collaborativeSessions.get(sessionId);
      if (!session || !session.participants.has(userId)) {
        throw new Error('User not in collaborative session');
      }

      // Apply changes to current code
      const newCode = this.applyCodeChanges(session.current_code, changes);
      session.current_code = newCode;

      // Add to history
      session.codeHistory.push({
        user_id: userId,
        changes: changes,
        timestamp: new Date().toISOString(),
        resulting_code: newCode
      });

      // Update database
      await db('collaborative_sessions')
        .where({ id: sessionId })
        .update({
          current_code: newCode,
          last_modified: new Date().toISOString(),
          last_modified_by: userId
        });

      // Broadcast changes to other participants
      websocketService.broadcastToRoom(`collaboration_${sessionId}`, {
        type: 'code_change',
        user_id: userId,
        changes: changes,
        new_code: newCode,
        timestamp: new Date().toISOString()
      }, [userId]); // Exclude the sender

      return { success: true, new_code: newCode };
    } catch (error) {
      logger.error('Error updating collaborative code:', error);
      throw error;
    }
  }

  /**
   * Update cursor position in collaborative session
   */
  async updateCursorPosition(sessionId, userId, position) {
    try {
      const session = this.collaborativeSessions.get(sessionId);
      if (!session || !session.participants.has(userId)) {
        throw new Error('User not in collaborative session');
      }

      // Update cursor position
      session.cursors.set(userId, {
        line: position.line,
        column: position.column,
        timestamp: Date.now()
      });

      // Broadcast cursor position
      websocketService.broadcastToRoom(`collaboration_${sessionId}`, {
        type: 'cursor_update',
        user_id: userId,
        position: position,
        timestamp: new Date().toISOString()
      }, [userId]);

      return true;
    } catch (error) {
      logger.error('Error updating cursor position:', error);
      throw error;
    }
  }

  /**
   * Get chat room messages
   */
  async getChatMessages(roomId, userId, limit = 50, offset = 0) {
    try {
      // Verify user has access to room
      const participant = await db('chat_participants')
        .where({ room_id: roomId, user_id: userId })
        .first();

      if (!participant) {
        throw new Error('User does not have access to this room');
      }

      const messages = await db('chat_messages')
        .where({ room_id: roomId, is_deleted: false })
        .orderBy('sent_at', 'desc')
        .limit(limit)
        .offset(offset)
        .select('*');

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Error getting chat messages:', error);
      throw error;
    }
  }

  /**
   * Get team's chat rooms
   */
  async getTeamChatRooms(teamId) {
    try {
      const rooms = await db('chat_rooms')
        .where({ team_id: teamId, is_active: true })
        .select('*');

      return rooms;
    } catch (error) {
      logger.error('Error getting team chat rooms:', error);
      throw error;
    }
  }

  /**
   * Get code snippets for room
   */
  async getCodeSnippets(roomId, userId) {
    try {
      // Verify user has access to room
      const participant = await db('chat_participants')
        .where({ room_id: roomId, user_id: userId })
        .first();

      if (!participant) {
        throw new Error('User does not have access to this room');
      }

      const snippets = await db('code_snippets')
        .where({ room_id: roomId })
        .orderBy('created_at', 'desc')
        .select('*');

      return snippets;
    } catch (error) {
      logger.error('Error getting code snippets:', error);
      throw error;
    }
  }

  /**
   * Get collaborative sessions for room
   */
  async getCollaborativeSessions(roomId) {
    try {
      const sessions = await db('collaborative_sessions')
        .where({ room_id: roomId })
        .orderBy('created_at', 'desc')
        .select('*');

      return sessions;
    } catch (error) {
      logger.error('Error getting collaborative sessions:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  async getChatRoom(roomId) {
    try {
      return await db('chat_rooms').where({ id: roomId }).first();
    } catch (error) {
      logger.error('Error getting chat room:', error);
      return null;
    }
  }

  async handleCodeSnippet(roomId, messageId, metadata) {
    try {
      // Additional processing for code snippets
      if (metadata.snippet_id) {
        await db('chat_messages')
          .where({ id: messageId })
          .update({
            metadata: JSON.stringify({
              ...metadata,
              processed: true,
              processed_at: new Date().toISOString()
            })
          });
      }
    } catch (error) {
      logger.error('Error handling code snippet:', error);
    }
  }

  async handleFileShare(roomId, messageId, metadata) {
    try {
      // Additional processing for file shares
      if (metadata.file_id) {
        await db('shared_files').insert({
          room_id: roomId,
          message_id: messageId,
          file_id: metadata.file_id,
          file_name: metadata.file_name,
          file_size: metadata.file_size,
          mime_type: metadata.mime_type,
          shared_at: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error handling file share:', error);
    }
  }

  applyCodeChanges(currentCode, changes) {
    // Simple implementation - in production, use operational transform
    if (changes.type === 'replace') {
      return changes.newContent;
    } else if (changes.type === 'insert') {
      const lines = currentCode.split('\n');
      lines.splice(changes.line, 0, changes.content);
      return lines.join('\n');
    } else if (changes.type === 'delete') {
      const lines = currentCode.split('\n');
      lines.splice(changes.line, changes.count || 1);
      return lines.join('\n');
    }
    
    return currentCode;
  }

  /**
   * Create team workspace
   */
  async createTeamWorkspace(contestId, teamId, settings = {}) {
    try {
      const workspaceData = {
        contest_id: contestId,
        team_id: teamId,
        name: settings.name || 'Team Workspace',
        description: settings.description || '',
        settings: JSON.stringify({
          allow_external_tools: settings.allow_external_tools || false,
          shared_editor: settings.shared_editor !== false,
          voice_chat: settings.voice_chat || false,
          screen_sharing: settings.screen_sharing || false
        }),
        created_at: new Date().toISOString(),
        is_active: true
      };

      const result = await db('team_workspaces').insert(workspaceData).returning('*');
      const workspace = result[0];

      // Create default chat room for workspace
      await this.createTeamChatRoom(contestId, teamId, {
        room_name: 'Workspace Chat',
        workspace_id: workspace.id
      });

      logger.info('Team workspace created:', {
        workspaceId: workspace.id,
        contestId,
        teamId
      });

      return workspace;
    } catch (error) {
      logger.error('Error creating team workspace:', error);
      throw error;
    }
  }

  /**
   * Cleanup inactive sessions and rooms
   */
  async cleanupInactiveSessions() {
    try {
      const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      // Cleanup collaborative sessions
      const inactiveSessions = await db('collaborative_sessions')
        .where('last_modified', '<', cutoffTime.toISOString())
        .where('is_active', true)
        .update({ is_active: false });

      // Cleanup active sessions map
      for (const [sessionId, session] of this.collaborativeSessions.entries()) {
        if (new Date(session.last_modified || session.created_at) < cutoffTime) {
          this.collaborativeSessions.delete(sessionId);
        }
      }

      logger.info(`Cleaned up ${inactiveSessions} inactive collaborative sessions`);
    } catch (error) {
      logger.error('Error cleaning up inactive sessions:', error);
    }
  }
}

module.exports = new TeamCollaborationService();
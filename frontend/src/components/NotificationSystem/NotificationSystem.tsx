/**
 * CS Club Hackathon Platform - Notification System Component
 * Phase 5.5: Real-time contest notifications and alerts
 */

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRealTimeData } from '../../hooks/useWebSocket';
import { SystemNotification } from '../../services/websocket';

interface NotificationSystemProps {
  contestId?: number;
  showInDrawer?: boolean;
  soundEnabled?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  autoHideDuration?: number;
}

interface NotificationState {
  id: string;
  notification: SystemNotification;
  isVisible: boolean;
  isPersistent: boolean;
  hasBeenSeen: boolean;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  contestId,
  showInDrawer = false,
  soundEnabled = true,
  position = 'top-right',
  maxVisible = 3,
  autoHideDuration = 6000,
}) => {
  const { notifications, clearNotifications, markNotificationRead } = useRealTimeData(contestId);
  
  const [notificationStates, setNotificationStates] = useState<NotificationState[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(!soundEnabled);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Process new notifications
  useEffect(() => {
    notifications.forEach(notification => {
      const existingState = notificationStates.find(state => 
        state.notification.timestamp === notification.timestamp
      );
      
      if (!existingState) {
        const newState: NotificationState = {
          id: `notification-${Date.now()}-${Math.random()}`,
          notification,
          isVisible: true,
          isPersistent: notification.autoClose === false,
          hasBeenSeen: false,
        };
        
        setNotificationStates(prev => [newState, ...prev]);
        
        // Play sound for important notifications
        if (!soundMuted && (notification.type === 'warning' || notification.type === 'error')) {
          playNotificationSound(notification.type);
        }
        
        // Auto-hide non-persistent notifications
        if (!newState.isPersistent) {
          setTimeout(() => {
            setNotificationStates(prev => 
              prev.map(state => 
                state.id === newState.id 
                  ? { ...state, isVisible: false }
                  : state
              )
            );
            
            // Remove completely after animation
            setTimeout(() => {
              setNotificationStates(prev => 
                prev.filter(state => state.id !== newState.id)
              );
            }, 300);
          }, autoHideDuration);
        }
      }
    });
  }, [notifications, notificationStates, soundMuted, autoHideDuration]);

  // Update unread count
  useEffect(() => {
    const unread = notificationStates.filter(state => !state.hasBeenSeen).length;
    setUnreadCount(unread);
  }, [notificationStates]);

  // Play notification sound
  const playNotificationSound = (type: string) => {
    try {
      const audio = new Audio();
      // Different sounds for different notification types
      switch (type) {
        case 'error':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBjq...'; // Simplified error sound
          break;
        case 'warning':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBjq...'; // Simplified warning sound
          break;
        case 'success':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBjq...'; // Simplified success sound
          break;
        default:
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBjq...'; // Simplified default sound
      }
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (e.g., user hasn't interacted with page yet)
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '!';
      case 'error':
        return '!';
      case 'info':
      default:
        return 'i';
    }
  };

  // Get notification severity
  const getNotificationSeverity = (type: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
      default:
        return 'info';
    }
  };

  // Handle notification close
  const handleCloseNotification = (notificationId: string) => {
    setNotificationStates(prev => 
      prev.map(state => 
        state.id === notificationId 
          ? { ...state, isVisible: false }
          : state
      )
    );
    
    setTimeout(() => {
      setNotificationStates(prev => 
        prev.filter(state => state.id !== notificationId)
      );
    }, 300);
  };

  // Mark notification as seen
  const markAsSeen = (notificationId: string) => {
    setNotificationStates(prev => 
      prev.map(state => 
        state.id === notificationId 
          ? { ...state, hasBeenSeen: true }
          : state
      )
    );
  };

  // Get visible notifications for display
  const visibleNotifications = notificationStates
    .filter(state => state.isVisible)
    .slice(0, maxVisible);

  // Get position styles
  const getPositionStyles = () => {
    const base = { position: 'fixed', zIndex: 1400 };
    switch (position) {
      case 'top-right':
        return { ...base, top: 24, right: 24 };
      case 'top-left':
        return { ...base, top: 24, left: 24 };
      case 'bottom-right':
        return { ...base, bottom: 24, right: 24 };
      case 'bottom-left':
        return { ...base, bottom: 24, left: 24 };
      default:
        return { ...base, top: 24, right: 24 };
    }
  };

  return (
    <div>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setDrawerOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          marginRight: '8px',
          position: 'relative',
          padding: '8px',
          fontSize: '20px'
        }}
      >
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '16px'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {unreadCount > 0 ? '🔔' : '🔕'}
      </button>

      {/* Floating Notifications */}
      {!showInDrawer && (
        <div style={getPositionStyles()}>
          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '8px' }}>
            {visibleNotifications.map((notificationState, index) => {
              const severity = getNotificationSeverity(notificationState.notification.type);
              const alertColors = {
                success: { bg: '#dcfce7', border: '#bbf7d0', text: '#166534' },
                warning: { bg: '#fef3c7', border: '#fed7aa', text: '#d97706' },
                error: { bg: '#fecaca', border: '#fca5a5', text: '#dc2626' },
                info: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' }
              };
              const colors = alertColors[severity];
              
              return (
                <div
                  key={notificationState.id}
                  style={{
                    minWidth: '300px',
                    maxWidth: '400px',
                    opacity: notificationState.hasBeenSeen ? 0.8 : 1,
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    transform: notificationState.isVisible ? 'translateX(0)' : 
                      (position.includes('right') ? 'translateX(100%)' : 'translateX(-100%)'),
                    transition: 'all 0.3s ease',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={() => markAsSeen(notificationState.id)}
                >
                  <div style={{
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px',
                    position: 'relative'
                  }}>
                    <button
                      onClick={() => handleCloseNotification(notificationState.id)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        fontSize: '16px',
                        cursor: 'pointer',
                        color: colors.text
                      }}
                    >
                      ×
                    </button>
                    <div style={{ marginRight: '24px' }}>
                      <div style={{ fontWeight: 600, color: colors.text, marginBottom: '4px' }}>
                        {notificationState.notification.title}
                      </div>
                      <div style={{ fontSize: '14px', color: colors.text, marginBottom: '8px' }}>
                        {notificationState.notification.message}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.text, opacity: 0.7 }}>
                        {formatDistanceToNow(new Date(notificationState.notification.timestamp))} ago
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notification Drawer */}
      {drawerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '90vw',
          backgroundColor: 'white',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: -1
          }} onClick={() => setDrawerOpen(false)} />
          
          <div style={{
            padding: '16px',
            backgroundColor: '#3b82f6',
            color: 'white'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                fontWeight: 600
              }}>
                <span style={{ fontSize: '20px' }}>🔔</span>
                Notifications
                {unreadCount > 0 && (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSoundMuted(!soundMuted)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px'
                  }}
                >
                  {soundMuted ? '🔇' : '🔊'}
                </button>
                
                <button
                  onClick={() => setSettingsOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px'
                  }}
                >
                  ⚙
                </button>
                
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '20px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {notificationStates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}>🔔</div>
                <div style={{ color: '#6b7280' }}>
                  No notifications yet
                </div>
              </div>
            ) : (
              <div>
                {notificationStates.map((notificationState, index) => (
                  <div key={notificationState.id}>
                    <div
                      style={{
                        backgroundColor: notificationState.hasBeenSeen ? 'transparent' : '#f3f4f6',
                        opacity: notificationState.isVisible ? 1 : 0.5,
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}
                      onMouseEnter={() => markAsSeen(notificationState.id)}
                    >
                      <div style={{
                        color: notificationState.notification.type === 'success' ? '#10b981' :
                              notificationState.notification.type === 'warning' ? '#f59e0b' :
                              notificationState.notification.type === 'error' ? '#ef4444' : '#3b82f6',
                        fontSize: '20px'
                      }}>
                        {getNotificationIcon(notificationState.notification.type)}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                          {notificationState.notification.title}
                        </div>
                        <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                          {notificationState.notification.message}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {formatDistanceToNow(new Date(notificationState.notification.timestamp))} ago
                        </div>
                      </div>
                      
                      {!notificationState.hasBeenSeen && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#3b82f6',
                          borderRadius: '50%',
                          marginTop: '4px'
                        }} />
                      )}
                    </div>
                    
                    {index < notificationStates.length - 1 && (
                      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {notificationStates.length > 0 && (
            <div style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => {
                  setNotificationStates([]);
                  clearNotifications();
                }}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151'
                }}
              >
                Clear All Notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Dialog */}
      {settingsOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            padding: '24px'
          }}>
            <div style={{
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '16px',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0 }}>Notification Settings</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>Sound Notifications</div>
                <button
                  onClick={() => setSoundMuted(!soundMuted)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {soundMuted ? '🔇' : '🔊'}
                </button>
              </div>
              
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Configure notification preferences for different types of contest events:
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span style={{ fontSize: '14px' }}>Contest events (start, end, freeze)</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#f59e0b' }}>!</span>
                <span style={{ fontSize: '14px' }}>Time warnings (30 min, 5 min)</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3b82f6' }}>🏆</span>
                <span style={{ fontSize: '14px' }}>Contest achievements and milestones</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ef4444' }}>!</span>
                <span style={{ fontSize: '14px' }}>System errors and issues</span>
              </div>
            </div>
            
            <div style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '16px',
              marginTop: '24px',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;
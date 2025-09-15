/**
 * CS Club Hackathon Platform - Connection Status Component
 * Phase 5.5: Real-time Connection Health Display
 */

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '../../hooks/useWebSocket';
import { MdCheck, MdClose, MdSync, MdError, MdRefresh, MdExpandMore, MdExpandLess, MdQuestionMark, MdInfo } from 'react-icons/md';

interface ConnectionStatusProps {
  compact?: boolean;
  showDetails?: boolean;
  onReconnect?: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  compact = false,
  showDetails = false,
  onReconnect,
}) => {
  const { connectionStatus, connectionHealth, connect, disconnect } = useWebSocket();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Get status display info
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <MdCheck />,
          color: '#22c55e',
          text: 'Connected',
          description: 'Real-time updates active',
        };
      case 'connecting':
        return {
          icon: <MdSync />,
          color: '#3b82f6',
          text: 'Connecting',
          description: 'Establishing connection...',
        };
      case 'reconnecting':
        return {
          icon: <MdSync />,
          color: '#f59e0b',
          text: 'Reconnecting',
          description: `Attempt ${connectionHealth.reconnectAttempts}`,
        };
      case 'disconnected':
        return {
          icon: <MdClose />,
          color: '#6b7280',
          text: 'Disconnected',
          description: 'No real-time updates',
        };
      case 'error':
        return {
          icon: <MdError />,
          color: '#ef4444',
          text: 'Connection Error',
          description: 'Failed to connect',
        };
      default:
        return {
          icon: <MdQuestionMark />,
          color: '#6b7280',
          text: 'Unknown',
          description: 'Unknown status',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const lastPingTime = connectionHealth.lastPing > 0 ? new Date(connectionHealth.lastPing) : null;

  // Handle reconnection
  const handleReconnect = () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      connect();
    }
    if (onReconnect) {
      onReconnect();
    }
  };

  // Compact display
  if (compact) {
    return (
      <div title={`${statusInfo.text} - ${statusInfo.description}`}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm cursor-pointer"
          style={{ backgroundColor: statusInfo.color }}
          onClick={() => setDetailsOpen(true)}
        >
          <span className="text-base">{statusInfo.icon}</span>
          <span>{statusInfo.text}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Status Display */}
      <div
        className="p-4 border-2 rounded-lg"
        style={{ borderColor: statusInfo.color }}
      >
        <div className="flex items-center gap-4">
          <div className="text-xl" style={{ color: statusInfo.color }}>
            {statusInfo.icon}
          </div>
          
          <div className="flex-1">
            <div className="font-semibold text-sm">
              {statusInfo.text}
            </div>
            <div className="text-xs text-gray-500">
              {statusInfo.description}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
              <button
                title="Reconnect"
                className="p-1 rounded hover:bg-gray-100 text-blue-600"
                onClick={handleReconnect}
              >
                <MdRefresh className="w-5 h-5" />
              </button>
            )}
            
            {showDetails && (
              <button
                title="Connection Details"
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <MdExpandLess className="w-5 h-5" /> : <MdExpandMore className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Connection Progress for connecting/reconnecting states */}
        {(connectionStatus === 'connecting' || connectionStatus === 'reconnecting') && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {showDetails && expanded && (
          <div className="mt-4 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">
                  Status
                </div>
                <div className="text-sm font-medium">
                  {connectionHealth.status}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500">
                  Authenticated
                </div>
                <div className="text-sm font-medium">
                  {connectionHealth.isAuthenticated ? 'Yes' : 'No'}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500">
                  Reconnect Attempts
                </div>
                <div className="text-sm font-medium">
                  {connectionHealth.reconnectAttempts}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500">
                  Queued Events
                </div>
                <div className="text-sm font-medium">
                  {connectionHealth.queuedEvents}
                </div>
              </div>
              
              {lastPingTime && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">
                    Last Ping
                  </div>
                  <div className="text-sm font-medium">
                    {formatDistanceToNow(lastPingTime)} ago
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alerts for various states */}
      {connectionStatus === 'error' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MdError className="text-red-600" />
            <span className="text-red-800 text-sm">Connection failed. Real-time updates are disabled.</span>
          </div>
          <button
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            onClick={handleReconnect}
          >
            Retry
          </button>
        </div>
      )}

      {connectionStatus === 'disconnected' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MdClose className="text-yellow-600" />
            <span className="text-yellow-800 text-sm">Not connected. Click to enable real-time updates.</span>
          </div>
          <button
            className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
            onClick={handleReconnect}
          >
            Connect
          </button>
        </div>
      )}

      {connectionHealth.queuedEvents > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <MdInfo className="text-blue-600" />
          <span className="text-blue-800 text-sm">
            {connectionHealth.queuedEvents} events queued for when connection is restored.
          </span>
        </div>
      )}

      {/* Detailed Connection Dialog */}
      {detailsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center gap-2">
              <div className="text-xl" style={{ color: statusInfo.color }}>
                {statusInfo.icon}
              </div>
              <h2 className="text-lg font-semibold">Connection Status</h2>
              <button
                className="ml-auto p-1 hover:bg-gray-100 rounded"
                onClick={() => setDetailsOpen(false)}
              >
                <MdClose />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              <div className="p-4 bg-gray-50 border rounded-lg">
                <h3 className="text-base font-semibold mb-4">Current Status</h3>
                <div className="flex items-center gap-4">
                  <div className="text-xl" style={{ color: statusInfo.color }}>
                    {statusInfo.icon}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {statusInfo.text}
                    </div>
                    <div className="text-sm text-gray-600">
                      {statusInfo.description}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Authentication</h4>
                  <div className="flex items-center gap-1">
                    {connectionHealth.isAuthenticated ? (
                      <><MdCheck className="text-green-600" /> <span>Authenticated</span></>
                    ) : (
                      <><MdClose className="text-red-600" /> <span>Not Authenticated</span></>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Reconnection Attempts</h4>
                  <div>{connectionHealth.reconnectAttempts} / 5</div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Queued Events</h4>
                  <div>{connectionHealth.queuedEvents} pending</div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Connection Health</h4>
                  <div>
                    {lastPingTime ? 
                      `Last ping: ${formatDistanceToNow(lastPingTime)} ago` :
                      'No ping data'
                    }
                  </div>
                </div>
              </div>

              {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                <button
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  onClick={handleReconnect}
                >
                  <MdRefresh /> Reconnect Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
import React, { useState, useEffect } from 'react';
import { 
  MdStorage, 
  MdBarChart, 
  MdTrendingUp,
  MdRefresh,
  MdSettings,
  MdWarning,
  MdCheckCircle,
  MdError,
  MdInfo,
  MdDownload,
  MdFilterList
} from 'react-icons/md';

interface SystemMetrics {
  cpu: {
    usage_percent: number;
    load_average: number[];
    cores: number;
  };
  memory: {
    total_mb: number;
    used_mb: number;
    free_mb: number;
    usage_percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    usage_percent: number;
  };
  network: {
    bytes_sent: number;
    bytes_received: number;
    connections_active: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
  };
  uptime_seconds: number;
}

interface QueueStatus {
  name: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  workers_active: number;
  workers_total: number;
  avg_processing_time_seconds: number;
}

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  service: string;
  message: string;
  details?: any;
}

interface DatabaseStatus {
  status: 'connected' | 'disconnected' | 'slow';
  connections_active: number;
  connections_max: number;
  response_time_ms: number;
  queries_per_second: number;
}

const SystemMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: { usage_percent: 0, load_average: [0, 0, 0], cores: 0 },
    memory: { total_mb: 0, used_mb: 0, free_mb: 0, usage_percent: 0 },
    disk: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0 },
    network: { bytes_sent: 0, bytes_received: 0, connections_active: 0 },
    processes: { total: 0, running: 0, sleeping: 0 },
    uptime_seconds: 0
  });

  const [queueStatus, setQueueStatus] = useState<QueueStatus[]>([]);

  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({
    status: 'disconnected',
    connections_active: 0,
    connections_max: 0,
    response_time_ms: 0,
    queries_per_second: 0
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [selectedTab, setSelectedTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  useEffect(() => {
    fetchMetrics();
    fetchLogs();
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMetrics();
        fetchLogs();
      }, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/system/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMetrics(result.data);
        }
      } else {
        console.error('Failed to fetch system metrics');
      }

      const statusResponse = await fetch('/api/admin/system/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        if (statusResult.success) {
          const systemStatus = statusResult.data;
          
          if (systemStatus.judge_queue) {
            setQueueStatus([{
              name: 'Judge Queue',
              pending: systemStatus.judge_queue.pending || 0,
              processing: systemStatus.judge_queue.processing || 0,
              completed: systemStatus.judge_queue.completed || 0,
              failed: systemStatus.judge_queue.failed || 0,
              workers_active: systemStatus.judge_queue.workers_active || 0,
              workers_total: systemStatus.judge_queue.workers_total || 0,
              avg_processing_time_seconds: systemStatus.judge_queue.avg_processing_time || 0
            }]);
          }

          if (systemStatus.database) {
            setDbStatus({
              status: systemStatus.database.status || 'disconnected',
              connections_active: systemStatus.database.connections_active || 0,
              connections_max: systemStatus.database.connections_max || 0,
              response_time_ms: systemStatus.database.response_time_ms || 0,
              queries_per_second: systemStatus.database.queries_per_second || 0
            });
          }
        }
      }


    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/system/logs?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLogs(result.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
    }
  };

  const getHealthStatus = () => {
    if (metrics.cpu.usage_percent > 90 || metrics.memory.usage_percent > 95 || dbStatus.status === 'disconnected') {
      return { status: 'critical', color: 'error' };
    }
    if (metrics.cpu.usage_percent > 70 || metrics.memory.usage_percent > 80 || queueStatus.some(q => q.pending > 50)) {
      return { status: 'warning', color: 'warning' };
    }
    return { status: 'healthy', color: 'success' };
  };

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const filteredLogs = logs.filter(log => logFilter === 'all' || log.level === logFilter);
  const healthStatus = getHealthStatus();

  return (
    <div style={{
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#1d4ed8',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          System Monitoring Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'capitalize',
            backgroundColor: healthStatus.status === 'healthy' ? '#dcfce7' :
                            healthStatus.status === 'warning' ? '#fef3c7' : '#fef2f2',
            color: healthStatus.status === 'healthy' ? '#166534' :
                   healthStatus.status === 'warning' ? '#92400e' : '#dc2626',
            border: `1px solid ${
              healthStatus.status === 'healthy' ? '#bbf7d0' :
              healthStatus.status === 'warning' ? '#fcd34d' : '#fecaca'
            }`
          }}>
            <span style={{ fontSize: '14px' }}>
              {healthStatus.status === 'healthy' ? <MdCheckCircle /> : 
               healthStatus.status === 'warning' ? <MdWarning /> : <MdError />}
            </span>
            System {healthStatus.status}
          </div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
            color: '#374151',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#1d4ed8'
              }}
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchMetrics}
            disabled={autoRefresh}
            style={{
              padding: '8px',
              border: '2px solid #e2e8f0',
              backgroundColor: autoRefresh ? '#f3f4f6' : '#ffffff',
              color: autoRefresh ? '#9ca3af' : '#475569',
              borderRadius: '8px',
              cursor: autoRefresh ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={(e) => {
              if (!autoRefresh) {
                e.currentTarget.style.borderColor = '#cbd5e0';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }
            }}
            onMouseLeave={(e) => {
              if (!autoRefresh) {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }
            }}
          >
            <MdRefresh style={{ fontSize: '16px' }} />
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth >= 768 ? 'repeat(4, 1fr)' : window.innerWidth >= 640 ? 'repeat(2, 1fr)' : '1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ marginRight: '12px', color: '#1d4ed8', fontSize: '24px', display: 'flex', alignItems: 'center' }}>
              <MdBarChart />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0
            }}>
              CPU Usage
            </h3>
          </div>
          <div style={{
            fontSize: '2.25rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            {metrics.cpu.usage_percent}%
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#f3f4f6',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${metrics.cpu.usage_percent}%`,
              height: '100%',
              backgroundColor: metrics.cpu.usage_percent > 80 ? '#ef4444' : metrics.cpu.usage_percent > 60 ? '#f59e0b' : '#22c55e',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '8px'
          }}>
            Load: {metrics.cpu.load_average[0].toFixed(2)}
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ marginRight: '12px', color: '#7c3aed', fontSize: '24px', display: 'flex', alignItems: 'center' }}>
              <MdStorage />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0
            }}>
              Memory Usage
            </h3>
          </div>
          <div style={{
            fontSize: '2.25rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            {metrics.memory.usage_percent}%
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#f3f4f6',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${metrics.memory.usage_percent}%`,
              height: '100%',
              backgroundColor: metrics.memory.usage_percent > 85 ? '#ef4444' : metrics.memory.usage_percent > 70 ? '#f59e0b' : '#22c55e',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '8px'
          }}>
            {formatBytes(metrics.memory.used_mb * 1024 * 1024)} / {formatBytes(metrics.memory.total_mb * 1024 * 1024)}
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ marginRight: '12px', color: '#0891b2', fontSize: '24px', display: 'flex', alignItems: 'center' }}>
              <MdStorage />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0
            }}>
              Disk Usage
            </h3>
          </div>
          <div style={{
            fontSize: '2.25rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            {metrics.disk.usage_percent}%
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#f3f4f6',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${metrics.disk.usage_percent}%`,
              height: '100%',
              backgroundColor: metrics.disk.usage_percent > 90 ? '#ef4444' : metrics.disk.usage_percent > 75 ? '#f59e0b' : '#22c55e',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '8px'
          }}>
            {metrics.disk.used_gb} GB / {metrics.disk.total_gb} GB
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ marginRight: '12px', color: '#22c55e', fontSize: '24px', display: 'flex', alignItems: 'center' }}>
              <MdTrendingUp />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0
            }}>
              Uptime
            </h3>
          </div>
          <div style={{
            fontSize: '2.25rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            {formatUptime(metrics.uptime_seconds)}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            {metrics.processes.total} processes running
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
      }}>
        <div style={{
          borderBottom: '1px solid #e5e7eb',
          padding: '0 24px'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb'
          }}>
            {[
              { label: 'Queue Status', index: 0 },
              { label: 'Database', index: 1 },
              { label: 'System Logs', index: 2 },
              { label: 'Configuration', index: 3 }
            ].map(tab => (
              <button
                key={tab.index}
                onClick={() => setSelectedTab(tab.index)}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: selectedTab === tab.index ? '#1d4ed8' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: selectedTab === tab.index ? 600 : 500,
                  fontSize: '0.95rem',
                  borderBottom: `3px solid ${selectedTab === tab.index ? '#1d4ed8' : 'transparent'}`,
                  transition: 'all 0.2s ease',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (selectedTab !== tab.index) {
                    e.currentTarget.style.color = '#4b5563';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTab !== tab.index) {
                    e.currentTarget.style.color = '#6b7280';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {selectedTab === 0 && (
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1f2937',
                marginBottom: '20px'
              }}>
                Queue Status & Workers
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 768 ? 'repeat(2, 1fr)' : '1fr',
                gap: '16px'
              }}>
                {queueStatus.map((queue, index) => (
                  <div key={index} style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <h4 style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {queue.name}
                      </h4>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: queue.workers_active === queue.workers_total ? '#dcfce7' : '#fef3c7',
                        color: queue.workers_active === queue.workers_total ? '#166534' : '#92400e'
                      }}>
                        {queue.workers_active}/{queue.workers_total} workers
                      </span>
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '16px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Pending</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>{queue.pending}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Processing</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>{queue.processing}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Completed</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>{queue.completed}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Failed</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444' }}>{queue.failed}</div>
                      </div>
                    </div>
                      
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px' }}>
                        Avg. Processing Time: {queue.avg_processing_time_seconds.toFixed(1)}s
                      </div>
                      <div style={{
                        width: '100%',
                        height: '4px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(100, (queue.pending / (queue.pending + queue.completed)) * 100)}%`,
                          height: '100%',
                          backgroundColor: queue.pending > 20 ? '#ef4444' : '#22c55e',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 1 && (
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1f2937',
                marginBottom: '20px'
              }}>
                Database Status
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 768 ? 'repeat(2, 1fr)' : '1fr',
                gap: '24px'
              }}>
                <div>
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '0'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 20px',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <div style={{
                        marginRight: '16px',
                        color: dbStatus.status === 'connected' ? '#22c55e' : '#ef4444',
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {dbStatus.status === 'connected' ? <MdCheckCircle /> : <MdError />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '2px' }}>Connection Status</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{dbStatus.status}</div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        backgroundColor: dbStatus.status === 'connected' ? '#dcfce7' : '#fef2f2',
                        color: dbStatus.status === 'connected' ? '#166534' : '#dc2626'
                      }}>
                        {dbStatus.status}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 20px',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <div style={{
                        marginRight: '16px',
                        color: '#1d4ed8',
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <MdBarChart />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '2px' }}>Response Time</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{dbStatus.response_time_ms}ms average</div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 20px',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <div style={{
                        marginRight: '16px',
                        color: '#0891b2',
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <MdStorage />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '2px' }}>Active Connections</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{dbStatus.connections_active} / {dbStatus.connections_max}</div>
                      </div>
                      <div style={{
                        width: '60px',
                        height: '6px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(dbStatus.connections_active / dbStatus.connections_max) * 100}%`,
                          height: '100%',
                          backgroundColor: '#1d4ed8',
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 20px'
                    }}>
                      <div style={{
                        marginRight: '16px',
                        color: '#22c55e',
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <MdTrendingUp />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '2px' }}>Queries per Second</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{dbStatus.queries_per_second.toString()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    backgroundColor: dbStatus.status === 'connected' ? '#dcfce7' : '#fef2f2',
                    color: dbStatus.status === 'connected' ? '#166534' : '#dc2626',
                    border: `1px solid ${dbStatus.status === 'connected' ? '#bbf7d0' : '#fecaca'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '18px' }}>
                      {dbStatus.status === 'connected' ? <MdCheckCircle /> : <MdError />}
                    </span>
                    Database is {dbStatus.status === 'connected' ? 'operating normally' : 'experiencing issues'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 2 && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: 0
                }}>
                  Recent System Logs
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value as any)}
                      style={{
                        padding: '8px 32px 8px 12px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        appearance: 'none',
                        minWidth: '100px'
                      }}
                    >
                      <option value="all">All</option>
                      <option value="error">Errors</option>
                      <option value="warning">Warnings</option>
                      <option value="info">Info</option>
                    </select>
                    <div style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#6b7280'
                    }}>
                      <MdFilterList style={{ fontSize: '16px' }} />
                    </div>
                  </div>
                  <button style={{
                    padding: '8px 12px',
                    border: '2px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <MdDownload style={{ fontSize: '14px' }} /> Export
                  </button>
                  <button style={{
                    padding: '8px 12px',
                    border: '2px solid #ef4444',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <MdError style={{ fontSize: '14px' }} /> Clear
                  </button>
                </div>
              </div>

              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <tr>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>Timestamp</th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>Level</th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>Service</th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>Message</th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} style={{
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#1f2937' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            backgroundColor: log.level === 'error' ? '#fef2f2' : 
                                           log.level === 'warning' ? '#fef3c7' : '#f0f9ff',
                            color: log.level === 'error' ? '#dc2626' : 
                                   log.level === 'warning' ? '#92400e' : '#1d4ed8'
                          }}>
                            {log.level}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '0.875rem',
                          color: '#1f2937',
                          fontFamily: 'monospace'
                        }}>
                          {log.service}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#1f2937' }}>
                          {log.message}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button style={{
                            padding: '4px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#6b7280',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontSize: '16px'
                          }}>
                            <MdInfo />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedTab === 3 && (
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1f2937',
                marginBottom: '20px'
              }}>
                Monitoring Configuration
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 768 ? 'repeat(2, 1fr)' : '1fr',
                gap: '24px'
              }}>
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Refresh Interval
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '12px 32px 12px 16px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          backgroundColor: '#ffffff',
                          color: '#1f2937',
                          cursor: 'pointer',
                          appearance: 'none'
                        }}
                      >
                        <option value={1}>1 second</option>
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>1 minute</option>
                      </select>
                      <div style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#6b7280'
                      }}>
                        <MdSettings style={{ fontSize: '16px' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      CPU Alert Threshold (%)
                    </label>
                    <input
                      type="number"
                      defaultValue={80}
                      style={{
                        width: '100%',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        padding: '12px 16px',
                        backgroundColor: '#ffffff',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Memory Alert Threshold (%)
                    </label>
                    <input
                      type="number"
                      defaultValue={85}
                      style={{
                        width: '100%',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        padding: '12px 16px',
                        backgroundColor: '#ffffff',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    marginBottom: '16px'
                  }}>
                    Alert Settings
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#1d4ed8'
                        }}
                      />
                      Email notifications
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#1d4ed8'
                        }}
                      />
                      High CPU alerts
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#1d4ed8'
                        }}
                      />
                      Memory alerts
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#1d4ed8'
                        }}
                      />
                      Disk space alerts
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button style={{
                  padding: '12px 24px',
                  border: '2px solid #1d4ed8',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Save Configuration
                </button>
                <button style={{
                  padding: '12px 24px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoringDashboard;
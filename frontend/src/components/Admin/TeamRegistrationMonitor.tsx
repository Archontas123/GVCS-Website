import React, { useState, useEffect } from 'react';
import { 
  MdPeople, 
  MdEvent, 
  MdSchedule,
  MdRefresh,
  MdMoreVert,
  MdDelete,
  MdEdit,
  MdCheck,
  MdClose,
  MdInfo,
  MdWarning
} from 'react-icons/md';

interface TeamMember {
  firstName: string;
  lastName: string;
}

interface TeamRegistration {
  id: number;
  team_name: string;
  contest_code: string;
  contest_name: string;
  registered_at: string;
  last_activity: string;
  is_active: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  session_token?: string;
  ip_address?: string;
  validation_errors?: string[];
  members?: TeamMember[];
  members_count?: number;
}

interface RegistrationStats {
  total_registrations: number;
  pending_approvals: number;
  active_teams: number;
  registrations_today: number;
  recent_activity: number;
}

const TeamRegistrationMonitor: React.FC = () => {
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [stats, setStats] = useState<RegistrationStats>({
    total_registrations: 0,
    pending_approvals: 0,
    active_teams: 0,
    registrations_today: 0,
    recent_activity: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamRegistration | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'reset' | 'view' | null;
  }>({ open: false, action: null });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchRegistrations();
    const interval = setInterval(fetchRegistrations, 5000); 
    return () => clearInterval(interval);
  }, []);

  const fetchRegistrations = async () => {
    try {
      const [registrationsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/teams/registrations?limit=100', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/teams/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (registrationsResponse.ok && statsResponse.ok) {
        const registrationsData = await registrationsResponse.json();
        const statsData = await statsResponse.json();

        if (registrationsData.success) {
          setRegistrations(registrationsData.data || []);
        }

        if (statsData.success) {
          setStats(statsData.data);
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, team: TeamRegistration) => {
    setAnchorEl(event.currentTarget);
    setSelectedTeam(team);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTeam(null);
  };

  const handleAction = (action: 'approve' | 'reject' | 'reset' | 'view') => {
    setActionDialog({ open: true, action });
    handleMenuClose();
  };

  const executeAction = async () => {
    if (!selectedTeam || !actionDialog.action) return;

    try {
      let response;
      const authHeaders = {
        'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
        'Content-Type': 'application/json'
      };

      switch (actionDialog.action) {
        case 'approve':
          response = await fetch(`/api/admin/teams/${selectedTeam.id}/approve`, {
            method: 'POST',
            headers: authHeaders
          });
          break;
        case 'reject':
          response = await fetch(`/api/admin/teams/${selectedTeam.id}/reject`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ reason: 'Rejected by admin' })
          });
          break;
        case 'reset':
          console.log('Reset session for team:', selectedTeam.team_name);
          break;
        default:
          return;
      }

      if (response && response.ok) {
        await fetchRegistrations();
      } else if (response) {
        const error = await response.json();
        console.error('API error:', error.message);
      }

      setActionDialog({ open: false, action: null });
      setSelectedTeam(null);
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <MdCheck />;
      case 'pending': return <MdSchedule />;
      case 'rejected': return <MdClose />;
      case 'inactive': return <MdClose />;
      default: return <MdInfo />;
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredRegistrations = registrations.filter(reg => {
    switch (selectedTab) {
      case 0: return true; 
      case 1: return reg.status === 'pending';
      case 2: return reg.status === 'active';
      case 3: return reg.status === 'rejected' || reg.status === 'inactive';
      default: return true;
    }
  });

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
          Team Registration Monitor
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchRegistrations}
            title="Refresh"
            style={{
              padding: '8px',
              border: '2px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#475569',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e0';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            <MdRefresh style={{ fontSize: '16px' }} />
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '48px',
            color: '#1d4ed8',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <MdPeople />
            {stats.recent_activity > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                minWidth: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {stats.recent_activity > 99 ? '99+' : stats.recent_activity}
              </span>
            )}
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            {stats.total_registrations}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Total Registrations
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
        }}>
          <div style={{
            fontSize: '48px',
            color: '#f59e0b',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <MdWarning />
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            {stats.pending_approvals}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Pending Approvals
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
        }}>
          <div style={{
            fontSize: '48px',
            color: '#22c55e',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <MdCheck />
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            {stats.active_teams}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Active Teams
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
        }}>
          <div style={{
            fontSize: '48px',
            color: '#0891b2',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <MdEvent />
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            {stats.registrations_today}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Today's Registrations
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
              { label: `All (${registrations.length})`, index: 0 },
              { label: 'Pending', index: 1, badge: registrations.filter(r => r.status === 'pending').length },
              { label: `Active (${registrations.filter(r => r.status === 'active').length})`, index: 2 },
              { label: `Rejected (${registrations.filter(r => r.status === 'rejected').length})`, index: 3 }
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
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  position: 'relative'
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
                {tab.badge && tab.badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 0 }}>
          {loading ? (
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#f3f4f6',
              borderRadius: '2px',
              overflow: 'hidden',
              margin: '20px 0'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #e5e7eb 25%, transparent 25%, transparent 50%, #e5e7eb 50%, #e5e7eb 75%, transparent 75%, transparent)',
                backgroundSize: '40px 100%',
                animation: 'loading 1s linear infinite'
              }} />
            </div>
          ) : (
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
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>Team</th>
                  <th style={{
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>Contest</th>
                  <th style={{
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>Status</th>
                  <th style={{
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>Registered</th>
                  <th style={{
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>Last Activity</th>
                  <th style={{
                    padding: '16px 24px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((registration) => (
                  <tr key={registration.id} style={{
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          marginRight: '16px'
                        }}>
                          {registration.team_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: '#1f2937'
                          }}>
                            {registration.team_name}
                          </div>
                          {registration.validation_errors && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              marginTop: '4px',
                              color: '#ef4444',
                              fontSize: '0.75rem'
                            }}>
                              <MdWarning style={{ fontSize: '14px', marginRight: '4px' }} />
                              {registration.validation_errors[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: '#1f2937' }}>
                          {registration.contest_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                          {registration.contest_code}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        backgroundColor: getStatusColor(registration.status) === 'success' ? '#dcfce7' :
                                        getStatusColor(registration.status) === 'warning' ? '#fef3c7' :
                                        getStatusColor(registration.status) === 'error' ? '#fecaca' : '#f3f4f6',
                        color: getStatusColor(registration.status) === 'success' ? '#166534' :
                               getStatusColor(registration.status) === 'warning' ? '#92400e' :
                               getStatusColor(registration.status) === 'error' ? '#dc2626' : '#374151'
                      }}>
                        <span style={{ fontSize: '14px' }}>{getStatusIcon(registration.status)}</span>
                        {registration.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#1f2937' }}>
                      {formatTimeAgo(registration.registered_at)}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatTimeAgo(registration.last_activity)}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button
                        onClick={(e) => handleMenuOpen(e, registration)}
                        style={{
                          padding: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#6b7280',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '16px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.color = '#1f2937';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#6b7280';
                        }}
                      >
                        <MdMoreVert />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <style>
          {`
            @keyframes loading {
              0% { background-position: 0% 0%; }
              100% { background-position: 40px 0%; }
            }
          `}
        </style>
      </div>

      {Boolean(anchorEl) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000
          }}
          onClick={handleMenuClose}
        >
          <div
            style={{
              position: 'absolute',
              top: (anchorEl as HTMLElement).getBoundingClientRect().bottom + window.scrollY,
              left: (anchorEl as HTMLElement).getBoundingClientRect().left + window.scrollX,
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb',
              minWidth: '160px',
              padding: '8px 0',
              zIndex: 1001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedTeam?.status === 'pending' && [
              <button
                key="approve"
                onClick={() => handleAction('approve')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <MdCheck style={{ color: '#22c55e' }} />
                Approve Team
              </button>,
              <button
                key="reject"
                onClick={() => handleAction('reject')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <MdClose style={{ color: '#ef4444' }} />
                Reject Team
              </button>
            ]}
            <button
              onClick={() => handleAction('view')}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <MdInfo style={{ color: '#6b7280' }} />
              View Details
            </button>
            <button
              onClick={() => handleAction('reset')}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <MdRefresh style={{ color: '#6b7280' }} />
              Reset Session
            </button>
          </div>
        </div>
      )}

      {actionDialog.open && (
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
          zIndex: 1200
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              padding: '24px 32px 16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                {actionDialog.action === 'approve' && 'Approve Team Registration'}
                {actionDialog.action === 'reject' && 'Reject Team Registration'}
                {actionDialog.action === 'reset' && 'Reset Team Session'}
                {actionDialog.action === 'view' && 'Team Details'}
              </h2>
            </div>
            <div style={{
              padding: '24px 32px'
            }}>
              {selectedTeam && (
                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#374151',
                    marginBottom: '12px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    <strong>Team:</strong> {selectedTeam.team_name}
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#374151',
                    marginBottom: '12px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    <strong>Contest:</strong> {selectedTeam.contest_name} ({selectedTeam.contest_code})
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#374151',
                    marginBottom: '12px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    <strong>Registered:</strong> {new Date(selectedTeam.registered_at).toLocaleString()}
                  </div>
                  {selectedTeam.members && selectedTeam.members.length > 0 && (
                    <div style={{
                      fontSize: '0.95rem',
                      color: '#374151',
                      marginBottom: '12px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>
                      <strong>Members:</strong>
                      <ul style={{
                        marginTop: '8px',
                        marginBottom: '0',
                        paddingLeft: '20px'
                      }}>
                        {selectedTeam.members.map((member, index) => (
                          <li key={index}>
                            {member.firstName} {member.lastName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedTeam.ip_address && (
                    <div style={{
                      fontSize: '0.95rem',
                      color: '#374151',
                      marginBottom: '12px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>
                      <strong>IP Address:</strong> {selectedTeam.ip_address}
                    </div>
                  )}
                  
                  {selectedTeam.validation_errors && selectedTeam.validation_errors.length > 0 && (
                    <div style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fcd34d',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      marginTop: '16px',
                      fontSize: '0.875rem',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MdWarning style={{ fontSize: '18px' }} />
                        Validation Issues:
                      </div>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        {selectedTeam.validation_errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {actionDialog.action === 'approve' && (
                    <div style={{
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      border: '1px solid #bbf7d0',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      marginTop: '16px',
                      fontSize: '0.875rem',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <MdCheck style={{ fontSize: '18px' }} />
                      This team will be approved and can participate in the contest.
                    </div>
                  )}
                  {actionDialog.action === 'reject' && (
                    <div style={{
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      marginTop: '16px',
                      fontSize: '0.875rem',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <MdClose style={{ fontSize: '18px' }} />
                      This team will be rejected and cannot participate.
                    </div>
                  )}
                  {actionDialog.action === 'reset' && (
                    <div style={{
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      border: '1px solid #93c5fd',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      marginTop: '16px',
                      fontSize: '0.875rem',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <MdInfo style={{ fontSize: '18px' }} />
                      This will invalidate the team's current session and require them to login again.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{
              padding: '16px 32px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setActionDialog({ open: false, action: null })}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e0';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                Cancel
              </button>
              {actionDialog.action !== 'view' && (
                <button
                  onClick={executeAction}
                  style={{
                    padding: '10px 20px',
                    border: `2px solid ${actionDialog.action === 'reject' ? '#dc2626' : '#1d4ed8'}`,
                    background: actionDialog.action === 'reject' 
                      ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                      : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    boxShadow: actionDialog.action === 'reject'
                      ? '0 8px 25px rgba(220, 38, 38, 0.25), 0 4px 12px rgba(239, 68, 68, 0.15)'
                      : '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    if (actionDialog.action === 'reject') {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)';
                    } else {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                    }
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    if (actionDialog.action === 'reject') {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
                    } else {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                    }
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {actionDialog.action === 'approve' && 'Approve'}
                  {actionDialog.action === 'reject' && 'Reject'}
                  {actionDialog.action === 'reset' && 'Reset Session'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamRegistrationMonitor;
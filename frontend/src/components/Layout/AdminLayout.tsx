import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { 
  MdDashboard, 
  MdEmojiEvents, 
  MdHelpOutline, 
  MdGroup, 
  MdAssignment, 
  MdMonitor,
  MdSettings,
  MdMenu,
  MdNotifications,
  MdLogout,
  MdArrowBack
} from 'react-icons/md';

const drawerWidth = 280;

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  alerts?: Array<{
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
  }>;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  active?: boolean;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  title = 'Admin Dashboard',
  actions,
  alerts = []
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAdminAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [systemStatus] = useState({
    contests_running: 2,
    pending_submissions: 15,
    active_teams: 45,
    system_health: 'healthy' as 'healthy' | 'warning' | 'error'
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: <MdDashboard />,
    },
    {
      label: 'Contests',
      path: '/admin/contests',
      icon: <MdEmojiEvents />,
      badge: systemStatus.contests_running
    },
    {
      label: 'Problems',
      path: '/admin/problems',
      icon: <MdHelpOutline />,
    },
    {
      label: 'Teams',
      path: '/admin/teams',
      icon: <MdGroup />,
      badge: systemStatus.active_teams
    },
    {
      label: 'Submissions',
      path: '/admin/submissions',
      icon: <MdAssignment />,
      badge: systemStatus.pending_submissions
    },
    {
      label: 'System Monitor',
      path: '/admin/monitor',
      icon: <MdMonitor />,
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
    setUserMenuOpen(false);
  };

  const Badge = ({ count, children }: { count: number; children: React.ReactNode }) => (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: '#f56565',
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
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );

  const drawer = (
    <div 
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)',
        color: 'white',
        borderRight: '1px solid rgba(59, 130, 246, 0.3)'
      }}
    >
      {/* Sidebar Header */}
      <div 
        style={{ 
          padding: '20px', 
          borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
          background: 'rgba(30, 58, 138, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(59, 130, 246, 0.3)',
              fontSize: '18px'
            }}
          >
<MdSettings />
          </div>
          <h2 
            style={{ 
              fontWeight: 600,
              color: '#ffffff',
              fontSize: '1.1rem',
              margin: 0
            }}
          >
            Admin Panel
          </h2>
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        <ul style={{ listStyle: 'none', padding: '0 16px', margin: 0 }}>
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path} style={{ marginBottom: '4px' }}>
                <button
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.9rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isActive ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent';
                  }}
                >
                  <div style={{ fontSize: '20px', minWidth: '32px' }}>
                    {item.badge ? (
                      <Badge count={item.badge}>
                        <span>{item.icon}</span>
                      </Badge>
                    ) : (
                      item.icon
                    )}
                  </div>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom Section */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <button
          onClick={() => navigate('/admin/settings')}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'transparent',
            color: 'rgba(255, 255, 255, 0.9)',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.9rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '20px', minWidth: '32px' }}><MdSettings /></span>
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: isMobile ? 0 : `${drawerWidth}px`,
          right: 0,
          height: '64px',
          zIndex: 1100,
          background: 'linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '16px'
        }}
      >
        {isMobile && (
          <button
            onClick={handleDrawerToggle}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.9)',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '8px'
            }}
          >
<MdMenu />
          </button>
        )}
        
        <h1 
          style={{ 
            flex: 1,
            fontWeight: 600,
            color: '#ffffff',
            fontSize: '1.25rem',
            margin: 0
          }}
        >
          {title}
        </h1>

        {/* System Status Indicator */}
        <div
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.9)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500
          }}
        >
          {systemStatus.contests_running} Active
        </div>

        {/* Notifications */}
        <button 
          style={{
            border: 'none',
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          <Badge count={systemStatus.pending_submissions}>
            <span style={{ fontSize: '20px' }}><MdNotifications /></span>
          </Badge>
        </button>

        {/* Actions */}
        {actions && (
          <div>{actions}</div>
        )}

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleUserMenuToggle}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              {admin?.username?.charAt(0)?.toUpperCase()}
            </div>
          </button>
          
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                minWidth: '180px',
                backgroundColor: '#1e3a8a',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: 1000
              }}
            >
              <button
                onClick={() => { 
                  navigate('/admin/settings'); 
                  setUserMenuOpen(false); 
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  color: 'rgba(255, 255, 255, 0.9)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: '18px' }}><MdSettings /></span>
                Settings
              </button>
              <div style={{ height: '1px', backgroundColor: 'rgba(59, 130, 246, 0.3)', margin: '0 16px' }} />
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  border: 'none',
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  color: 'rgba(255, 255, 255, 0.9)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: '18px' }}><MdLogout /></span>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar Drawer */}
      <nav
        style={{
          width: isMobile ? 0 : `${drawerWidth}px`,
          flexShrink: 0
        }}
      >
        {/* Mobile Overlay */}
        {isMobile && mobileOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1200
            }}
            onClick={handleDrawerToggle}
          />
        )}
        
        {/* Sidebar */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: mobileOpen || !isMobile ? 0 : `-${drawerWidth}px`,
            width: `${drawerWidth}px`,
            height: '100vh',
            zIndex: 1300,
            transition: 'left 0.3s ease',
            boxSizing: 'border-box'
          }}
        >
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px' }}>
              <button
                onClick={handleDrawerToggle}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '8px'
                }}
              >
<MdArrowBack />
              </button>
            </div>
          )}
          {drawer}
        </div>
      </nav>

      {/* Main Content */}
      <main
        style={{
          flexGrow: 1,
          backgroundColor: '#f8fafc',
          minHeight: '100vh',
          paddingTop: '64px'
        }}
      >
        {/* Alerts */}
        {alerts.length > 0 && (
          <div style={{ padding: '24px 24px 0' }}>
            {alerts.map((alert, index) => (
              <div 
                key={index} 
                style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  backgroundColor: alert.type === 'error' ? '#fef2f2' : 
                                  alert.type === 'warning' ? '#fffbeb' : 
                                  alert.type === 'success' ? '#f0fdf4' : '#f0f9ff',
                  border: `1px solid ${alert.type === 'error' ? '#fecaca' : 
                                      alert.type === 'warning' ? '#fed7aa' : 
                                      alert.type === 'success' ? '#bbf7d0' : '#bae6fd'}`,
                  color: alert.type === 'error' ? '#991b1b' : 
                         alert.type === 'warning' ? '#92400e' : 
                         alert.type === 'success' ? '#166534' : '#1e40af'
                }}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Page Content */}
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
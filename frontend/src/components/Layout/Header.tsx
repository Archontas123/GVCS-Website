import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationSystem from '../NotificationSystem';
import ConnectionStatus from '../ConnectionStatus';
import '../../styles/theme.css';

interface HeaderProps {
  teamName?: string;
  contestName?: string;
  timeRemaining?: number; 
  isAuthenticated: boolean;
  onLogout: () => void;
  contestId?: number;
}

const Header: React.FC<HeaderProps> = ({
  teamName,
  contestName,
  timeRemaining,
  isAuthenticated,
  onLogout,
  contestId,
}) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [displayTime, setDisplayTime] = useState<string>('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (timeRemaining !== undefined && timeRemaining > 0) {
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      const seconds = timeRemaining % 60;
      setDisplayTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else if (timeRemaining === 0) {
      setDisplayTime('Contest Ended');
    } else {
      setDisplayTime('');
    }
  }, [timeRemaining]);

  const handleProfileMenuToggle = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleMobileMenuToggle = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const handleMenuClose = () => {
    setShowProfileMenu(false);
    setShowMobileMenu(false);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
    navigate('/');
  };

  const handleNavigation = (path: string) => {
    handleMenuClose();
    navigate(path);
  };

  const getTimerClass = (): string => {
    if (!timeRemaining || timeRemaining <= 0) return 'chip chip-error';
    if (timeRemaining < 1800) return 'chip chip-error'; 
    if (timeRemaining < 3600) return 'chip chip-warning'; 
    return 'chip chip-success';
  };

  const NavigationButtons = () => (
    <>
      <button
        onClick={() => handleNavigation('/dashboard')}
        style={{ 
          background: 'none',
          border: 'none',
          color: '#374151',
          padding: '8px 16px',
          margin: '0 4px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
          e.currentTarget.style.color = '#1d4ed8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#374151';
        }}
      >
        Dashboard
      </button>
      <button
        onClick={() => handleNavigation('/leaderboard')}
        style={{ 
          background: 'none',
          border: 'none',
          color: '#374151',
          padding: '8px 16px',
          margin: '0 4px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
          e.currentTarget.style.color = '#1d4ed8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#374151';
        }}
      >
        Leaderboard
      </button>
    </>
  );

  const MobileMenu = () => (
    showMobileMenu && (
      <div style={{
        position: 'absolute',
        top: '60px',
        right: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
        minWidth: '200px',
        zIndex: 1000,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <div 
          style={{ 
            cursor: 'pointer', 
            borderBottom: '1px solid #e5e7eb',
            padding: '12px 16px',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: '#374151',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            transition: 'background-color 0.2s ease',
          }}
          onClick={() => handleNavigation('/dashboard')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Dashboard
        </div>
        <div 
          style={{ 
            cursor: 'pointer',
            padding: '12px 16px',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: '#374151',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            transition: 'background-color 0.2s ease',
          }}
          onClick={() => handleNavigation('/leaderboard')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Leaderboard
        </div>
      </div>
    )
  );

  const ProfileMenu = () => (
    showProfileMenu && (
      <div style={{
        position: 'absolute',
        top: '60px',
        right: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
        minWidth: '200px',
        zIndex: 1000,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <div style={{ 
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          fontSize: '0.85rem',
          color: '#6b7280',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        }}>
          Team: {teamName}
        </div>
        <div 
          style={{ 
            cursor: 'pointer',
            padding: '12px 16px',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: '#374151',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            transition: 'background-color 0.2s ease',
          }}
          onClick={handleLogout}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef2f2';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#374151';
          }}
        >
          Logout
        </div>
      </div>
    )
  );

  useEffect(() => {
    const handleClickOutside = () => {
      setShowProfileMenu(false);
      setShowMobileMenu(false);
    };
    if (showProfileMenu || showMobileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showProfileMenu, showMobileMenu]);

  return (
    <nav style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 100,
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    }}>
      <div 
        style={{ 
          cursor: 'pointer',
          flexGrow: isMobile ? 1 : 0,
          display: 'flex',
          alignItems: 'center',
        }}
        onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
      >
        <span style={{ marginRight: '12px', fontSize: '1.5rem' }}>CS</span>
        {!isMobile && (
          <h1 style={{ 
            fontWeight: 700, 
            fontSize: '1.5rem',
            color: '#1d4ed8',
            letterSpacing: '-0.02em',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            margin: 0,
          }}>
            Hack The Valley
          </h1>
        )}
      </div>

      {contestName && !isMobile && (
        <div style={{ margin: '0 24px' }}>
          <span style={{ 
            fontSize: '0.95rem',
            color: '#64748b',
            fontWeight: 500,
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            {contestName}
          </span>
        </div>
      )}

      <div style={{ flexGrow: 1 }} />

      {displayTime && (
        <div style={{ margin: '0 16px' }}>
          <span style={{
            backgroundColor: timeRemaining && timeRemaining > 0 
              ? (timeRemaining < 1800 ? '#fef2f2' : timeRemaining < 3600 ? '#fff4e5' : '#e8f5e8')
              : '#fef2f2',
            color: timeRemaining && timeRemaining > 0 
              ? (timeRemaining < 1800 ? '#dc2626' : timeRemaining < 3600 ? '#a16207' : '#166534')
              : '#dc2626',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            ⏱ {displayTime}
          </span>
        </div>
      )}

      {isAuthenticated ? (
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          {!isMobile && <NavigationButtons />}

          <ConnectionStatus compact />
          <NotificationSystem contestId={contestId} />

          {isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMobileMenuToggle();
              }}
              style={{ 
                background: 'none',
                border: 'none',
                color: '#374151',
                padding: '8px 12px',
                marginRight: '8px',
                borderRadius: '8px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ☰
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleProfileMenuToggle();
            }}
            style={{ 
              background: 'none',
              border: 'none',
              color: '#374151',
              padding: '8px 12px',
              marginLeft: '8px',
              borderRadius: '8px',
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            User
          </button>

          <MobileMenu />
          <ProfileMenu />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#ffffff',
              color: '#374151',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1d4ed8';
              e.currentTarget.style.color = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(29, 78, 216, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.25)';
            }}
          >
            Register
          </button>
        </div>
      )}
    </nav>
  );
};

export default Header;
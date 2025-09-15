import React, { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  teamName?: string;
  contestName?: string;
  timeRemaining?: number;
  isAuthenticated: boolean;
  onLogout: () => void;
  contestId?: number;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  teamName,
  contestName,
  timeRemaining,
  isAuthenticated,
  onLogout,
  contestId,
}) => {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Header
        teamName={teamName}
        contestName={contestName}
        timeRemaining={timeRemaining}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        contestId={contestId}
      />

      <main style={{ 
        flexGrow: 1, 
        padding: '32px 16px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>

      <footer 
        style={{ 
          textAlign: 'center', 
          padding: '24px 16px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.9rem',
          color: '#6b7280',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        }}
      >
        Hack The Valley Platform
      </footer>
    </div>
  );
};

export default Layout;
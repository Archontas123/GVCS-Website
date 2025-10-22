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
  contestSlug?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  teamName,
  contestName,
  timeRemaining,
  isAuthenticated,
  onLogout,
  contestId,
  contestSlug,
}) => {
  return (
    <>
      <Header
        teamName={teamName}
        contestName={contestName}
        timeRemaining={timeRemaining}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        contestId={contestId}
        contestSlug={contestSlug}
      />
      {children}
    </>
  );
};

export default Layout;
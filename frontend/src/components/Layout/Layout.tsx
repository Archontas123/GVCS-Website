import React, { ReactNode } from 'react';

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
    <>
      {children}
    </>
  );
};

export default Layout;
import React, { ReactNode } from 'react';

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
}) => {
  return (
    <>
      {children}
    </>
  );
};

export default Layout;

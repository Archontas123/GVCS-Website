// Temporary placeholder components to replace MUI components
import React from 'react';

// Simple placeholder components
export const PlaceholderDashboard: React.FC = () => (
  <div className="p-4 text-center">
    <h2>Dashboard</h2>
    <p>This page is being updated to remove MUI dependencies.</p>
  </div>
);

export const PlaceholderAdmin: React.FC = () => (
  <div className="p-4 text-center">
    <h2>Admin Panel</h2>
    <p>This page is being updated to remove MUI dependencies.</p>
  </div>
);

export const PlaceholderComponent: React.FC<{ title?: string }> = ({ title = "Component" }) => (
  <div className="p-4 text-center">
    <h3>{title}</h3>
    <p>This component is being updated to remove MUI dependencies.</p>
  </div>
);
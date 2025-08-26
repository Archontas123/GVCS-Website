/**
 * Breadcrumb Navigation Component
 * Used for admin navigation hierarchy
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const navigate = useNavigate();

  const handleClick = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      navigate(item.href);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index < items.length - 1 ? (
            <button
              onClick={() => handleClick(item)}
              style={{
                color: '#007bff',
                textDecoration: 'none',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                fontSize: '14px',
                padding: '0'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {item.label}
            </button>
          ) : (
            <span
              style={{
                color: '#6c757d',
                fontWeight: 500,
                fontSize: '14px'
              }}
            >
              {item.label}
            </span>
          )}
          {index < items.length - 1 && (
            <span
              style={{
                margin: '0 8px',
                fontSize: '16px',
                color: '#6c757d',
              }}
            >
              /
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumb;
/**
 * Breadcrumb Navigation Component
 * Used for admin navigation hierarchy
 */

import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
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
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        mb: 2,
        flexWrap: 'wrap',
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index < items.length - 1 ? (
            <Link
              component="button"
              variant="body2"
              onClick={() => handleClick(item)}
              sx={{
                color: '#007bff',
                textDecoration: 'none',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {item.label}
            </Link>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: '#6c757d',
                fontWeight: 500,
              }}
            >
              {item.label}
            </Typography>
          )}
          {index < items.length - 1 && (
            <ChevronRight
              sx={{
                mx: 1,
                fontSize: 16,
                color: '#6c757d',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default Breadcrumb;
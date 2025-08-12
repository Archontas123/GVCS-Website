/**
 * CS Club Hackathon Platform - Home Page
 * Phase 1.4: Landing page with registration and login options
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Code,
  Timer,
  EmojiEvents,
  Group,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: <Code sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Multi-Language Support',
      description: 'Write code in C++, Java, or Python with full compiler support and real-time execution.',
    },
    {
      icon: <Timer sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: 'Real-Time Judging',
      description: 'Get instant feedback on your submissions with comprehensive verdict reporting.',
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40, color: theme.palette.warning.main }} />,
      title: 'ICPC-Style Scoring',
      description: 'Experience authentic competitive programming with penalty-based scoring system.',
    },
    {
      icon: <Group sx={{ fontSize: 40, color: theme.palette.info.main }} />,
      title: 'Team Collaboration',
      description: 'Work together with your team using a single shared account and submission history.',
    },
  ];

  return (
    <Box sx={{ minHeight: '80vh' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          py: { xs: 6, md: 10 },
          px: 2,
          textAlign: 'center',
          borderRadius: { xs: 0, md: 2 },
          mb: 6,
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            fontSize: { xs: '2rem', md: '3rem' },
            mb: 3,
          }}
        >
          CS Club Hackathon Platform
        </Typography>
        
        <Typography
          variant="h5"
          component="p"
          sx={{
            mb: 4,
            opacity: 0.9,
            fontSize: { xs: '1.1rem', md: '1.5rem' },
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          Experience the thrill of competitive programming with our ICPC-style contest platform
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
            sx={{
              bgcolor: 'white',
              color: theme.palette.primary.main,
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.9)',
              },
            }}
          >
            Register Team
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/login')}
            sx={{
              borderColor: 'white',
              color: 'white',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Team Login
          </Button>
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h3"
          component="h2"
          gutterBottom
          sx={{
            textAlign: 'center',
            mb: 4,
            fontWeight: 600,
            fontSize: { xs: '2rem', md: '2.5rem' },
          }}
        >
          Platform Features
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
          {features.map((feature, index) => (
            <Box key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Getting Started Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 4,
          borderRadius: 2,
          textAlign: 'center',
          boxShadow: theme.shadows[2],
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{ fontWeight: 600, mb: 2 }}
        >
          Ready to Get Started?
        </Typography>
        
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}
        >
          Join your team and start competing in algorithmic challenges. Test your problem-solving skills and climb the leaderboard!
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
            }}
          >
            Register Your Team Now
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/admin/login')}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
            }}
          >
            Admin Panel
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
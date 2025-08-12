/**
 * CS Club Hackathon Platform - Problem View Page
 * Phase 5.2: Problem Viewing Interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Toolbar,
  AppBar,
  Container,
  Paper,
  Divider,
  Tooltip,
  Alert,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import {
  ArrowBack,
  ArrowForward,
  Home,
  ContentCopy,
  Timer,
  Memory,
  Code,
  ExpandMore,
  ExpandLess,
  Fullscreen,
  FullscreenExit,
  Refresh,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import apiService from '../services/api';
import { useAuth } from '../hooks/useAuth';
import CodeEditor from '../components/CodeEditor';
import SubmissionInterface from '../components/SubmissionInterface/SubmissionInterface';

// Mock problem data for Phase 5.2 - will be replaced with API calls
const mockProblem: Problem = {
  id: 1,
  contestId: 1,
  problemLetter: 'A',
  title: 'Matrix Multiplication',
  description: `Given two matrices **A** and **B**, compute their product **C = A × B**.

## Problem Description

Matrix multiplication is a fundamental operation in linear algebra. Given two matrices:
- Matrix $A$ of size $n \\times m$
- Matrix $B$ of size $m \\times p$

The product $C = A \\times B$ will be a matrix of size $n \\times p$ where:

$$C_{ij} = \\sum_{k=1}^{m} A_{ik} \\times B_{kj}$$

## Input Format
- First line: three integers $n$, $m$, $p$ representing the dimensions
- Next $n$ lines: each contains $m$ integers representing matrix $A$
- Next $m$ lines: each contains $p$ integers representing matrix $B$

## Output Format  
Output $n$ lines, each containing $p$ integers representing the resulting matrix $C$.

## Constraints
- $1 \\leq n, m, p \\leq 100$
- $-1000 \\leq A_{ij}, B_{ij} \\leq 1000$
- All values fit in 32-bit signed integers

## Example Explanation
In the sample input, we multiply a $2 \\times 2$ matrix with another $2 \\times 2$ matrix:

$$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\times \\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix} = \\begin{pmatrix} 19 & 22 \\\\ 43 & 50 \\end{pmatrix}$$

Where:
- $C_{11} = 1 \\times 5 + 2 \\times 7 = 19$
- $C_{12} = 1 \\times 6 + 2 \\times 8 = 22$
- $C_{21} = 3 \\times 5 + 4 \\times 7 = 43$
- $C_{22} = 3 \\times 6 + 4 \\times 8 = 50$

## Algorithm Implementation

Here's a solution in C++:

\`\`\`cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m, p;
    cin >> n >> m >> p;
    
    // Read matrix A
    vector<vector<int>> A(n, vector<int>(m));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            cin >> A[i][j];
        }
    }
    
    // Read matrix B
    vector<vector<int>> B(m, vector<int>(p));
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < p; j++) {
            cin >> B[i][j];
        }
    }
    
    // Compute matrix multiplication
    vector<vector<int>> C(n, vector<int>(p, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < p; j++) {
            for (int k = 0; k < m; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    
    // Output result
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < p; j++) {
            cout << C[i][j];
            if (j < p - 1) cout << " ";
        }
        cout << endl;
    }
    
    return 0;
}
\`\`\`

## Time Complexity
The time complexity is $O(n \\times m \\times p)$ for the triple nested loop.

## Alternative Solutions

Python implementation:
\`\`\`python
n, m, p = map(int, input().split())

# Read matrix A
A = []
for _ in range(n):
    row = list(map(int, input().split()))
    A.append(row)

# Read matrix B
B = []
for _ in range(m):
    row = list(map(int, input().split()))
    B.append(row)

# Matrix multiplication
C = [[0] * p for _ in range(n)]
for i in range(n):
    for j in range(p):
        for k in range(m):
            C[i][j] += A[i][k] * B[k][j]

# Output
for i in range(n):
    print(' '.join(map(str, C[i])))
\`\`\``,
  inputFormat: 'First line: n m p, then n lines of m integers (matrix A), then m lines of p integers (matrix B)',
  outputFormat: 'n lines of p integers representing the product matrix',
  sampleInput: `2 2 2
1 2
3 4
5 6
7 8`,
  sampleOutput: `19 22
43 50`,
  constraints: '1 ≤ n, m, p ≤ 100; -1000 ≤ matrix elements ≤ 1000',
  timeLimit: 2000,
  memoryLimit: 512,
  difficulty: 'medium',
};

const ProblemViewPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { problemId } = useParams<{ problemId: string }>();
  const { team } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [problem, setProblem] = useState<Problem>(mockProblem);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    samples: true,
    constraints: true,
  });
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [totalProblems, setTotalProblems] = useState(4);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');

  // Load problem data
  useEffect(() => {
    if (problemId) {
      loadProblem(parseInt(problemId));
    }
  }, [problemId]);

  const loadProblem = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with real API call
      // const response = await apiService.getProblem(id);
      // if (response.success && response.data) {
      //   setProblem(response.data);
      // }
      
      // For now, use mock data
      setProblem(mockProblem);
      
    } catch (err) {
      console.error('Error loading problem:', err);
      setError('Failed to load problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard navigation
  const handleKeyNavigation = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          navigateToProblem('previous');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateToProblem('next');
          break;
        case 'h':
        case 'Home':
          event.preventDefault();
          navigate('/dashboard');
          break;
        case 'Enter':
          event.preventDefault();
          toggleFullscreen();
          break;
      }
    }
    if (event.key === 'Escape' && fullscreen) {
      setFullscreen(false);
    }
  }, [navigate, fullscreen, currentProblemIndex]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation);
    return () => document.removeEventListener('keydown', handleKeyNavigation);
  }, [handleKeyNavigation]);

  const navigateToProblem = (direction: 'next' | 'previous') => {
    let newIndex = currentProblemIndex;
    if (direction === 'next' && currentProblemIndex < totalProblems - 1) {
      newIndex = currentProblemIndex + 1;
    } else if (direction === 'previous' && currentProblemIndex > 0) {
      newIndex = currentProblemIndex - 1;
    }
    
    if (newIndex !== currentProblemIndex) {
      setCurrentProblemIndex(newIndex);
      const problemLetter = String.fromCharCode(65 + newIndex); // A, B, C...
      navigate(`/problem/${newIndex + 1}`);
    }
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = async (text: string, type: 'input' | 'output') => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show success toast
      console.log(`${type} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Handle code submission
  const handleSubmitCode = async (submissionCode: string, submissionLanguage: string) => {
    try {
      console.log('Submitting code:', { code: submissionCode, language: submissionLanguage, problemId });
      // TODO: Implement actual submission
      // const response = await apiService.submitSolution({
      //   problemId: parseInt(problemId || '1'),
      //   language: submissionLanguage as 'cpp' | 'java' | 'python',
      //   code: submissionCode
      // });
      
      // For demo, just log the submission
      console.log('Code submitted successfully! (Demo mode)');
    } catch (error) {
      console.error('Submission error:', error);
      throw error; // Re-throw to let SubmissionInterface handle the error
    }
  };

  // Handle language changes from SubmissionInterface
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  // Mock contest status
  const contestStatus = {
    isRunning: true,
    timeRemaining: 3600, // 1 hour remaining
    canSubmit: true,
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return theme.palette.success.main;
      case 'medium': return theme.palette.warning.main;
      case 'hard': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  // Custom components for ReactMarkdown
  const markdownComponents = {
    h2: ({ children }: any) => (
      <Typography variant="h5" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
        {children}
      </Typography>
    ),
    h3: ({ children }: any) => (
      <Typography variant="h6" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        {children}
      </Typography>
    ),
    p: ({ children }: any) => (
      <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
        {children}
      </Typography>
    ),
    ul: ({ children }: any) => (
      <Box component="ul" sx={{ mb: 2, pl: 3 }}>
        {children}
      </Box>
    ),
    li: ({ children }: any) => (
      <Box component="li" sx={{ mb: 0.5 }}>
        <Typography variant="body1">{children}</Typography>
      </Box>
    ),
    ol: ({ children }: any) => (
      <Box component="ol" sx={{ mb: 2, pl: 3 }}>
        {children}
      </Box>
    ),
    code: ({ inline, className, children }: any) => {
      if (inline) {
        return (
          <Box
            component="code"
            sx={{
              bgcolor: theme.palette.grey[100],
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontFamily: 'monospace',
              fontSize: '0.9em',
              border: `1px solid ${theme.palette.grey[300]}`,
            }}
          >
            {children}
          </Box>
        );
      }
      
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      return (
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            overflow: 'hidden',
            '& pre': {
              margin: '0 !important',
              borderRadius: '0 !important',
            }
          }}
        >
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language || 'text'}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '0.9em',
            }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </Paper>
      );
    },
    strong: ({ children }: any) => (
      <Box component="strong" sx={{ fontWeight: 600 }}>
        {children}
      </Box>
    ),
    em: ({ children }: any) => (
      <Box component="em" sx={{ fontStyle: 'italic' }}>
        {children}
      </Box>
    ),
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6">Loading problem...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => loadProblem(parseInt(problemId || '1'))}>
            <Refresh /> Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: fullscreen ? 'background.paper' : 'background.default',
      position: fullscreen ? 'fixed' : 'relative',
      top: fullscreen ? 0 : 'auto',
      left: fullscreen ? 0 : 'auto',
      right: fullscreen ? 0 : 'auto',
      bottom: fullscreen ? 0 : 'auto',
      zIndex: fullscreen ? 9999 : 'auto',
      overflow: fullscreen ? 'auto' : 'visible',
    }}>
      {/* Navigation Toolbar */}
      <AppBar 
        position={fullscreen ? 'sticky' : 'static'} 
        color="default" 
        elevation={1}
        sx={{ bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}` }}
      >
        <Toolbar>
          <Tooltip title="Back to Dashboard (Ctrl+H)">
            <IconButton onClick={() => navigate('/dashboard')} edge="start">
              <Home />
            </IconButton>
          </Tooltip>
          
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Problem {problem.problemLetter}: {problem.title}
          </Typography>
          
          {/* Problem Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Previous Problem (Ctrl+←)">
              <span>
                <IconButton 
                  onClick={() => navigateToProblem('previous')}
                  disabled={currentProblemIndex === 0}
                >
                  <ArrowBack />
                </IconButton>
              </span>
            </Tooltip>
            
            <Chip 
              label={`${currentProblemIndex + 1} / ${totalProblems}`}
              size="small"
              variant="outlined"
            />
            
            <Tooltip title="Next Problem (Ctrl+→)">
              <span>
                <IconButton 
                  onClick={() => navigateToProblem('next')}
                  disabled={currentProblemIndex === totalProblems - 1}
                >
                  <ArrowForward />
                </IconButton>
              </span>
            </Tooltip>
            
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            
            <Tooltip title={fullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (Ctrl+Enter)"}>
              <IconButton onClick={toggleFullscreen}>
                {fullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container 
        maxWidth={fullscreen ? false : "lg"} 
        sx={{ 
          py: fullscreen ? 2 : 4,
          px: fullscreen ? 3 : undefined,
          maxWidth: fullscreen ? 'none' : undefined 
        }}
      >
        {/* Problem Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                fontFamily: 'monospace'
              }}
            >
              {problem.problemLetter}
            </Typography>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, flexGrow: 1 }}>
              {problem.title}
            </Typography>
            <Chip
              label={problem.difficulty}
              sx={{
                bgcolor: getDifficultyColor(problem.difficulty),
                color: 'white',
                fontWeight: 500,
              }}
            />
          </Box>

          {/* Technical Details */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer color="action" />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Time Limit: {problem.timeLimit}ms
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Memory color="action" />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Memory Limit: {problem.memoryLimit}MB
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Code color="action" />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Languages: C++, Java, Python
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Problem Description */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: expandedSections.description ? 2 : 0,
                cursor: isMobile ? 'pointer' : 'default'
              }}
              onClick={isMobile ? () => toggleSection('description') : undefined}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Problem Statement
              </Typography>
              {isMobile && (
                <IconButton size="small">
                  {expandedSections.description ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
            </Box>
            
            <Collapse in={expandedSections.description}>
              <Box sx={{ 
                '& .katex': { fontSize: '1em' },
                '& .katex-display': { margin: '1em 0' },
              }}>
                <ReactMarkdown
                  children={problem.description}
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                />
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* Sample Input/Output */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: expandedSections.samples ? 2 : 0,
                cursor: isMobile ? 'pointer' : 'default'
              }}
              onClick={isMobile ? () => toggleSection('samples') : undefined}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Sample Input/Output
              </Typography>
              {isMobile && (
                <IconButton size="small">
                  {expandedSections.samples ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
            </Box>
            
            <Collapse in={expandedSections.samples}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {/* Sample Input */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Sample Input
                    </Typography>
                    <Tooltip title="Copy to clipboard">
                      <IconButton 
                        size="small" 
                        onClick={() => copyToClipboard(problem.sampleInput, 'input')}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      bgcolor: theme.palette.grey[50],
                      border: `2px solid ${theme.palette.primary.light}`,
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}
                    >
                      {problem.sampleInput}
                    </Typography>
                  </Paper>
                </Paper>

                {/* Sample Output */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      Sample Output
                    </Typography>
                    <Tooltip title="Copy to clipboard">
                      <IconButton 
                        size="small" 
                        onClick={() => copyToClipboard(problem.sampleOutput, 'output')}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      bgcolor: theme.palette.grey[50],
                      border: `2px solid ${theme.palette.success.light}`,
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}
                    >
                      {problem.sampleOutput}
                    </Typography>
                  </Paper>
                </Paper>
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* Constraints */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: expandedSections.constraints ? 2 : 0,
                cursor: isMobile ? 'pointer' : 'default'
              }}
              onClick={isMobile ? () => toggleSection('constraints') : undefined}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Constraints & Limits
              </Typography>
              {isMobile && (
                <IconButton size="small">
                  {expandedSections.constraints ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
            </Box>
            
            <Collapse in={expandedSections.constraints}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Input Constraints
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {problem.constraints}
                  </Typography>
                </Paper>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.warning.light + '20' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Time Limit
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {problem.timeLimit} ms
                    </Typography>
                  </Paper>
                  
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.info.light + '20' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Memory Limit
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {problem.memoryLimit} MB
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* Code Editor Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Code /> Solution Editor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Write your solution below. Use Ctrl+Enter to submit, or test with custom input first.
            </Typography>
            <CodeEditor
              problemId={problem.id}
              initialLanguage={language}
              value={code}
              onChange={setCode}
              onLanguageChange={handleLanguageChange}
              height="400px"
            />
          </CardContent>
        </Card>

        {/* Submission Interface */}
        <SubmissionInterface
          problemId={problem.id}
          code={code}
          language={language}
          onLanguageChange={handleLanguageChange}
          onSubmit={handleSubmitCode}
          contestStatus={contestStatus}
          maxFileSize={64 * 1024} // 64KB
        />

        {/* Keyboard Shortcuts Help */}
        {!isMobile && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Keyboard Shortcuts
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography variant="caption">Ctrl + ← / → : Navigate problems</Typography>
              <Typography variant="caption">Ctrl + H : Return to dashboard</Typography>
              <Typography variant="caption">Ctrl + Enter : Submit code / Toggle fullscreen</Typography>
              <Typography variant="caption">Ctrl + F : Find in code</Typography>
              <Typography variant="caption">Ctrl + Shift + F : Format code</Typography>
              <Typography variant="caption">Esc : Exit fullscreen</Typography>
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default ProblemViewPage;
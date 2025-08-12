/**
 * CS Club Hackathon Platform - Code Editor Test Page
 * Phase 5.3: Standalone page for testing Monaco Editor features
 */

import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
} from '@mui/material';
import { Code } from '@mui/icons-material';
import CodeEditor from '../components/CodeEditor';

const CodeEditorTestPage: React.FC = () => {
  const handleSubmit = async (code: string, language: string) => {
    console.log('Test submission:', { code, language });
    alert(`Submitted ${language} code:\n\n${code.substring(0, 100)}...`);
  };

  const handleTest = async (code: string, language: string, input: string) => {
    console.log('Test execution:', { code, language, input });
    alert(`Testing ${language} code with input:\n${input}\n\nOutput would appear here in real implementation.`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code /> Monaco Code Editor Demo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page demonstrates the Monaco Editor integration with competitive programming features.
        </Typography>
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Features to test:</strong>
        </Typography>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Switch between C++, Java, and Python languages</li>
          <li>Use keyboard shortcuts: Ctrl+Enter (submit), Ctrl+Shift+F (format), Ctrl+F (find)</li>
          <li>Click the settings icon to customize font, theme, and editor options</li>
          <li>Click the fullscreen icon for distraction-free coding</li>
          <li>Try the code snippets dialog (find/replace icon)</li>
          <li>Test with custom input using the test panel</li>
        </ul>
      </Alert>

      <Box sx={{ height: '600px' }}>
        <CodeEditor
          onSubmit={handleSubmit}
          onTest={handleTest}
          height="100%"
        />
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Available Keyboard Shortcuts:
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 1 }}>
          <Typography variant="caption">Ctrl + Enter: Submit code</Typography>
          <Typography variant="caption">Ctrl + F: Find in code</Typography>
          <Typography variant="caption">Ctrl + H: Find and replace</Typography>
          <Typography variant="caption">Ctrl + Shift + F: Format code</Typography>
          <Typography variant="caption">Ctrl + /: Toggle comment</Typography>
          <Typography variant="caption">Alt + Click: Multiple cursors</Typography>
          <Typography variant="caption">Ctrl + D: Select next occurrence</Typography>
          <Typography variant="caption">F11: Toggle fullscreen</Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default CodeEditorTestPage;
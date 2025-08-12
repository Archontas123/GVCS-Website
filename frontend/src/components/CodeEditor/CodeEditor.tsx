/**
 * CS Club Hackathon Platform - Code Editor Component
 * Phase 5.3: Monaco Editor Integration for Competitive Programming
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Toolbar,
  Divider,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  useTheme,
} from '@mui/material';
import {
  PlayArrow,
  Send,
  Fullscreen,
  FullscreenExit,
  Settings,
  FormatAlignLeft,
  ContentCopy,
  Delete,
  FindReplace,
  Code,
  Refresh,
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Language templates for competitive programming
const LANGUAGE_TEMPLATES = {
  cpp: `#include <iostream>
#include <vector>
#include <algorithm>
#include <string>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <climits>
#include <cmath>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Your code here
    
    return 0;
}`,
  java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        // Your code here
        
        scanner.close();
    }
}`,
  python: `import sys
import math
from collections import defaultdict, deque, Counter
from heapq import heappush, heappop
from bisect import bisect_left, bisect_right

def main():
    # Your code here
    pass

if __name__ == "__main__":
    main()`
};

// Common competitive programming snippets
const CODE_SNIPPETS = {
  cpp: {
    'Fast I/O': 'ios_base::sync_with_stdio(false);\ncin.tie(NULL);',
    'Read Array': 'vector<int> arr(n);\nfor(int i = 0; i < n; i++) {\n    cin >> arr[i];\n}',
    'For Loop': 'for(int i = 0; i < n; i++) {\n    // code\n}',
    'While Loop': 'while(condition) {\n    // code\n}',
    'Binary Search': 'int left = 0, right = n - 1;\nwhile(left <= right) {\n    int mid = left + (right - left) / 2;\n    if(arr[mid] == target) return mid;\n    else if(arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n}',
  },
  java: {
    'Scanner Setup': 'Scanner scanner = new Scanner(System.in);',
    'Read Array': 'int[] arr = new int[n];\nfor(int i = 0; i < n; i++) {\n    arr[i] = scanner.nextInt();\n}',
    'ArrayList': 'ArrayList<Integer> list = new ArrayList<>();',
    'HashMap': 'HashMap<Integer, Integer> map = new HashMap<>();',
    'For Loop': 'for(int i = 0; i < n; i++) {\n    // code\n}',
  },
  python: {
    'Read Input': 'n = int(input())\narr = list(map(int, input().split()))',
    'For Loop': 'for i in range(n):\n    # code',
    'List Comprehension': 'result = [expression for item in iterable if condition]',
    'Dictionary': 'freq = defaultdict(int)',
    'Binary Search': 'left, right = 0, len(arr) - 1\nwhile left <= right:\n    mid = (left + right) // 2\n    if arr[mid] == target:\n        return mid\n    elif arr[mid] < target:\n        left = mid + 1\n    else:\n        right = mid - 1',
  }
};

interface CodeEditorProps {
  problemId?: number;
  initialCode?: string;
  onSubmit?: (code: string, language: string) => void;
  onTest?: (code: string, language: string, input: string) => void;
  height?: string | number;
  readOnly?: boolean;
}

interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  lineHeight: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoIndent: boolean;
  formatOnPaste: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  problemId,
  initialCode,
  onSubmit,
  onTest,
  height = '500px',
  readOnly = false,
}) => {
  const theme = useTheme();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [language, setLanguage] = useState<'cpp' | 'java' | 'python'>('cpp');
  const [code, setCode] = useState<string>(initialCode || LANGUAGE_TEMPLATES.cpp);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [settings, setSettings] = useState<EditorSettings>({
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace',
    theme: theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light',
    lineHeight: 1.5,
    wordWrap: false,
    minimap: true,
    lineNumbers: true,
    autoIndent: true,
    formatOnPaste: true,
  });

  // Handle language change
  const handleLanguageChange = useCallback((newLanguage: 'cpp' | 'java' | 'python') => {
    setLanguage(newLanguage);
    if (!code || code === LANGUAGE_TEMPLATES[language]) {
      setCode(LANGUAGE_TEMPLATES[newLanguage]);
    }
  }, [code, language]);

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Configure editor for competitive programming
    editor.updateOptions({
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      lineHeight: settings.lineHeight,
      wordWrap: settings.wordWrap ? 'on' : 'off',
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers ? 'on' : 'off',
      autoIndent: settings.autoIndent ? 'full' : 'none',
      formatOnPaste: settings.formatOnPaste,
      selectOnLineNumbers: true,
      mouseWheelZoom: true,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
    });

    // Add custom key bindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleSubmit();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      setFindReplaceOpen(true);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });

    // Add snippet insertion
    Object.entries(CODE_SNIPPETS[language]).forEach(([name, snippet]) => {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
        // This would show snippet suggestions
      });
    });
  }, [language, settings]);

  // Handle settings change
  const handleSettingsChange = useCallback((newSettings: Partial<EditorSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: updatedSettings.fontSize,
        fontFamily: updatedSettings.fontFamily,
        lineHeight: updatedSettings.lineHeight,
        wordWrap: updatedSettings.wordWrap ? 'on' : 'off',
        minimap: { enabled: updatedSettings.minimap },
        lineNumbers: updatedSettings.lineNumbers ? 'on' : 'off',
        autoIndent: updatedSettings.autoIndent ? 'full' : 'none',
        formatOnPaste: updatedSettings.formatOnPaste,
      });
    }
  }, [settings]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Handle code submission
  const handleSubmit = useCallback(async () => {
    if (!onSubmit || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(code, language);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, language, onSubmit, isSubmitting]);

  // Handle code testing
  const handleTest = useCallback(async () => {
    if (!onTest || isTesting) return;
    
    setIsTesting(true);
    setTestOutput('Running...');
    try {
      await onTest(code, language, testInput);
    } catch (error) {
      console.error('Testing error:', error);
      setTestOutput('Error running test');
    } finally {
      setIsTesting(false);
    }
  }, [code, language, testInput, onTest, isTesting]);

  // Insert template
  const insertTemplate = useCallback(() => {
    setCode(LANGUAGE_TEMPLATES[language]);
  }, [language]);

  // Insert snippet
  const insertSnippet = useCallback((snippet: string) => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const operation = {
        range: selection || new monaco.Range(1, 1, 1, 1),
        text: snippet,
        forceMoveMarkers: true,
      };
      editorRef.current.executeEdits('snippet-insert', [operation]);
      editorRef.current.focus();
    }
  }, []);

  // Copy code to clipboard
  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [code]);

  // Format code
  const formatCode = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  // Handle escape key for fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen]);

  const editorHeight = isFullscreen ? '100vh' : height;

  return (
    <Box
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        bgcolor: 'background.paper',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : 'auto',
      }}
    >
      {/* Editor Toolbar */}
      <Paper elevation={1} sx={{ borderRadius: isFullscreen ? 0 : 1 }}>
        <Toolbar variant="dense" sx={{ justifyContent: 'space-between', minHeight: 48 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Language Selection */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Language</InputLabel>
              <Select
                value={language}
                label="Language"
                onChange={(e) => handleLanguageChange(e.target.value as 'cpp' | 'java' | 'python')}
                disabled={readOnly}
              >
                <MenuItem value="cpp">C++</MenuItem>
                <MenuItem value="java">Java</MenuItem>
                <MenuItem value="python">Python</MenuItem>
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem />

            {/* Code Actions */}
            <Tooltip title="Insert Template">
              <IconButton size="small" onClick={insertTemplate} disabled={readOnly}>
                <Refresh />
              </IconButton>
            </Tooltip>

            <Tooltip title="Format Code (Ctrl+Shift+F)">
              <IconButton size="small" onClick={formatCode} disabled={readOnly}>
                <FormatAlignLeft />
              </IconButton>
            </Tooltip>

            <Tooltip title="Copy Code">
              <IconButton size="small" onClick={copyCode}>
                <ContentCopy />
              </IconButton>
            </Tooltip>

            <Tooltip title="Find & Replace (Ctrl+F)">
              <IconButton 
                size="small" 
                onClick={() => setFindReplaceOpen(true)}
                disabled={readOnly}
              >
                <FindReplace />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Test & Submit */}
            {onTest && (
              <Button
                size="small"
                startIcon={<PlayArrow />}
                onClick={handleTest}
                disabled={isTesting || readOnly}
                variant="outlined"
              >
                {isTesting ? 'Testing...' : 'Test'}
              </Button>
            )}

            {onSubmit && (
              <Button
                size="small"
                startIcon={<Send />}
                onClick={handleSubmit}
                disabled={isSubmitting || readOnly}
                variant="contained"
                color="primary"
              >
                {isSubmitting ? 'Submitting...' : 'Submit (Ctrl+Enter)'}
              </Button>
            )}

            <Divider orientation="vertical" flexItem />

            {/* Editor Controls */}
            <Tooltip title="Editor Settings">
              <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                <Settings />
              </IconButton>
            </Tooltip>

            <Tooltip title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}>
              <IconButton size="small" onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Paper>

      {/* Monaco Editor */}
      <Box sx={{ height: editorHeight, bgcolor: settings.theme === 'vs-dark' ? '#1e1e1e' : '#ffffff' }}>
        <Editor
          height="100%"
          language={language === 'cpp' ? 'cpp' : language}
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorDidMount}
          theme={settings.theme}
          options={{
            readOnly,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: settings.minimap },
            fontSize: settings.fontSize,
            fontFamily: settings.fontFamily,
            lineHeight: settings.lineHeight,
            wordWrap: settings.wordWrap ? 'on' : 'off',
            lineNumbers: settings.lineNumbers ? 'on' : 'off',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true,
            },
          }}
        />
      </Box>

      {/* Test Input/Output Panel */}
      {onTest && (
        <Paper elevation={1} sx={{ mt: 1, p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Test with Custom Input</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Input"
              multiline
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ fontFamily: 'monospace' }}
            />
            <TextField
              label="Output"
              multiline
              rows={3}
              value={testOutput}
              variant="outlined"
              size="small"
              InputProps={{ readOnly: true }}
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        </Paper>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editor Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {/* Font Size */}
            <Box>
              <Typography gutterBottom>Font Size: {settings.fontSize}px</Typography>
              <Slider
                value={settings.fontSize}
                onChange={(_, value) => handleSettingsChange({ fontSize: value as number })}
                min={10}
                max={24}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            {/* Line Height */}
            <Box>
              <Typography gutterBottom>Line Height: {settings.lineHeight}</Typography>
              <Slider
                value={settings.lineHeight}
                onChange={(_, value) => handleSettingsChange({ lineHeight: value as number })}
                min={1.0}
                max={2.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            {/* Theme */}
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={settings.theme}
                label="Theme"
                onChange={(e) => handleSettingsChange({ theme: e.target.value as any })}
              >
                <MenuItem value="vs-light">Light</MenuItem>
                <MenuItem value="vs-dark">Dark</MenuItem>
                <MenuItem value="hc-black">High Contrast</MenuItem>
              </Select>
            </FormControl>

            {/* Font Family */}
            <FormControl fullWidth>
              <InputLabel>Font Family</InputLabel>
              <Select
                value={settings.fontFamily}
                label="Font Family"
                onChange={(e) => handleSettingsChange({ fontFamily: e.target.value })}
              >
                <MenuItem value='"JetBrains Mono", monospace'>JetBrains Mono</MenuItem>
                <MenuItem value='"Fira Code", monospace'>Fira Code</MenuItem>
                <MenuItem value='"Monaco", monospace'>Monaco</MenuItem>
                <MenuItem value='"Menlo", monospace'>Menlo</MenuItem>
                <MenuItem value='"Ubuntu Mono", monospace'>Ubuntu Mono</MenuItem>
                <MenuItem value='"Courier New", monospace'>Courier New</MenuItem>
              </Select>
            </FormControl>

            {/* Boolean Settings */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.wordWrap}
                    onChange={(e) => handleSettingsChange({ wordWrap: e.target.checked })}
                  />
                }
                label="Word Wrap"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.minimap}
                    onChange={(e) => handleSettingsChange({ minimap: e.target.checked })}
                  />
                }
                label="Show Minimap"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.lineNumbers}
                    onChange={(e) => handleSettingsChange({ lineNumbers: e.target.checked })}
                  />
                }
                label="Show Line Numbers"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoIndent}
                    onChange={(e) => handleSettingsChange({ autoIndent: e.target.checked })}
                  />
                }
                label="Auto Indent"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.formatOnPaste}
                    onChange={(e) => handleSettingsChange({ formatOnPaste: e.target.checked })}
                  />
                }
                label="Format on Paste"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snippets Dialog */}
      <Dialog open={findReplaceOpen} onClose={() => setFindReplaceOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Code Snippets - {language.toUpperCase()}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, pt: 1 }}>
            {Object.entries(CODE_SNIPPETS[language]).map(([name, snippet]) => (
              <Paper key={name} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>{name}</Typography>
                <Box
                  component="pre"
                  sx={{
                    fontSize: '0.8em',
                    fontFamily: 'monospace',
                    bgcolor: 'grey.100',
                    p: 1,
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: 100,
                    mb: 1,
                  }}
                >
                  {snippet}
                </Box>
                <Button
                  size="small"
                  onClick={() => insertSnippet(snippet)}
                  variant="outlined"
                  fullWidth
                >
                  Insert
                </Button>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFindReplaceOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CodeEditor;
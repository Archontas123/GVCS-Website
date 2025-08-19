/**
 * CS Club Hackathon Platform - Code Editor Component (Modern Admin Style)
 * Updated to match new design system
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import '../../styles/theme.css';

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
  initialLanguage?: string;
  value?: string;
  onChange?: (value: string) => void;
  onLanguageChange?: (language: string) => void;
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
  initialLanguage = 'cpp',
  value,
  onChange,
  onLanguageChange,
  onSubmit,
  onTest,
  height = '400px',
  readOnly = false,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [language, setLanguage] = useState<'cpp' | 'java' | 'python'>(initialLanguage as 'cpp' | 'java' | 'python');
  const [code, setCode] = useState<string>(value || initialCode || LANGUAGE_TEMPLATES.cpp);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [settings, setSettings] = useState<EditorSettings>({
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace',
    theme: 'vs-dark',
    lineHeight: 1.5,
    wordWrap: false,
    minimap: true,
    lineNumbers: true,
    autoIndent: true,
    formatOnPaste: true,
  });

  // Update parent component when code changes
  useEffect(() => {
    if (onChange) {
      onChange(code);
    }
  }, [code, onChange]);

  // Update parent component when language changes
  useEffect(() => {
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  }, [language, onLanguageChange]);

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
    <div
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        backgroundColor: '#ffffff',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : 'auto',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Editor Toolbar */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '48px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Language Selection */}
          <div style={{ position: 'relative' }}>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as 'cpp' | 'java' | 'python')}
              disabled={readOnly}
              style={{
                padding: '8px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
                color: '#374151',
                cursor: readOnly ? 'not-allowed' : 'pointer',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                minWidth: '100px',
              }}
            >
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
            </select>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db' }} />

          {/* Code Actions */}
          <button
            onClick={insertTemplate}
            disabled={readOnly}
            title="Insert Template"
            style={{
              background: 'none',
              border: 'none',
              color: readOnly ? '#9ca3af' : '#6b7280',
              cursor: readOnly ? 'not-allowed' : 'pointer',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!readOnly) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = readOnly ? '#9ca3af' : '#6b7280';
            }}
          >
            ↻
          </button>

          <button
            onClick={formatCode}
            disabled={readOnly}
            title="Format Code (Ctrl+Shift+F)"
            style={{
              background: 'none',
              border: 'none',
              color: readOnly ? '#9ca3af' : '#6b7280',
              cursor: readOnly ? 'not-allowed' : 'pointer',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!readOnly) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = readOnly ? '#9ca3af' : '#6b7280';
            }}
          >
            ⚏
          </button>

          <button
            onClick={copyCode}
            title="Copy Code"
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            📋
          </button>

          <button
            onClick={() => setSnippetsOpen(true)}
            disabled={readOnly}
            title="Code Snippets"
            style={{
              background: 'none',
              border: 'none',
              color: readOnly ? '#9ca3af' : '#6b7280',
              cursor: readOnly ? 'not-allowed' : 'pointer',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!readOnly) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = readOnly ? '#9ca3af' : '#6b7280';
            }}
          >
            📋
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Test & Submit */}
          {onTest && (
            <button
              onClick={handleTest}
              disabled={isTesting || readOnly}
              style={{
                background: isTesting || readOnly ? '#f3f4f6' : '#ffffff',
                color: isTesting || readOnly ? '#9ca3af' : '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isTesting || readOnly ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                if (!isTesting && !readOnly) {
                  e.currentTarget.style.borderColor = '#1d4ed8';
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.backgroundColor = isTesting || readOnly ? '#f3f4f6' : '#ffffff';
              }}
            >
              ▶ {isTesting ? 'Testing...' : 'Test'}
            </button>
          )}

          {onSubmit && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || readOnly}
              style={{
                background: isSubmitting || readOnly
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isSubmitting || readOnly ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                boxShadow: isSubmitting || readOnly
                  ? 'none'
                  : '0 4px 12px rgba(29, 78, 216, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !readOnly) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(29, 78, 216, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && !readOnly) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.25)';
                }
              }}
            >
              ↗ {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}

          <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db' }} />

          {/* Editor Controls */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Editor Settings"
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ⚙
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen'}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            {isFullscreen ? '⤡' : '⤢'}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div style={{ height: editorHeight, backgroundColor: settings.theme === 'vs-dark' ? '#1e1e1e' : '#ffffff' }}>
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
      </div>

      {/* Test Input/Output Panel */}
      {onTest && (
        <div style={{
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Test with Custom Input
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#6b7280',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Input
              </label>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: '#ffffff',
                  resize: 'vertical',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1d4ed8';
                  e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#6b7280',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Output
              </label>
              <textarea
                value={testOutput}
                readOnly
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: '#f9fafb',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Editor Settings
              </h2>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Font Size */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#374151',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>
                    Font Size: {settings.fontSize}px
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={24}
                    step={1}
                    value={settings.fontSize}
                    onChange={(e) => handleSettingsChange({ fontSize: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: '#e5e7eb',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Line Height */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#374151',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>
                    Line Height: {settings.lineHeight}
                  </label>
                  <input
                    type="range"
                    min={1.0}
                    max={2.0}
                    step={0.1}
                    value={settings.lineHeight}
                    onChange={(e) => handleSettingsChange({ lineHeight: parseFloat(e.target.value) })}
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: '#e5e7eb',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Theme */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#374151',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>
                    Theme
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => handleSettingsChange({ theme: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="vs-light">Light</option>
                    <option value="vs-dark">Dark</option>
                    <option value="hc-black">High Contrast</option>
                  </select>
                </div>

                {/* Font Family */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#374151',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>
                    Font Family
                  </label>
                  <select
                    value={settings.fontFamily}
                    onChange={(e) => handleSettingsChange({ fontFamily: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
                    <option value='"Fira Code", monospace'>Fira Code</option>
                    <option value='"Monaco", monospace'>Monaco</option>
                    <option value='"Menlo", monospace'>Menlo</option>
                    <option value='"Ubuntu Mono", monospace'>Ubuntu Mono</option>
                    <option value='"Courier New", monospace'>Courier New</option>
                  </select>
                </div>

                {/* Boolean Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#374151',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}>
                      Word Wrap
                    </span>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={settings.wordWrap}
                        onChange={(e) => handleSettingsChange({ wordWrap: e.target.checked })}
                        style={{ marginRight: '8px' }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#374151',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}>
                      Show Minimap
                    </span>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={settings.minimap}
                        onChange={(e) => handleSettingsChange({ minimap: e.target.checked })}
                        style={{ marginRight: '8px' }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#374151',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}>
                      Show Line Numbers
                    </span>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={settings.lineNumbers}
                        onChange={(e) => handleSettingsChange({ lineNumbers: e.target.checked })}
                        style={{ marginRight: '8px' }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#374151',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}>
                      Auto Indent
                    </span>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={settings.autoIndent}
                        onChange={(e) => handleSettingsChange({ autoIndent: e.target.checked })}
                        style={{ marginRight: '8px' }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#374151',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}>
                      Format on Paste
                    </span>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={settings.formatOnPaste}
                        onChange={(e) => handleSettingsChange({ formatOnPaste: e.target.checked })}
                        style={{ marginRight: '8px' }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snippets Modal */}
      {snippetsOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Code Snippets - {language.toUpperCase()}
              </h2>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px',
              }}>
                {Object.entries(CODE_SNIPPETS[language]).map(([name, snippet]) => (
                  <div key={name} style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                    backgroundColor: '#ffffff',
                  }}>
                    <h3 style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}>
                      {name}
                    </h3>
                    <pre style={{
                      fontSize: '0.8rem',
                      fontFamily: '"JetBrains Mono", monospace',
                      backgroundColor: '#f3f4f6',
                      padding: '12px',
                      borderRadius: '8px',
                      overflow: 'auto',
                      maxHeight: '100px',
                      marginBottom: '12px',
                      color: '#1f2937',
                    }}>
                      {snippet}
                    </pre>
                    <button
                      onClick={() => insertSnippet(snippet)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Insert
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setSnippetsOpen(false)}
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add interface export for compatibility
export type { CodeEditorProps };

export default CodeEditor;
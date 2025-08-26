/**
 * CS Club Hackathon Platform - Code Editor Test Page
 * Phase 5.3: Standalone page for testing Monaco Editor features
 */

import React from 'react';
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
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
      <div className="card mb-4">
        <div className="card-content">
          <h1 className="flex align-center" style={{ gap: '8px', marginBottom: '16px' }}>
            Monaco Code Editor Demo
          </h1>
          <p className="text-secondary">
            This page demonstrates the Monaco Editor integration with competitive programming features.
          </p>
        </div>
      </div>

      <div className="alert alert-info mb-4">
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Features to test:</strong>
        </p>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Switch between C++, Java, and Python languages</li>
          <li>Use keyboard shortcuts: Ctrl+Enter (submit), Ctrl+Shift+F (format), Ctrl+F (find)</li>
          <li>Click the settings icon to customize font, theme, and editor options</li>
          <li>Click the fullscreen icon for distraction-free coding</li>
          <li>Try the code snippets dialog (find/replace icon)</li>
          <li>Test with custom input using the test panel</li>
        </ul>
      </div>

      <div style={{ height: '600px' }}>
        <CodeEditor
          onSubmit={handleSubmit}
          onTest={handleTest}
          height="100%"
        />
      </div>

      <div className="card border mt-4" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="card-content">
          <h3 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '1rem' }}>
            Available Keyboard Shortcuts:
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '8px' 
          }}>
            <small className="text-secondary">Ctrl + Enter: Submit code</small>
            <small className="text-secondary">Ctrl + F: Find in code</small>
            <small className="text-secondary">Ctrl + H: Find and replace</small>
            <small className="text-secondary">Ctrl + Shift + F: Format code</small>
            <small className="text-secondary">Ctrl + /: Toggle comment</small>
            <small className="text-secondary">Alt + Click: Multiple cursors</small>
            <small className="text-secondary">Ctrl + D: Select next occurrence</small>
            <small className="text-secondary">F11: Toggle fullscreen</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditorTestPage;
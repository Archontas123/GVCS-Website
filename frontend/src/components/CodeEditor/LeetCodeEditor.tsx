import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import './LeetCodeEditor.css';

interface LeetCodeEditorProps {
  problemId: number;
  language: string;
  onLanguageChange: (language: string) => void;
  onCodeChange?: (code: string) => void;
  onTest?: (code: string, input: string) => void;
  onSubmit?: (code: string) => void;
  isLoading?: boolean;
  testResult?: {
    success: boolean;
    output: string;
    error: string;
    executionTime: number;
  } | null;
}

const LANGUAGES = [
  { id: 'cpp', name: 'C++', monaco: 'cpp' },
  { id: 'java', name: 'Java', monaco: 'java' },
  { id: 'python', name: 'Python', monaco: 'python' }
];

const LeetCodeEditor: React.FC<LeetCodeEditorProps> = ({
  problemId,
  language,
  onLanguageChange,
  onCodeChange,
  onTest,
  onSubmit,
  isLoading = false,
  testResult = null
}) => {
  const [code, setCode] = useState<string>('// Loading...');
  const [testInput, setTestInput] = useState<string>('');
  const [isLoadingSignature, setIsLoadingSignature] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load function signature and user's saved code
  const loadCode = useCallback(async () => {
    setIsLoadingSignature(true);
    try {
      const token = localStorage.getItem('teamToken');
      
      // Load user's saved code
      const response = await fetch(
        `/api/leetcode/problems/${problemId}/code/${language}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCode(data.data.code);
      } else {
        // Fallback to function signature if no saved code
        const signatureResponse = await fetch(
          `/api/leetcode/problems/${problemId}/signature/${language}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (signatureResponse.ok) {
          const signatureData = await signatureResponse.json();
          setCode(signatureData.data.signature);
        } else {
          setCode('// Error loading function signature');
        }
      }
    } catch (error) {
      console.error('Error loading code:', error);
      setCode('// Error loading function signature');
    } finally {
      setIsLoadingSignature(false);
    }
  }, [problemId, language]);

  // Auto-save user's code
  const saveCode = useCallback(async (codeToSave: string) => {
    if (isLoadingSignature || codeToSave === '// Loading...' || codeToSave === '// Error loading function signature') {
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('teamToken');
      
      const response = await fetch(
        `/api/leetcode/problems/${problemId}/code/${language}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code: codeToSave })
        }
      );

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving code:', error);
    } finally {
      setIsSaving(false);
    }
  }, [problemId, language, isLoadingSignature]);

  // Load code when component mounts or language changes
  useEffect(() => {
    loadCode();
  }, [loadCode]);

  // Handle code changes
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange?.(newCode);

    // Auto-save after 2 seconds of inactivity
    const saveTimer = setTimeout(() => {
      saveCode(newCode);
    }, 2000);

    return () => clearTimeout(saveTimer);
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    // Save current code before switching
    if (code && !isLoadingSignature) {
      saveCode(code);
    }
    onLanguageChange(newLanguage);
  };

  // Handle test execution
  const handleTest = () => {
    if (code && onTest) {
      saveCode(code); // Save before testing
      onTest(code, testInput);
    }
  };

  // Handle submission
  const handleSubmit = () => {
    if (code && onSubmit) {
      saveCode(code); // Save before submitting
      onSubmit(code);
    }
  };

  const currentLanguage = LANGUAGES.find(l => l.id === language);

  return (
    <div className="leetcode-editor">
      {/* Header */}
      <div className="editor-header">
        <div className="language-selector">
          {LANGUAGES.map(lang => (
            <button
              key={lang.id}
              className={`lang-btn ${language === lang.id ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.id)}
              disabled={isLoading || isLoadingSignature}
            >
              {lang.name}
            </button>
          ))}
        </div>
        
        <div className="editor-status">
          {isSaving && <span className="saving">Saving...</span>}
          {lastSaved && !isSaving && (
            <span className="saved">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Code Editor */}
      <div className="editor-container">
        <div className="editor-wrapper">
          <Editor
            height="400px"
            language={currentLanguage?.monaco}
            value={code}
            onChange={handleCodeChange}
            loading={isLoadingSignature ? 'Loading function signature...' : undefined}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              automaticLayout: true,
              wordWrap: 'on',
              tabSize: 4,
              insertSpaces: true
            }}
          />
        </div>
      </div>

      {/* Test Input */}
      <div className="test-section">
        <div className="test-input">
          <label htmlFor="test-input">Test Input (optional):</label>
          <textarea
            id="test-input"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter test input here..."
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="editor-actions">
          <button
            className="test-btn"
            onClick={handleTest}
            disabled={isLoading || isLoadingSignature || !code.trim()}
          >
            {isLoading ? 'Testing...' : 'Test Code'}
          </button>
          
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={isLoading || isLoadingSignature || !code.trim()}
          >
            {isLoading ? 'Submitting...' : 'Submit Solution'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          <div className="result-header">
            <span className="result-status">
              {testResult.success ? '✅ Test Passed' : '❌ Test Failed'}
            </span>
            <span className="execution-time">
              {testResult.executionTime}ms
            </span>
          </div>
          
          {testResult.output && (
            <div className="result-section">
              <strong>Output:</strong>
              <pre className="result-content">{testResult.output}</pre>
            </div>
          )}
          
          {testResult.error && (
            <div className="result-section">
              <strong>Error:</strong>
              <pre className="result-content error">{testResult.error}</pre>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="editor-help">
        <div className="help-item">
          <strong>💡 LeetCode Style:</strong> Only write your solution function - I/O is handled automatically
        </div>
        <div className="help-item">
          <strong>💾 Auto-save:</strong> Your code is automatically saved as you type
        </div>
        <div className="help-item">
          <strong>🧪 Testing:</strong> Use the test button to run your code with custom input
        </div>
      </div>
    </div>
  );
};

export default LeetCodeEditor;
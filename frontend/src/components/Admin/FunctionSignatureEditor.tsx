import React, { useState, useEffect } from 'react';
import './FunctionSignatureEditor.css';

interface FunctionSignatures {
  cpp: string;
  java: string;
  python: string;
}

interface IOWrappers {
  cpp: string;
  java: string;
  python: string;
}

interface Props {
  problemId?: number;
  onSave: (signatures: FunctionSignatures, wrappers: IOWrappers) => void;
  onCancel: () => void;
}

const FunctionSignatureEditor: React.FC<Props> = ({ problemId, onSave, onCancel }) => {
  const [signatures, setSignatures] = useState<FunctionSignatures>({
    cpp: `int solution(vector<int>& nums) {
    // Your solution here
    return 0;
}`,
    java: `public int solution(int[] nums) {
    // Your solution here
    return 0;
}`,
    python: `def solution(nums):
    # Your solution here
    return 0`
  });

  const [wrappers, setWrappers] = useState<IOWrappers>({
    cpp: `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

{USER_FUNCTION}

int main() {
    // Parse JSON input and call user function
    // Output JSON result
    return 0;
}`,
    java: `import java.util.*;
import java.io.*;

public class Solution {
    {USER_FUNCTION}
    
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // Parse JSON input and call user function
        // Output JSON result
    }
}`,
    python: `import json
import sys

{USER_FUNCTION}

if __name__ == "__main__":
    # Parse JSON input and call user function
    # Output JSON result
    pass`
  });

  const [activeTab, setActiveTab] = useState<'cpp' | 'java' | 'python'>('cpp');
  const [activeSection, setActiveSection] = useState<'signature' | 'wrapper'>('signature');

  useEffect(() => {
    if (problemId) {
      loadExistingTemplates();
    }
  }, [problemId]);

  const loadExistingTemplates = async () => {
    try {
      const response = await fetch(`/api/admin/problems/${problemId}/templates`);
      if (response.ok) {
        const data = await response.json();
        setSignatures(data.signatures);
        setWrappers(data.wrappers);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSignatureChange = (language: keyof FunctionSignatures, value: string) => {
    setSignatures(prev => ({
      ...prev,
      [language]: value
    }));
  };

  const handleWrapperChange = (language: keyof IOWrappers, value: string) => {
    setWrappers(prev => ({
      ...prev,
      [language]: value
    }));
  };

  const handleSave = () => {
    onSave(signatures, wrappers);
  };

  const getLanguageDisplay = (lang: string) => {
    const displays = {
      cpp: 'C++',
      java: 'Java',
      python: 'Python'
    };
    return displays[lang as keyof typeof displays];
  };

  return (
    <div className="function-signature-editor">
      <div className="editor-header">
        <h3>Function Signature & I/O Template Editor</h3>
        <div className="editor-controls">
          <button 
            className={`section-btn ${activeSection === 'signature' ? 'active' : ''}`}
            onClick={() => setActiveSection('signature')}
          >
            Function Signatures (User Sees)
          </button>
          <button 
            className={`section-btn ${activeSection === 'wrapper' ? 'active' : ''}`}
            onClick={() => setActiveSection('wrapper')}
          >
            I/O Wrappers (Hidden)
          </button>
        </div>
      </div>

      <div className="language-tabs">
        {(['cpp', 'java', 'python'] as const).map(lang => (
          <button
            key={lang}
            className={`tab ${activeTab === lang ? 'active' : ''}`}
            onClick={() => setActiveTab(lang)}
          >
            {getLanguageDisplay(lang)}
          </button>
        ))}
      </div>

      <div className="editor-content">
        {activeSection === 'signature' && (
          <div className="signature-editor">
            <label htmlFor={`signature-${activeTab}`}>
              Function Signature ({getLanguageDisplay(activeTab)}) - What users see and edit:
            </label>
            <textarea
              id={`signature-${activeTab}`}
              value={signatures[activeTab]}
              onChange={(e) => handleSignatureChange(activeTab, e.target.value)}
              className="code-textarea signature"
              rows={8}
              placeholder={`Enter the function signature for ${getLanguageDisplay(activeTab)}...`}
            />
            <div className="signature-help">
              <h4>Tips for Function Signatures:</h4>
              <ul>
                <li>Users only see and edit this function</li>
                <li>Include parameter names that match your I/O parsing</li>
                <li>Add helpful comments inside the function body</li>
                <li>Make sure return type matches expected output format</li>
              </ul>
            </div>
          </div>
        )}

        {activeSection === 'wrapper' && (
          <div className="wrapper-editor">
            <label htmlFor={`wrapper-${activeTab}`}>
              I/O Wrapper ({getLanguageDisplay(activeTab)}) - Hidden from users:
            </label>
            <textarea
              id={`wrapper-${activeTab}`}
              value={wrappers[activeTab]}
              onChange={(e) => handleWrapperChange(activeTab, e.target.value)}
              className="code-textarea wrapper"
              rows={15}
              placeholder={`Enter the I/O wrapper template for ${getLanguageDisplay(activeTab)}...`}
            />
            <div className="wrapper-help">
              <h4>I/O Wrapper Guidelines:</h4>
              <ul>
                <li>Use <code>&#123;USER_FUNCTION&#125;</code> placeholder for user's function</li>
                <li>Handle JSON input parsing from stdin</li>
                <li>Call user's function with parsed parameters</li>
                <li>Output result in expected format</li>
                <li>Include all necessary imports/includes</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="editor-actions">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={handleSave}>
          Save Templates
        </button>
      </div>
    </div>
  );
};

export default FunctionSignatureEditor;
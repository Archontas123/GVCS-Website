import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { MdLink, MdImage, MdClose } from 'react-icons/md';

const markdownStyles = `
  .markdown-preview h1,
  .markdown-preview h2,
  .markdown-preview h3,
  .markdown-preview h4,
  .markdown-preview h5,
  .markdown-preview h6 {
    color: #1e293b;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .markdown-preview p {
    margin-bottom: 1rem;
  }
  
  .markdown-preview ul,
  .markdown-preview ol {
    padding-left: 2rem;
    margin-bottom: 1rem;
  }
  
  .markdown-preview code {
    background-color: #e2e8f0;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 14px;
  }
  
  .markdown-preview pre {
    background-color: #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    overflow: auto;
    margin-bottom: 1rem;
  }
  
  .markdown-preview a {
    color: #3b82f6;
    text-decoration: underline;
  }
`;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  minRows?: number;
  maxLength?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  label,
  minRows = 6,
  maxLength,
}) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (beforeText: string, afterText: string = '') => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + beforeText + selectedText + afterText + value.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + beforeText.length, start + beforeText.length + selectedText.length);
    }, 0);
  };

  const handleFormatClick = (format: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    switch (format) {
      case 'bold':
        insertText('**', '**');
        break;
      case 'italic':
        insertText('*', '*');
        break;
      case 'bulletList':
        const bulletText = selectedText || 'List item';
        insertText('\n- ', '');
        break;
      case 'numberList':
        const numberText = selectedText || 'List item';
        insertText('\n1. ', '');
        break;
      case 'code':
        if (selectedText.includes('\n')) {
          insertText('```\n', '\n```');
        } else {
          insertText('`', '`');
        }
        break;
      case 'link':
        setLinkText(selectedText);
        setLinkUrl('');
        setLinkModalOpen(true);
        break;
      case 'image':
        setImageAlt(selectedText || 'Image description');
        setImageUrl('');
        setImageModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleInsertLink = () => {
    const linkMarkdown = `[${linkText}](${linkUrl})`;
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + linkMarkdown + value.substring(end);
    onChange(newText);
    setLinkModalOpen(false);
    setLinkText('');
    setLinkUrl('');
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + linkMarkdown.length, start + linkMarkdown.length);
    }, 0);
  };

  const handleInsertImage = () => {
    const imageMarkdown = `![${imageAlt}](${imageUrl})`;
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + imageMarkdown + value.substring(end);
    onChange(newText);
    setImageModalOpen(false);
    setImageAlt('');
    setImageUrl('');
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
    }, 0);
  };

  const characterCount = value.length;
  const isOverLimit = maxLength && characterCount > maxLength;

  return (
    <div>
      <style>{markdownStyles}</style>
      {label && (
        <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '16px' }}>
          {label}
        </div>
      )}
      
      <div style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{
          backgroundColor: '#f8fafc',
          minHeight: '48px',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
            <button
              onClick={() => handleFormatClick('bold')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => handleFormatClick('italic')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <em>I</em>
            </button>
            <button
              onClick={() => handleFormatClick('bulletList')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              •
            </button>
            <button
              onClick={() => handleFormatClick('numberList')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              1.
            </button>
            <button
              onClick={() => handleFormatClick('code')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              &lt;/&gt;
            </button>
            <button
              onClick={() => handleFormatClick('link')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <MdLink />
            </button>
            <button
              onClick={() => handleFormatClick('image')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <MdImage />
            </button>
          </div>
          
          <button
            onClick={() => setPreviewModalOpen(true)}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Preview
          </button>
        </div>

        <div style={{ padding: 0 }}>
          <textarea
            ref={textAreaRef}
            rows={minRows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              padding: '16px',
              fontSize: '14px',
              lineHeight: 1.5,
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {maxLength && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'right',
          }}>
            <span style={{
              color: isOverLimit ? '#dc2626' : '#64748b',
              fontWeight: 500,
              fontSize: '12px'
            }}>
              Characters left: {maxLength - characterCount}
            </span>
          </div>
        )}
      </div>

      {previewModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Preview</h2>
              <button
                onClick={() => setPreviewModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <MdClose />
              </button>
            </div>
            <div style={{ padding: '24px', flex: 1, overflow: 'auto' }}>
              <div style={{
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                lineHeight: 1.6,
                minHeight: '200px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}>
                {value ? (
                  <div className="markdown-preview">
                    <ReactMarkdown>{value}</ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                    No content to preview
                  </div>
                )}
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setPreviewModalOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  color: '#64748b',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {linkModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            padding: '24px'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Insert Link</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  URL
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setLinkModalOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInsertLink}
                disabled={!linkText || !linkUrl}
                style={{
                  backgroundColor: !linkText || !linkUrl ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: !linkText || !linkUrl ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {imageModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            padding: '24px'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Insert Image</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Alt Text (Description)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Image description for accessibility"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Image URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setImageModalOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInsertImage}
                disabled={!imageAlt || !imageUrl}
                style={{
                  backgroundColor: !imageAlt || !imageUrl ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: !imageAlt || !imageUrl ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
/**
 * Rich Text Editor Component
 * Mimics the editor shown in the problem creation screenshot
 */

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  TextField,
  IconButton,
  Toolbar,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  Code,
  Link,
  Image,
  Close,
} from '@mui/icons-material';

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
    
    // Set cursor position after the inserted text
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
          // Multi-line code block
          insertText('```\n', '\n```');
        } else {
          // Inline code
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
    <Box>
      {label && (
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      
      <Paper 
        variant="outlined" 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Toolbar */}
        <Toolbar 
          variant="dense" 
          sx={{ 
            backgroundColor: '#f8fafc',
            minHeight: '48px !important',
            borderBottom: '1px solid #e2e8f0',
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
            <IconButton 
              size="small" 
              onClick={() => handleFormatClick('bold')}
              sx={{ color: '#64748b' }}
            >
              <FormatBold fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleFormatClick('italic')}
              sx={{ color: '#64748b' }}
            >
              <FormatItalic fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleFormatClick('bulletList')}
              sx={{ color: '#64748b' }}
            >
              <FormatListBulleted fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleFormatClick('numberList')}
              sx={{ color: '#64748b' }}
            >
              <FormatListNumbered fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleFormatClick('code')}
              sx={{ color: '#64748b' }}
            >
              <Code fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleFormatClick('link')}
              sx={{ color: '#64748b' }}
            >
              <Link fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleFormatClick('image')}
              sx={{ color: '#64748b' }}
            >
              <Image fontSize="small" />
            </IconButton>
          </Box>
          
          <Button
            size="small"
            variant="outlined"
            onClick={() => setPreviewModalOpen(true)}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              borderColor: '#cbd5e1',
              fontSize: '0.75rem',
              py: 0.5,
              px: 1.5,
              minWidth: 'auto',
            }}
          >
            Preview
          </Button>
        </Toolbar>

        {/* Editor Area */}
        <Box sx={{ p: 0 }}>
          <TextField
            multiline
            fullWidth
            minRows={minRows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            variant="standard"
            inputRef={textAreaRef}
            InputProps={{
              disableUnderline: true,
              sx: {
                p: 2,
                fontSize: '0.875rem',
                lineHeight: 1.5,
                '& textarea': {
                  resize: 'vertical',
                },
              },
            }}
          />
        </Box>

        {/* Character Count */}
        {maxLength && (
          <Box 
            sx={{ 
              px: 2, 
              py: 1, 
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'right',
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: isOverLimit ? '#dc2626' : '#64748b',
                fontWeight: 500,
              }}
            >
              Characters left: {maxLength - characterCount}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Preview Modal */}
      <Dialog 
        open={previewModalOpen} 
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '80vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
        }}>
          <Typography variant="h6">Preview</Typography>
          <IconButton onClick={() => setPreviewModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              lineHeight: 1.6,
              minHeight: '200px',
              p: 2,
              backgroundColor: '#f8fafc',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                color: '#1e293b',
                marginTop: '1rem',
                marginBottom: '0.5rem',
              },
              '& p': {
                marginBottom: '1rem',
              },
              '& ul, & ol': {
                paddingLeft: '2rem',
                marginBottom: '1rem',
              },
              '& code': {
                backgroundColor: '#e2e8f0',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.25rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
              '& pre': {
                backgroundColor: '#e2e8f0',
                padding: '1rem',
                borderRadius: '0.5rem',
                overflow: 'auto',
                marginBottom: '1rem',
              },
              '& pre code': {
                backgroundColor: 'transparent',
                padding: 0,
              },
              '& a': {
                color: '#3b82f6',
                textDecoration: 'underline',
              },
              '& strong': {
                fontWeight: 600,
              },
              '& em': {
                fontStyle: 'italic',
              },
            }}
          >
            {value ? (
              <ReactMarkdown>{value}</ReactMarkdown>
            ) : (
              <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No content to preview
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPreviewModalOpen(false)}
            sx={{
              textTransform: 'none',
              color: '#64748b',
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link Modal */}
      <Dialog
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle>Insert Link</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Link Text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              fullWidth
              variant="outlined"
            />
            <TextField
              label="URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="https://example.com"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleInsertLink} 
            variant="contained"
            disabled={!linkText || !linkUrl}
            sx={{ textTransform: 'none' }}
          >
            Insert Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Modal */}
      <Dialog
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle>Insert Image</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Alt Text (Description)"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="Image description for accessibility"
            />
            <TextField
              label="Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="https://example.com/image.jpg"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleInsertImage} 
            variant="contained"
            disabled={!imageAlt || !imageUrl}
            sx={{ textTransform: 'none' }}
          >
            Insert Image
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RichTextEditor;
/**
 * Tag Input Component
 * For adding and managing tags for problems
 */

import React, { useState, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  Chip,
  Typography,
} from '@mui/material';
import { Add } from '@mui/icons-material';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'add a tag',
  label,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim().toLowerCase();
    if (trimmedValue && !tags.includes(trimmedValue)) {
      onChange([...tags, trimmedValue]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Box>
      {label && (
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      
      <TextField
        fullWidth
        variant="outlined"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        onBlur={addTag}
        placeholder={placeholder}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: '#ffffff',
          },
        }}
      />

      {tags.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              onDelete={() => removeTag(tag)}
              size="small"
              sx={{
                backgroundColor: '#f1f5f9',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                '& .MuiChip-deleteIcon': {
                  color: '#64748b',
                  '&:hover': {
                    color: '#1e293b',
                  },
                },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TagInput;
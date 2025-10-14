import React from 'react';

interface DateTimePickerProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  min?: string | null | undefined;
  disabled?: boolean;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  min,
  disabled = false
}) => {
  const formatDateTimeLocal = (isoString: string | null | undefined): string => {
    // Handle null/undefined/empty values for manual control contests
    if (!isoString) {
      return '';
    }
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toISOString().slice(0, 16);
    } catch (error) {
      console.warn('Invalid date format:', isoString);
      return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localDateTime = e.target.value;
    if (localDateTime) {
      const isoString = new Date(localDateTime).toISOString();
      onChange(isoString);
    } else {
      // Allow clearing the date for manual control contests
      onChange('');
    }
  };

  return (
    <input
      type="datetime-local"
      value={formatDateTimeLocal(value)}
      onChange={handleChange}
      min={min ? formatDateTimeLocal(min) : undefined}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '12px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '1rem',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        transition: 'border-color 0.2s ease',
        backgroundColor: disabled ? '#f8f9fa' : 'white',
        color: disabled ? '#6b7280' : '#1f2937',
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = '#1d4ed8';
          e.currentTarget.style.outline = 'none';
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    />
  );
};

export default DateTimePicker;
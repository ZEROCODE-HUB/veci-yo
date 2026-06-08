import { useState } from 'react';
import theme from '../../config/theme';

export default function InputField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  type = 'text',
  rows = 3,
  error = '',
  showEditIcon = true,
  onFocus,
  onBlur,
  style = {},
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.borderFocus
      : theme.colors.border;

  const baseStyle = {
    width: '100%',
    background: theme.colors.bgCard,
    borderRadius: theme.radius['2xl'],
    padding: '13px 16px',
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    fontFamily: theme.fonts.family,
    border: `1.5px solid ${borderColor}`,
    outline: 'none',
    boxShadow: focused ? `0 0 0 3px ${theme.colors.primaryLight}` : theme.shadows.card,
    resize: 'none',
    transition: `border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast}`,
    ...style,
  };

  const handleFocus = (e) => { setFocused(true); onFocus?.(e); };
  const handleBlur = (e) => { setFocused(false); onBlur?.(e); };

  return (
    <div>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: theme.fonts.sizes.sm,
            color: theme.colors.textSecondary,
            marginBottom: '6px',
            fontWeight: theme.fonts.weights.medium,
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {multiline ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={rows}
            style={baseStyle}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            style={baseStyle}
          />
        )}
        {showEditIcon && (
          <span
            style={{
              position: 'absolute',
              right: '14px',
              top: multiline ? '14px' : '50%',
              transform: multiline ? 'none' : 'translateY(-50%)',
              color: theme.colors.textMuted,
              pointerEvents: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </span>
        )}
      </div>
      {error && (
        <span style={{
          display: 'block',
          marginTop: '6px',
          fontSize: theme.fonts.sizes.xs,
          color: theme.colors.danger,
          fontWeight: theme.fonts.weights.medium,
        }}>
          {error}
        </span>
      )}
    </div>
  );
}

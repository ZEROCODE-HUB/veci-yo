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
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const esContrasena = type === 'password';
  const inputType = esContrasena ? (mostrarContrasena ? 'text' : 'password') : type;

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
            type={inputType}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            style={baseStyle}
          />
        )}
        {esContrasena ? (
          <button
            type="button"
            onClick={() => setMostrarContrasena(v => !v)}
            aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.textMuted,
              display: 'flex',
              padding: 0,
            }}
          >
            {mostrarContrasena ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            )}
          </button>
        ) : showEditIcon && (
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

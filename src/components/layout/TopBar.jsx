import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { edificios } from '../../data/mockData';
import theme from '../../config/theme';

export default function TopBar() {
  const { edificioActivo, setEdificioActivo } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#fff',
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        position: 'relative',
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}>
          🦉
        </div>
        <span style={{
          fontSize: theme.fonts.sizes.xl,
          fontWeight: theme.fonts.weights.bold,
          color: theme.colors.text,
          fontFamily: theme.fonts.family,
        }}>
          Veciyo
        </span>
      </div>

      {/* Building selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: theme.fonts.sizes.sm,
            color: theme.colors.text,
            fontWeight: theme.fonts.weights.medium,
            fontFamily: theme.fonts.family,
          }}
        >
          <span style={{ textDecoration: 'underline' }}>{edificioActivo}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {open && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#fff',
              borderRadius: theme.radius.md,
              boxShadow: theme.shadows.md,
              border: `1px solid ${theme.colors.border}`,
              minWidth: '200px',
              zIndex: 200,
              overflow: 'hidden',
              animation: 'slideDown 150ms ease',
            }}
          >
            {edificios.map(e => (
              <button
                key={e}
                onClick={() => { setEdificioActivo(e); setOpen(false); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: e === edificioActivo ? theme.colors.primaryLight : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: theme.fonts.sizes.sm,
                  color: theme.colors.text,
                  fontFamily: theme.fonts.family,
                  borderBottom: `1px solid ${theme.colors.borderLight}`,
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notification bell */}
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: theme.colors.danger,
          border: '2px solid #fff',
        }} />
      </button>
    </div>
  );
}

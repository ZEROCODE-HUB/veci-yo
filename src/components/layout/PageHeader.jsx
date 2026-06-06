import { useNavigate } from 'react-router-dom';
import theme from '../../config/theme';

export default function PageHeader({ title, onBack, action }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        background: '#fff',
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        gap: '12px',
        flexShrink: 0,
      }}
    >
      <button
        onClick={onBack || (() => navigate(-1))}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme.colors.text,
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
          flexShrink: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <h1
        style={{
          flex: 1,
          fontSize: theme.fonts.sizes.lg,
          fontWeight: theme.fonts.weights.bold,
          color: theme.colors.text,
          textAlign: 'center',
          fontFamily: theme.fonts.family,
        }}
      >
        {title}
      </h1>

      <div style={{ flexShrink: 0 }}>
        {action || <div style={{ width: '30px' }} />}
      </div>
    </div>
  );
}

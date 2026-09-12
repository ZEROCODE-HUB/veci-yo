import theme from '../../config/theme';

export default function SearchBar({ value, onChange, placeholder = 'Búsqueda' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: theme.colors.bgCard,
        borderRadius: theme.radius.full,
        padding: '10px 16px',
        gap: '8px',
        boxShadow: theme.shadows.sm,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          fontSize: theme.fonts.sizes.base,
          color: theme.colors.text,
          background: 'none',
          outline: 'none',
          border: 'none',
          fontFamily: theme.fonts.family,
        }}
      />
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </div>
  );
}

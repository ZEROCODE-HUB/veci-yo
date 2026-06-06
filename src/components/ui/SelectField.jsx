import theme from '../../config/theme';

export default function SelectField({ label, value, options, onChange, placeholder }) {
  return (
    <div
      style={{
        background: theme.colors.bgCard,
        borderRadius: theme.radius['2xl'],
        padding: '13px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: theme.shadows.card,
        cursor: 'pointer',
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      {label && !value && (
        <span style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base }}>
          {label}
        </span>
      )}
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontSize: theme.fonts.sizes.base,
          color: value ? theme.colors.text : theme.colors.textSecondary,
          fontFamily: theme.fonts.family,
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <option value="">{label || placeholder || 'Seleccione...'}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  );
}

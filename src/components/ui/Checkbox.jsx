import theme from '../../config/theme';

export default function Checkbox({ checked, onChange, label, error = false }) {
  return (
    <label
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
        fontFamily: theme.fonts.family,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: '22px',
          height: '22px',
          borderRadius: theme.radius.sm,
          border: `1.5px solid ${error ? theme.colors.danger : checked ? theme.colors.text : theme.colors.border}`,
          background: checked ? theme.colors.text : theme.colors.bgCard,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: `background ${theme.transitions.fast}, border-color ${theme.transitions.fast}`,
        }}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span
        style={{
          fontSize: theme.fonts.sizes.sm,
          color: theme.colors.text,
          lineHeight: theme.fonts.lineHeights.snug,
        }}
      >
        {label}
      </span>
    </label>
  );
}

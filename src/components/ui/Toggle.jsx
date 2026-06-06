import theme from '../../config/theme';

export default function Toggle({ value, onChange, label, labelRight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {label && (
        <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
          {label}
        </span>
      )}
      <div
        onClick={() => onChange(!value)}
        style={{
          position: 'relative',
          width: '44px',
          height: '26px',
          borderRadius: theme.radius.full,
          background: value ? theme.colors.primary : theme.colors.statusGray,
          cursor: 'pointer',
          transition: 'background 200ms',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: value ? '21px' : '3px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'left 200ms',
          }}
        />
      </div>
      {labelRight && (
        <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
          {labelRight}
        </span>
      )}
    </div>
  );
}

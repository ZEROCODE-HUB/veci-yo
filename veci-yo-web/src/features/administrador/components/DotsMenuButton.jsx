import theme from '../../../config/theme';

export default function DotsMenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Más acciones"
      style={{
        background: theme.colors.bgMuted,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '50%',
        cursor: 'pointer',
        color: theme.colors.text,
        fontSize: '20px',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: theme.shadows.sm,
      }}
    >
      ⋮
    </button>
  );
}

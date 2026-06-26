import theme from '../../config/theme';

export default function BottomSheet({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.colors.bgOverlay,
        zIndex: 999,
        display: 'flex',
        alignItems: 'flex-end',
        animation: 'fadeIn 200ms ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0`,
          width: '100%',
          overflow: 'hidden',
          animation: 'slideUp 250ms ease',
          boxShadow: theme.shadows.modal,
          paddingBottom: '24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function BottomSheetOption({ label, onPress, variant = 'default' }) {
  const colors = {
    default: theme.colors.text,
    danger: theme.colors.danger,
    primary: theme.colors.primary,
  };

  return (
    <button
      onClick={onPress}
      style={{
        width: '100%',
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.medium,
        color: colors[variant] || colors.default,
        background: 'none',
        border: 'none',
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        cursor: 'pointer',
        fontFamily: theme.fonts.family,
      }}
    >
      {label}
    </button>
  );
}

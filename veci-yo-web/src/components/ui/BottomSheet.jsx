import { createPortal } from 'react-dom';
import theme from '../../config/theme';

export default function BottomSheet({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.colors.bgOverlay,
        zIndex: 99999,
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
          paddingBottom: '34px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function BottomSheetOption({ label, onPress, variant = 'default', disabled = false }) {
  const colors = {
    default: theme.colors.text,
    danger: theme.colors.danger,
    primary: theme.colors.primary,
  };

  return (
    <button
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.medium,
        color: disabled ? theme.colors.textMuted : (colors[variant] || colors.default),
        background: 'none',
        border: 'none',
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: theme.fonts.family,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
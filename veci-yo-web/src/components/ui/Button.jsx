import theme from '../../config/theme';

const variants = {
  primary: {
    background: theme.colors.primary,
    color: theme.colors.text,
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: theme.colors.text,
    border: `1.5px solid ${theme.colors.border}`,
  },
  danger: {
    background: theme.colors.danger,
    color: '#fff',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: theme.colors.textSecondary,
    border: 'none',
  },
  blue: {
    background: theme.colors.secondary,
    color: '#fff',
    border: 'none',
  },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  style = {},
  type = 'button',
}) {
  const v = variants[variant] || variants.primary;

  const sizes = {
    sm: { padding: '8px 16px', fontSize: theme.fonts.sizes.sm, height: '36px', borderRadius: theme.radius['2xl'] },
    md: { padding: '13px 20px', fontSize: theme.fonts.sizes.base, height: '50px', borderRadius: theme.radius['2xl'] },
    lg: { padding: '16px 24px', fontSize: theme.fonts.sizes.md, height: '56px', borderRadius: theme.radius['2xl'] },
  };

  const s = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : 'auto',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontWeight: theme.fonts.weights.semibold,
        transition: 'opacity 150ms, transform 100ms',
        fontFamily: theme.fonts.family,
        whiteSpace: 'nowrap',
        ...s,
        ...v,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/**
 * VECIYO DESIGN SYSTEM - DESIGN TOKENS
 * Centraliza colores, tipografía, espaciados, radios y sombras.
 * Modificar aquí afecta toda la aplicación.
 */

const theme = {
  colors: {
    primary: '#F5B800',
    primaryDark: '#D4A000',
    primaryLight: '#FFF8E1',
    secondary: '#2563EB',
    secondaryLight: '#EFF6FF',
    danger: '#EF4444',
    dangerDark: '#DC2626',
    dangerLight: '#FEE2E2',
    success: '#16A34A',
    successLight: '#DCFCE7',
    warning: '#F59E0B',

    bgApp: '#F2F2F7',
    bgCard: '#FFFFFF',
    bgMuted: '#F9FAFB',
    bgOverlay: 'rgba(0,0,0,0.5)',

    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',
    textPrimary: '#F5B800',

    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderFocus: '#F5B800',

    navActive: '#F5B800',
    navInactive: '#6B7280',
    navBg: '#FFFFFF',

    // Status badge colors
    statusYellow: '#F5B800',
    statusYellowText: '#111827',
    statusGray: '#E5E7EB',
    statusGrayText: '#6B7280',
    statusBlue: '#2563EB',
    statusBlueText: '#FFFFFF',
    statusGreen: '#16A34A',
    statusGreenText: '#FFFFFF',
    statusRed: '#EF4444',
    statusRedText: '#FFFFFF',
    statusOrange: '#F59E0B',
    statusOrangeText: '#111827',

    // Icon area (amber tone for feature/zone icons)
    iconAmber: '#F59E0B',
    iconAmberDark: '#92400E',
    iconAmberBg: '#FEF3C7',
  },

  fonts: {
    // Change this to update typography globally
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    sizes: {
      '2xs': '10px',
      xs: '12px',
      sm: '13px',
      base: '15px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '22px',
      '3xl': '26px',
      '4xl': '32px',
      '5xl': '40px',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeights: {
      tight: 1.2,
      snug: 1.35,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    card: '0 2px 8px rgba(0,0,0,0.08)',
    md: '0 4px 16px rgba(0,0,0,0.10)',
    lg: '0 8px 32px rgba(0,0,0,0.12)',
    modal: '0 -4px 32px rgba(0,0,0,0.15)',
    fab: '0 4px 20px rgba(245,184,0,0.35)',
  },

  transitions: {
    fast: '120ms ease',
    base: '200ms ease',
    slow: '300ms ease',
  },
};

export default theme;

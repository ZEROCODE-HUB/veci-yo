/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Colores IDÉNTICOS a theme.js
      colors: {
        primary: {
          DEFAULT: '#F5B800',    // theme.colors.primary
          dark: '#D4A000',       // theme.colors.primaryDark
          light: '#FFF8E1',      // theme.colors.primaryLight
        },
        secondary: {
          DEFAULT: '#2563EB',    // theme.colors.secondary
          light: '#EFF6FF',      // theme.colors.secondaryLight
        },
        danger: {
          DEFAULT: '#EF4444',    // theme.colors.danger
          dark: '#DC2626',       // theme.colors.dangerDark
          light: '#FEE2E2',      // theme.colors.dangerLight
        },
        success: {
          DEFAULT: '#16A34A',    // theme.colors.success
          light: '#DCFCE7',      // theme.colors.successLight
        },
        warning: {
          DEFAULT: '#F59E0B',    // theme.colors.warning
          light: '#FEF3C7',      // theme.colors.warningLight
        },
        // bgApp, bgCard, bgMuted, bgOverlay
        'bg-app': '#F2F2F7',     // theme.colors.bgApp
        'bg-card': '#FFFFFF',    // theme.colors.bgCard
        'bg-muted': '#F9FAFB',   // theme.colors.bgMuted
        'bg-overlay': 'rgba(0,0,0,0.5)',  // theme.colors.bgOverlay
        // text
        'text-primary': '#111827',   // theme.colors.text
        'text-secondary': '#6B7280', // theme.colors.textSecondary
        'text-muted': '#9CA3AF',     // theme.colors.textMuted
        'text-inverse': '#FFFFFF',   // theme.colors.textInverse
        'text-amber': '#F5B800',     // theme.colors.textPrimary
        // border
        border: '#E5E7EB',           // theme.colors.border
        'border-light': '#F3F4F6',   // theme.colors.borderLight
        'border-focus': '#F5B800',   // theme.colors.borderFocus
        // nav
        'nav-active': '#F5B800',     // theme.colors.navActive
        'nav-inactive': '#6B7280',   // theme.colors.navInactive
        'nav-bg': '#FFFFFF',         // theme.colors.navBg
        // status
        'status-yellow': '#F5B800',
        'status-yellow-text': '#111827',
        'status-gray': '#E5E7EB',
        'status-gray-text': '#6B7280',
        'status-blue': '#2563EB',
        'status-blue-text': '#FFFFFF',
        'status-green': '#16A34A',
        'status-green-text': '#FFFFFF',
        'status-red': '#EF4444',
        'status-red-text': '#FFFFFF',
        'status-orange': '#F59E0B',
        'status-orange-text': '#111827',
        // icon
        'icon-amber': '#F59E0B',
        'icon-amber-dark': '#92400E',
        'icon-amber-bg': '#FEF3C7',
        // gray scale
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      // Tipografía IDÉNTICA a theme.js
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': '10px',    // theme.fonts.sizes['2xs']
        xs: '12px',       // theme.fonts.sizes.xs
        sm: '13px',       // theme.fonts.sizes.sm
        base: '15px',     // theme.fonts.sizes.base
        md: '16px',       // theme.fonts.sizes.md
        lg: '18px',       // theme.fonts.sizes.lg
        xl: '20px',       // theme.fonts.sizes.xl
        '2xl': '22px',    // theme.fonts.sizes['2xl']
        '3xl': '26px',    // theme.fonts.sizes['3xl']
        '4xl': '32px',    // theme.fonts.sizes['4xl']
        '5xl': '40px',    // theme.fonts.sizes['5xl']
      },
      // Border radius IDÉNTICOS a theme.js
      borderRadius: {
        sm: '8px',        // theme.radius.sm
        md: '12px',       // theme.radius.md
        lg: '16px',       // theme.radius.lg
        xl: '20px',       // theme.radius.xl
        '2xl': '24px',    // theme.radius['2xl']
        '3xl': '32px',    // theme.radius['3xl']
        full: '9999px',   // theme.radius.full
      },
      // Sombras IDÉNTICAS a theme.js
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',           // theme.shadows.sm
        card: '0 2px 8px rgba(0,0,0,0.08)',         // theme.shadows.card
        md: '0 4px 16px rgba(0,0,0,0.10)',          // theme.shadows.md
        lg: '0 8px 32px rgba(0,0,0,0.12)',          // theme.shadows.lg
        modal: '0 -4px 32px rgba(0,0,0,0.15)',      // theme.shadows.modal
        fab: '0 4px 20px rgba(245,184,0,0.35)',     // theme.shadows.fab
      },
      // Espaciados IDÉNTICOS a theme.js
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
      // Transiciones (RN usa reanimated, pero definimos para NativeWind)
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
};

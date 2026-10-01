/** @type {import('tailwindcss').Config} */
// Los colores salen de src/config/palette.js, la misma fuente que consumen los
// estilos en linea via src/config/theme.ts. No duplicar valores aqui.
const { colors: paleta, shadows: sombras } = require("./src/config/palette");

module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Colores IDÉNTICOS a theme.js
      colors: {
        primary: {
          DEFAULT: paleta.primary, // theme.colors.primary
          dark: paleta.primaryDark, // theme.colors.primaryDark
          light: paleta.primaryLight, // theme.colors.primaryLight
        },
        secondary: {
          DEFAULT: paleta.secondary, // theme.colors.secondary
          light: paleta.secondaryLight, // theme.colors.secondaryLight
        },
        danger: {
          DEFAULT: paleta.danger, // theme.colors.danger
          dark: paleta.dangerDark, // theme.colors.dangerDark
          light: paleta.dangerLight, // theme.colors.dangerLight
        },
        success: {
          DEFAULT: paleta.success, // theme.colors.success
          light: paleta.successLight, // theme.colors.successLight
        },
        warning: {
          DEFAULT: paleta.warning, // theme.colors.warning
          light: paleta.warningLight, // theme.colors.warningLight
        },
        // bgApp, bgCard, bgMuted, bgOverlay
        "bg-app": paleta.bgApp, // theme.colors.bgApp
        "bg-card": paleta.bgCard, // theme.colors.bgCard
        "bg-muted": paleta.bgMuted, // theme.colors.bgMuted
        "bg-overlay": paleta.bgOverlay, // theme.colors.bgOverlay
        // text
        "text-primary": paleta.text, // theme.colors.text
        "text-secondary": paleta.textSecondary, // theme.colors.textSecondary
        "text-muted": paleta.textMuted, // theme.colors.textMuted
        "text-inverse": paleta.bgCard, // theme.colors.textInverse
        "text-amber": paleta.primary, // theme.colors.textPrimary
        // border
        border: paleta.border, // theme.colors.border
        "border-light": paleta.borderLight, // theme.colors.borderLight
        "border-focus": paleta.primary, // theme.colors.borderFocus
        // nav
        "nav-active": paleta.primary, // theme.colors.navActive
        "nav-inactive": paleta.textSecondary, // theme.colors.navInactive
        "nav-bg": paleta.bgCard, // theme.colors.navBg
        // status
        "status-yellow": paleta.primary,
        "status-yellow-text": paleta.text,
        "status-gray": paleta.border,
        "status-gray-text": paleta.textSecondary,
        "status-blue": paleta.secondary,
        "status-blue-text": paleta.bgCard,
        "status-green": paleta.success,
        "status-green-text": paleta.bgCard,
        "status-red": paleta.danger,
        "status-red-text": paleta.bgCard,
        "status-orange": paleta.warning,
        "status-orange-text": paleta.text,
        // icon
        "icon-amber": paleta.warning,
        "icon-amber-dark": paleta.iconAmberDark,
        "icon-amber-bg": paleta.warningLight,
        // gray scale
        gray: {
          50: paleta.bgMuted,
          100: paleta.borderLight,
          200: paleta.border,
          300: paleta.gray[300],
          400: paleta.textMuted,
          500: paleta.textSecondary,
          600: paleta.gray[600],
          700: paleta.gray[700],
          800: paleta.gray[800],
          900: paleta.text,
        },
      },
      // Tipografía IDÉNTICA a theme.js
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      fontSize: {
        "2xs": "10px", // theme.fonts.sizes['2xs']
        xs: "12px", // theme.fonts.sizes.xs
        sm: "13px", // theme.fonts.sizes.sm
        base: "15px", // theme.fonts.sizes.base
        md: "16px", // theme.fonts.sizes.md
        lg: "18px", // theme.fonts.sizes.lg
        xl: "20px", // theme.fonts.sizes.xl
        "2xl": "22px", // theme.fonts.sizes['2xl']
        "3xl": "26px", // theme.fonts.sizes['3xl']
        "4xl": "32px", // theme.fonts.sizes['4xl']
        "5xl": "40px", // theme.fonts.sizes['5xl']
      },
      // Border radius IDÉNTICOS a theme.js
      borderRadius: {
        sm: "8px", // theme.radius.sm
        md: "12px", // theme.radius.md
        lg: "16px", // theme.radius.lg
        xl: "20px", // theme.radius.xl
        "2xl": "24px", // theme.radius['2xl']
        "3xl": "32px", // theme.radius['3xl']
        full: "9999px", // theme.radius.full
      },
      // Las sombras salen de la paleta, no se copian aqui.
      boxShadow: sombras,
      // Espaciados IDÉNTICOS a theme.js
      spacing: {
        0: "0px",
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        7: "28px",
        8: "32px",
        10: "40px",
        12: "48px",
        16: "64px",
      },
      // Transiciones (RN usa reanimated, pero definimos para NativeWind)
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "300ms",
      },
    },
  },
  plugins: [],
};

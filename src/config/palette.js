/**
 * Fuente única de los tokens de diseño de VeciYo.
 *
 * La consumen dos caminos distintos:
 *   - `tailwind.config.js` la requiere, para las clases de NativeWind.
 *   - `src/config/theme.ts` la reexporta tipada, para los `style={{ }}` de
 *     React Native, donde las clases no llegan.
 *
 * Antes los valores vivían solo en `tailwind.config.js`, así que todo estilo
 * en línea los repetía a mano: 700 literales hexadecimales repartidos en 107
 * archivos. Cambiar el amarillo de marca obligaba a tocarlos uno por uno.
 *
 * Es CommonJS a propósito: `tailwind.config.js` no puede importar TypeScript.
 */

const colors = {
  primary: "#F5B800",
  primaryDark: "#D4A000",
  primaryLight: "#FFF8E1",

  secondary: "#2563EB",
  secondaryLight: "#EFF6FF",
  secondaryDark: "#1E40AF",

  danger: "#EF4444",
  dangerDark: "#DC2626",
  dangerLight: "#FEE2E2",

  success: "#16A34A",
  successLight: "#DCFCE7",
  successSoft: "#F0FDF4",

  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  warningSoft: "#FEF9C3",
  warningDark: "#CA8A04",

  bgApp: "#F2F2F7",
  bgCard: "#FFFFFF",
  bgMuted: "#F9FAFB",
  bgOverlay: "rgba(0,0,0,0.5)",
  /** Color de la sombra de las tarjetas. Se usa con opacidad baja. */
  shadow: "#000000",

  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textInverse: "#FFFFFF",
  textStrong: "#374151",

  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  borderStrong: "#D1D5DB",
  borderFocus: "#F5B800",

  iconAmber: "#F59E0B",
  iconAmberDark: "#92400E",
  iconAmberBg: "#FEF3C7",

  infoBg: "#DBEAFE",
  infoText: "#1E40AF",

  accentPink: "#FCE7F3",
  accentPinkText: "#BE185D",

  // Variantes de badge usadas por los estados de la interfaz.
  badgeSkyBg: "#E0F2FE",
  badgeSkyText: "#0369A1",
  badgeGreenText: "#166534",
  badgeAmberBg: "#FFFBEB",
  badgeAmberBorder: "#FDE68A",
  badgeAmberText: "#854D0E",
  badgeAmberStrong: "#D97706",
  badgeRedBg: "#FEF2F2",
  badgeRedBorder: "#FECACA",
  badgeRedText: "#991B1B",
  badgeVioletBg: "#F3E8FF",
  badgeVioletText: "#7C3AED",

  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
};

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

module.exports = { colors, radius };

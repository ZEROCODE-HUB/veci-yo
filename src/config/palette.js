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
  /**
   * Velo del modal cuando el fondo ademas se difumina. Mas claro que
   * `bgOverlay` porque el desenfoque ya separa la tarjeta del contenido: con
   * 0.5 encima del blur no se adivina que hay debajo y parece una pantalla
   * nueva en vez de una capa.
   */
  bgOverlayDifuminado: "rgba(17,24,39,0.32)",
  /** Color de la sombra de las tarjetas. Se usa con opacidad baja. */
  shadow: "#000000",

  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textInverse: "#FFFFFF",
  textStrong: "#374151",

  /** Carril del interruptor apagado. Gris frio, para que el pulgar blanco resalte. */
  switchOff: "#D8DCE3",
  /** Carril encendido. Es el amarillo de marca; se nombra por su uso. */
  switchOn: "#F5B800",
  /** Pulgar del interruptor. */
  switchThumb: "#FFFFFF",

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

  // --- Comunicaciones: chat y llamadas ---
  /** Conversacion directa: su avatar, su cabecera y el panel de llamada. */
  chatAcento: "#5B9BD5",
  /** Lo mismo cuando la conversacion es de grupo. */
  chatAcentoSuave: "#E8F4FD",
  /** Fondo de la fila de un grupo dentro de la lista de conversaciones. */
  chatFilaGrupo: "rgba(91,155,213,0.06)",
  /** Burbuja de un mensaje propio. */
  chatBurbujaPropia: "rgba(37,99,235,0.05)",
  /** Superficie neutra del modulo: la llamada en curso y el avatar sin tipo. */
  comunicacionNeutro: "#9BA3AE",

  // --- Vidrio: superficies translucidas sobre una foto o una pantalla oscura ---
  /** Tarjeta sobre la fotografia de portada del alojamiento. */
  heroVidrio: "rgba(255,255,255,0.18)",
  /** La misma tarjeta cuando debe pesar menos. */
  heroVidrioSuave: "rgba(255,255,255,0.12)",
  /** Panel que necesita leerse encima de la foto, casi opaco. */
  heroVidrioOpaco: "rgba(255,255,255,0.92)",
  /** Boton redondo de la llamada en curso. */
  llamadaControl: "rgba(255,255,255,0.2)",
  /** Su borde. */
  llamadaControlBorde: "rgba(255,255,255,0.5)",
  /** Su etiqueta. */
  llamadaControlTexto: "rgba(255,255,255,0.8)",

  // --- Fondos que sustituyen a una imagen que no existe ---
  /** Zona comun sin fotografia cargada. */
  zonaSinFoto: "#B8A98C",
  /** La misma, en su variante clara. */
  zonaSinFotoClara: "#D4C5A9",
  /** Marcador de un documento adjunto que todavia no se muestra. */
  documentoAdjunto: "#C5CAE9",

  /** Portada de la vivienda en el resumen y en el perfil. */
  bgVivienda: "#E8E4DC",
  /** Campo de solo lectura. */
  bgCampo: "#F8FAFC",
  /** Franja sobre una foto para que el texto de encima se lea. */
  veloPieImagen: "rgba(0,0,0,0.45)",
  /** Sombra del texto cuando va sobre una fotografia. */
  sombraTexto: "rgba(0,0,0,0.3)",

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

/**
 * Sombras. Vivian solo en `tailwind.config.js`, asi que todo estilo en linea
 * que necesitara una la reescribia a mano --y ahi es donde se colaban los
 * `rgba(...)` sueltos que la regla 11 prohibe--. Ahora las consumen los dos
 * caminos, igual que los colores.
 */
const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  card: "0 2px 8px rgba(0,0,0,0.08)",
  md: "0 4px 16px rgba(0,0,0,0.10)",
  lg: "0 8px 32px rgba(0,0,0,0.12)",
  /** Tarjeta que debe destacar un poco mas sobre el fondo. */
  cardFuerte: "0 2px 8px rgba(0,0,0,0.12)",
  /** Pastilla seleccionada dentro de un grupo de pestanas. */
  pestanaActiva: "0 1px 3px rgba(0,0,0,0.1)",
  /** Hoja inferior: la sombra sube, no baja. */
  modal: "0 -4px 32px rgba(0,0,0,0.15)",
  fab: "0 4px 20px rgba(245,184,0,0.35)",
};

module.exports = { colors, radius, shadows };

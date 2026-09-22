import { colors, radius } from "./palette";

/**
 * Tokens de diseño para estilos en línea de React Native.
 *
 * Es la misma fuente que alimenta a `tailwind.config.js`: si un color cambia
 * en `palette.js`, cambia en las clases de NativeWind y en los `style={{ }}`
 * a la vez. Usar el token, nunca el literal hexadecimal (regla 10 de AGENTS.md).
 */
export const theme = { colors, radius } as const;

export type ColorToken = keyof typeof colors;
export { colors, radius };
export default theme;

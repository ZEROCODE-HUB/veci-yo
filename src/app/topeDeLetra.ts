/**
 * Lo más que crece la letra de la app cuando la persona agranda la del
 * teléfono: un 30 % (auditoría de responsividad, 24/10/2026).
 *
 * Sin tope, con la letra del sistema al máximo, las etiquetas de la barra de
 * pestañas se cortaban, los botones partían las palabras y el S.O.S. no cabía.
 * Con el 30 % quien necesita la letra más grande la tiene, y las pantallas
 * siguen enteras en un teléfono de 320 de ancho.
 */
export const TOPE_DE_LETRA = 1.3;

type Jsx = (type: unknown, props: Record<string, unknown> | null, ...resto: unknown[]) => unknown;

/**
 * Envuelve la función que crea cada elemento para que todo `Text` y todo
 * `TextInput` lleven el tope, salvo que digan otro.
 *
 * React 19 ya no aplica `defaultProps` a los componentes de función --y el
 * `Text` de React Native lo es--, así que `Text.defaultProps` no hace nada. La
 * alternativa era escribir el tope en cientos de `<Text>`, y el siguiente que
 * se escribiera sin él volvería a cortarse.
 *
 * `esTexto` se pasa para poder probarlo sin React Native.
 */
export function conTopeDeLetra<F>(jsx: F, esTexto: (type: unknown) => boolean): F {
  const crear = jsx as unknown as Jsx;
  const envuelta: Jsx = function (type, props, ...resto) {
    if (props && props.maxFontSizeMultiplier === undefined && esTexto(type)) {
      return crear(type, { ...props, maxFontSizeMultiplier: TOPE_DE_LETRA }, ...resto);
    }
    return crear(type, props, ...resto);
  };
  return envuelta as unknown as F;
}

let textos: { Text: unknown; TextInput: unknown } | null = null;

/**
 * Si es el `Text` o el `TextInput` de React Native. Se pide al primer uso y no
 * al importar: este módulo lo cargan también los archivos de React Native
 * --pasan por la misma transformación de JSX--, así que pedirlo arriba haría
 * un ciclo mientras React Native se inicia.
 */
export function esTextoDeReactNative(type: unknown): boolean {
  if (!textos) {
    const rn = require("react-native") as typeof import("react-native");
    textos = { Text: rn.Text, TextInput: rn.TextInput };
  }
  return type === textos.Text || type === textos.TextInput;
}

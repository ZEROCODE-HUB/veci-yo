/**
 * Lee el texto de la foto del documento, en el propio celular (23/10/2026).
 *
 * ML Kit de Google por `expo-text-extractor`: funciona sin internet y la foto
 * no sale del teléfono, que es lo que pidió el cliente («no se debe guardar ni
 * subir nada, solo escanear y comparar»).
 *
 * La pieza nativa se carga al usarla y no al abrir la app: el APK instalado
 * antes de este cambio no la trae y la actualización por el aire le llega
 * igual. Ahí se dice qué falta, y la portería sigue con el número a mano.
 */
export async function leerTextoDelDocumento(uri: string): Promise<string> {
  let extractor: typeof import("expo-text-extractor");
  try {
    extractor = require("expo-text-extractor") as typeof import("expo-text-extractor");
  } catch {
    throw new Error(
      "Para leer el documento hay que instalar la versión nueva de la app (el APK nuevo). Mientras, escribe el número a mano.",
    );
  }
  if (!extractor.isSupported) {
    throw new Error("Este celular no puede leer texto de una foto. Escribe el número a mano.");
  }
  const lineas = await extractor.extractTextFromImage(uri);
  return lineas.join("\n");
}

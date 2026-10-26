import { requireOptionalNativeModule } from "expo";
import { anotarYEsperar } from "@/shared/services/erroresDeLaApp";
import { rutaParaElLector } from "../helpers/rutaParaElLector";

/** La pieza nativa de `expo-text-extractor`: ML Kit de Google. */
interface LectorNativo {
  isSupported: boolean;
  extractTextFromImage: (ruta: string) => Promise<string[]>;
}

/**
 * Lee el texto de la foto del documento, en el propio celular (23/10/2026).
 *
 * ML Kit de Google por `expo-text-extractor`: funciona sin internet y la foto
 * no sale del teléfono, que es lo que pidió el cliente («no se debe guardar ni
 * subir nada, solo escanear y comparar»).
 *
 * La pieza nativa entró en el APK 4. **Se pregunta si está, sin cargarla**
 * (26/10/2026): antes se hacía `require("expo-text-extractor")` dentro de un
 * `try`, y en la app publicada eso no se puede atrapar --el fallo al cargar
 * un módulo va derecho al manejador de errores fatales-- así que en un celular
 * con un APK anterior la app se quedaba en blanco al pulsar «Escanear». Lo
 * encontró el registro de Android del celular del cliente: «Cannot find native
 * module 'ExpoTextExtractor'». Sin la pieza se dice qué falta y la portería
 * puede volver a escanear o aprobarlo a mano.
 */
export async function leerTextoDelDocumento(uri: string): Promise<string> {
  const lector = requireOptionalNativeModule<LectorNativo>("ExpoTextExtractor");
  if (!lector) {
    await anotarYEsperar("escaneo: sin lector en este APK", "");
    throw new Error(
      "Este celular tiene una versión de la app sin el lector de documentos. Instala el APK nuevo; mientras, apruébalo a mano.",
    );
  }
  if (!lector.isSupported) {
    throw new Error("Este celular no puede leer texto de una foto. Apruébalo a mano.");
  }
  await anotarYEsperar("escaneo: lector cargado", "");
  const lineas = await lector.extractTextFromImage(rutaParaElLector(uri));
  return lineas.join("\n");
}

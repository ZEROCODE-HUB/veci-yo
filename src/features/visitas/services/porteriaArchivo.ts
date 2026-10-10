/**
 * La foto que el guardia acaba de tomar: leerla para mandarla, y olvidarla.
 *
 * Va aparte de `porteria.repo.ts` porque toca la plataforma —`react-native`,
 * `expo-file-system`— y los repositorios no pueden: los recorridos corren en
 * Node y un repositorio que la importa deja de arrancar («Flow is not
 * supported»). Lo comprueba `npm run repos`.
 */
import { Platform } from "react-native";
import { File } from "expo-file-system";

/** La imagen en base64, sin la cabecera `data:`. */
export async function fotoEnBase64(uri: string): Promise<string> {
  const respuesta = await fetch(uri);
  const archivo = await respuesta.blob();

  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error("No se pudo leer la foto"));
    lector.onload = () => {
      const texto = typeof lector.result === "string" ? lector.result : "";
      resolver(texto.slice(texto.indexOf(",") + 1));
    };
    lector.readAsDataURL(archivo);
  });
}

/**
 * Que la foto no se quede en el dispositivo del guardia.
 *
 * Lo pidió el cliente el 09/10/2026: la foto de un documento ajeno no tiene
 * que vivir en el teléfono de la portería. La cámara la deja en la caché de
 * la aplicación —no en la galería—, y de ahí se borra en cuanto se manda, o
 * en cuanto falla el envío.
 *
 * No lanza: si no se puede borrar no hay nada que el guardia pueda hacer, y
 * no es motivo para decirle que la foto no se guardó cuando sí se guardó.
 */
export function olvidarFoto(uri: string): void {
  try {
    if (Platform.OS === "web") {
      if (uri.startsWith("blob:")) URL.revokeObjectURL(uri);
      return;
    }
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // La caché de la aplicación la vacía el sistema; no hay más que hacer.
  }
}

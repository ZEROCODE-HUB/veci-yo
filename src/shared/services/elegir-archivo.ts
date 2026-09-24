import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { ArchivoElegido } from "./archivos";

/**
 * Elegir un archivo: el trozo que necesita Expo y la pantalla.
 *
 * Estaba en `archivos.ts` junto a la subida, y por eso cualquier repositorio
 * que subiera algo --PQRS, reservas, visitas-- arrastraba el selector de
 * documentos, el de imágenes y React Native entero. Elegir es de la interfaz;
 * subir es de los datos, y solo lo segundo tiene que poder correr fuera de la
 * aplicación.
 */

/**
 * Documentos y PDF. Devuelve null si la persona cancela.
 *
 * `tipos` por defecto es lo que aceptan los buckets de PQRS y reservas. El
 * de reglamentos no acepta imágenes —un reglamento es un documento— y sí
 * acepta Word, así que ofrecerle al usuario un selector que deja elegir un
 * JPEG solo sirve para que el bucket lo rechace después.
 */
export async function elegirDocumento(
  tipos: string[] = ["image/*", "application/pdf"],
): Promise<ArchivoElegido | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: tipos,
    copyToCacheDirectory: true,
  });

  if (resultado.canceled || !resultado.assets?.[0]) return null;

  const archivo = resultado.assets[0];
  return {
    uri: archivo.uri,
    nombre: archivo.name,
    tipoMime: archivo.mimeType ?? "application/octet-stream",
    tamanoBytes: archivo.size ?? undefined,
  };
}

/** Galería de fotos. Devuelve null si la persona cancela. */
export async function elegirImagen(): Promise<ArchivoElegido | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    throw new Error("Necesitamos permiso para acceder a tus fotos.");
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
  });

  if (resultado.canceled || !resultado.assets?.[0]) return null;

  const imagen = resultado.assets[0];
  return {
    uri: imagen.uri,
    nombre: imagen.fileName ?? `foto-${Date.now()}.jpg`,
    tipoMime: imagen.mimeType ?? "image/jpeg",
    tamanoBytes: imagen.fileSize ?? undefined,
  };
}


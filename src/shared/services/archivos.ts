import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

/**
 * Selección y subida de archivos.
 *
 * Vive en `shared` porque hay tres sitios que suben lo mismo de maneras
 * distintas: los adjuntos de PQRS, los comprobantes de pago de reservas y las
 * fotos de visita. Los tres usan buckets privados cuya política mira el primer
 * segmento de la ruta, así que la convención `<id>/<archivo>` no es un detalle
 * del llamador: es parte del contrato con la política.
 */

export interface ArchivoElegido {
  uri: string;
  nombre: string;
  tipoMime: string;
  tamanoBytes?: number;
}

/** Documentos y PDF. Devuelve null si la persona cancela. */
export async function elegirDocumento(): Promise<ArchivoElegido | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
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

/**
 * Nombre con el que se guarda en el bucket.
 *
 * Dos personas suben "foto.jpg" a la misma PQRS y la segunda pisaría a la
 * primera, así que el nombre visible se guarda en la fila y en el bucket va
 * uno generado. Se conserva la extensión para que el navegador sepa abrirlo.
 */
function nombreEnBucket(nombreOriginal: string): string {
  const extension = nombreOriginal.includes(".")
    ? nombreOriginal.slice(nombreOriginal.lastIndexOf("."))
    : "";
  const aleatorio =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${aleatorio}${extension}`;
}

/**
 * Sube un archivo al bucket. `carpeta` es el id de la fila que da acceso: la
 * política del bucket lee ese primer segmento para decidir.
 */
export async function subirArchivo(params: {
  bucket: string;
  carpeta: string;
  archivo: ArchivoElegido;
}): Promise<{ ruta: string }> {
  const ruta = `${params.carpeta}/${nombreEnBucket(params.archivo.nombre)}`;

  // En React Native `fetch` sobre un `file://` devuelve un blob válido, y en
  // web sobre un `blob:` también. Es el único camino que sirve en ambos.
  const respuesta = await fetch(params.archivo.uri);
  const contenido = await respuesta.arrayBuffer();

  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(ruta, contenido, {
      contentType: params.archivo.tipoMime,
      upsert: false,
    });

  if (error) throw error;
  return { ruta };
}

/**
 * URL temporal para ver un archivo de un bucket privado.
 *
 * Los buckets no son públicos a propósito: un comprobante de pago lleva datos
 * bancarios y una PQRS puede llevar fotos de la vivienda.
 */
export async function urlTemporal(params: {
  bucket: string;
  ruta: string;
  segundos?: number;
}): Promise<string> {
  const { data, error } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.ruta, params.segundos ?? 3600);

  if (error) throw error;
  return data.signedUrl;
}

export async function borrarArchivo(bucket: string, ruta: string) {
  const { error } = await supabase.storage.from(bucket).remove([ruta]);
  if (error) throw error;
}

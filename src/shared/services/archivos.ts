// Se importa por el alias `@/`, como el resto del codigo, y no con ruta
// relativa: las pruebas de recorrido sustituyen ese modulo por un cliente
// sin React Native, y un `./supabase` se les escapa.
import { supabase } from "@/shared/services/supabase";
import { obtenerParametrosPublicos } from "@/shared/services/parametros.repo";
import { parametroNumero } from "@/shared/services/parametros";
import {
  formatoDeLaFila,
  type FormatoDeArchivo,
  type SitioDeArchivo,
} from "@/shared/constants/formatosDeArchivo";

/**
 * Subida y borrado de archivos en los buckets privados.
 *
 * Vive en `shared` porque hay tres sitios que suben lo mismo de maneras
 * distintas: los adjuntos de PQRS, los comprobantes de pago de reservas y las
 * fotos de visita. Los tres usan buckets privados cuya política mira el primer
 * segmento de la ruta, así que la convención `<id>/<archivo>` no es un detalle
 * del llamador: es parte del contrato con la política.
 *
 * **Elegir** un archivo vive aparte, en `elegir-archivo.ts`. Estaban juntos, y
 * eso hacía que un repositorio de datos --`pqrs.repo`-- arrastrase
 * `expo-document-picker` y `expo-image-picker`, y con ellos React Native
 * entero. Subir un archivo no necesita saber de dónde salió.
 */

export interface ArchivoElegido {
  uri: string;
  nombre: string;
  tipoMime: string;
  tamanoBytes?: number;
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

  // El tope de la plataforma, antes de subir: PQRS, reglamentos,
  // correspondencia y comprobantes no lo miraban, y lo que frenaba era el
  // límite de cada bucket, distinto en cada uno (Parametrización, 25/10/2026).
  await comprobarTamano(params.archivo.tamanoBytes ?? contenido.byteLength);

  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(ruta, contenido, {
      contentType: params.archivo.tipoMime,
      upsert: false,
    });

  if (error) throw error;
  return { ruta };
}

let formatosEnCurso: Promise<Map<string, Record<string, unknown>>> | null = null;

/**
 * Qué tipos de archivo se aceptan en un sitio, de la lista `archivo_formatos`
 * (29/10/2026). Se pide una vez; si no llega, el de siempre. Un sitio no se
 * apaga (lo impide la base): solo cambian sus tipos.
 */
export async function formatoDeArchivo(sitio: SitioDeArchivo): Promise<FormatoDeArchivo> {
  formatosEnCurso ??= (async () => {
    const { data, error } = await supabase
      .from("catalogo_opcion")
      .select("codigo, extra")
      .eq("catalogo", "archivo_formatos");
    if (error) throw error;
    return new Map(
      (data ?? [])
        .filter((f) => f.extra && typeof f.extra === "object" && !Array.isArray(f.extra))
        .map((f) => [f.codigo, f.extra as Record<string, unknown>]),
    );
  })().catch((e: unknown) => {
    formatosEnCurso = null;
    throw e;
  });
  const filas = await formatosEnCurso.catch(() => new Map<string, Record<string, unknown>>());
  return formatoDeLaFila(sitio, filas.get(sitio));
}

/** Lanza con una frase que se entienda si el tipo no se acepta en ese sitio. */
const POR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * El tipo de un archivo, dicho como lo espera la lista `archivo_formatos`
 * (29/10/2026).
 *
 * En el celular el archivo elegido llega a veces sin tipo, como
 * `application/octet-stream` o como `image/jpg` (que no es estándar), y la
 * comprobación rechazaba una foto JPG diciendo «tiene que ser JPG, PNG o
 * WEBP» (GSheet, Para Claude fila 141). Se normaliza y, si falta, se deduce de
 * la extensión del nombre o de la dirección del archivo.
 */
export function tipoDeArchivo(tipo: string | null | undefined, nombreOUri?: string | null): string {
  const limpio = (tipo ?? "").split(";")[0].trim().toLowerCase();
  if (limpio === "image/jpg" || limpio === "image/pjpeg") return "image/jpeg";
  // En Android un archivo local puede decir «text/plain»: no se le cree.
  if (limpio && limpio !== "application/octet-stream" && limpio !== "text/plain") return limpio;
  const extension = (nombreOUri ?? "").split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return POR_EXTENSION[extension] ?? limpio;
}

export async function comprobarFormato(
  sitio: SitioDeArchivo,
  tipoOriginal: string,
  queEs: string,
): Promise<void> {
  const formato = await formatoDeArchivo(sitio);
  const tipo = tipoDeArchivo(tipoOriginal);
  if (!formato.tiposMime.includes(tipo)) {
    throw new Error(`${queEs} tiene que ser ${formato.extensiones}.`);
  }
}

let topeEnCurso: Promise<number> | null = null;

/**
 * El tamaño máximo de un archivo, en MB (`archivo_tamano_maximo_mb`). Se pide
 * una vez, como `segundosDeEnlace`.
 */
export function topeDeArchivoMb(): Promise<number> {
  topeEnCurso ??= obtenerParametrosPublicos()
    .then((mapa) => parametroNumero(mapa, "archivo_tamano_maximo_mb"))
    .catch((error: unknown) => {
      topeEnCurso = null;
      throw error;
    });
  return topeEnCurso;
}

/** Lanza con una frase que se entienda si el archivo pasa del tope. */
export async function comprobarTamano(bytes: number): Promise<void> {
  const topeMb = await topeDeArchivoMb();
  if (bytes > topeMb * 1024 * 1024) {
    throw new Error(`El archivo no puede pasar de ${topeMb} MB.`);
  }
}

let segundosEnCurso: Promise<number> | null = null;

/**
 * Cuántos segundos vale un enlace temporal a un archivo
 * (`archivo_enlace_segundos`).
 *
 * Era un 3600 escrito en seis sitios. Es de la plataforma, no de cada
 * edificio, así que se pide una vez y se guarda mientras la app esté abierta:
 * pedirlo antes de cada foto sería una ida y vuelta más por imagen. Si la
 * consulta falla no se guarda el fallo, para que la siguiente lo reintente.
 */
export function segundosDeEnlace(): Promise<number> {
  segundosEnCurso ??= obtenerParametrosPublicos()
    .then((mapa) => parametroNumero(mapa, "archivo_enlace_segundos"))
    .catch((error: unknown) => {
      segundosEnCurso = null;
      throw error;
    });
  return segundosEnCurso;
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
    .createSignedUrl(params.ruta, params.segundos ?? (await segundosDeEnlace()));

  if (error) throw error;
  return data.signedUrl;
}

export async function borrarArchivo(bucket: string, ruta: string) {
  const { error } = await supabase.storage.from(bucket).remove([ruta]);
  if (error) throw error;
}

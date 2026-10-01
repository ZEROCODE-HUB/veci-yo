import { supabase } from "@/shared/services/supabase";
import {
  borrarArchivo,
  subirArchivo,
  urlTemporal,
  type ArchivoElegido,
} from "@/shared/services/archivos";
import type { Database } from "@/shared/types/database.types";
import type { ReglaContenido, TipoRegla } from "../types/reglas";

type TipoReglaDB = Database["public"]["Enums"]["tipo_regla"];

const BUCKET_REGLAMENTOS = "reglamentos";

/**
 * Los reglamentos del condominio.
 *
 * El texto vivía en `reglasContenido.ts`, un archivo TypeScript: el mismo
 * reglamento para todos los edificios, y para cambiar una línea había que
 * publicar la aplicación. La tabla `reglamento` existe desde el primer día
 * —con `condominio_id`, el contenido por secciones, `version` y `vigente`— y
 * estaba vacía y sin leer.
 *
 * Cada condominio tiene los suyos: son su reglamento interno, y el de renta
 * corta es justamente el que el RNT exige presentar.
 */

/** La app habla con guiones; la base con guiones bajos. */
const HACIA_BASE: Record<TipoRegla, TipoReglaDB> = {
  "residente-permanente": "residente_permanente",
  "huesped-temporal": "huesped_temporal",
  "guardia-seguridad": "guardia_seguridad",
};

export async function obtenerReglamento(
  condominioId: string,
  tipo: TipoRegla,
): Promise<ReglaContenido | null> {
  if (!condominioId) return null;

  const { data, error } = await supabase
    .from("reglamento")
    .select("titulo, contenido, archivo_path, version")
    .eq("condominio_id", condominioId)
    .eq("tipo", HACIA_BASE[tipo])
    .eq("vigente", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const secciones = Array.isArray(data.contenido)
    ? (data.contenido as Array<{ titulo?: string; items?: string[] }>)
    : [];

  return {
    title: data.titulo,
    // `file` era el nombre de un PDF que no existía en ningún sitio. Ahora es
    // la ruta en el bucket, y sin ruta no hay descarga que ofrecer.
    file: data.archivo_path ?? "",
    sections: secciones.map((s) => ({
      title: s.titulo ?? "",
      items: s.items ?? [],
    })),
    downloadable: Boolean(data.archivo_path),
  };
}

/** Lo que aceptan el selector y el bucket `reglamentos`. */
export const TIPOS_REGLAMENTO = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Sube el PDF del reglamento y lo deja apuntado en la fila.
 *
 * `reglamento.archivo_path` existe desde el primer día y estaba vacía en todos
 * los condominios porque **nadie subía nada**: "Elegir archivo" no tenía más
 * acción que cerrar el modal. El de renta corta es justamente el que el RNT
 * exige poder presentar.
 */
export async function subirReglamento(
  condominioId: string,
  tipo: TipoRegla,
  archivo: ArchivoElegido,
): Promise<string> {
  if (!condominioId) throw new Error("No hay condominio activo.");

  const { ruta } = await subirArchivo({
    bucket: BUCKET_REGLAMENTOS,
    // El primer segmento es el condominio: es lo que lee la política.
    carpeta: condominioId,
    archivo,
  });

  const { error } = await supabase
    .from("reglamento")
    .update({ archivo_path: ruta })
    .eq("condominio_id", condominioId)
    .eq("tipo", HACIA_BASE[tipo])
    .eq("vigente", true);

  // Si la fila no se pudo apuntar, el archivo subido queda huérfano en el
  // bucket y la pantalla seguiría sin ofrecer descarga. Se retira.
  if (error) {
    await borrarArchivo(BUCKET_REGLAMENTOS, ruta).catch(() => {});
    throw error;
  }

  return ruta;
}

/** URL temporal para abrir el reglamento; el bucket es privado. */
export function urlDelReglamento(rutaArchivo: string) {
  return urlTemporal({ bucket: BUCKET_REGLAMENTOS, ruta: rutaArchivo });
}

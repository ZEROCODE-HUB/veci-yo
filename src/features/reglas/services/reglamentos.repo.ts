import { supabase } from "@/shared/services/supabase";
import {
  borrarArchivo,
  comprobarFormato,
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

/** El título con que nace el reglamento si el edificio todavía no tenía uno. */
const TITULO_INICIAL: Record<TipoRegla, string> = {
  "residente-permanente": "Residente Permanente",
  "huesped-temporal": "Huéspedes Temporales",
  "guardia-seguridad": "Guardia de Seguridad",
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
  // Los tipos, de la lista `archivo_formatos` (29/10/2026).
  await comprobarFormato("reglamento", archivo.tipoMime, "El reglamento");

  const { ruta } = await subirArchivo({
    bucket: BUCKET_REGLAMENTOS,
    // El primer segmento es el condominio: es lo que lee la política.
    carpeta: condominioId,
    archivo,
  });

  /*
    En un edificio nuevo no hay fila todavía: el `update` no tocaba nada, no
    daba error, y la pantalla decía «guardado» con el archivo suelto en el
    bucket (hueco 25, 15/10/2026). Si no hay fila, se crea con el archivo.
  */
  const actualizado = await supabase
    .from("reglamento")
    .update({ archivo_path: ruta })
    .eq("condominio_id", condominioId)
    .eq("tipo", HACIA_BASE[tipo])
    .eq("vigente", true)
    .select("id");
  let error = actualizado.error;
  if (!error && (actualizado.data ?? []).length === 0) {
    ({ error } = await supabase.from("reglamento").insert({
      condominio_id: condominioId,
      tipo: HACIA_BASE[tipo],
      titulo: TITULO_INICIAL[tipo],
      archivo_path: ruta,
    }));
  }

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

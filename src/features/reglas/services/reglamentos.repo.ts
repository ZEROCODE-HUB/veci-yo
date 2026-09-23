import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";
import type { ReglaContenido, TipoRegla } from "../types/reglas";

type TipoReglaDB = Database["public"]["Enums"]["tipo_regla"];

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

import { supabase } from "./supabase";
import type { MapaDeParametros } from "./parametros";

/**
 * Los parámetros que la app puede leer, con el valor propio del edificio si se
 * pasa uno. Solo llegan los marcados `es_publico`: los internos no salen de la
 * base.
 */
export async function obtenerParametrosPublicos(condominioId?: string): Promise<MapaDeParametros> {
  const { data, error } = await supabase.rpc(
    "parametros_publicos",
    condominioId ? { p_condominio_id: condominioId } : {},
  );
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((p) => [p.clave, p.valor]));
}

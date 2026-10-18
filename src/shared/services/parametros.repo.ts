// Por el alias y no con ruta relativa: las pruebas de recorrido sustituyen
// ese módulo por un cliente sin React Native, y un `./supabase` se les escapa.
import { supabase } from "@/shared/services/supabase";
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

import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

export type AccionEnLaVivienda = Extract<
  Database["public"]["Enums"]["accion_de_rol"],
  "registrar_visitas" | "reservar_zonas" | "invitar_a_la_vivienda"
>;

/**
 * Qué puede hacer quien está en sesión en esa vivienda, según su rol (huecos 9
 * y 14). Lo decide el administrador de la app en el panel; la base lo vuelve a
 * comprobar al guardar, así que esto solo sirve para no ofrecer lo que no se
 * puede (y sí ofrecer lo que se permitió).
 */
export async function misPermisosEnLaVivienda(
  unidadId: string,
): Promise<Record<AccionEnLaVivienda, boolean>> {
  const { data, error } = await supabase.rpc("mis_permisos_en_la_vivienda", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
  const permisos = { registrar_visitas: true, reservar_zonas: true, invitar_a_la_vivienda: false };
  for (const fila of data ?? []) {
    if (fila.accion in permisos) permisos[fila.accion as AccionEnLaVivienda] = fila.permitido;
  }
  return permisos;
}

/**
 * Lo que puede cada rol de vivienda en ese edificio, para el resumen «Podrá /
 * No podrá» al invitar (17/11/2026). Con la misma regla que la base aplica al
 * guardar (`rol_puede`), así que el resumen no puede contradecirla.
 */
export async function permisosDeLosRolesDeLaVivienda(condominioId: string) {
  const { data, error } = await supabase.rpc("permisos_de_los_roles_de_la_vivienda", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return data ?? [];
}

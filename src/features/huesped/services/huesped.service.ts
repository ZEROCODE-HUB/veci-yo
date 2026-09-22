import { supabase } from "@/shared/services/supabase";
import type { AlojamientoConfig } from "../types";

/**
 * Ficha del alojamiento de una vivienda en renta corta.
 *
 * Era la misma para todas: "Departamento de 2 habitaciones, 1 cama queen, 1
 * cama individual", 4 huéspedes, 1 estacionamiento, sin mascotas y apto para
 * niños. Ahora se arma con tres fuentes, cada una dueña de lo suyo:
 * la suscripción (descripción, huéspedes, estacionamientos), la tipología
 * (habitaciones) y los permisos de la vivienda (mascotas, niños).
 */
export async function obtenerAlojamientoConfigRequest(
  unidadId: string,
): Promise<AlojamientoConfig | null> {
  if (!unidadId) return null;

  const [suscripcion, unidad, permisos] = await Promise.all([
    supabase
      .from("suscripcion_renta_corta")
      .select("descripcion, max_huespedes, estacionamientos_huesped")
      .eq("unidad_id", unidadId)
      .maybeSingle(),

    supabase
      .from("unidad")
      .select("tipologia:tipologia_id ( habitaciones )")
      .eq("id", unidadId)
      .maybeSingle(),

    supabase
      .from("permiso_vivienda")
      .select("corta_permite_mascotas, corta_permite_ninos")
      .eq("unidad_id", unidadId)
      .maybeSingle(),
  ]);

  for (const res of [suscripcion, unidad, permisos]) {
    if (res.error) throw res.error;
  }

  // Sin suscripción de renta corta no hay ficha que mostrar.
  if (!suscripcion.data) return null;

  return {
    descripcion: suscripcion.data.descripcion ?? "",
    numHabitaciones: (unidad.data as any)?.tipologia?.habitaciones ?? 0,
    maxHuespedes: suscripcion.data.max_huespedes ?? 0,
    estacionamientos: suscripcion.data.estacionamientos_huesped,
    politicaMascotas: permisos.data?.corta_permite_mascotas
      ? "permitidas"
      : "no-permitidas",
    aptoNinos: permisos.data?.corta_permite_ninos ?? false,
  };
}

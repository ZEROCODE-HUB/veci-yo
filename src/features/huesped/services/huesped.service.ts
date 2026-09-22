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

export interface LibroHuespedDatos {
  wifiName?: string;
  wifiPassword?: string;
  doorPassword?: string;
  instructions?: string;
  notes?: string;
}

/**
 * El libro del alojamiento: wifi, instrucciones y notas del anfitrion.
 *
 * Es lo que un huesped viene a buscar, y sin embargo se leia de un store en
 * memoria: la pantalla anunciaba "Tu Guestbook aun esta vacio" aunque el
 * anfitrion lo hubiera cargado.
 *
 * Las contrasenas no viajan aqui. `wifi_password_secret` y
 * `puerta_password_secret` apuntan a Vault, y se piden aparte para que no
 * queden en una respuesta que se cachea.
 */
export async function obtenerLibroHuesped(
  unidadId: string,
): Promise<LibroHuespedDatos | null> {
  if (!unidadId) return null;

  const { data, error } = await supabase
    .from("libro_huesped")
    .select("wifi_nombre, instrucciones, notas")
    .eq("unidad_id", unidadId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    wifiName: data.wifi_nombre ?? undefined,
    instructions: data.instrucciones ?? undefined,
    notes: data.notas ?? undefined,
  };
}

import { supabase } from "@/shared/services/supabase";
import type { AlojamientoConfig } from "../types";

/**
 * Ficha del alojamiento de una vivienda en renta corta.
 *
 * Era la misma para todas: "Departamento de 2 habitaciones, 1 cama queen, 1
 * cama individual", 4 huéspedes, 1 estacionamiento, sin mascotas y apto para
 * niños.
 *
 * Se arma con tres tablas —la suscripción, la tipología y los permisos de la
 * vivienda— y se leía haciendo tres consultas desde el cliente. Eso dejaba
 * fuera al huésped, que no puede leer ninguna de las tres: la pantalla le
 * decía "esta vivienda todavía no tiene ficha" cuando sí la tenía.
 *
 * Ahora lo resuelve `ficha_alojamiento` en la base, que devuelve exactamente
 * estos seis campos. La suscripción no se abre entera a propósito: guarda el
 * estado comercial del anfitrión —si está activa, cuántas verificaciones le
 * quedan, quién se la verificó—, que no es asunto de quien se aloja.
 */
export async function obtenerAlojamientoConfigRequest(
  unidadId: string,
): Promise<AlojamientoConfig | null> {
  if (!unidadId) return null;

  const { data, error } = await supabase
    .rpc("ficha_alojamiento", { p_unidad_id: unidadId })
    .maybeSingle();

  if (error) throw error;
  // Sin suscripción de renta corta no hay ficha que mostrar.
  if (!data) return null;

  return {
    descripcion: data.descripcion ?? "",
    numHabitaciones: data.num_habitaciones ?? 0,
    maxHuespedes: data.max_huespedes ?? 0,
    estacionamientos: data.estacionamientos,
    politicaMascotas: data.permite_mascotas ? "permitidas" : "no-permitidas",
    aptoNinos: data.apto_ninos ?? false,
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

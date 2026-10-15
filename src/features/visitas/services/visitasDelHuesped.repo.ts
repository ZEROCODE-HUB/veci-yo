import { supabase } from "@/shared/services/supabase";

/**
 * Si el anfitrión deja al huésped registrar visitas en esa vivienda.
 *
 * Lo decide el anfitrión en la configuración del alojamiento y lo hace cumplir
 * la base (`huesped_puede_registrar_visitas`, 15/10/2026). La pantalla lo
 * pregunta para no ofrecer un botón que la base va a rechazar.
 */
export async function huespedPuedeRegistrarVisitas(unidadId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("huesped_puede_registrar_visitas", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
  return data !== false;
}

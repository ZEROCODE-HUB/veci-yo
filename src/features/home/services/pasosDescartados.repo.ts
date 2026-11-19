import { supabase } from "@/shared/services/supabase";

/**
 * Los pasos de «paso a paso» que cada uno quitó de su inicio (18/11/2026,
 * pedido del cliente), o «tarjeta» si ocultó la tarjeta entera. Viven en la
 * base: lo que se quita en un celular no vuelve a salir en otro. La política
 * deja a cada uno ver y tocar solo lo suyo.
 */
export async function obtenerPasosDescartados(): Promise<string[]> {
  const { data, error } = await supabase.from("paso_descartado").select("paso");
  if (error) throw error;
  return (data ?? []).map((f) => f.paso);
}

export async function descartarPaso(paso: string): Promise<void> {
  const { error } = await supabase
    .from("paso_descartado")
    .upsert({ paso }, { onConflict: "usuario_id,paso", ignoreDuplicates: true });
  if (error) throw error;
}

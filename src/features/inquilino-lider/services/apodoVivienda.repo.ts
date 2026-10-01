import { supabase } from "@/shared/services/supabase";

/**
 * Cómo llama esta persona a esta vivienda.
 *
 * Se escribe en **su** membresía, no en la unidad: dos que comparten casa
 * pueden ponerle motes distintos, y el anfitrión que lleva tres apartamentos
 * los distingue por cómo los llama él, no por «Torre 2 · 301».
 *
 * Un texto en blanco **quita** el apodo en vez de guardar una cadena vacía: la
 * base no la admite --tiene un `check`-- y, aunque la admitiera, dejaría el
 * nombre de arriba en blanco, que es justo el texto que se pulsa para cambiar
 * de vivienda.
 *
 * Quién puede escribirlo no se decide aquí: `membresia_unidad_cambio` deja
 * tocar la fila propia, y `proteger_apodo_de_vivienda` impide que lo cambie
 * nadie más --ni el anfitrión ni la administración--. Esto solo pide lo suyo.
 */
export async function ponerApodoAVivienda(
  membresiaId: string,
  apodo: string,
): Promise<string | null> {
  const limpio = apodo.trim();
  const valor = limpio === "" ? null : limpio;

  const { error } = await supabase
    .from("membresia_unidad")
    .update({ apodo: valor })
    .eq("id", membresiaId);

  if (error) throw error;

  return valor;
}

import { supabase } from "@/shared/services/supabase";

/**
 * El chat entre vecinos (17/11/2026, pedido del cliente: «no habilitar chats
 * entre vecinos»).
 *
 * Es `condominio.chat_entre_vecinos`, apagado por defecto. Apagado, en los
 * canales del edificio («Residentes», «Propietarios»…) solo escribe el
 * personal y los vecinos leen. Lo hace cumplir la base
 * (`mensaje_sin_chat_entre_vecinos`); esto solo le sirve a la pantalla para no
 * ofrecer una caja de escribir que siempre fallaría.
 */

/** Si quien entra puede escribir en esa conversación. La responde la base. */
export async function puedeEscribirEnConversacion(conversacionId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("puede_escribir_en_conversacion", {
    p_conversacion_id: conversacionId,
  });
  if (error) throw error;
  return data ?? false;
}

export async function obtenerChatEntreVecinos(condominioId: string): Promise<boolean> {
  if (!condominioId) return false;
  const { data, error } = await supabase
    .from("condominio")
    .select("chat_entre_vecinos")
    .eq("id", condominioId)
    .maybeSingle();
  if (error) throw error;
  return data?.chat_entre_vecinos ?? false;
}

/** Solo la administración; lo sujeta `condominio_escritura`. */
export async function guardarChatEntreVecinos(
  condominioId: string,
  activo: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("condominio")
    .update({ chat_entre_vecinos: activo })
    .eq("id", condominioId);
  if (error) throw error;
}

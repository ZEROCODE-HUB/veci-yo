import { supabase } from "@/shared/services/supabase";

/**
 * El botón de S.O.S.
 *
 * Hasta ahora la pantalla anunciaba "TODOS LOS GUARDIAS SERÁN NOTIFICADOS" y
 * los dos botones hacían `navigation.goBack()`. No se avisaba a nadie ni
 * quedaba constancia de que alguien hubiera pedido auxilio.
 *
 * El aviso lo reparte un disparador de la base (`avisar_sos`): la app solo
 * crea la fila. Así la alarma llega igual si algún día se activa desde otro
 * sitio, y el cliente no decide a quién avisar.
 */

export interface AlarmaActivada {
  id: string;
  /** Cuánta gente recibió el aviso. Un cero hay que decírselo a quien pidió auxilio. */
  avisados: number;
}

export type MotivoCierre = "cancelada" | "atendida";

export async function activarSos(params: {
  condominioId: string;
  unidadId: string | null;
}): Promise<AlarmaActivada> {
  const { data: sesion } = await supabase.auth.getUser();
  const usuarioId = sesion.user?.id;
  if (!usuarioId) throw new Error("No hay sesión activa");

  const { data, error } = await supabase
    .from("alarma_sos")
    .insert({
      condominio_id: params.condominioId,
      usuario_id: usuarioId,
      unidad_id: params.unidadId,
    })
    .select("id, avisados")
    .single();

  if (error) throw error;

  // El disparador escribe `avisados` **después** del insert, así que la fila
  // que vuelve todavía trae el cero por defecto. Se relee.
  const { data: fresca } = await supabase
    .from("alarma_sos")
    .select("id, avisados")
    .eq("id", data.id)
    .single();

  return { id: data.id, avisados: fresca?.avisados ?? 0 };
}

export async function cerrarSos(
  alarmaId: string,
  cierre: MotivoCierre,
): Promise<void> {
  const { data: sesion } = await supabase.auth.getUser();
  const usuarioId = sesion.user?.id;
  if (!usuarioId) throw new Error("No hay sesión activa");

  const { error } = await supabase
    .from("alarma_sos")
    .update({
      cerrada_en: new Date().toISOString(),
      cerrada_por: usuarioId,
      cierre,
    })
    .eq("id", alarmaId);

  if (error) throw error;
}

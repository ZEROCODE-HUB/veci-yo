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
  /**
   * Cuánta gente recibió el aviso. Un cero hay que decírselo a quien pidió
   * auxilio. `null`: la alarma está creada y no se pudo leer a cuántos llegó.
   */
  avisados: number | null;
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
  const { data: fresca, error: errorRelectura } = await supabase
    .from("alarma_sos")
    .select("id, avisados")
    .eq("id", data.id)
    .single();

  /*
    Si la relectura falla **no se dice cero**. Caía en `?? 0`, y entonces la
    pantalla afirmaba «no hay nadie de turno» cuando el aviso sí había salido:
    lo peor que se le puede decir en falso a quien pide auxilio.
  */
  if (errorRelectura || !fresca) return { id: data.id, avisados: null };
  return { id: data.id, avisados: fresca.avisados ?? 0 };
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

/** Una alarma abierta, como la ve la portería (14/10/2026). */
export interface AlarmaAbierta {
  id: string;
  activadaEn: string;
  unidad: string | null;
  torre: number | null;
  quien: string | null;
  telefono: string | null;
}

/** Las alarmas abiertas de mi edificio, si soy portería o administración. */
export async function sosActivas(): Promise<AlarmaAbierta[]> {
  const { data, error } = await supabase.rpc("sos_activas");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: fila.id,
    activadaEn: fila.activada_en,
    unidad: fila.unidad,
    torre: fila.torre,
    quien: fila.quien,
    telefono: fila.telefono,
  }));
}

/**
 * La única salida de un S.O.S. para la portería: desactivarlo dejando la
 * incidencia (qué pasó, qué vio), que queda como PQRS de seguridad.
 */
export async function atenderSos(
  alarmaId: string,
  quePaso: string,
  queVio: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("atender_sos", {
    p_alarma_id: alarmaId,
    p_que_paso: quePaso,
    p_que_vio: queVio,
  });
  if (error) throw error;
  return data as string;
}

/** Una alarma pasada o abierta, como sale en el historial (15/10/2026). */
export interface AlarmaDelHistorial {
  id: string;
  activadaEn: string;
  unidad: string | null;
  quien: string | null;
  /** `null` mientras sigue abierta. */
  cierre: "cancelada" | "atendida" | "sin_respuesta" | null;
  cerradaEn: string | null;
  cerradaPor: string | null;
  /** La PQRS de seguridad que dejó la portería al atenderla, si la hay. */
  incidenciaId: string | null;
  esMia: boolean;
}

/**
 * El historial de S.O.S. (hueco 15): la portería y la administración, el de
 * su edificio; cada quien, las suyas. Lo decide la base.
 */
export async function historialSos(limite = 50): Promise<AlarmaDelHistorial[]> {
  const { data, error } = await supabase.rpc("historial_sos", { p_limite: limite });
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: fila.id,
    activadaEn: fila.activada_en,
    unidad: fila.unidad,
    quien: fila.quien,
    cierre: fila.cierre,
    cerradaEn: fila.cerrada_en,
    cerradaPor: fila.cerrada_por,
    incidenciaId: fila.incidencia_id,
    esMia: fila.es_mia,
  }));
}

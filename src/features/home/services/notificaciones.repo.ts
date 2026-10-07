import { supabase } from "@/shared/services/supabase";
import { formatDate, formatTime } from "@/shared/utils";
import type { Notificacion } from "../types";
import type { Database } from "@/shared/types/database.types";

type MotivoNotificacion = Database["public"]["Enums"]["motivo_notificacion"];

/**
 * Bandeja de notificaciones.
 *
 * Antes venían de un store con doce avisos fijos agrupados por rol: todos los
 * propietarios del edificio veían "tienes un paquete en portería" y el estado
 * `leida` se perdía al recargar. Ahora cada fila pertenece a una persona y las
 * escriben los disparadores de la base (migración 20260922090000).
 */

/** El emoji es presentación; lo decide el motivo, no lo guarda la base. */
const EMOJI: Record<MotivoNotificacion, string> = {
  correspondencia_recibida: "📦",
  correspondencia_entregada: "📬",
  visita_ingreso: "🔑",
  reserva_aprobada: "🏖️",
  reserva_rechazada: "🚫",
  anuncio_publicado: "📢",
  reconocimiento_recibido: "🏅",
  sos_activado: "🆘",
  mensaje_de_chat: "💬",
};

/** "Hoy" y "Ayer" leen mejor que la fecha en una bandeja. */
function etiquetaFecha(fecha: Date): string {
  const hoy = new Date();
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diferencia = (dia(hoy) - dia(fecha)) / 86_400_000;
  if (diferencia === 0) return "Hoy";
  if (diferencia === 1) return "Ayer";
  return formatDate(fecha);
}

export async function obtenerNotificaciones(): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from("notificacion")
    .select("id, tipo, titulo, mensaje, entidad_tipo, entidad_id, leida_en, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((fila) => {
    const creada = new Date(fila.created_at);
    return {
      id: fila.id,
      emoji: EMOJI[fila.tipo] ?? "🔔",
      titulo: fila.titulo,
      mensaje: fila.mensaje,
      hora: formatTime(creada),
      fecha: etiquetaFecha(creada),
      leida: fila.leida_en !== null,
      entidadTipo: fila.entidad_tipo,
      entidadId: fila.entidad_id,
    };
  });
}

export async function marcarNotificacionLeida(id: string) {
  const { error } = await supabase
    .from("notificacion")
    .update({ leida_en: new Date().toISOString() })
    .eq("id", id)
    .is("leida_en", null);

  if (error) throw error;
}

export async function marcarTodasLeidas() {
  const { error } = await supabase
    .from("notificacion")
    .update({ leida_en: new Date().toISOString() })
    .is("leida_en", null);

  if (error) throw error;
}

/** Cuántas quedan sin leer, para el punto de la campana. */
export async function contarSinLeer(): Promise<number> {
  const { count, error } = await supabase
    .from("notificacion")
    .select("id", { count: "exact", head: true })
    .is("leida_en", null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Por dónde quiere cada quien que le avisen de cada cosa.
 *
 * Lo pidió el cliente el 02/10/2026: «WhatsApp configurable por residente y
 * por tipo de aviso». Y está en el alcance del proyecto desde el principio: el
 * KT nombra «integración WhatsApp» entre las de notificaciones, marcada como no
 * verificada en código. No lo estaba: no había nada.
 *
 * **Nada de esto manda todavía un WhatsApp ni un correo.** Hace falta una
 * cuenta de WhatsApp Business API y un SMTP propio, y ninguno de los dos
 * existe. Lo que sí hay es la elección, guardada y **leída por quien avisa**:
 * `notificar_unidad` y el aviso de un reconocimiento preguntan antes de
 * insertar en la campana. Sin eso, `por_app` sería la novena casilla
 * decorativa de este proyecto.
 */
export interface PreferenciaDeAviso {
  motivo: MotivoNotificacion;
  emoji: string;
  etiqueta: string;
  porApp: boolean;
  porCorreo: boolean;
  porWhatsapp: boolean;
  /** Falso en la alarma de pánico: una alarma que se silencia no es una alarma. */
  configurable: boolean;
}

/** Cómo se llama cada motivo en la pantalla. El enum no es para leerlo. */
const ETIQUETA_MOTIVO: Record<MotivoNotificacion, string> = {
  correspondencia_recibida: "Llega un paquete",
  correspondencia_entregada: "Me entregan un paquete",
  visita_ingreso: "Entra una visita mía",
  reserva_aprobada: "Me aprueban una reserva",
  reserva_rechazada: "Me rechazan una reserva",
  anuncio_publicado: "Se publica un anuncio",
  reconocimiento_recibido: "Recibo un reconocimiento",
  sos_activado: "Alarma de S.O.S.",
  /*
    «Me escriben» y no «mensaje de chat»: la lista de avisos se lee como una
    frase en primera persona --«Llega un paquete», «Entra una visita mía»-- y
    una que diga el nombre interno del motivo se nota.
  */
  mensaje_de_chat: "Me escriben por el chat",
};

export async function obtenerPreferenciasDeAviso(): Promise<PreferenciaDeAviso[]> {
  const { data, error } = await supabase.rpc("avisos_de_cada_uno");

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    motivo: fila.motivo,
    emoji: EMOJI[fila.motivo] ?? "🔔",
    etiqueta: ETIQUETA_MOTIVO[fila.motivo] ?? fila.motivo,
    porApp: fila.por_app ?? true,
    porCorreo: fila.por_correo ?? false,
    porWhatsapp: fila.por_whatsapp ?? false,
    configurable: fila.configurable ?? true,
  }));
}

export async function guardarPreferenciaDeAviso(params: {
  motivo: MotivoNotificacion;
  porApp: boolean;
  porCorreo: boolean;
  porWhatsapp: boolean;
}) {
  const { error } = await supabase.rpc("guardar_aviso", {
    p_motivo: params.motivo,
    p_por_app: params.porApp,
    p_por_correo: params.porCorreo,
    p_por_whatsapp: params.porWhatsapp,
  });

  if (error) throw error;
}

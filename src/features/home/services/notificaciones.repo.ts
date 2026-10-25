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
  // Una novedad con el paquete: llegó roto, mojado, abierto (15/10/2026).
  correspondencia_incidencia: "⚠️",
  // Para la portería: el anfitrión decidió sobre un menor que ella marcó.
  menor_revisado: "🧒",
  // Las PQRS (15/10/2026).
  reclamo_nuevo: "📝",
  reclamo_respondido: "✅",
  visita_ingreso: "🔑",
  reserva_aprobada: "🏖️",
  reserva_rechazada: "🚫",
  // Lo que otro hace con la reserva de tu vivienda (15/10/2026).
  reserva_creada: "📅",
  reserva_cambiada: "🔁",
  reserva_cancelada: "❌",
  anuncio_publicado: "📢",
  reconocimiento_recibido: "🏅",
  sos_activado: "🆘",
  sos_atendido: "🛟",
  llamada_perdida: "📵",
  reserva_por_aprobar: "🧾",
  mensaje_de_chat: "💬",
  // Los de la estancia, para el anfitrión (14/10/2026).
  huesped_salida_parcial: "🚶",
  huesped_salida: "🏁",
  verificacion_requiere_revision: "🛡️",
  menor_por_revisar: "👶",
  preregistro_incompleto: "⏰",
  // El que cada quien se manda desde Perfil › Avisos (22/10/2026).
  aviso_de_prueba: "🧪",
  // Se publicó una actualización de la app (OTA), 22/10/2026.
  app_actualizada: "⬆️",
  // El día elegido para recordar el pago de un servicio (25/10/2026).
  servicio_por_pagar: "💡",
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
      tipo: fila.tipo,
      entidadTipo: fila.entidad_tipo,
      entidadId: fila.entidad_id,
    };
  });
}

/** Los avisos de la estancia que el anfitrión ve en su inicio (14/10/2026). */
const DE_LA_ESTANCIA: MotivoNotificacion[] = [
  "visita_ingreso",
  "huesped_salida_parcial",
  "huesped_salida",
  "verificacion_requiere_revision",
  "menor_por_revisar",
  "preregistro_incompleto",
];

/**
 * Lo último que pasó con sus huéspedes: entradas, salidas parciales, la salida
 * del último, lo que pide su aprobación. Lo pidió la responsable de producto:
 * «se notifica al anfitrión, en la vista del home».
 */
export async function obtenerAvisosDeEstancia(cuantos = 5): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from("notificacion")
    .select("id, tipo, titulo, mensaje, entidad_tipo, entidad_id, leida_en, created_at")
    .in("tipo", DE_LA_ESTANCIA)
    .order("created_at", { ascending: false })
    .limit(cuantos);
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
      tipo: fila.tipo,
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
  /** Push al celular (OneSignal), 22/10/2026. */
  porPush: boolean;
  /** Falso en la alarma de pánico: una alarma que se silencia no es una alarma. */
  configurable: boolean;
}

/** Cómo se llama cada motivo en la pantalla. El enum no es para leerlo. */
const ETIQUETA_MOTIVO: Record<MotivoNotificacion, string> = {
  correspondencia_recibida: "Llega un paquete",
  correspondencia_entregada: "Me entregan un paquete",
  correspondencia_incidencia: "Hay una novedad con un paquete mío",
  menor_revisado: "El anfitrión decide sobre un menor que dejé en espera",
  reclamo_nuevo: "Llega una PQRS que me toca atender o ver",
  reclamo_respondido: "Responden una PQRS mía",
  visita_ingreso: "Entra una visita mía",
  reserva_aprobada: "Me aprueban una reserva",
  reserva_rechazada: "Me rechazan una reserva",
  reserva_creada: "Me hacen una reserva a nombre de mi vivienda",
  reserva_cambiada: "Me cambian una reserva",
  reserva_cancelada: "Me cancelan una reserva",
  anuncio_publicado: "Se publica un anuncio",
  reconocimiento_recibido: "Recibo un reconocimiento",
  sos_activado: "Alarma de S.O.S.",
  sos_atendido: "Atienden el S.O.S. que pedí",
  llamada_perdida: "Nadie contesta una llamada a portería que me tocaba",
  reserva_por_aprobar: "Hay una reserva que tengo que aprobar",
  /*
    «Me escriben» y no «mensaje de chat»: la lista de avisos se lee como una
    frase en primera persona --«Llega un paquete», «Entra una visita mía»-- y
    una que diga el nombre interno del motivo se nota.
  */
  mensaje_de_chat: "Me escriben por el chat",
  // Los de la estancia, para el anfitrión (14/10/2026).
  huesped_salida_parcial: "Sale alguien de mi estancia y quedan otros",
  huesped_salida: "Sale el último huésped de mi estancia",
  verificacion_requiere_revision: "Un huésped necesita mi aprobación",
  menor_por_revisar: "La portería duda de un menor de mi estancia",
  preregistro_incompleto: "Un huésped llega pronto sin preregistro",
  // No sale en la lista de preferencias (no se apaga), pero el tipo lo pide.
  aviso_de_prueba: "Aviso de prueba",
  app_actualizada: "La app se actualiza a una versión nueva",
  servicio_por_pagar: "Llega el día de pagar un servicio de mi vivienda",
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
    porPush: fila.por_push ?? true,
    configurable: fila.configurable ?? true,
  }));
}

export async function guardarPreferenciaDeAviso(params: {
  motivo: MotivoNotificacion;
  porApp: boolean;
  porCorreo: boolean;
  porWhatsapp: boolean;
  /** Sin decirlo, se queda el que había (la base lo respeta así). */
  porPush?: boolean;
}) {
  const { error } = await supabase.rpc("guardar_aviso", {
    p_motivo: params.motivo,
    p_por_app: params.porApp,
    p_por_correo: params.porCorreo,
    p_por_whatsapp: params.porWhatsapp,
    p_por_push: params.porPush,
  });

  if (error) throw error;
}

/**
 * Cada quien se manda un aviso de prueba (campana + push) para comprobar que
 * le llega al celular. Devuelve el id del aviso, para seguir su envío.
 */
export async function enviarAvisoDePrueba(): Promise<string> {
  const { data, error } = await supabase.rpc("enviar_aviso_de_prueba");
  if (error) throw error;
  return data;
}

/** La app dice que el push de este aviso le llegó. Solo cuenta para los propios. */
export async function confirmarAvisoRecibido(notificacionId: string): Promise<void> {
  const { error } = await supabase.rpc("confirmar_aviso_recibido", {
    p_notificacion_id: notificacionId,
  });
  if (error) throw error;
}

export type EstadoEnvioPush = Database["public"]["Enums"]["estado_envio_push"];

export interface EnvioPush {
  estado: EstadoEnvioPush;
  detalle: string | null;
  enviadoEn: Date | null;
  recibidoEn: Date | null;
}

/** En qué quedó el push de un aviso propio (null si todavía no hay fila). */
export async function obtenerEnvioPush(notificacionId: string): Promise<EnvioPush | null> {
  const { data, error } = await supabase
    .from("envio_push")
    .select("estado, detalle, enviado_en, recibido_en")
    .eq("notificacion_id", notificacionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    estado: data.estado,
    detalle: data.detalle,
    enviadoEn: data.enviado_en ? new Date(data.enviado_en) : null,
    recibidoEn: data.recibido_en ? new Date(data.recibido_en) : null,
  };
}

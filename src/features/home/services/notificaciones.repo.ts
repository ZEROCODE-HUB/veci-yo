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

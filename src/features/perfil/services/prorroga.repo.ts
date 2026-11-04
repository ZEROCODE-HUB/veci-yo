import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

export type EstadoProrroga = Database["public"]["Enums"]["estado_prorroga"];

export interface MiProrroga {
  id: string;
  hasta: Date;
  /** `HH:mm` en la hora del edificio, no del teléfono (Para Claude 214). */
  hastaHora: string;
  motivo: string;
  estado: EstadoProrroga;
}

export interface DetalleDeProrroga {
  id: string;
  guardia: string;
  hasta: Date;
  motivo: string;
  estado: EstadoProrroga;
  pedidaEn: Date;
  /** Las horas y fechas ya escritas en la zona del edificio (Para Claude 214). */
  hastaHora: string;
  hastaFecha: string;
  pedidaHora: string;
  pedidaFecha: string;
}

/** La última prórroga del guardia en este edificio: pendiente o vigente (Para Claude 178). */
export async function obtenerMiProrroga(condominioId: string): Promise<MiProrroga | null> {
  const { data, error } = await supabase.rpc("mi_prorroga", { p_condominio_id: condominioId });
  if (error) throw error;
  const fila = data?.[0];
  return fila
    ? {
        id: fila.id,
        /*
          El fin en el reloj de este teléfono: ahora más lo que la base dice que
          falta. Con `new Date(fila.hasta)` la cuenta salía del reloj del
          teléfono, y uno con la hora mal decía «quedan 36 minutos» media hora
          después del final (Para Claude 217, 04/11/2026). Se pide cada minuto.
        */
        hasta: new Date(Date.now() + fila.segundos_restantes * 1000),
        hastaHora: fila.hasta_hora,
        motivo: fila.motivo,
        estado: fila.estado,
      }
    : null;
}

/** La hora actual del edificio en `HH:mm` (Para Claude 213). */
export async function obtenerHoraDelEdificio(condominioId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("hora_en_el_edificio", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return data ?? null;
}

/** `hasta` es una hora `HH:mm` del edificio; si ya pasó hoy, es la de mañana. */
export async function solicitarProrroga(datos: {
  condominioId: string;
  hasta: string;
  motivo: string;
}) {
  const { error } = await supabase.rpc("solicitar_prorroga", {
    p_condominio_id: datos.condominioId,
    p_hasta: datos.hasta,
    p_motivo: datos.motivo.trim(),
  });
  if (error) throw error;
}

export async function obtenerDetalleDeProrroga(id: string): Promise<DetalleDeProrroga | null> {
  const { data, error } = await supabase.rpc("detalle_de_prorroga", { p_id: id });
  if (error) throw error;
  const fila = data?.[0];
  return fila
    ? {
        id: fila.id,
        guardia: fila.guardia,
        hasta: new Date(fila.hasta),
        motivo: fila.motivo,
        estado: fila.estado,
        pedidaEn: new Date(fila.pedida_en),
        hastaHora: fila.hasta_hora,
        hastaFecha: fila.hasta_fecha,
        pedidaHora: fila.pedida_hora,
        pedidaFecha: fila.pedida_fecha,
      }
    : null;
}

export async function resolverProrroga(id: string, acepta: boolean) {
  const { error } = await supabase.rpc("resolver_prorroga", { p_id: id, p_acepta: acepta });
  if (error) throw error;
}

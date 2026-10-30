import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

export type EstadoProrroga = Database["public"]["Enums"]["estado_prorroga"];

export interface MiProrroga {
  id: string;
  hasta: Date;
  estado: EstadoProrroga;
}

export interface DetalleDeProrroga {
  id: string;
  guardia: string;
  hasta: Date;
  motivo: string;
  estado: EstadoProrroga;
  pedidaEn: Date;
}

/** La última prórroga del guardia en este edificio: pendiente o vigente (Para Claude 178). */
export async function obtenerMiProrroga(condominioId: string): Promise<MiProrroga | null> {
  const { data, error } = await supabase.rpc("mi_prorroga", { p_condominio_id: condominioId });
  if (error) throw error;
  const fila = data?.[0];
  return fila ? { id: fila.id, hasta: new Date(fila.hasta), estado: fila.estado } : null;
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
      }
    : null;
}

export async function resolverProrroga(id: string, acepta: boolean) {
  const { error } = await supabase.rpc("resolver_prorroga", { p_id: id, p_acepta: acepta });
  if (error) throw error;
}

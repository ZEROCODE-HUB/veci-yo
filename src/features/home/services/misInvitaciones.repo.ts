import { supabase } from "@/shared/services/supabase";

export interface EspacioDeLaInvitacion {
  id: string;
  estado: "pendiente" | "aceptada" | "rechazada" | "revocada" | "expirada";
  tipo: "estacionamiento" | "deposito";
  codigo: string | null;
  ubicacion: string | null;
  terminos: string | null;
}

export interface MiInvitacion {
  id: string;
  unidad: string;
  torre: number;
  edificio: string;
  invitadaPor: string | null;
  terminos: string | null;
  espacios: EspacioDeLaInvitacion[];
  /** Si ya aceptó la vivienda y solo quedan espacios por responder. */
  aceptada: boolean;
}

/**
 * Las invitaciones a una vivienda de quien entra, por su correo (Para Claude
 * 183, 30/10/2026). Salen también las ya aceptadas que tienen un
 * estacionamiento o un depósito por responder.
 */
export async function obtenerMisInvitaciones(): Promise<MiInvitacion[]> {
  const { data, error } = await supabase.rpc("mis_invitaciones_pendientes");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: fila.invitacion_id,
    unidad: fila.unidad,
    torre: fila.torre,
    edificio: fila.edificio,
    invitadaPor: fila.invitada_por,
    terminos: fila.terminos,
    espacios: Array.isArray(fila.espacios) ? (fila.espacios as unknown as EspacioDeLaInvitacion[]) : [],
    aceptada: Boolean(fila.aceptada),
  }));
}

export async function responderInvitacion(invitacionId: string, acepta: boolean) {
  const { error } = await supabase.rpc("responder_mi_invitacion", {
    p_invitacion_id: invitacionId,
    p_acepta: acepta,
  });
  if (error) throw error;
}

export async function responderEspacio(espacioId: string, acepta: boolean) {
  const { error } = await supabase.rpc("responder_espacio_de_mi_invitacion", {
    p_espacio_id: espacioId,
    p_acepta: acepta,
  });
  if (error) throw error;
}

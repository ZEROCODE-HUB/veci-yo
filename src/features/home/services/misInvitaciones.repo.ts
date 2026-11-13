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

export interface MiInvitacionDeHuesped {
  id: string;
  edificio: string;
  torre: number;
  unidad: string;
  anfitrion: string | null;
  /** `yyyy-MM-dd`, en la fecha del edificio. */
  entrada: string | null;
  salida: string | null;
  /** `HH:mm:ss`, si el anfitrión la puso. */
  horaLlegada: string | null;
  horaSalida: string | null;
  huespedes: number;
  vehiculos: number | null;
  codigoReserva: string | null;
}

/**
 * Las invitaciones de huésped temporal de quien entra, por su correo, con los
 * datos de la reserva (Para Claude 224, 04/11/2026). Antes solo se podían
 * aceptar abriendo el enlace con el token, y quien entraba a la app después
 * del preregistro la encontraba vacía.
 */
export async function obtenerMisInvitacionesDeHuesped(): Promise<MiInvitacionDeHuesped[]> {
  const { data, error } = await supabase.rpc("mis_invitaciones_de_huesped");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: fila.invitacion_id,
    edificio: fila.edificio,
    torre: fila.torre,
    unidad: fila.unidad,
    anfitrion: fila.anfitrion,
    entrada: fila.entrada,
    salida: fila.salida,
    horaLlegada: fila.hora_llegada,
    horaSalida: fila.hora_salida,
    huespedes: fila.huespedes ?? 0,
    vehiculos: fila.vehiculos,
    codigoReserva: fila.codigo_reserva,
  }));
}

export async function aceptarMiInvitacionDeHuesped(invitacionId: string) {
  const { error } = await supabase.rpc("aceptar_mi_invitacion_de_huesped", {
    p_invitacion_id: invitacionId,
  });
  if (error) throw error;
}

/** Una invitación del edificio (guardia, coadministración, administración). */
export interface MiInvitacionDelEdificio {
  id: string;
  edificio: string;
  /** `guardia`, `coadministrador` o `administrador`. */
  rol: string;
  invitadaPor: string | null;
}

/**
 * Las invitaciones del edificio pendientes para mi correo (13/11/2026). Antes
 * solo se aceptaban abriendo el enlace del correo con la sesión iniciada en la
 * web: quien se registraba en la app no las veía nunca.
 */
export async function obtenerMisInvitacionesDelEdificio(): Promise<MiInvitacionDelEdificio[]> {
  const { data, error } = await supabase.rpc("mis_invitaciones_del_edificio");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    edificio: f.condominio,
    rol: f.rol,
    invitadaPor: f.invitada_por ?? null,
  }));
}

export async function responderInvitacionDelEdificio(invitacionId: string, acepta: boolean) {
  const { error } = await supabase.rpc("responder_mi_invitacion_del_edificio", {
    p_invitacion_id: invitacionId,
    p_acepta: acepta,
  });
  if (error) throw error;
}

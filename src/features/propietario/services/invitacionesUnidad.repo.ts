import { supabase } from "@/shared/services/supabase";
import { crearInvitacion } from "@/shared/services/invitaciones";
import type { Database } from "@/shared/types/database.types";

type RolUnidad = Database["public"]["Enums"]["rol_unidad"];

/**
 * Quién está en una vivienda y a quién se ha invitado.
 *
 * Hasta ahora no había forma de dar de alta a nadie desde la aplicación: la
 * única pantalla que emitía invitaciones era la de coadministradores, de
 * ámbito condominio. Las membresías de las viviendas existían solo porque se
 * habían sembrado a mano.
 *
 * Quién puede invitar lo decide `puede_invitar_a_unidad` en la base —el
 * propietario, el inquilino líder y la administración—, no esta pantalla.
 */

export interface PersonaDeLaUnidad {
  id: string;
  nombre: string;
  rol: RolUnidad;
  /** Solo el huésped temporal las tiene. */
  vigenteDesde: string | null;
  vigenteHasta: string | null;
}

export interface InvitacionPendiente {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUnidad | null;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  expiraEn: string;
}

export async function obtenerPersonasDeUnidad(
  unidadId: string,
): Promise<PersonaDeLaUnidad[]> {
  if (!unidadId) return [];

  const { data, error } = await supabase
    .from("membresia_unidad")
    .select("id, nombre, rol, vigente_desde, vigente_hasta")
    .eq("unidad_id", unidadId)
    .eq("activo", true);

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre ?? "",
    rol: fila.rol,
    vigenteDesde: fila.vigente_desde,
    vigenteHasta: fila.vigente_hasta,
  }));
}

export async function obtenerInvitacionesPendientes(
  unidadId: string,
): Promise<InvitacionPendiente[]> {
  if (!unidadId) return [];

  const { data, error } = await supabase
    .from("invitacion")
    .select("id, nombre, correo, rol_unidad, vigente_desde, vigente_hasta, expira_en")
    .eq("unidad_id", unidadId)
    .eq("estado", "pendiente");

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre ?? "",
    correo: fila.correo,
    rol: fila.rol_unidad,
    vigenteDesde: fila.vigente_desde,
    vigenteHasta: fila.vigente_hasta,
    expiraEn: fila.expira_en,
  }));
}

export interface NuevaInvitacionAUnidad {
  condominioId: string;
  unidadId: string;
  rol: RolUnidad;
  nombre: string;
  correo: string;
  /** Obligatorias para `huesped_temporal`; la base lo exige. */
  vigenteDesde?: string;
  vigenteHasta?: string;
}

export async function invitarAUnidad(datos: NuevaInvitacionAUnidad) {
  return crearInvitacion({
    ambito: "unidad",
    condominioId: datos.condominioId,
    unidadId: datos.unidadId,
    rol: datos.rol,
    nombre: datos.nombre,
    correo: datos.correo,
    vigenteDesde: datos.vigenteDesde,
    vigenteHasta: datos.vigenteHasta,
  });
}

/**
 * Revocar, no borrar: la invitación es un hecho que ocurrió y queda en la
 * tabla con su estado. Borrarla haría imposible saber a quién se invitó.
 */
export async function revocarInvitacion(invitacionId: string) {
  const { error } = await supabase
    .from("invitacion")
    .update({ estado: "revocada" })
    .eq("id", invitacionId);
  if (error) throw error;
}

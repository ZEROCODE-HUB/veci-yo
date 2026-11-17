import { supabase } from "@/shared/services/supabase";
import { crearInvitacion, enlaceNuevoDeInvitacion, enviarInvitacion } from "@/shared/services/invitaciones";
import { mensajeDeError } from "@/shared/utils/error.util";
import { invitacionesPorCorreo } from "@/shared/services/ajustesDeLaApp";
import { motivoDeLaFuncion } from "@/shared/services/errorDeFuncion";
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
  /** Figura en la vivienda, sin cuenta y sin acceso. KT flujo 4.3 paso 3. */
  esMenor?: boolean;
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
    .select("id, nombre, rol, vigente_desde, vigente_hasta, es_menor")
    .eq("unidad_id", unidadId)
    .eq("activo", true);

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre ?? "",
    rol: fila.rol,
    vigenteDesde: fila.vigente_desde,
    vigenteHasta: fila.vigente_hasta,
    esMenor: fila.es_menor,
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
 * La administración asigna el propietario de una vivienda (29/10/2026).
 *
 * Desde el 30/10/2026 es una invitación que el propietario acepta en Inicio,
 * con sus términos y sus espacios. Desde el 16/11/2026 el correo la lleva,
 * como el de los demás roles: abre la app con ella, y la app dice si toca
 * iniciar sesión o crear la cuenta.
 */
export async function asignarPropietario(datos: { unidadId: string; nombre: string; correo: string }) {
  const correo = datos.correo.trim().toLowerCase();
  const nombre = datos.nombre.trim();
  const { data, error } = await supabase.rpc("asignar_propietario", {
    p_unidad_id: datos.unidadId,
    p_correo: correo,
    p_nombre: nombre,
  });
  if (error) throw error;
  const fila = data?.[0];
  const asignado = Boolean(fila?.asignado);

  /*
    El correo lleva la invitación, como los de los demás roles (16/11/2026):
    el botón abre la app con ella y la app dice si toca iniciar sesión o
    crear la cuenta. Hasta hoy solo decía «abre la app», porque el enlace con
    el que nace la invitación no lo recibe nadie: se pide uno nuevo.
  */
  if (!(await invitacionesPorCorreo())) {
    return { asignado, correoEnviado: false, motivo: "El envío de correos está apagado" };
  }
  try {
    const { data: invitacion, error: errorInvitacion } = await supabase
      .from("invitacion")
      .select("id")
      .eq("unidad_id", datos.unidadId)
      .eq("ambito", "unidad")
      .eq("rol_unidad", "propietario")
      .eq("correo", correo)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (errorInvitacion) throw errorInvitacion;
    const token = await enlaceNuevoDeInvitacion(invitacion.id);
    await enviarInvitacion({ invitacionId: invitacion.id, token, correo, nombre });
    return { asignado, correoEnviado: true, motivo: null };
  } catch (fallo) {
    return {
      asignado,
      correoEnviado: false,
      motivo: (await motivoDeLaFuncion(fallo)) ?? mensajeDeError(fallo, "No se pudo enviar el correo"),
    };
  }
}

/** El propietario asignado que todavía no creó su cuenta, si hay (29/10/2026). */
export async function propietarioPendiente(
  unidadId: string,
): Promise<{ id: string; nombre: string; correo: string; desde: string } | null> {
  const { data, error } = await supabase
    .from("invitacion")
    .select("id, nombre, correo, created_at")
    .eq("unidad_id", unidadId)
    .eq("ambito", "unidad")
    .eq("rol_unidad", "propietario")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, nombre: data.nombre, correo: data.correo, desde: data.created_at } : null;
}

/**
 * La administración quita al propietario de una vivienda (29/10/2026): su
 * membresía se da de baja (no se borra: queda constancia) y, si no queda otro
 * propietario, la vivienda vuelve a «disponible».
 */
export async function quitarPropietario(membresiaId: string, unidadId: string): Promise<void> {
  const { data, error } = await supabase
    .from("membresia_unidad")
    .update({ activo: false, es_anfitrion_primario: false, es_admin_primario: false })
    .eq("id", membresiaId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No tienes permiso para quitar a ese propietario.");
  const { count } = await supabase
    .from("membresia_unidad")
    .select("id", { count: "exact", head: true })
    .eq("unidad_id", unidadId)
    .eq("rol", "propietario")
    .eq("activo", true);
  if (!count) {
    await supabase.from("unidad").update({ estado: "disponible" }).eq("id", unidadId);
  }
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


/**
 * Da de alta a un residente menor de edad.
 *
 * No lleva correo ni invitación a propósito: el KT decide que un menor figura
 * en la vivienda **sin acceso a la plataforma**, y la invitación existe
 * justamente para crear una cuenta. La base lo garantiza con una restricción,
 * no con esta función: un menor no puede tener `usuario_id` ni `puede_acceder`.
 */
export async function registrarMenor(datos: {
  unidadId: string;
  nombre: string;
  telefono?: string;
  /**
   * El pais del telefono, en ISO 3166-1 alfa-2.
   *
   * `membresia_unidad.codigo_pais` existia desde el primer dia y nadie la
   * escribia. Y `registrar_menor` recibia el pais del **contacto de
   * emergencia** y no el del telefono del propio menor: el del adulto que
   * responde por el se guardaba y el del niño no.
   */
  codigoPais?: string;
  /** De un menor es de quien más falta hace saber a quién llamar. */
  contactoEmergencia?: { nombre?: string; codigo?: string; telefono?: string };
}) {
  const { error } = await supabase.rpc("registrar_menor", {
    p_unidad_id: datos.unidadId,
    p_nombre: datos.nombre,
    p_telefono: datos.telefono || undefined,
    p_codigo_pais: datos.codigoPais || undefined,
    p_contacto_nombre: datos.contactoEmergencia?.nombre || undefined,
    p_contacto_codigo: datos.contactoEmergencia?.codigo || undefined,
    p_contacto_telefono: datos.contactoEmergencia?.telefono || undefined,
  });
  if (error) throw error;
}

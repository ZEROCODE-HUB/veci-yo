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
  /** Sin cuenta: vive en la vivienda y no usa la app (17/11/2026). */
  sinApp: boolean;
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
    .select("id, usuario_id, nombre, rol, vigente_desde, vigente_hasta, es_menor")
    .eq("unidad_id", unidadId)
    .eq("activo", true);

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre ?? "",
    rol: fila.rol,
    sinApp: !fila.usuario_id,
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
 * Da de alta a un residente menor de edad, con el teléfono de quien responde
 * por él.
 *
 * Desde el 17/11/2026 la pantalla anota a los menores con
 * `agregarPersonaSinApp` (nombre, documento y la casilla de menor). Esta se
 * queda porque `registrar_menor` es lo que llaman las versiones instaladas y
 * el recorrido `el-telefono-sabe-de-que-pais-es` comprueba que guarda el país.
 */
export async function registrarMenor(datos: {
  unidadId: string;
  nombre: string;
  telefono?: string;
  /** El país del teléfono, en ISO 3166-1 alfa-2. */
  codigoPais?: string;
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

type TipoDocumento = Database["public"]["Enums"]["tipo_documento"];

/**
 * Anota a alguien que vive en la vivienda y no va a usar la app: un niño, un
 * abuelo (17/11/2026). Sin correo ni cuenta; el documento es opcional.
 *
 * Quién puede y la regla de la renta corta los pone la base
 * (`agregar_persona_sin_app`): aquí solo se llama.
 */
export async function agregarPersonaSinApp(datos: {
  unidadId: string;
  nombre: string;
  tipoDocumento?: TipoDocumento;
  documento?: string;
  esMenor: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc("agregar_persona_sin_app", {
    p_unidad_id: datos.unidadId,
    p_nombre: datos.nombre,
    p_tipo_documento: datos.documento ? datos.tipoDocumento : undefined,
    p_documento: datos.documento || undefined,
    p_es_menor: datos.esMenor,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Le da la app a quien ya vive en la vivienda sin ella (17/11/2026): una
 * invitación de residente que, al aceptarla, se une a **su misma fila** en vez
 * de crear otra persona. El correo sale como el de cualquier invitación.
 */
export async function darAccesoALaApp(datos: {
  membresiaId: string;
  nombre: string;
  correo: string;
}) {
  const correo = datos.correo.trim().toLowerCase();
  const { data, error } = await supabase.rpc("dar_acceso_a_la_app", {
    p_membresia_id: datos.membresiaId,
    p_correo: correo,
  });
  if (error) throw error;
  const fila = Array.isArray(data) ? data[0] : data;
  return enviarInvitacion({
    invitacionId: fila?.invitacion_id as string,
    token: fila?.token as string,
    correo,
    nombre: datos.nombre,
  });
}

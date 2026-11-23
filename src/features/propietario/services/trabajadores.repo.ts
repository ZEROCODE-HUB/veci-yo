import { supabase } from "@/shared/services/supabase";
import { enviarInvitacion, type InvitacionCreada } from "@/shared/services/invitaciones";

/**
 * El trabajador permanente de una vivienda (17/11/2026): la empleada, el
 * chofer. No es miembro de la vivienda --la base no le deja ver nada de
 * ella--: sin app figura en su directorio; con app, además, le suena su
 * intercomunicador. Todo pasa por funciones de la base, que comprueban quién
 * pide.
 */
export interface TrabajadorDeLaVivienda {
  id: string;
  nombre: string;
  oficio: string | null;
  codigoPais: string | null;
  telefono: string | null;
  /** Se le dio usuario en la app. */
  conApp: boolean;
  /** Ya aceptó y entra con su cuenta. Con app y sin cuenta: invitación pendiente. */
  tieneCuenta: boolean;
  /** A qué correo se le ofreció la app; solo llega a quien lo puede cambiar. */
  correoInvitado: string | null;
}

export interface NuevoTrabajador {
  unidadId: string;
  nombre: string;
  oficio?: string;
  codigoPais?: string;
  telefono?: string;
  conApp: boolean;
  correo?: string;
  /** Con app (18/11/2026): le suena el citófono de la vivienda. Por defecto sí. */
  puedeContestarCitofono?: boolean;
  /** Con app (18/11/2026): anuncia visitas para la vivienda. Por defecto no. */
  puedeCrearVisitas?: boolean;
  /** La visita permanente con que se registró. */
  visitaId?: string;
}

export async function agregarTrabajador(datos: NuevoTrabajador): Promise<string> {
  const { data, error } = await supabase.rpc("agregar_trabajador_de_la_vivienda", {
    p_unidad_id: datos.unidadId,
    p_nombre: datos.nombre,
    p_oficio: datos.oficio ?? undefined,
    p_codigo_pais: datos.codigoPais ?? undefined,
    p_telefono: datos.telefono ?? undefined,
    p_con_app: datos.conApp,
    p_correo: datos.conApp ? datos.correo : undefined,
    p_puede_contestar_citofono: datos.puedeContestarCitofono ?? true,
    p_puede_crear_visitas: datos.puedeCrearVisitas ?? false,
    p_visita_id: datos.visitaId ?? undefined,
  });
  if (error) throw error;
  return data;
}

/** Lo que el profesional permanente puede hacer con su cuenta (23/11/2026). */
export interface PermisosDeTrabajador {
  puedeCrearVisitas: boolean;
  puedeContestarCitofono: boolean;
}

/** Los permisos de cada profesional de la vivienda, por id. Solo quien la gestiona. */
export async function obtenerPermisosDeTrabajadores(
  unidadId: string,
): Promise<Record<string, PermisosDeTrabajador>> {
  const { data, error } = await supabase.rpc("permisos_de_trabajadores", { p_unidad_id: unidadId });
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((f) => [
      f.id,
      { puedeCrearVisitas: f.puede_crear_visitas, puedeContestarCitofono: f.puede_contestar_citofono },
    ]),
  );
}

export async function cambiarPermisosDeTrabajador(id: string, permisos: PermisosDeTrabajador): Promise<void> {
  const { error } = await supabase.rpc("cambiar_permisos_de_trabajador", {
    p_id: id,
    p_puede_crear_visitas: permisos.puedeCrearVisitas,
    p_puede_contestar_citofono: permisos.puedeContestarCitofono,
  });
  if (error) throw error;
}

/**
 * La invitación a la app del profesional permanente con cuenta (23/11/2026):
 * la misma de los demás roles, con su código, así su registro sale lleno con
 * lo que escribió quien lo registró. Sirve también para reenviarla.
 */
export async function invitarTrabajador(trabajador: {
  id: string;
  correo: string;
  nombre: string;
}): Promise<InvitacionCreada> {
  const { data, error } = await supabase.rpc("invitar_trabajador", { p_trabajador_id: trabajador.id });
  if (error) throw error;
  const fila = Array.isArray(data) ? data[0] : data;
  return enviarInvitacion({
    invitacionId: fila?.invitacion_id as string,
    token: fila?.token as string,
    correo: trabajador.correo,
    nombre: trabajador.nombre,
  });
}

export async function darDeBajaTrabajador(id: string): Promise<void> {
  const { error } = await supabase.rpc("dar_de_baja_trabajador_de_la_vivienda", { p_id: id });
  if (error) throw error;
}

export async function obtenerTrabajadores(unidadId: string): Promise<TrabajadorDeLaVivienda[]> {
  const { data, error } = await supabase.rpc("trabajadores_de_la_vivienda", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    nombre: f.nombre,
    oficio: f.oficio ?? null,
    codigoPais: f.codigo_pais ?? null,
    telefono: f.telefono ?? null,
    conApp: f.con_app,
    tieneCuenta: f.tiene_cuenta,
    correoInvitado: f.correo_invitado ?? null,
  }));
}

/** La invitación a la app como trabajador, para aceptarla en Inicio. */
export interface MiInvitacionDeTrabajador {
  id: string;
  edificio: string;
  torre: number;
  unidad: string;
  invitadaPor: string | null;
}

export async function obtenerMisInvitacionesDeTrabajador(): Promise<MiInvitacionDeTrabajador[]> {
  const { data, error } = await supabase.rpc("mis_invitaciones_de_trabajador");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    edificio: f.condominio,
    torre: f.torre,
    unidad: f.unidad,
    invitadaPor: f.invitada_por ?? null,
  }));
}

export async function responderInvitacionDeTrabajador(id: string, acepta: boolean): Promise<void> {
  const { error } = await supabase.rpc("responder_mi_invitacion_de_trabajador", {
    p_id: id,
    p_acepta: acepta,
  });
  if (error) throw error;
}

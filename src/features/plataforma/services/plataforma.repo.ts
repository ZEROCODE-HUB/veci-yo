import { supabase } from "@/shared/services/supabase";
import { formatDate, formatDateTime } from "@/shared/utils";
import type { Database } from "@/shared/types/database.types";

type EstadoReclamo = Database["public"]["Enums"]["estado_reclamo"];
type RolPlataforma = Database["public"]["Enums"]["rol_plataforma"];

/**
 * El panel de la plataforma.
 *
 * Todo pasa por funciones de la base, ninguna consulta directa a una tabla del
 * dominio. No es una preferencia de estilo: el alcance de este rol es «lo de la
 * plataforma y nada de los vecinos», y la unica forma de que eso se sostenga es
 * que la lista de lo que se puede pedir sea finita. Si manaña hace falta un dato
 * mas, se añade a la funcion de la base y se discute ahi, no aqui.
 *
 * Cada funcion de la base comprueba el rol en su primera linea. Esto de aqui no
 * protege nada: es la capa que pinta.
 */

export interface ResumenPlataforma {
  condominios: number;
  viviendas: number;
  cuentas: number;
  reclamosAppAbiertos: number;
}

export interface EdificioEnElPanel {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string | null;
  pais: string;
  moneda: string;
  torres: number;
  viviendas: number;
  personas: number;
  administradores: number;
  guardias: number;
  reclamosAbiertos: number;
  creadoEn: string;
}

export interface ReclamoDeLaApp {
  id: string;
  numero: string;
  tipo: string;
  categoria: string | null;
  titulo: string;
  descripcion: string;
  estado: EstadoReclamo;
  resolucion: string | null;
  modeloDispositivo: string | null;
  correoContacto: string | null;
  telefonoContacto: string | null;
  medioPreferido: string | null;
  autor: string;
  condominio: string;
  creadoEn: string;
  resueltoEn: string | null;
}

export interface MiembroDelStaff {
  usuarioId: string;
  nombre: string;
  rol: RolPlataforma;
  activo: boolean;
  nota: string | null;
  creadoEn: string;
}

export interface LineaDeBitacora {
  id: string;
  accion: string;
  actor: string;
  condominio: string | null;
  detalle: Record<string, unknown>;
  creadoEn: string;
}

/**
 * Las acciones de la bitácora, en castellano.
 *
 * La base guarda la clave --`condominio_creado`-- porque es lo que no cambia; la
 * frase se decide aquí. Una acción que no esté en este mapa se enseña con su
 * clave: es más útil leer `algo_raro` que «Acción desconocida».
 */
export const ACCIONES: Record<string, string> = {
  condominio_creado: "Dio de alta un edificio",
  primer_administrador_invitado: "Invitó a la primera administración",
  reclamo_app_respondido: "Contestó una PQRS de la aplicación",
  rol_plataforma_dado: "Dio un rol de plataforma",
  rol_plataforma_quitado: "Quitó un rol de plataforma",
};

export const ROLES_PLATAFORMA: Record<RolPlataforma, string> = {
  dueno: "Dueño de la plataforma",
  soporte: "Soporte",
};

export async function obtenerResumen(): Promise<ResumenPlataforma> {
  const { data, error } = await supabase.rpc("panel_resumen");
  if (error) throw error;

  const fila = data?.[0];
  return {
    // Los conteos vienen como `bigint`, que PostgREST entrega en texto para no
    // perder precision. Aqui caben de sobra en un numero.
    condominios: Number(fila?.condominios ?? 0),
    viviendas: Number(fila?.viviendas ?? 0),
    cuentas: Number(fila?.cuentas ?? 0),
    reclamosAppAbiertos: Number(fila?.reclamos_app_abiertos ?? 0),
  };
}

export async function obtenerEdificios(): Promise<EdificioEnElPanel[]> {
  const { data, error } = await supabase.rpc("panel_condominios");
  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    direccion: fila.direccion,
    ciudad: fila.ciudad,
    pais: fila.pais,
    moneda: fila.moneda,
    torres: Number(fila.torres ?? 0),
    viviendas: Number(fila.viviendas ?? 0),
    personas: Number(fila.personas ?? 0),
    administradores: Number(fila.administradores ?? 0),
    guardias: Number(fila.guardias ?? 0),
    reclamosAbiertos: Number(fila.reclamos_abiertos ?? 0),
    creadoEn: formatDate(new Date(fila.creado_en)),
  }));
}

export async function obtenerReclamosDeLaApp(): Promise<ReclamoDeLaApp[]> {
  const { data, error } = await supabase.rpc("panel_reclamos_app");
  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    numero: fila.numero,
    tipo: fila.tipo,
    categoria: fila.categoria,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    estado: fila.estado,
    resolucion: fila.resolucion,
    modeloDispositivo: fila.modelo_dispositivo,
    correoContacto: fila.correo_contacto,
    telefonoContacto: fila.telefono_contacto,
    medioPreferido: fila.medio_preferido,
    autor: fila.autor,
    condominio: fila.condominio,
    creadoEn: formatDateTime(new Date(fila.creado_en)),
    resueltoEn: fila.resuelto_en ? formatDateTime(new Date(fila.resuelto_en)) : null,
  }));
}

export async function responderReclamo(params: {
  reclamoId: string;
  resolucion: string;
  estado: EstadoReclamo;
}) {
  const { error } = await supabase.rpc("panel_responder_reclamo", {
    p_reclamo_id: params.reclamoId,
    p_resolucion: params.resolucion,
    p_estado: params.estado,
  });
  if (error) throw error;
}

export interface EdificioNuevo {
  nombre: string;
  direccion: string;
  pais: string;
  ciudad?: string;
  moneda?: string;
  correoAdmin?: string;
  nombreAdmin?: string;
}

/**
 * Da de alta un edificio y, si se dio un correo, deja la invitación para su
 * primera administración.
 *
 * Devuelve el **token en claro**, que es la única vez que existe: en la tabla
 * solo queda su hash. Quien llame a esto tiene que enseñarlo o enviarlo ahí
 * mismo, porque no se puede volver a pedir.
 */
export async function crearEdificio(datos: EdificioNuevo) {
  const { data, error } = await supabase.rpc("panel_crear_condominio", {
    p_nombre: datos.nombre,
    p_direccion: datos.direccion,
    p_pais: datos.pais,
    p_ciudad: datos.ciudad,
    p_moneda: datos.moneda ?? "COP",
    p_correo_admin: datos.correoAdmin,
    p_nombre_admin: datos.nombreAdmin,
  });
  if (error) throw error;

  const fila = data?.[0];
  return {
    condominioId: fila?.condominio_id ?? "",
    invitacionId: fila?.invitacion_id ?? null,
    token: fila?.token ?? null,
  };
}

export async function obtenerStaff(): Promise<MiembroDelStaff[]> {
  const { data, error } = await supabase.rpc("panel_staff");
  if (error) throw error;

  return (data ?? []).map((fila) => ({
    usuarioId: fila.usuario_id,
    nombre: fila.nombre,
    rol: fila.rol,
    activo: fila.activo,
    nota: fila.nota,
    creadoEn: formatDate(new Date(fila.creado_en)),
  }));
}

/**
 * Busca una cuenta por su correo para poder darle el rol.
 *
 * El correo no es la identidad --regla 3-- y no se usa como tal: esto devuelve
 * el `id`, que sí lo es. El correo solo sirve para encontrarla, y el nombre
 * para que quien reparte el rol confirme que es la persona que cree.
 */
export async function buscarCuenta(correo: string) {
  const { data, error } = await supabase.rpc("panel_buscar_cuenta", {
    p_correo: correo,
  });
  if (error) throw error;

  const fila = data?.[0];
  if (!fila) return null;
  return {
    usuarioId: fila.usuario_id,
    nombre: fila.nombre,
    yaEsStaff: fila.ya_es_staff,
  };
}

export async function darRolDePlataforma(params: {
  usuarioId: string;
  rol: RolPlataforma;
  nota?: string;
}) {
  const { error } = await supabase.rpc("panel_dar_rol_plataforma", {
    p_usuario_id: params.usuarioId,
    p_rol: params.rol,
    p_nota: params.nota,
  });
  if (error) throw error;
}

export async function quitarRolDePlataforma(usuarioId: string) {
  const { error } = await supabase.rpc("panel_quitar_rol_plataforma", {
    p_usuario_id: usuarioId,
  });
  if (error) throw error;
}

export async function obtenerBitacora(limite = 100): Promise<LineaDeBitacora[]> {
  const { data, error } = await supabase.rpc("panel_bitacora", {
    p_limite: limite,
  });
  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    accion: fila.accion,
    actor: fila.actor,
    condominio: fila.condominio,
    detalle: (fila.detalle ?? {}) as Record<string, unknown>,
    creadoEn: formatDateTime(new Date(fila.creado_en)),
  }));
}

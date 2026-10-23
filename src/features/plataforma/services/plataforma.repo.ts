import { supabase } from "@/shared/services/supabase";
import { motivoDeLaFuncion } from "@/shared/services/errorDeFuncion";
import { BASE_ENLACE } from "@/shared/services/invitaciones";
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
  parametro_cambiado: "Cambió un ajuste de la app",
  precio_cambiado: "Cambió un precio",
  documento_legal_publicado: "Publicó un texto legal",
  cuenta_bloquear: "Bloqueó una cuenta",
  cuenta_desbloquear: "Desbloqueó una cuenta",
  cuenta_enviar_contrasena: "Envió el correo de contraseña",
  cuenta_confirmar_correo: "Confirmó el correo de una cuenta",
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

/**
 * Invita a la administración de un edificio que no tiene ninguna.
 *
 * `invitar_primer_administrador` existía en la base desde el primer día y
 * **nada la llamaba**. Un edificio creado sin correo, o cuyo enlace se perdió
 * o caducó, se quedaba sin administración para siempre: las pantallas decían
 * «vuelve a entrar aquí» y «hay que emitir otro», y no había dónde
 * (13/10/2026). La función solo deja pasar si el edificio no tiene a nadie.
 */
export async function invitarPrimerAdministrador(params: {
  condominioId: string;
  correo: string;
  nombre: string;
}) {
  const { data, error } = await supabase.rpc("invitar_primer_administrador", {
    p_condominio_id: params.condominioId,
    p_correo: params.correo.trim(),
    p_nombre: params.nombre.trim(),
  });
  if (error) throw error;

  const fila = data?.[0];
  return {
    invitacionId: fila?.invitacion_id ?? "",
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

// --- Códigos de descuento de la suscripción (QA 23/10/2026) ----------------

export interface CodigoDeDescuento {
  id: string;
  codigo: string;
  porcentaje: number;
  /** `dd/MM/yyyy`, o `null` si no vence. */
  venceEn: string | null;
  usosMaximos: number | null;
  activo: boolean;
}

export async function listarCodigosDeDescuento(): Promise<CodigoDeDescuento[]> {
  const { data, error } = await supabase
    .from("codigo_descuento")
    .select("id, codigo, porcentaje, vence_en, usos_maximos, activo")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    codigo: f.codigo,
    porcentaje: f.porcentaje,
    venceEn: f.vence_en ? formatDate(new Date(`${f.vence_en}T12:00:00`)) : null,
    usosMaximos: f.usos_maximos,
    activo: f.activo,
  }));
}

export async function crearCodigoDeDescuento(params: {
  codigo: string;
  porcentaje: number;
  /** `yyyy-MM-dd`, o vacío si no vence. */
  venceEn?: string;
  usosMaximos?: number | null;
}): Promise<void> {
  const { data: sesion } = await supabase.auth.getSession();
  const { error } = await supabase.from("codigo_descuento").insert({
    codigo: params.codigo.trim().toUpperCase(),
    porcentaje: params.porcentaje,
    vence_en: params.venceEn || null,
    usos_maximos: params.usosMaximos ?? null,
    creado_por: sesion.session?.user.id ?? null,
  });
  if (error) throw error;
}

export async function activarCodigoDeDescuento(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from("codigo_descuento").update({ activo }).eq("id", id);
  if (error) throw error;
}

// --- Ajustes de la app (configuracion_plataforma, 23/10/2026) ---------------

export interface Parametro {
  clave: string;
  descripcion: string;
  categoria: string;
  tipo: string;
  unidad: string | null;
  minimo: number | null;
  maximo: number | null;
  valoresPermitidos: string[] | null;
  riesgo: string;
  valor: string;
  valorPorDefecto: string | null;
  actualizadoEn: string;
}

export async function obtenerParametros(): Promise<Parametro[]> {
  const { data, error } = await supabase.rpc("panel_parametros");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    clave: f.clave,
    descripcion: f.descripcion ?? "",
    categoria: f.categoria,
    tipo: f.tipo,
    unidad: f.unidad,
    minimo: f.minimo,
    maximo: f.maximo,
    valoresPermitidos: f.valores_permitidos,
    riesgo: f.riesgo,
    valor: f.valor,
    valorPorDefecto: f.valor_por_defecto,
    actualizadoEn: formatDateTime(new Date(f.actualizado_en)),
  }));
}

/** Lo valida la base (tipo, rango, valores permitidos); su motivo llega tal cual. */
export async function cambiarParametro(clave: string, valor: string): Promise<void> {
  const { error } = await supabase.rpc("panel_cambiar_parametro", {
    p_clave: clave,
    p_valor: valor,
  });
  if (error) throw error;
}

export interface CambioDeParametro {
  antes: string | null;
  despues: string | null;
  cuando: string;
  quien: string;
}

export async function historialDeParametro(clave: string): Promise<CambioDeParametro[]> {
  const { data, error } = await supabase.rpc("panel_historial_parametro", { p_clave: clave });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    antes: f.valor_anterior,
    despues: f.valor_nuevo,
    cuando: formatDateTime(new Date(f.cambiado_en)),
    quien: f.quien,
  }));
}

// --- Planes y precios -------------------------------------------------------

export interface PrecioVigente {
  plan: string;
  planNombre: string;
  periodicidad: string;
  /** `null`: el precio para cualquier país sin uno propio. */
  pais: string | null;
  monto: number;
  moneda: string;
  vigenteDesde: string;
}

export async function obtenerPrecios(): Promise<PrecioVigente[]> {
  const { data, error } = await supabase.rpc("panel_precios");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    plan: f.plan,
    planNombre: f.plan_nombre,
    periodicidad: f.periodicidad,
    pais: f.pais?.trim() || null,
    monto: Number(f.monto),
    moneda: f.moneda.trim(),
    vigenteDesde: formatDate(new Date(`${f.vigente_desde}T12:00:00`)),
  }));
}

export async function cambiarPrecio(params: {
  plan: string;
  pais: string | null;
  monto: number;
  moneda: string;
}): Promise<void> {
  const { error } = await supabase.rpc("panel_cambiar_precio", {
    p_plan: params.plan,
    p_pais: params.pais ?? "",
    p_monto: params.monto,
    p_moneda: params.moneda,
  });
  if (error) throw error;
}

// --- Textos legales de la app ------------------------------------------------

export const TEXTOS_LEGALES_DE_LA_APP: Record<string, string> = {
  terminos_app: "Términos y condiciones de la app",
  privacidad: "Política de privacidad",
  tratamiento_datos: "Tratamiento de datos personales",
  consulta_antecedentes: "Autorización de consulta de antecedentes",
};

export interface TextoLegal {
  tipo: string;
  titulo: string;
  contenido: string;
  version: number;
  actualizadoEn: string;
}

export async function obtenerTextosLegales(): Promise<TextoLegal[]> {
  const { data, error } = await supabase.rpc("panel_documentos_legales");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    tipo: f.tipo,
    titulo: f.titulo,
    contenido: f.contenido,
    version: f.version,
    actualizadoEn: formatDate(new Date(f.actualizado_en)),
  }));
}

export async function publicarTextoLegal(params: {
  tipo: string;
  titulo: string;
  contenido: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("panel_publicar_documento_legal", {
    p_tipo: params.tipo,
    p_titulo: params.titulo,
    p_contenido: params.contenido,
  });
  if (error) throw error;
  return data;
}

// --- Usuarios: buscar y actuar ---------------------------------------------

export interface CuentaEnElPanel {
  usuarioId: string;
  nombre: string;
  correo: string;
  creadaEn: string;
  ultimoIngreso: string | null;
  correoConfirmado: boolean;
  bloqueada: boolean;
  /** En qué edificios está y con qué rol; nada más de su vida en ellos. */
  edificios: { edificio: string; rol: string }[];
  rolPlataforma: RolPlataforma | null;
}

export async function buscarUsuarios(texto: string): Promise<CuentaEnElPanel[]> {
  const { data, error } = await supabase.rpc("panel_buscar_usuarios", { p_texto: texto });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    usuarioId: f.usuario_id,
    nombre: f.nombre,
    correo: f.correo,
    creadaEn: formatDate(new Date(f.creada_en)),
    ultimoIngreso: f.ultimo_ingreso ? formatDateTime(new Date(f.ultimo_ingreso)) : null,
    correoConfirmado: f.correo_confirmado,
    bloqueada: f.bloqueada,
    edificios: (f.edificios ?? []) as { edificio: string; rol: string }[],
    rolPlataforma: (f.rol_plataforma as RolPlataforma | null) ?? null,
  }));
}

export type AccionSobreCuenta = "bloquear" | "desbloquear" | "enviar_contrasena" | "confirmar_correo";

/** Va por la función `panel-usuarios`: necesita la API de administración. */
export async function actuarSobreCuenta(usuarioId: string, accion: AccionSobreCuenta): Promise<void> {
  const { error } = await supabase.functions.invoke("panel-usuarios", {
    body: { usuarioId, accion, volverA: `${BASE_ENLACE}/nueva-contrasena` },
  });
  if (error) {
    throw new Error((await motivoDeLaFuncion(error)) ?? "No se pudo completar la acción");
  }
}

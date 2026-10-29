import { supabase } from "@/shared/services/supabase";
import { motivoDeLaFuncion } from "@/shared/services/errorDeFuncion";
import { webDeVeciyo } from "@/shared/services/ajustesDeLaApp";
import { formatDate, formatDateTime } from "@/shared/utils";
import type { Database, Json } from "@/shared/types/database.types";

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
  pais_cambiado: "Cambió los datos de un país",
  documento_de_pais_cambiado: "Cambió un documento de un país",
  permiso_de_rol_cambiado: "Cambió un permiso por rol",
  documento_legal_publicado: "Publicó un texto legal",
  cuenta_bloquear: "Bloqueó una cuenta",
  cuenta_desbloquear: "Desbloqueó una cuenta",
  cuenta_enviar_contrasena: "Envió el correo de contraseña",
  cuenta_confirmar_correo: "Confirmó el correo de una cuenta",
  cuenta_suspender: "Suspendió una cuenta",
  cuenta_reactivar: "Reactivó una cuenta",
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

/** Si el correo de aviso salió, y si no, por qué. */
export interface EnvioDeInvitacion {
  enviado: boolean;
  motivo: string | null;
}

/** Lo que queda al dar la administración de un edificio. */
export interface AdministracionAsignada {
  /** Si no tenía cuenta y se le creó (el correo trae el enlace de la contraseña). */
  cuentaNueva: boolean;
  correo: EnvioDeInvitacion;
}

/**
 * Le da la administración de un edificio sin administración a ese correo, en
 * el acto, y se lo avisa por correo (29/10/2026). Antes era una invitación que
 * había que aceptar; el cliente: «es mucha vaina». Si no tenía cuenta, se le
 * crea y el correo trae el enlace para poner su contraseña. Lo hace la función
 * `vincular-administracion`, que comprueba que quien pide es dueño.
 */
async function vincularAdministracion(datos: {
  condominioId: string;
  correo: string;
  nombre: string;
}): Promise<AdministracionAsignada> {
  const { data, error } = await supabase.functions.invoke("vincular-administracion", {
    body: datos,
  });
  if (error) {
    throw new Error((await motivoDeLaFuncion(error)) ?? "No se pudo asignar la administración");
  }
  const respuesta = data as {
    cuentaNueva?: boolean;
    correo?: { enviado?: boolean; motivo?: string | null };
  } | null;
  return {
    cuentaNueva: Boolean(respuesta?.cuentaNueva),
    correo: {
      enviado: Boolean(respuesta?.correo?.enviado),
      motivo: respuesta?.correo?.enviado ? null : (respuesta?.correo?.motivo ?? "No se pudo enviar el correo"),
    },
  };
}

/**
 * Los países donde se puede dar de alta un edificio, con su moneda. Salen de
 * la tabla `pais` (`alta_de_edificio`): la pantalla tenía su propia lista con
 * Colombia y Perú, y habilitar otro país pedía tocar el código
 * (Parametrización, 25/10/2026).
 */
export async function paisesParaAltaDeEdificio(): Promise<
  Array<{ codigo: string; nombre: string; moneda: string }>
> {
  const { data, error } = await supabase
    .from("pais")
    .select("codigo, nombre, moneda")
    .eq("alta_de_edificio", true)
    .eq("activo", true)
    .not("moneda", "is", null)
    .order("orden");
  if (error) throw error;
  return (data ?? []).map((p) => ({ codigo: p.codigo, nombre: p.nombre, moneda: p.moneda ?? "" }));
}

/**
 * Da de alta un edificio y, si se dio un correo, le da su administración a
 * esa persona en el acto (29/10/2026; antes era una invitación).
 */
export async function crearEdificio(datos: EdificioNuevo) {
  const { data, error } = await supabase.rpc("panel_crear_condominio", {
    p_nombre: datos.nombre,
    p_direccion: datos.direccion,
    p_pais: datos.pais,
    p_ciudad: datos.ciudad,
    // Sin moneda, la base pone la del país (`pais.moneda`).
    p_moneda: datos.moneda,
    // Sin invitación: la administración se asigna directamente, abajo.
  });
  if (error) throw error;

  const condominioId = data?.[0]?.condominio_id ?? "";
  if (!datos.correoAdmin || !condominioId) return { condominioId, administracion: null, fallo: null };
  /*
    El edificio ya existe: si asignar la administración falla, no se deshace,
    se dice, y se puede volver a intentar desde el resumen.
  */
  try {
    const administracion = await vincularAdministracion({
      condominioId,
      correo: datos.correoAdmin,
      nombre: datos.nombreAdmin ?? "",
    });
    return { condominioId, administracion, fallo: null };
  } catch (e) {
    return {
      condominioId,
      administracion: null,
      fallo: e instanceof Error ? e.message : "No se pudo asignar la administración",
    };
  }
}

/**
 * Da la administración de un edificio que no tiene ninguna (desde el
 * 29/10/2026, sin invitación que aceptar). Solo deja si el edificio no tiene
 * a nadie.
 */
export async function invitarPrimerAdministrador(params: {
  condominioId: string;
  correo: string;
  nombre: string;
}) {
  return vincularAdministracion({
    condominioId: params.condominioId,
    correo: params.correo.trim(),
    nombre: params.nombre.trim(),
  });
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

// --- Países y sus documentos (25/10/2026) -------------------------------------

/** Un documento tal como se pide en un país. */
export interface DocumentoDelPais {
  tipo: Database["public"]["Enums"]["tipo_documento"];
  etiqueta: string;
  activo: boolean;
  paraAdultos: boolean;
  paraMenores: boolean;
  soloCifras: boolean;
  largoMinimo: number;
  largoMaximo: number;
  dosCaras: boolean;
  pideFechaExpedicion: boolean;
}

export interface PaisDelPanel {
  codigo: string;
  nombre: string;
  prefijo: string;
  moneda: string;
  zonaHoraria: string;
  policia: string;
  etiquetaFiscal: string;
  mayoriaDeEdad: number;
  reportaSire: boolean;
  altaDeEdificio: boolean;
  activo: boolean;
  edificios: number;
  documentos: DocumentoDelPais[];
}

/** Lo que se puede cambiar de un país, con el nombre de su columna. */
export interface CambiosDePais {
  nombre?: string;
  prefijo?: string;
  moneda?: string;
  zona_horaria?: string;
  policia?: string;
  etiqueta_fiscal?: string;
  mayoria_de_edad?: number;
  reporta_sire?: boolean;
  alta_de_edificio?: boolean;
  activo?: boolean;
}

export interface CambiosDeDocumento {
  etiqueta?: string;
  activo?: boolean;
  para_adultos?: boolean;
  para_menores?: boolean;
  solo_cifras?: boolean;
  largo_minimo?: number;
  largo_maximo?: number;
  dos_caras?: boolean;
  pide_fecha_expedicion?: boolean;
}

interface FilaDocumento {
  tipo: DocumentoDelPais["tipo"];
  etiqueta: string;
  activo: boolean;
  para_adultos: boolean;
  para_menores: boolean;
  solo_cifras: boolean;
  largo_minimo: number;
  largo_maximo: number;
  dos_caras: boolean;
  pide_fecha_expedicion: boolean;
}

export async function obtenerPaises(): Promise<PaisDelPanel[]> {
  const { data, error } = await supabase.rpc("panel_paises");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    codigo: f.codigo,
    nombre: f.nombre,
    prefijo: f.prefijo ?? "",
    moneda: f.moneda ?? "",
    zonaHoraria: f.zona_horaria ?? "",
    policia: f.policia ?? "",
    etiquetaFiscal: f.etiqueta_fiscal ?? "",
    mayoriaDeEdad: f.mayoria_de_edad,
    reportaSire: f.reporta_sire,
    altaDeEdificio: f.alta_de_edificio,
    activo: f.activo,
    edificios: f.edificios,
    documentos: ((f.documentos ?? []) as unknown as FilaDocumento[]).map((d) => ({
      tipo: d.tipo,
      etiqueta: d.etiqueta,
      activo: d.activo,
      paraAdultos: d.para_adultos,
      paraMenores: d.para_menores,
      soloCifras: d.solo_cifras,
      largoMinimo: d.largo_minimo,
      largoMaximo: d.largo_maximo,
      dosCaras: d.dos_caras,
      pideFechaExpedicion: d.pide_fecha_expedicion,
    })),
  }));
}

export async function cambiarPais(codigo: string, cambios: CambiosDePais): Promise<void> {
  const { error } = await supabase.rpc("panel_cambiar_pais", {
    p_codigo: codigo,
    p_cambios: cambios as Json,
  });
  if (error) throw error;
}

export async function guardarDocumentoDelPais(
  pais: string,
  tipo: DocumentoDelPais["tipo"],
  cambios: CambiosDeDocumento,
): Promise<void> {
  const { error } = await supabase.rpc("panel_guardar_documento_del_pais", {
    p_pais: pais,
    p_tipo: tipo,
    p_cambios: cambios as Json,
  });
  if (error) throw error;
}

/** Las monedas que se pueden elegir para un país. */
export async function obtenerMonedas(): Promise<{ codigo: string; nombre: string }[]> {
  const { data, error } = await supabase
    .from("moneda")
    .select("codigo, nombre")
    .eq("activa", true)
    .order("orden");
  if (error) throw error;
  return (data ?? []).map((m) => ({ codigo: m.codigo.trim(), nombre: m.nombre }));
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
  /** Por qué está suspendida, si lo está desde el panel (24/10/2026). */
  motivoSuspension: string | null;
}

type FilaDeCuenta = Database["public"]["Functions"]["panel_listar_usuarios"]["Returns"][number];

function cuentaDesdeFila(f: Omit<FilaDeCuenta, "total">): CuentaEnElPanel {
  return {
    usuarioId: f.usuario_id,
    nombre: f.nombre,
    correo: f.correo,
    creadaEn: formatDate(new Date(f.creada_en)),
    ultimoIngreso: f.ultimo_ingreso ? formatDateTime(new Date(f.ultimo_ingreso)) : null,
    correoConfirmado: f.correo_confirmado,
    bloqueada: f.bloqueada,
    edificios: (f.edificios ?? []) as { edificio: string; rol: string }[],
    rolPlataforma: (f.rol_plataforma as RolPlataforma | null) ?? null,
    motivoSuspension: f.motivo_suspension ?? null,
  };
}

export const CUENTAS_POR_PAGINA = 20;

/**
 * Las cuentas por páginas, de la más nueva a la más antigua (24/10/2026). Sin
 * texto, todas; con texto, las que lo tengan en el correo o el nombre.
 */
export async function listarUsuarios(
  texto: string,
  pagina: number,
): Promise<{ cuentas: CuentaEnElPanel[]; total: number }> {
  const { data, error } = await supabase.rpc("panel_listar_usuarios", {
    p_texto: texto,
    p_pagina: pagina,
    p_por_pagina: CUENTAS_POR_PAGINA,
  });
  if (error) throw error;
  const filas = data ?? [];
  return { cuentas: filas.map(cuentaDesdeFila), total: Number(filas[0]?.total ?? 0) };
}

export type AccionSobreCuenta =
  | "suspender"
  | "reactivar"
  | "bloquear"
  | "desbloquear"
  | "enviar_contrasena"
  | "confirmar_correo";

/**
 * Va por la función `panel-usuarios`: necesita la API de administración.
 * Al suspender o reactivar devuelve si salió el correo a la persona.
 */
export async function actuarSobreCuenta(
  usuarioId: string,
  accion: AccionSobreCuenta,
  motivo?: string,
): Promise<{ correo: { enviado: boolean; motivo?: string } | null }> {
  const { data, error } = await supabase.functions.invoke("panel-usuarios", {
    body: { usuarioId, accion, motivo, volverA: `${await webDeVeciyo()}/nueva-contrasena` },
  });
  if (error) {
    throw new Error((await motivoDeLaFuncion(error)) ?? "No se pudo completar la acción");
  }
  return { correo: (data as { correo?: { enviado: boolean; motivo?: string } } | null)?.correo ?? null };
}

// ---------------------------------------------------------------------------
// Permisos por rol (huecos 9 y 14)
// ---------------------------------------------------------------------------

export type RolConPermisos = Database["public"]["Enums"]["rol_con_permisos"];
export type AccionDeRol = Database["public"]["Enums"]["accion_de_rol"];

export interface PermisoDeRol {
  rol: RolConPermisos;
  accion: AccionDeRol;
  /** Lo que vale: en un edificio, su excepción si la tiene; si no, la general. */
  permitido: boolean;
  /** La regla general. */
  general: boolean;
  /** Si el edificio tiene una excepción propia. */
  esExcepcion: boolean;
}

/** Los permisos por rol: la regla general, o lo que vale en un edificio. */
export async function obtenerPermisosDeRol(condominioId: string | null): Promise<PermisoDeRol[]> {
  const { data, error } = await supabase.rpc("panel_permisos_de_rol", {
    p_condominio_id: condominioId ?? undefined,
  });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    rol: f.rol,
    accion: f.accion,
    permitido: f.permitido,
    general: f.general,
    esExcepcion: f.es_excepcion,
  }));
}

/**
 * Cambia un permiso. Sin edificio, la regla general; con edificio, su
 * excepción; con edificio y `null`, vuelve a la general. Solo el dueño.
 */
export async function cambiarPermisoDeRol(params: {
  condominioId: string | null;
  rol: RolConPermisos;
  accion: AccionDeRol;
  permitido: boolean | null;
}): Promise<void> {
  const { error } = await supabase.rpc("panel_cambiar_permiso_de_rol", {
    p_condominio_id: params.condominioId as string,
    p_rol: params.rol,
    p_accion: params.accion,
    p_permitido: params.permitido as boolean,
  });
  if (error) throw error;
}

// --- Monedas (28/10/2026) ------------------------------------------------

export interface MonedaDelPanel {
  codigo: string;
  nombre: string;
  decimales: number;
  activa: boolean;
  /** Por qué no se puede apagar; vacío = se puede. */
  enUso: string | null;
}

export async function obtenerMonedasDelPanel(): Promise<MonedaDelPanel[]> {
  const { data, error } = await supabase.rpc("panel_monedas");
  if (error) throw error;
  return (data ?? []).map((m) => ({
    codigo: m.codigo,
    nombre: m.nombre,
    decimales: m.decimales,
    activa: m.activa,
    enUso: m.en_uso,
  }));
}

export async function guardarMoneda(
  codigo: string,
  cambios: { nombre?: string; activa?: boolean },
): Promise<void> {
  const { error } = await supabase.rpc("panel_guardar_moneda", {
    p_codigo: codigo,
    p_cambios: cambios as Json,
  });
  if (error) throw error;
}

export async function agregarMoneda(codigo: string, nombre: string, decimales: number): Promise<void> {
  const { error } = await supabase.rpc("panel_agregar_moneda", {
    p_codigo: codigo,
    p_nombre: nombre,
    p_decimales: decimales,
  });
  if (error) throw error;
}

// --- Listas (28/10/2026) -------------------------------------------------

export type TipoDeCampoExtra = "texto" | "numero" | "booleano" | "hora" | "lista";

export interface CampoExtra {
  clave: string;
  etiqueta: string;
  tipo: TipoDeCampoExtra;
}

export interface OpcionDelPanel {
  id: string;
  codigo: string;
  etiqueta: string;
  orden: number;
  activo: boolean;
  pais: string | null;
  extra: Record<string, unknown>;
}

export interface ListaDelPanel {
  catalogo: Database["public"]["Enums"]["nombre_catalogo"];
  titulo: string;
  descripcion: string;
  admiteNuevas: boolean;
  porPais: boolean;
  riesgo: "bajo" | "medio" | "alto";
  camposExtra: CampoExtra[];
  opciones: OpcionDelPanel[];
}

export async function obtenerListas(): Promise<ListaDelPanel[]> {
  const { data, error } = await supabase.rpc("panel_listas");
  if (error) throw error;
  return (data ?? []) as unknown as ListaDelPanel[];
}

export interface CambiosDeOpcion {
  etiqueta?: string;
  orden?: number;
  activo?: boolean;
  extra?: Record<string, unknown>;
}

export async function guardarOpcion(id: string, cambios: CambiosDeOpcion): Promise<void> {
  const { error } = await supabase.rpc("panel_guardar_opcion", {
    p_id: id,
    p_cambios: cambios as Json,
  });
  if (error) throw error;
}

export async function agregarOpcion(
  catalogo: ListaDelPanel["catalogo"],
  etiqueta: string,
  pais: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("panel_agregar_opcion", {
    p_catalogo: catalogo,
    p_etiqueta: etiqueta,
    p_pais: pais ?? undefined,
  });
  if (error) throw error;
}

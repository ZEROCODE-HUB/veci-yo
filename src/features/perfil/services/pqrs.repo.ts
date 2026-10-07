import { supabase } from "@/shared/services/supabase";
import { formatDate } from "@/shared/utils";
import {
  borrarArchivo,
  subirArchivo,
  type ArchivoElegido,
} from "@/shared/services/archivos";
import type { Database } from "@/shared/types/database.types";

type AreaReclamo = Database["public"]["Enums"]["area_reclamo"];
type TipoReclamo = Database["public"]["Enums"]["tipo_reclamo"];
type EstadoReclamo = Database["public"]["Enums"]["estado_reclamo"];
type DestinatarioReclamo = Database["public"]["Enums"]["destinatario_reclamo"];
type MedioContacto = Database["public"]["Enums"]["medio_contacto"];

/**
 * PQRS.
 *
 * Los ocho reclamos de ejemplo vivían en `soporteMockData` con un vocabulario
 * propio ("Consulta"/"Convivencia") que no coincidía ni con el schema ni con
 * el formulario. La migración 20260922100000 separó los tres ejes; aquí solo
 * se traduce entre las etiquetas que muestra la interfaz y los enums.
 */

export const AREAS: Record<AreaReclamo, string> = {
  condominio: "Condominio",
  aplicacion: "Aplicación Veciyo",
  constructora: "Constructora TyC",
  documentos_antiguos: "Documentos antiguos",
};

/** Los tipos que ofrece cada área. Las dos últimas no piden tipo. */
export const TIPOS_POR_AREA: Record<AreaReclamo, TipoReclamo[]> = {
  condominio: ["pregunta", "queja", "reclamo", "sugerencia"],
  aplicacion: ["idea", "soporte"],
  constructora: [],
  documentos_antiguos: [],
};

export const TIPOS: Record<TipoReclamo, string> = {
  pregunta: "Pregunta",
  queja: "Queja",
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  consulta: "Consulta",
  idea: "Idea",
  soporte: "Soporte",
};

export const ESTADOS: Record<EstadoReclamo, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  resuelto: "Resuelto",
};

export const DESTINATARIOS: Record<DestinatarioReclamo, string> = {
  administrador: "Administrador",
  propietario: "Propietario",
  aplicacion: "Aplicación",
};

export const MEDIOS_CONTACTO: Record<MedioContacto, string> = {
  correo: "Correo electrónico",
  telefono: "Teléfono",
  cualquiera: "Cualquiera",
};

/** Busca la clave del enum a partir de la etiqueta que eligió la persona. */
function claveDe<T extends string>(
  mapa: Record<T, string>,
  etiqueta: string,
): T | null {
  const par = Object.entries(mapa).find(([, valor]) => valor === etiqueta);
  return par ? (par[0] as T) : null;
}

export interface Reclamo {
  id: string;
  numero: string;
  nombre: string;
  /** El codigo de la vivienda de quien la abrio. Null si no vive aqui. */
  unidad: string | null;
  titulo: string;
  descripcion: string;
  area: string;
  tipo: string;
  estado: string;
  fechaCreacion: string;
  fechaRevision: string;
  resolucionAdmin?: string;
  modelo?: string;
}

/**
 * `propias` son las que abrió quien consulta; `condominio`, todas las del
 * edificio.
 *
 * El ámbito lo pide la consulta y no lo deduce RLS, porque RLS no sabe con qué
 * rol entró la persona: mira su identidad. Alguien que administra el
 * condominio y además vive en él veía las PQRS de todos sus vecinos aunque
 * hubiera entrado como propietario (R-24). La política sigue siendo el techo
 * —pedir `condominio` sin serlo no devuelve nada ajeno—, pero la app deja de
 * pedir lo que no corresponde al rol elegido.
 */
/*
  La relacion va **nombrada**. `reclamo` apunta dos veces a `unidad` --la de
  quien abre la PQRS y la denunciada-- y sin nombrarla PostgREST responde
  «more than one relationship was found» y la consulta entera devuelve 300.
  Ya paso con `autorizacion_menor`, y esta documentado en AGENTS.md.

  El comentario va fuera del `select`: dentro es un *template literal*, o sea
  texto que viaja a PostgREST, y los acentos graves cierran la cadena.
*/
const SELECT_RECLAMO = `id, numero, titulo, descripcion, area, tipo, estado,
   resolucion, modelo_dispositivo, creado_por_nombre, created_at, resuelto_en,
   unidad:unidad!reclamo_unidad_id_fkey ( codigo )` as const;

export type AmbitoReclamos = "propias" | "condominio";

export async function obtenerReclamos(params: {
  ambito: AmbitoReclamos;
  usuarioId: string;
}): Promise<Reclamo[]> {
  let consulta = supabase
    .from("reclamo")
    .select(
      SELECT_RECLAMO,
    );

  if (params.ambito === "propias") {
    consulta = consulta.eq("creado_por", params.usuarioId);
  }

  const { data, error } = await consulta.order("created_at", {
    ascending: false,
  });

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    numero: fila.numero ?? "",
    nombre: fila.creado_por_nombre ?? "",
    /*
      De que vivienda sale. Lo pidio el cliente el 02/10/2026 --el depto junto
      al nombre-- y en una PQRS es lo que de verdad hace falta: una queja de
      ruido o una fuga sin depto obliga a abrir la ficha para saber donde ir.
      Null para quien no tiene vivienda, como la administracion.
    */
    unidad: fila.unidad?.codigo ?? null,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    area: AREAS[fila.area as AreaReclamo] ?? fila.area,
    tipo: TIPOS[fila.tipo as TipoReclamo] ?? fila.tipo,
    estado: ESTADOS[fila.estado as EstadoReclamo] ?? fila.estado,
    fechaCreacion: formatDate(new Date(fila.created_at)),
    fechaRevision: fila.resuelto_en
      ? formatDate(new Date(fila.resuelto_en))
      : "",
    resolucionAdmin: fila.resolucion ?? undefined,
    modelo: fila.modelo_dispositivo ?? undefined,
  }));
}

export interface NuevoReclamo {
  titulo: string;
  descripcion: string;
  /** Etiquetas tal como las eligió la persona en los selectores. */
  area: string;
  tipo: string;
  destinatario: string;
  correo: string;
  telefono: string;
  /** El pais del telefono de contacto, en ISO 3166-1 alfa-2. */
  codigoPais: string;
  medioContacto: string;
  modelo: string;
  /**
   * La vivienda contra la que va la queja, si va contra una.
   *
   * `reclamo.unidad_denunciada` existe desde la primera migración, está
   * indexada, y **no la escribía ni la leía nadie**: una queja de convivencia
   * --ruido, humedades, un huésped que molesta-- no tenía dónde decir contra
   * quién iba (REVISAR-A-OJO 98).
   *
   * Decidido con el cliente el 02/10/2026: **señala a la vivienda, no a la
   * persona.** Es menos invasivo y es lo que la administración necesita para
   * actuar; quién vive allí ya lo sabe.
   *
   * Quién la lee no cambia, y era lo delicado: `reclamo_lectura` ya dice
   * `creado_por = auth.uid() OR es_admin_condominio(...)`, así que **el
   * denunciado no la ve**, ni sabe que existe.
   */
  unidadDenunciada?: string | null;
}

export async function crearReclamo(params: {
  datos: NuevoReclamo;
  condominioId: string;
  unidadId: string | null;
  usuarioId: string;
  nombre: string;
  /**
   * Archivos elegidos en el formulario, que se suben **después** de insertar.
   *
   * La política del bucket comprueba que quien sube puede ver el reclamo, así
   * que la fila tiene que existir antes de que haya dónde colgar el archivo.
   * Por eso el formulario solo los guarda en memoria y el orden lo pone aquí,
   * en un sitio, y no cada pantalla que cree una PQRS.
   */
  adjuntos?: ArchivoElegido[];
}) {
  const area = claveDe(AREAS, params.datos.area) ?? "condominio";

  const { data, error } = await supabase.from("reclamo").insert({
    condominio_id: params.condominioId,
    unidad_id: params.unidadId,
    creado_por: params.usuarioId,
    creado_por_nombre: params.nombre,
    titulo: params.datos.titulo.trim(),
    descripcion: params.datos.descripcion.trim(),
    area,
    // Las áreas sin tipos propios se registran como consulta.
    tipo: claveDe(TIPOS, params.datos.tipo) ?? "consulta",
    destinatario: claveDe(DESTINATARIOS, params.datos.destinatario),
    correo_contacto: params.datos.correo.trim() || null,
    telefono_contacto: params.datos.telefono.trim() || null,
    /*
      `reclamo.codigo_pais_contacto` existe desde el primer dia y **nadie la
      escribia**. En una PQRS el telefono es para que la administracion llame,
      asi que un numero sin pais es medio dato.
    */
    codigo_pais_contacto: params.datos.codigoPais || null,
    medio_contacto_preferido: claveDe(
      MEDIOS_CONTACTO,
      params.datos.medioContacto,
    ),
    // La restricción `reclamo_modelo_solo_para_app` rechaza el modelo en
    // cualquier otra área.
    modelo_dispositivo:
      area === "aplicacion" ? params.datos.modelo.trim() || null : null,
    /*
      Solo en las quejas del condominio: señalar una vivienda desde un reporte
      sobre la aplicación no significa nada, y dejarlo abierto invita a usarlo
      donde no toca.
    */
    unidad_denunciada:
      area === "condominio" ? (params.datos.unidadDenunciada ?? null) : null,
    // `numero` lo asigna la secuencia de la base: el cliente lo sorteaba con
    // `Math.random()` y podía repetirlo.
  })
    // Se devuelve la fila para que la pantalla de éxito muestre el número real
    // que asignó la base, y no uno adivinado antes de escribir.
    .select("id, numero, area")
    .single();

  if (error) throw error;

  // Una queja por ruido o una fuga se sostienen con una foto. Si alguno falla,
  // la PQRS ya está creada y no se deshace: se dice cuántos quedaron fuera y
  // desde el detalle se pueden volver a colgar.
  let adjuntosFallidos = 0;
  for (const archivo of params.adjuntos ?? []) {
    try {
      await adjuntarAReclamo({
        reclamoId: data.id,
        archivo,
        usuarioId: params.usuarioId,
      });
    } catch {
      adjuntosFallidos += 1;
    }
  }

  return {
    id: data.id,
    numero: data.numero ?? "",
    area: AREAS[data.area as AreaReclamo] ?? data.area,
    adjuntosFallidos,
  };
}

export async function cambiarEstadoReclamo(params: {
  id: string;
  estado: string;
  resolucion?: string;
  usuarioId: string;
}) {
  const estado = claveDe(ESTADOS, params.estado) ?? "pendiente";
  const resuelto = estado === "resuelto";

  const { error } = await supabase
    .from("reclamo")
    .update({
      estado,
      resolucion: params.resolucion?.trim() || null,
      // La restricción `reclamo_resuelto_con_actor` exige ambos al resolver.
      resuelto_por: resuelto ? params.usuarioId : null,
      resuelto_en: resuelto ? new Date().toISOString() : null,
    })
    .eq("id", params.id);

  if (error) throw error;
}

export interface PreguntaFrecuente {
  id: string;
  categoria: string;
  pregunta: string;
  respuesta: string;
}

/**
 * Preguntas frecuentes del condominio.
 *
 * Eran siete entradas fijas en el cliente. Tres de ellas explicaban un sistema
 * de puntos —cómo sumarlos, que vencen a los 12 meses, que se canjean por
 * descuentos— que el producto no tiene: la decisión del 21/07/2026 fue
 * acumulación de insignias, sin niveles ni puntos. No se migran.
 */
export async function obtenerPreguntasFrecuentes(
  condominioId: string,
): Promise<PreguntaFrecuente[]> {
  const { data, error } = await supabase
    .from("pregunta_frecuente")
    .select("id, categoria, pregunta, respuesta")
    .eq("condominio_id", condominioId)
    .order("orden");

  if (error) throw error;
  return data ?? [];
}

export interface ContactoSoporte {
  telefono: string | null;
  email: string | null;
  ubicacion: string | null;
  horarios: string | null;
}

/**
 * Contacto de la administración.
 *
 * La pantalla mostraba un teléfono de Ecuador, una dirección de Perú y
 * "Veciyomanda@gmail.com". Son los datos del condominio.
 */
export async function obtenerContactoSoporte(
  condominioId: string,
): Promise<ContactoSoporte> {
  const { data, error } = await supabase
    .from("condominio")
    .select("telefono, email, direccion, ciudad, horario_atencion")
    .eq("id", condominioId)
    .maybeSingle();

  if (error) throw error;

  return {
    telefono: data?.telefono ?? null,
    email: data?.email ?? null,
    ubicacion: [data?.direccion, data?.ciudad].filter(Boolean).join(", ") || null,
    horarios: data?.horario_atencion ?? null,
  };
}

export interface AdjuntoReclamo {
  id: string;
  ruta: string;
  nombre: string;
  tipoMime: string;
}

/** El bucket y la convención de rutas los fija la migración 20260922110000. */
export const BUCKET_PQRS = "pqrs";

export async function obtenerAdjuntos(
  reclamoId: string,
): Promise<AdjuntoReclamo[]> {
  const { data, error } = await supabase
    .from("adjunto_reclamo")
    .select("id, ruta, nombre_original, tipo_mime")
    .eq("reclamo_id", reclamoId)
    .order("created_at");

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    ruta: fila.ruta,
    nombre: fila.nombre_original,
    tipoMime: fila.tipo_mime,
  }));
}

/**
 * Sube el archivo y registra la fila.
 *
 * El orden importa: la política del bucket comprueba que quien sube puede ver
 * el reclamo, así que la PQRS tiene que existir antes. Por eso los adjuntos se
 * agregan desde el detalle y no durante el alta.
 */
export async function adjuntarAReclamo(params: {
  reclamoId: string;
  archivo: ArchivoElegido;
  usuarioId: string;
}) {
  const { ruta } = await subirArchivo({
    bucket: BUCKET_PQRS,
    carpeta: params.reclamoId,
    archivo: params.archivo,
  });

  const { error } = await supabase.from("adjunto_reclamo").insert({
    reclamo_id: params.reclamoId,
    ruta,
    nombre_original: params.archivo.nombre,
    tipo_mime: params.archivo.tipoMime,
    tamano_bytes: params.archivo.tamanoBytes ?? null,
    subido_por: params.usuarioId,
  });

  // Si la fila no entra, el archivo queda huérfano en el bucket: se borra para
  // no dejar basura que nadie puede ver ni referenciar.
  if (error) {
    await borrarArchivo(BUCKET_PQRS, ruta).catch(() => {});
    throw error;
  }
}

export async function quitarAdjunto(adjunto: AdjuntoReclamo) {
  const { error } = await supabase
    .from("adjunto_reclamo")
    .delete()
    .eq("id", adjunto.id);

  if (error) throw error;
  await borrarArchivo(BUCKET_PQRS, adjunto.ruta).catch(() => {});
}

export interface AliasPerfil {
  alias: string;
  usaEnCuadroHonor: boolean;
  usaEnZonas: boolean;
}

/**
 * El alias y dónde se usa.
 *
 * Vivía en un store en memoria con "GuilleSv" como valor por defecto para
 * cualquier persona, y los dos interruptores se perdían al cerrar la app.
 */
export async function obtenerAlias(usuarioId: string): Promise<AliasPerfil> {
  const { data, error } = await supabase
    .from("perfil")
    .select("alias, usa_alias_cuadro_honor, usa_alias_zonas")
    .eq("id", usuarioId)
    .maybeSingle();

  if (error) throw error;

  return {
    alias: data?.alias ?? "",
    usaEnCuadroHonor: data?.usa_alias_cuadro_honor ?? false,
    usaEnZonas: data?.usa_alias_zonas ?? false,
  };
}

export async function guardarAlias(params: {
  usuarioId: string;
  datos: AliasPerfil;
}) {
  const { error } = await supabase
    .from("perfil")
    .update({
      // Un alias vacío borra el alias; no se sustituye por uno inventado.
      alias: params.datos.alias.trim() || null,
      usa_alias_cuadro_honor: params.datos.usaEnCuadroHonor,
      usa_alias_zonas: params.datos.usaEnZonas,
    })
    .eq("id", params.usuarioId);

  if (error) throw error;
}

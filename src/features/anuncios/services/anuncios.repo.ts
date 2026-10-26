import { supabase } from "@/shared/services/supabase";
import type { Columnas } from "@/shared/types";
import { formatDate } from "@/shared/utils";
import type { Anuncio } from "../types/anuncios";
import type { Database } from "@/shared/types/database.types";

type CategoriaDB = Database["public"]["Enums"]["categoria_anuncio"];
type TipoDB = Database["public"]["Enums"]["tipo_publicacion"];

/**
 * Los votos ya no viven dentro del anuncio.
 *
 * El prototipo guardaba `votosSi: string[]` y `votosNo: string[]` en el propio
 * anuncio: cualquiera que lo leyera veía quién votó qué, nada impedía votar dos
 * veces, y los datos de prueba ya tenían departamentos en ambas listas.
 *
 * Ahora el voto es una tabla con unicidad por votante, el recuento sale
 * agregado por `resultados_publicacion`, y el detalle nominal solo lo devuelve
 * `detalle_votacion` cuando la votación no es secreta y quien pregunta
 * administra el condominio.
 */

const SELECT = `
  id, tipo, categoria, titulo, descripcion, url_video, avisar,
  publicada_desde, publicada_hasta,
  para_propietarios, para_residentes, para_huespedes, para_porteria,
  voto_multiple, ocultar_resultados, resultados_publicados_en, umbral,
  opciones:opcion_voto ( id, etiqueta, orden )
` as const;

/*
  Lo que el SELECT devuelve, derivado del esquema: las columnas pedidas del
  anuncio mas las opciones de voto que cuelgan de el.
*/
type FilaDeAnuncio = Columnas<
  "publicacion",
  | "id"
  | "tipo"
  | "avisar"
  | "categoria"
  | "titulo"
  | "descripcion"
  | "url_video"
  | "publicada_desde"
  | "publicada_hasta"
  | "para_propietarios"
  | "para_residentes"
  | "para_huespedes"
  | "para_porteria"
  | "voto_multiple"
  | "ocultar_resultados"
  | "resultados_publicados_en"
  | "umbral"
> & {
  opciones: Columnas<"opcion_voto", "id" | "etiqueta" | "orden">[];
};

const CATEGORIA_DESDE_BASE: Record<CategoriaDB, string> = {
  servicios: "Servicios",
  eventos: "Eventos",
  mantenimiento: "Mantenimiento",
  seguridad: "Seguridad",
  administracion: "Administración",
};

export const CATEGORIA_HACIA_BASE: Record<string, CategoriaDB> = {
  Servicios: "servicios",
  Eventos: "eventos",
  Mantenimiento: "mantenimiento",
  Seguridad: "seguridad",
  "Administración": "administracion",
  Administracion: "administracion",
};

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** Viviendas del edificio y cuántas votaron, por encuesta. */
type Participacion = Map<string, { viviendas: number; votaron: number }>;

function mapear(
  fila: FilaDeAnuncio,
  conteos: Map<string, number>,
  participacion: Participacion,
): Anuncio {
  const opciones = (fila.opciones ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const totalVotos = opciones.reduce(
    (suma: number, o) => suma + (conteos.get(o.id) ?? 0),
    0,
  );
  const umbral = fila.umbral ?? 0;

  return {
    uuid: fila.id,
    id: idNumerico(fila.id),
    categoria: CATEGORIA_DESDE_BASE[fila.categoria as CategoriaDB] ?? "",
    titulo: fila.titulo,
    descripcion: fila.descripcion ?? "",
    fechaPublicada: formatDate(new Date(fila.publicada_desde)),
    fechaFinalizacion: fila.publicada_hasta
      ? formatDate(new Date(fila.publicada_hasta))
      : "",
    fechaCorta: formatDate(new Date(fila.publicada_desde)),
    votacion: fila.tipo === "encuesta",
    /*
      Participación: porcentaje de viviendas del edificio que ya votaron. El
      umbral es la meta en ese mismo porcentaje (hueco 26, 21/10/2026).

      `undefined` --y no 0-- cuando el anuncio no declara umbral: no hay meta
      contra la que medir. La pantalla lo distinguía con `progreso || 0` y
      `progreso || 100`, así que una encuesta sin umbral decía «Progreso 0%»
      con votos emitidos, y al cerrarse «Participación 100%» sin votos.
    */
    progreso: umbral > 0 ? porcentajeDeParticipacion(participacion.get(fila.id)) : undefined,
    umbral: umbral || undefined,
    ocultarResultados: fila.ocultar_resultados ?? false,
    /*
      Si la administración ya decidió enseñarlos. Hasta el 03/10/2026 la
      tarjeta prometía «los resultados se mostrarán al cierre» y eso **no
      pasaba nunca**: `ocultar_resultados` se fijaba al crear la encuesta y
      nadie la volvía a tocar.
    */
    resultadosPublicados: fila.resultados_publicados_en != null,
    votacionMultiple: fila.voto_multiple ?? false,
    opcionesVotacion: opciones.map((o) => o.etiqueta),
    paraHuespedes: fila.para_huespedes ?? false,
    paraPorteria: fila.para_porteria ?? false,
    paraPropietarios: fila.para_propietarios ?? true,
    paraResidentes: fila.para_residentes ?? true,
    avisar: fila.avisar ?? true,
    opciones: opciones.map((o) => ({
      uuid: o.id,
      etiqueta: o.etiqueta,
      votos: conteos.get(o.id) ?? 0,
    })),
    totalVotos,
  } as Anuncio;
}

export async function obtenerAnuncios(): Promise<Anuncio[]> {
  const { data, error } = await supabase
    .from("publicacion")
    .select(SELECT)
    .is("deleted_at", null)
    .order("publicada_desde", { ascending: false });

  if (error) throw error;
  const filas = data ?? [];

  // Los recuentos salen de la funcion agregada, nunca de leer la tabla `voto`.
  const conteos = new Map<string, number>();
  await Promise.all(
    filas
      .filter((f) => f.tipo === "encuesta")
      .map(async (f) => {
        const { data: res } = await supabase.rpc("resultados_publicacion", {
          p_publicacion_id: f.id,
        });
        (res ?? []).forEach((r) => conteos.set(r.opcion_id, Number(r.votos)));
      }),
  );

  const participacion: Participacion = new Map();
  await Promise.all(
    filas
      .filter((f) => f.tipo === "encuesta" && (f.umbral ?? 0) > 0)
      .map(async (f) => {
        const { data: res } = await supabase.rpc("participacion_encuesta", {
          p_publicacion_id: f.id,
        });
        const fila = res?.[0];
        if (fila) participacion.set(f.id, { viviendas: fila.viviendas, votaron: fila.votaron });
      }),
  );

  return filas.map((f) => mapear(f, conteos, participacion));
}

/** Qué porcentaje de las viviendas votó; 0 si no se sabe o no hay viviendas. */
export function porcentajeDeParticipacion(p?: { viviendas: number; votaron: number }): number {
  if (!p || p.viviendas <= 0) return 0;
  return Math.min(100, Math.round((p.votaron / p.viviendas) * 100));
}

export interface NuevoAnuncio {
  condominioId: string;
  tipo: TipoDB;
  categoria: string;
  titulo: string;
  descripcion?: string;
  urlVideo?: string;
  publicadaDesde?: Date | null;
  publicadaHasta?: Date | null;
  paraPropietarios?: boolean;
  paraResidentes?: boolean;
  paraHuespedes?: boolean;
  /** Si la portería lo ve y le llega el aviso (15/10/2026). Por defecto no. */
  paraPorteria?: boolean;
  votoMultiple?: boolean;
  ocultarResultados?: boolean;
  umbral?: number;
  opciones?: string[];
  /**
   * Si al publicarse se avisa a su audiencia. Por defecto sí.
   *
   * Hasta el 05/10/2026 **nadie avisaba**: `anuncio_publicado` existía en el
   * enum de motivos desde septiembre y ninguna función lo insertaba. Se
   * publicaba un anuncio y había que entrar a mirar.
   */
  avisar?: boolean;
}

/** El último instante de ese día, en el reloj de quien publica. */
function finDelDia(dia: Date): Date {
  const fin = new Date(dia);
  fin.setHours(23, 59, 59, 999);
  return fin;
}

export async function crearAnuncio(datos: NuevoAnuncio) {
  const { data, error } = await supabase
    .from("publicacion")
    .insert({
      condominio_id: datos.condominioId,
      tipo: datos.tipo,
      categoria: CATEGORIA_HACIA_BASE[datos.categoria] ?? "administracion",
      titulo: datos.titulo,
      descripcion: datos.descripcion || null,
      url_video: datos.urlVideo || null,
      publicada_desde: (datos.publicadaDesde ?? new Date()).toISOString(),
      /*
        Hasta el **final** del día elegido. La fecha viajaba como medianoche,
        o sea el principio: la base cerraba la encuesta al empezar el día de
        «Fecha de finalización» y la pantalla la daba por abierta todo ese
        día. El último día el vecino votaba y recibía «no se pudo registrar
        tu voto» (13/10/2026).
      */
      publicada_hasta: datos.publicadaHasta
        ? finDelDia(datos.publicadaHasta).toISOString()
        : null,
      para_propietarios: datos.paraPropietarios ?? true,
      para_residentes: datos.paraResidentes ?? true,
      para_huespedes: datos.paraHuespedes ?? false,
      para_porteria: datos.paraPorteria ?? false,
      voto_multiple: datos.votoMultiple ?? false,
      ocultar_resultados: datos.ocultarResultados ?? false,
      umbral: datos.umbral ?? null,
      avisar: datos.avisar ?? true,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (datos.tipo === "encuesta" && datos.opciones?.length) {
    const { error: errorOpciones } = await supabase.from("opcion_voto").insert(
      datos.opciones
        .filter((etiqueta) => etiqueta.trim())
        .map((etiqueta, orden) => ({
          publicacion_id: data.id,
          etiqueta: etiqueta.trim(),
          orden,
        })),
    );
    if (errorOpciones) throw errorOpciones;
  }

  return data.id;
}

/**
 * Emite el voto del usuario actual. `usuario_id` lo completa la base con
 * `auth.uid()`: quién vota lo decide la base, no el cliente.
 */
export async function votar(
  publicacionUuid: string,
  opcionUuid: string,
  unidadId?: string,
) {
  const { error } = await supabase.from("voto").insert({
    publicacion_id: publicacionUuid,
    opcion_id: opcionUuid,
    unidad_id: unidadId ?? null,
  });
  if (error) throw error;
}

/** El voto propio, para que la pantalla sepa si ya voté y qué elegí. */
export interface MiVoto {
  opcionUuid: string;
  /** La vivienda por la que se votó. Null para quien no tiene ninguna. */
  unidadId: string | null;
  codigo: string | null;
}

/**
 * Lo que esta persona ya votó en esa encuesta, con la vivienda de cada voto.
 *
 * Antes bastaba con la lista de opciones porque solo se podía votar una vez.
 * Desde el 05/10/2026 se vota **por vivienda** --lo decidió el cliente: «si
 * tiene 2 viviendas puede votar 2 veces»-- así que la pantalla necesita saber
 * cuál de las suyas votó ya, para ofrecer la otra.
 */
export async function misVotos(publicacionUuid: string): Promise<MiVoto[]> {
  const { data, error } = await supabase.rpc("mis_votos", {
    p_publicacion_id: publicacionUuid,
  });
  if (error) throw error;
  return (data ?? []).map((v) => ({
    opcionUuid: v.opcion_id,
    unidadId: v.unidad_id,
    codigo: v.codigo,
  }));
}

export interface FilaDetalleVoto {
  opcion: string;
  votante: string;
  unidad: string | null;
  emitidoEn: string;
}

/**
 * Detalle nominal. Devuelve vacío si la votación es secreta o si quien pregunta
 * no administra el condominio: la decisión la toma la base, no la interfaz.
 */
export async function detalleVotacion(
  publicacionUuid: string,
): Promise<FilaDetalleVoto[]> {
  const { data, error } = await supabase.rpc("detalle_votacion", {
    p_publicacion_id: publicacionUuid,
  });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    opcion: f.opcion,
    votante: f.votante,
    unidad: f.unidad,
    emitidoEn: f.emitido_en,
  }));
}

export async function pendientesVotacion(publicacionUuid: string) {
  const { data, error } = await supabase.rpc("pendientes_votacion", {
    p_publicacion_id: publicacionUuid,
  });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    unidad: f.unidad,
    propietario: f.propietario,
  }));
}

export async function eliminarAnuncio(uuid: string) {
  const { data, error } = await supabase
    .from("publicacion")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", uuid)
    .select("id");
  if (error) throw error;
  // Sin permiso, RLS deja el `update` en cero filas y no se queja.
  if (!data?.length) {
    throw new Error("No tienes permiso para eliminar este anuncio.");
  }
}

/** Una encuesta cerrada cuyos resultados siguen sin decidirse. */
export interface EncuestaPorDecidir {
  id: string;
  titulo: string;
  cerro_en: string;
  votos: number;
}

/**
 * Las encuestas que cerraron con los resultados ocultos y esperan una decisión.
 *
 * Sin esta lista la decisión no existiría: el administrador tendría que
 * acordarse de entrar a cada encuesta vieja a ver si ya cerró. Es el mismo
 * motivo por el que el titular del preregistro ve a quién le falta.
 */
export async function encuestasPorDecidir(
  condominioId: string,
): Promise<EncuestaPorDecidir[]> {
  const { data, error } = await supabase.rpc("encuestas_por_decidir", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return (data ?? []) as EncuestaPorDecidir[];
}

/** La administración enseña los resultados de una encuesta cerrada. */
export async function publicarResultados(publicacionId: string): Promise<void> {
  const { error } = await supabase.rpc("publicar_resultados", {
    p_publicacion_id: publicacionId,
  });
  if (error) throw error;
}

/**
 * Y los vuelve a tapar.
 *
 * Se puede deshacer a propósito: publicar por error unos resultados sensibles
 * no puede ser definitivo por un clic.
 */
export async function dejarResultadosEnBorrador(
  publicacionId: string,
): Promise<void> {
  const { error } = await supabase.rpc("dejar_resultados_en_borrador", {
    p_publicacion_id: publicacionId,
  });
  if (error) throw error;
}

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
  id, tipo, categoria, titulo, descripcion, url_video,
  publicada_desde, publicada_hasta,
  para_propietarios, para_residentes, para_huespedes,
  voto_multiple, ocultar_resultados, umbral,
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
  | "categoria"
  | "titulo"
  | "descripcion"
  | "url_video"
  | "publicada_desde"
  | "publicada_hasta"
  | "para_propietarios"
  | "para_residentes"
  | "para_huespedes"
  | "voto_multiple"
  | "ocultar_resultados"
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

function mapear(fila: FilaDeAnuncio, conteos: Map<string, number>): Anuncio {
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
      Porcentaje de avance respecto del umbral de participacion esperado.

      `undefined` --y no 0-- cuando el anuncio no declara umbral: no es que no
      haya avance, es que no hay contra que medirlo. La pantalla lo distinguia
      con `progreso || 0` y `progreso || 100`, asi que una encuesta sin umbral
      decia «Progreso 0%» con votos emitidos, y al cerrarse «Participacion
      100%» aunque no hubiera votado nadie.
    */
    progreso:
      umbral > 0 ? Math.min(100, Math.round((totalVotos / umbral) * 100)) : undefined,
    umbral: umbral || undefined,
    ocultarResultados: fila.ocultar_resultados ?? false,
    votacionMultiple: fila.voto_multiple ?? false,
    opcionesVotacion: opciones.map((o) => o.etiqueta),
    paraHuespedes: fila.para_huespedes ?? false,
    paraPropietarios: fila.para_propietarios ?? true,
    paraResidentes: fila.para_residentes ?? true,
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

  return filas.map((f) => mapear(f, conteos));
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
  votoMultiple?: boolean;
  ocultarResultados?: boolean;
  umbral?: number;
  opciones?: string[];
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
      publicada_hasta: datos.publicadaHasta?.toISOString() ?? null,
      para_propietarios: datos.paraPropietarios ?? true,
      para_residentes: datos.paraResidentes ?? true,
      para_huespedes: datos.paraHuespedes ?? false,
      voto_multiple: datos.votoMultiple ?? false,
      ocultar_resultados: datos.ocultarResultados ?? false,
      umbral: datos.umbral ?? null,
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
export async function miVoto(publicacionUuid: string) {
  const { data, error } = await supabase
    .from("voto")
    .select("opcion_id")
    .eq("publicacion_id", publicacionUuid);
  if (error) throw error;
  return (data ?? []).map((v) => v.opcion_id);
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
  const { error } = await supabase
    .from("publicacion")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", uuid);
  if (error) throw error;
}

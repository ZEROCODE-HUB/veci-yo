import { supabase } from "@/shared/services/supabase";
import type { CorrespondenciaItem } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";
import { formatDate, formatTime } from "@/shared/utils";
import {
  segundosDeEnlace,
  subirArchivo,
  type ArchivoElegido,
} from "@/shared/services/archivos";
import type { PermisoDeEntrega } from "../helpers/destinos";

/** El bucket privado de las fotos. La carpeta es el id de la correspondencia. */
const BUCKET_FOTOS = "correspondencia";

type EstadoDB = Database["public"]["Enums"]["estado_correspondencia"];
type CategoriaDB = Database["public"]["Enums"]["categoria_correspondencia"];
type CondicionDB = Database["public"]["Enums"]["estado_encomienda"];

/**
 * El prototipo guardaba nueve pares fecha/hora en columnas separadas y dos
 * campos de estado sin relación documentada. En la base son tres `timestamptz`
 * con su actor, y dos estados con significados explícitos: `estado` es dónde
 * está el paquete, `condicion` en qué estado llegó.
 */

const SELECT = `
  id, empresa, logistica, categoria, descripcion, estado, condicion,
  entrega_en_puerta, destinatario_nombre, destinatario_documento,
  fotos, instrucciones,
  registrada_en, recibida_en, entregada_en, entregada_a,
  unidad:unidad_id ( id, codigo, piso, torre:torre_id ( numero ) ),
  incidencias:incidencia_correspondencia ( descripcion, fotos, reportada_en )
` as const;

/*
  La forma de lo que trae el SELECT, deducida de la consulta que se usa de
  verdad mas abajo. El `as const` es lo que lo hace posible.
*/
const consultaDeCorrespondencia = () =>
  supabase.from("correspondencia").select(SELECT);
type FilaDeCorrespondencia = NonNullable<
  Awaited<ReturnType<typeof consultaDeCorrespondencia>>["data"]
>[number];

const ESTADO_DESDE_BASE: Record<EstadoDB, CorrespondenciaItem["estado"]> = {
  no_recibido: "No Recibido",
  en_porteria: "En Portería",
  entregado: "Entregado",
};

export const ESTADO_HACIA_BASE: Record<string, EstadoDB> = {
  "No Recibido": "no_recibido",
  "En Portería": "en_porteria",
  Entregado: "entregado",
};

const CATEGORIA_DESDE_BASE: Record<CategoriaDB, string> = {
  delivery: "Delivery",
  sobres: "Sobres",
  paqueteria: "Paquetería",
};

/**
 * La misma categoría se etiqueta distinto segun el rol: el guardia ve
 * "Delivery/Comida" y el resto "Delivery". Se aceptan las dos formas para que
 * la etiqueta visible no cambie el dato guardado.
 */
export const CATEGORIA_HACIA_BASE: Record<string, CategoriaDB> = {
  Delivery: "delivery",
  "Delivery/Comida": "delivery",
  Sobres: "sobres",
  "Paquetería": "paqueteria",
  Paqueteria: "paqueteria",
};

const CONDICION_DESDE_BASE: Record<CondicionDB, string> = {
  buen_estado: "Buen estado",
  estado_intermedio: "Estado intermedio",
  mal_estado: "Mal estado",
};

export const CONDICION_HACIA_BASE: Record<string, CondicionDB> = {
  "Buen estado": "buen_estado",
  "Estado intermedio": "estado_intermedio",
  "Mal estado": "mal_estado",
};

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** Los nombres de quien registró y recibió, que no salen del perfil. */
type Nombres = { registradaPor?: string; recibidaPor?: string };

/*
  Los nombres venían del perfil por la consulta, y el perfil de la portería no
  lo ve un vecino: salían vacíos (hueco 20, 15/10/2026). Los da
  `nombres_de_correspondencia`, que solo devuelve el nombre.
*/
async function nombresDe(ids: string[]): Promise<Map<string, Nombres>> {
  const nombres = new Map<string, Nombres>();
  if (ids.length === 0) return nombres;
  const { data, error } = await supabase.rpc("nombres_de_correspondencia", { p_ids: ids });
  if (error) throw error;
  for (const fila of data ?? []) {
    nombres.set(fila.correspondencia_id, {
      registradaPor: fila.registrada_por ?? undefined,
      recibidaPor: fila.recibida_por ?? undefined,
    });
  }
  return nombres;
}

function mapear(fila: FilaDeCorrespondencia, nombres?: Nombres): CorrespondenciaItem {
  const registrada = fila.registrada_en ? new Date(fila.registrada_en) : null;
  const recibida = fila.recibida_en ? new Date(fila.recibida_en) : null;
  const entregada = fila.entregada_en ? new Date(fila.entregada_en) : null;
  const incidencia = (fila.incidencias ?? [])[0];

  return {
    uuid: fila.id,
    id: idNumerico(fila.id),
    empresa: fila.empresa ?? "",
    unidad: fila.unidad?.codigo ?? "",
    unidadId: fila.unidad?.id ?? undefined,
    nombre: fila.destinatario_nombre ?? "",
    ci: fila.destinatario_documento ?? "",
    estado: ESTADO_DESDE_BASE[fila.estado as EstadoDB],
    fecha: registrada ? formatDate(registrada) : "",
    categoria: CATEGORIA_DESDE_BASE[fila.categoria as CategoriaDB] ?? "",
    logistica: fila.logistica ?? "",
    descripcion: fila.descripcion ?? "",
    entregaEnPuerta: fila.entrega_en_puerta ?? false,
    torre: fila.unidad?.torre?.numero ? `Torre ${fila.unidad.torre.numero}` : "",
    piso: fila.unidad?.piso != null ? String(fila.unidad.piso) : "",
    estadoEncomienda: fila.condicion
      ? CONDICION_DESDE_BASE[fila.condicion as CondicionDB]
      : "",
    fechaRegistro: registrada ? formatDate(registrada) : undefined,
    horaRegistro: registrada ? formatTime(registrada) : undefined,
    registradoPor: nombres?.registradaPor,
    fechaRecibido: recibida ? formatDate(recibida) : undefined,
    horaRecibido: recibida ? formatTime(recibida) : undefined,
    recibidoPor: nombres?.recibidaPor,
    fechaEntregado: entregada ? formatDate(entregada) : undefined,
    horaEntregado: entregada ? formatTime(entregada) : undefined,
    entregadoA: fila.entregada_a ?? undefined,
    fotos: fila.fotos ?? [],
    instrucciones: fila.instrucciones ?? undefined,
    informarInfo: incidencia
      ? {
          descripcion: incidencia.descripcion,
          fotos: incidencia.fotos ?? [],
          fechaReporte: incidencia.reportada_en
            ? formatDate(new Date(incidencia.reportada_en))
            : "",
          usuarioReporte: "",
        }
      : undefined,
  };
}

/**
 * Qué correspondencia se pide, según el rol con el que se entró (regla 8).
 *
 * Es la tercera vez que aparece la misma forma --ya pasó con `obtenerVisitas` y
 * `obtenerReservas`--: la consulta pedía «todo lo que RLS me permita» y la
 * política no filtra por rol activo porque no lo conoce, solo mira la
 * identidad.
 *
 * Marcela administra el condominio y además es propietaria de la 301. Al entrar
 * **como propietaria**, en su lista de correspondencia salían los paquetes de
 * la 101 y de la 102: viviendas ajenas, en la pantalla donde debería ver solo
 * los suyos. Salió recorriendo la pantalla; con una persona de un solo rol los
 * dos ámbitos devuelven lo mismo y no se nota.
 *
 * RLS sigue siendo el techo: pedir `condominio` sin serlo no devuelve nada
 * ajeno. Lo que cambia es que la aplicación deja de pedirlo.
 */
export type AmbitoCorrespondencia = "condominio" | "unidad";

export async function obtenerCorrespondencia(params: {
  ambito: AmbitoCorrespondencia;
  unidadIds: string[];
}): Promise<CorrespondenciaItem[]> {
  let consulta = consultaDeCorrespondencia().is("deleted_at", null);

  if (params.ambito === "unidad") {
    /*
      Sin ninguna unidad no hay nada que pedir, y hay que decirlo: `in` con una
      lista vacía es sintaxis inválida en PostgREST y responde con un error, no
      con cero filas.
    */
    if (params.unidadIds.length === 0) return [];
    consulta = consulta.in("unidad_id", params.unidadIds);
  }

  const { data, error } = await consulta.order("registrada_en", {
    ascending: false,
  });

  if (error) throw error;
  const filas = data ?? [];
  const nombres = await nombresDe(filas.map((f) => f.id));
  return filas.map((f) => mapear(f, nombres.get(f.id)));
}

export interface NuevaCorrespondencia {
  condominioId: string;
  unidadId: string;
  empresa?: string;
  logistica?: string;
  categoria?: string;
  descripcion?: string;
  condicion?: string;
  entregaEnPuerta?: boolean;
  destinatarioNombre?: string;
  destinatarioDocumento?: string;
  estado?: CorrespondenciaItem["estado"];
  instrucciones?: string;
  /** Las fotos recien elegidas, todavia en el dispositivo. */
  fotos?: ArchivoElegido[];
}

/**
 * Sube las fotos a la carpeta del envio y devuelve sus rutas.
 *
 * La carpeta es el id de la correspondencia porque la politica del bucket lee
 * ese primer segmento: por eso las fotos se suben **despues** de crear la
 * fila, y no antes.
 */
async function subirFotos(
  correspondenciaUuid: string,
  fotos: ArchivoElegido[],
): Promise<string[]> {
  const rutas: string[] = [];
  for (const archivo of fotos) {
    const { ruta } = await subirArchivo({
      bucket: BUCKET_FOTOS,
      carpeta: correspondenciaUuid,
      archivo,
    });
    rutas.push(ruta);
  }
  return rutas;
}

export async function crearCorrespondencia(datos: NuevaCorrespondencia) {
  const { data, error } = await supabase
    .from("correspondencia")
    .insert({
      condominio_id: datos.condominioId,
      unidad_id: datos.unidadId,
      empresa: datos.empresa || null,
      logistica: datos.logistica || null,
      categoria: datos.categoria ? CATEGORIA_HACIA_BASE[datos.categoria] : null,
      descripcion: datos.descripcion || null,
      condicion: datos.condicion ? CONDICION_HACIA_BASE[datos.condicion] : null,
      entrega_en_puerta: datos.entregaEnPuerta ?? false,
      destinatario_nombre: datos.destinatarioNombre || null,
      destinatario_documento: datos.destinatarioDocumento || null,
      instrucciones: datos.instrucciones || null,
      estado: datos.estado ? ESTADO_HACIA_BASE[datos.estado] : "en_porteria",
    })
    .select("id")
    .single();

  if (error) throw error;

  if (datos.fotos && datos.fotos.length > 0) {
    const rutas = await subirFotos(data.id, datos.fotos);
    const { error: alAnotar } = await supabase
      .from("correspondencia")
      .update({ fotos: rutas })
      .eq("id", data.id);
    if (alAnotar) throw alAnotar;
  }

  return data.id;
}

export interface ResultadoDeRegistro {
  /** Las viviendas para las que el envio quedo registrado. */
  registradas: string[];
  /** Las que no, con lo que respondio la base. */
  fallidas: { unidadId: string; error: unknown }[];
}

/**
 * Registra el mismo envio para varias viviendas: una fila por vivienda.
 *
 * El KT (flujo 4.5) lo da por decidido --«para correspondencia masiva,
 * Seguridad puede seleccionar multiples deptos a la vez»-- y la pantalla lo
 * ofrecia, con su «Seleccionar todo». Pero al guardar se quedaba con
 * `unidades[0]`: se marcaban veinte departamentos y se registraba uno, y el
 * aviso decia «cargada con éxito». Lo vio el cliente el 12/10/2026.
 *
 * No se detiene en el primer fallo: que una vivienda rechace el envio no es
 * motivo para dejar sin avisar a las otras diecinueve. Devuelve cuales si y
 * cuales no, para que la pantalla lo diga.
 */
export async function registrarCorrespondencia(
  envios: NuevaCorrespondencia[],
): Promise<ResultadoDeRegistro> {
  const resultado: ResultadoDeRegistro = { registradas: [], fallidas: [] };
  for (const envio of envios) {
    try {
      await crearCorrespondencia(envio);
      resultado.registradas.push(envio.unidadId);
    } catch (error) {
      resultado.fallidas.push({ unidadId: envio.unidadId, error });
    }
  }
  return resultado;
}

/**
 * Lo que la administracion ha dicho sobre la entrega en puerta: la fila del
 * edificio y las de cada vivienda que diga algo distinto.
 *
 * No pide ambito porque la politica de `permiso_vivienda` ya lo acota al
 * edificio de quien pregunta, y la cuenta --en `sinEntregaEnPuerta`-- empareja
 * por condominio.
 */
export async function obtenerPermisosDeEntrega(): Promise<PermisoDeEntrega[]> {
  const { data, error } = await supabase
    .from("permiso_vivienda")
    .select("condominio_id, unidad_id, entrega_directa");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    condominioId: fila.condominio_id,
    unidadId: fila.unidad_id,
    entregaDirecta: fila.entrega_directa,
  }));
}

/**
 * Direcciones temporales para ver las fotos de un envio.
 *
 * El bucket es privado: una foto de un paquete dice quien te compra que. Lo
 * que la fila guarda son rutas, y cada vez que se van a pintar se firman. Una
 * ruta que no se puede firmar --porque no es de quien pregunta, o porque es
 * una direccion local de antes del 12/10/2026-- se queda fuera sin mas.
 */
export async function urlsDeFotos(rutas: string[]): Promise<string[]> {
  // Antes se guardaba la direccion del archivo en el telefono (`blob:`,
  // `file:`). Eso no es una ruta del bucket y pedirla es un error seguro.
  const delBucket = rutas.filter((ruta) => !ruta.includes(":"));
  if (delBucket.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .createSignedUrls(delBucket, await segundosDeEnlace());
  if (error) throw error;
  return (data ?? [])
    .map((firmada) => firmada.signedUrl)
    .filter((url): url is string => Boolean(url));
}

/**
 * Cada cambio de estado deja su marca de tiempo y su actor. La base completa el
 * actor sola en el alta; para recepción y entrega se registra explícitamente.
 */
export async function cambiarEstadoCorrespondencia(
  uuid: string,
  estado: CorrespondenciaItem["estado"],
  extras?: { entregadoA?: string },
) {
  const { data: sesion } = await supabase.auth.getSession();
  const ahora = new Date().toISOString();
  const estadoDB = ESTADO_HACIA_BASE[estado];

  const { data: actualizadas, error } = await supabase
    .from("correspondencia")
    .update({
      estado: estadoDB,
      /*
        Volver a porteria es tambien deshacer una entrega marcada por error:
        si se deja la fecha y el nombre de quien «recibio», el detalle sigue
        afirmando que se entrego.
      */
      // Volver a portería deshace la entrega. Quién recibió el paquete y
      // cuándo **no se toca** aquí: va abajo, y solo si no estaba anotado.
      ...(estadoDB === "en_porteria"
        ? { entregada_en: null, entregada_a: null }
        : {}),
      ...(estadoDB === "entregado"
        ? {
            entregada_en: ahora,
            ...(extras?.entregadoA ? { entregada_a: extras.entregadoA } : {}),
          }
        : {}),
    })
    .eq("id", uuid)
    .select("id");
  if (error) throw error;
  if (!actualizadas?.length) {
    throw new Error("No tienes permiso para cambiar ese envío.");
  }

  /*
    La recepción se anota **una vez**. Deshacer una entrega marcada por error
    reescribía `recibida_en` y `recibida_por`: el detalle pasaba a decir que
    el paquete lo recibió hoy quien deshizo la entrega, y se perdía quién lo
    había recibido de verdad (13/10/2026).
  */
  if (estadoDB === "en_porteria") {
    const { error: errorRecepcion } = await supabase
      .from("correspondencia")
      .update({
        recibida_en: ahora,
        recibida_por: sesion.session?.user.id ?? null,
      })
      .eq("id", uuid)
      .is("recibida_en", null);
    if (errorRecepcion) throw errorRecepcion;
  }
}

/** Borrado lógico: el historial de portería no se pierde. */
export async function eliminarCorrespondencia(uuid: string) {
  const { data, error } = await supabase
    .from("correspondencia")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", uuid)
    .select("id");
  if (error) throw error;
  if (!data?.length) {
    throw new Error("No tienes permiso para eliminar ese registro.");
  }
}

/**
 * Las fotos se **suben** y lo que se guarda es su ruta.
 *
 * Se guardaba lo que llegaba de la pantalla, que era la direccion del archivo
 * en el telefono de quien lo tomo: la propia porteria veia su foto mientras no
 * cerrara la aplicacion, y el vecino --que es para quien se informa-- un
 * cuadro roto.
 */
export async function reportarIncidencia(
  correspondenciaUuid: string,
  descripcion: string,
  fotos: ArchivoElegido[] = [],
  condicion?: string,
) {
  const rutas = await subirFotos(correspondenciaUuid, fotos);
  const { error } = await supabase.from("incidencia_correspondencia").insert({
    correspondencia_id: correspondenciaUuid,
    descripcion,
    fotos: rutas,
  });
  if (error) throw error;

  /*
    El informe pedia «Estado de encomienda» y no hacia nada con el: se elegia
    «Mal estado» para un paquete que llego roto y el envio seguia diciendo
    «Buen estado».
  */
  const condicionDB = condicion ? CONDICION_HACIA_BASE[condicion] : undefined;
  if (condicionDB) {
    const { error: alCorregir } = await supabase
      .from("correspondencia")
      .update({ condicion: condicionDB })
      .eq("id", correspondenciaUuid);
    if (alCorregir) throw alCorregir;
  }
}

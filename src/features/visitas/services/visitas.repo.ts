import { supabase } from "@/shared/services/supabase";
import type { Invitado, VisitaItem, Vehiculo } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";

type TipoVisitaDB = Database["public"]["Enums"]["tipo_visita"];
type EstadoVisitaDB = Database["public"]["Enums"]["estado_visita"];
type TipoVehiculoDB = Database["public"]["Enums"]["tipo_vehiculo"];

/**
 * Traducción entre la base y la forma que consumen las pantallas.
 *
 * El tipo `VisitaItem` nació en el prototipo, sin base de datos: los ids eran
 * `Date.now()` y los invitados vivían en un array anónimo. Se conserva su forma
 * para no reescribir las pantallas de una vez, pero cada fila lleva ahora su
 * uuid real en `uuid` / `invitados[].uuid`, que es lo que usan las mutaciones.
 * Las operaciones por posición en el array quedaron eliminadas.
 */

const SELECT_VISITA = `
  id, tipo, estado, fecha_desde, fecha_hasta,
  hora_estimada_llegada, hora_estimada_salida, ingreso_en, salida_en,
  instruccion_documento, aviso, es_evento, nombre_evento,
  para_administracion, dias_laborales, profesion,
  anotaciones_ingreso, anotaciones_salida, codigo_acceso,
  autorizada_por_nombre, anunciada_en, fotos_ingreso, fotos_salida, created_at,
  unidad:unidad_id ( id, codigo, torre:torre_id ( numero ) ),
  invitados:invitado ( id, orden, nombre, tipo_documento, documento_numero,
                       fecha_nacimiento, es_menor, tiene_tutela,
                       terminos_aceptados, terminos_excepcion, terminos_aprobado_por,
                       llego, ingreso_en, salida_en,
                       verificacion:verificacion_documento ( estado ),
                       reportes:reporte_tra ( movimiento ) ),
  vehiculos:vehiculo_visita ( id, placa, tipo )
`;

/**
 * La base usa enums en minuscula y con guion bajo; la app heredo del prototipo
 * valores con guion medio y capitalizados. Se traduce en un solo lugar para
 * que las pantallas sigan funcionando sin tocarlas, y para que el dia que se
 * unifique el vocabulario haya que cambiar solo esto.
 */
const TIPO_DESDE_BASE: Record<TipoVisitaDB, VisitaItem["tipo"]> = {
  amigos: "amigos",
  temporal: "temporal",
  permanente: "permanente",
  huesped_temporal: "huesped-temporal",
};

const TIPO_HACIA_BASE: Record<VisitaItem["tipo"], TipoVisitaDB> = {
  amigos: "amigos",
  temporal: "temporal",
  permanente: "permanente",
  "huesped-temporal": "huesped_temporal",
};

const ESTADO_DESDE_BASE: Record<EstadoVisitaDB, string> = {
  programada: "Pendiente",
  ingresada: "Ingresado",
  finalizada: "Finalizado",
  cancelada: "Cancelado",
};

export const ESTADO_HACIA_BASE: Record<string, EstadoVisitaDB> = {
  Pendiente: "programada",
  Ingresado: "ingresada",
  Finalizado: "finalizada",
  Cancelado: "cancelada",
  Cancelada: "cancelada",
};

export function tipoHaciaBase(tipo: VisitaItem["tipo"]): TipoVisitaDB {
  return TIPO_HACIA_BASE[tipo];
}

/** Las etiquetas del selector de la app a los valores del enum. */
const VEHICULO_HACIA_BASE: Record<string, TipoVehiculoDB> = {
  Auto: "auto",
  Camioneta: "camioneta",
  Van: "van",
  Bus: "bus",
  Moto: "moto",
};

export function vehiculoHaciaBase(etiqueta?: string): TipoVehiculoDB | undefined {
  if (!etiqueta) return undefined;
  return VEHICULO_HACIA_BASE[etiqueta];
}

/** Solo la hora, en `HH:mm`, a partir de un timestamp de la base. */
function horaDe(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** `yyyy-MM-dd` de la base a `dd/MM/yyyy`, el formato canónico de la app. */
function fechaDe(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const [anio, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** `dd/MM/yyyy` de la app a `yyyy-MM-dd` para la base. */
export function fechaParaBase(valor?: string): string | null {
  if (!valor) return null;
  const partes = valor.split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes;
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function mapearInvitado(fila: any, indice: number): Invitado {
  const verificacion = Array.isArray(fila.verificacion)
    ? fila.verificacion[0]
    : fila.verificacion;

  /*
    El timeline de seis pasos que el KT da por decidido —"🔗 preregistro
    enviado → 📄 documentación completa → 📝 T&C aceptados → 🛡️ verificación
    pasada → 🟢 TRA/SIRE entrada → 🔴 TRA/SIRE salida"— **no se armaba nunca**:
    esta función no devolvía `timeline`, así que el componente recibía
    `undefined` y pintaba los seis pasos en pendiente para todo el mundo,
    siempre.

    Los seis salen de la base:
      · el preregistro existe porque existe la fila del invitado;
      · la documentación, de `verificacion_documento`;
      · los términos, de la columna que ya los guarda;
      · la verificación, del estado de ese documento;
      · y los dos últimos, de `reporte_tra`.
  */
  const reportes: string[] = (fila.reportes ?? []).map(
    (r: any) => r.movimiento,
  );
  const documentoCargado = Boolean(verificacion);
  const documentoVerificado = verificacion?.estado === "verificado";

  return {
    timeline: {
      preregistroEnviado: true,
      documentacionCompleta: documentoCargado,
      terminosAceptados: fila.terminos_aceptados ?? false,
      terminosAprobadoPor: fila.terminos_aprobado_por ?? null,
      verificacionPasada: documentoVerificado,
      verificacionAprobada: documentoVerificado,
      trasideEntrada: reportes.includes("entrada"),
      trasideSalida: reportes.includes("salida"),
    },
    traSireReported: reportes.length > 0,
    uuid: fila.id,
    nombre: fila.nombre,
    llego: fila.llego ?? false,
    esMenor: fila.es_menor ?? false,
    tieneTutela: fila.tiene_tutela ?? false,
    terminosExcepcion: fila.terminos_excepcion ?? false,
    terminosAprobadoPor: fila.terminos_aprobado_por ?? undefined,
    ciVerificado: verificacion?.estado === "verificado",
    horaIngreso: horaDe(fila.ingreso_en),
    horaSalida: horaDe(fila.salida_en),
    tipoDocumento: fila.tipo_documento ?? undefined,
    documentoNumero: fila.documento_numero ?? undefined,
    fechaNacimiento: fila.fecha_nacimiento ?? undefined,
    orden: fila.orden ?? indice,
  };
}

function mapearVisita(fila: any): VisitaItem {
  const invitados: Invitado[] = (fila.invitados ?? [])
    .slice()
    .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
    .map(mapearInvitado);

  const vehiculos: Vehiculo[] = (fila.vehiculos ?? []).map((v: any) => ({
    uuid: v.id,
    placa: v.placa,
    tipo: v.tipo ?? undefined,
  }));

  return {
    uuid: fila.id,
    // Las pantallas todavía comparan ids numéricos en algunas listas; se deriva
    // uno estable a partir del uuid para no romperlas durante la migración.
    id: idNumericoDesdeUuid(fila.id),
    tipo: TIPO_DESDE_BASE[fila.tipo as TipoVisitaDB],
    estado: ESTADO_DESDE_BASE[fila.estado as EstadoVisitaDB] ?? fila.estado,
    nombre: invitados[0]?.nombre ?? "",
    ci: invitados[0]?.documentoNumero ?? "",
    invitados,
    vehiculos,
    tieneVehiculo: vehiculos.length > 0,
    esEvento: fila.es_evento ?? false,
    nombreEvento: fila.nombre_evento ?? undefined,
    fechaDesde: fechaDe(fila.fecha_desde),
    fechaHasta: fechaDe(fila.fecha_hasta),
    horaEstimadaLlegada: fila.hora_estimada_llegada?.slice(0, 5),
    horaEstimadaSalida: fila.hora_estimada_salida?.slice(0, 5),
    horaIngreso: horaDe(fila.ingreso_en),
    horaSalida: horaDe(fila.salida_en),
    instruccionDocumento:
      fila.instruccion_documento === "no_verificar" ? "no_verificar" : "verificar",
    aviso:
      fila.aviso === "notificar_y_anunciar"
        ? "notificar_y_anunciar"
        : "solo_notificar",
    torre: fila.unidad?.torre?.numero ? `Torre ${fila.unidad.torre.numero}` : undefined,
    depto: fila.unidad?.codigo ?? undefined,
    unidadId: fila.unidad?.id ?? undefined,
    paraAdministracion: fila.para_administracion ?? false,
    diasLaborales: fila.dias_laborales ?? undefined,
    profesion: fila.profesion ?? undefined,
    anotacionesIngreso: fila.anotaciones_ingreso ?? undefined,
    anotacionesSalida: fila.anotaciones_salida ?? undefined,
    codigoAcceso: fila.codigo_acceso ?? undefined,
    autorizadoPor: fila.autorizada_por_nombre ?? undefined,
    llego: invitados.some((i) => i.llego),
    instruccionesCumplidas: { llamoAnuncie: Boolean(fila.anunciada_en) },
    personas: invitados.length,
    fotosIngreso: fila.fotos_ingreso ?? [],
    fotosSalida: fila.fotos_salida ?? [],
  };
}

/** Las listas heredadas comparan por id numérico; se deriva del uuid. */
function idNumericoDesdeUuid(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) {
    hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

export async function obtenerVisitas(): Promise<VisitaItem[]> {
  const { data, error } = await supabase
    .from("visita")
    .select(SELECT_VISITA)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapearVisita);
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export interface NuevaVisita {
  condominioId: string;
  unidadId: string | null;
  tipo: TipoVisitaDB;
  estado?: EstadoVisitaDB;
  paraAdministracion?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
  horaEstimadaLlegada?: string;
  horaEstimadaSalida?: string;
  instruccionDocumento?: "verificar" | "no_verificar";
  aviso?: "solo_notificar" | "notificar_y_anunciar";
  esEvento?: boolean;
  nombreEvento?: string;
  diasLaborales?: string;
  profesion?: string;
  autorizadaPorNombre?: string;
  anotacionesIngreso?: string;
  invitados: Array<{
    nombre: string;
    tipoDocumento?: string;
    documentoNumero?: string;
    esMenor?: boolean;
  }>;
  vehiculos?: Array<{ placa: string; tipo?: TipoVehiculoDB }>;
}

export async function crearVisita(datos: NuevaVisita): Promise<string> {
  const { data: visita, error } = await supabase
    .from("visita")
    .insert({
      condominio_id: datos.condominioId,
      unidad_id: datos.unidadId,
      tipo: datos.tipo,
      estado: datos.estado ?? "programada",
      para_administracion: datos.paraAdministracion ?? false,
      fecha_desde: fechaParaBase(datos.fechaDesde),
      fecha_hasta: fechaParaBase(datos.fechaHasta),
      hora_estimada_llegada: datos.horaEstimadaLlegada || null,
      hora_estimada_salida: datos.horaEstimadaSalida || null,
      instruccion_documento: datos.instruccionDocumento ?? "verificar",
      aviso: datos.aviso ?? "solo_notificar",
      es_evento: datos.esEvento ?? false,
      nombre_evento: datos.nombreEvento || null,
      dias_laborales: datos.diasLaborales || null,
      profesion: datos.profesion || null,
      autorizada_por_nombre: datos.autorizadaPorNombre || null,
      anotaciones_ingreso: datos.anotacionesIngreso || null,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (datos.invitados.length > 0) {
    const { error: errorInvitados } = await supabase.from("invitado").insert(
      datos.invitados.map((inv, orden) => ({
        visita_id: visita.id,
        orden,
        nombre: inv.nombre,
        tipo_documento: (inv.tipoDocumento as any) || null,
        documento_numero: inv.documentoNumero || null,
        es_menor: inv.esMenor ?? false,
      })),
    );
    if (errorInvitados) throw errorInvitados;
  }

  if (datos.vehiculos?.length) {
    const { error: errorVehiculos } = await supabase
      .from("vehiculo_visita")
      .insert(
        datos.vehiculos.map((v) => ({
          visita_id: visita.id,
          placa: v.placa,
          tipo: v.tipo ?? null,
        })),
      );
    if (errorVehiculos) throw errorVehiculos;
  }

  return visita.id;
}

export async function actualizarEstadoVisita(
  visitaUuid: string,
  estado: EstadoVisitaDB,
) {
  const { error } = await supabase
    .from("visita")
    .update({ estado })
    .eq("id", visitaUuid);
  if (error) throw error;
}

/** Borrado lógico: el historial de porteria no se pierde. */
export async function eliminarVisita(visitaUuid: string) {
  const { error } = await supabase
    .from("visita")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", visitaUuid);
  if (error) throw error;
}

export async function actualizarVisita(
  visitaUuid: string,
  patch: {
    anotacionesIngreso?: string;
    anotacionesSalida?: string;
    estado?: EstadoVisitaDB;
    autorizadaPorNombre?: string;
    fotosIngreso?: string[];
    fotosSalida?: string[];
  },
) {
  const { error } = await supabase
    .from("visita")
    .update({
      anotaciones_ingreso: patch.anotacionesIngreso,
      anotaciones_salida: patch.anotacionesSalida,
      estado: patch.estado,
      autorizada_por_nombre: patch.autorizadaPorNombre,
      fotos_ingreso: patch.fotosIngreso,
      fotos_salida: patch.fotosSalida,
    })
    .eq("id", visitaUuid);
  if (error) throw error;
}

/** Datos de un invitado que el anfitrion puede corregir antes del ingreso. */
export async function actualizarInvitado(
  invitadoUuid: string,
  patch: {
    nombre?: string;
    documentoNumero?: string;
    tipoDocumento?: string;
    esMenor?: boolean;
  },
) {
  const { error } = await supabase
    .from("invitado")
    .update({
      nombre: patch.nombre,
      documento_numero: patch.documentoNumero,
      tipo_documento: (patch.tipoDocumento as any) ?? undefined,
      es_menor: patch.esMenor,
    })
    .eq("id", invitadoUuid);
  if (error) throw error;
}

/**
 * Sube una foto de porteria al bucket privado `visitas`.
 * La ruta empieza por el uuid de la visita: de ahi derivan las politicas de
 * Storage quien puede verla, que son los mismos que pueden ver la visita.
 */
export async function subirFotoVisita(
  visitaUuid: string,
  archivo: Blob,
  momento: "ingreso" | "salida",
): Promise<string> {
  const nombre = `${visitaUuid}/${momento}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("visitas")
    .upload(nombre, archivo, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return nombre;
}

/** URL temporal para mostrar una foto privada. */
export async function urlFotoVisita(ruta: string, segundos = 3600) {
  const { data, error } = await supabase.storage
    .from("visitas")
    .createSignedUrl(ruta, segundos);
  if (error) throw error;
  return data.signedUrl;
}

/** El guardia llamó al residente y anunció la visita. Queda con actor y hora. */
export async function registrarAnuncio(visitaUuid: string, anunciada: boolean) {
  const { data: sesion } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("visita")
    .update({
      anunciada_en: anunciada ? new Date().toISOString() : null,
      anunciada_por: anunciada ? (sesion.session?.user.id ?? null) : null,
    })
    .eq("id", visitaUuid);
  if (error) throw error;
}

// --- Invitados: todo por uuid, nunca por posición en el array ---------------

export async function marcarLlegadaInvitado(
  invitadoUuid: string,
  llego: boolean,
) {
  const { error } = await supabase
    .from("invitado")
    .update({
      llego,
      ingreso_en: llego ? new Date().toISOString() : null,
    })
    .eq("id", invitadoUuid);
  if (error) throw error;
}

export async function registrarHoraInvitado(
  invitadoUuid: string,
  momento: "ingreso" | "salida",
  hora: string,
) {
  // La app maneja `HH:mm`; la base guarda el instante completo.
  let valor: string | null = null;
  if (hora) {
    const [h, m] = hora.split(":").map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    valor = d.toISOString();
  }

  const cambios =
    momento === "ingreso"
      ? { ingreso_en: valor, llego: Boolean(valor) }
      : { salida_en: valor };

  const { error } = await supabase
    .from("invitado")
    .update(cambios)
    .eq("id", invitadoUuid);
  if (error) throw error;
}

/**
 * El guardia comparó el documento físico contra el del precheck-in.
 * Deja constancia de quién verificó y cuándo, que es el objeto del módulo.
 */
export async function verificarDocumentoInvitado(invitadoUuid: string) {
  const { data: sesion } = await supabase.auth.getSession();
  const { error } = await supabase.from("verificacion_documento").upsert(
    {
      invitado_id: invitadoUuid,
      estado: "verificado",
      verificado_por: sesion.session?.user.id ?? null,
      verificado_en: new Date().toISOString(),
    },
    { onConflict: "invitado_id" },
  );
  if (error) throw error;
}

/**
 * Registra el reporte TRA/SIRE de un huésped.
 *
 * El KT es explícito en dos cosas que la base impone y esta función no
 * repite: solo se puede reportar la entrada **cuando la portería ha
 * confirmado el ingreso físico** —nunca antes, nunca automático— y hace falta
 * un RNT vigente al que referenciar el reporte.
 *
 * No envía nada a ninguna autoridad: no hay integración con TRA ni con SIRE, y
 * fingir que el reporte salió sería peor que no tenerlo. Se registra que el
 * anfitrión lo hizo, y el radicado se completa cuando lo haya.
 */
export async function reportarTraSire(params: {
  invitadoUuid: string;
  movimiento: "entrada" | "salida";
  observaciones?: string;
}): Promise<void> {
  const { error } = await supabase.from("reporte_tra").insert({
    invitado_id: params.invitadoUuid,
    movimiento: params.movimiento,
    observaciones: params.observaciones || null,
    // `rnt` lo pone la base desde el registro vigente del alojamiento: quien
    // reporta no lo teclea, y así no puede referenciar uno que no es.
    rnt: "",
  });
  if (error) throw error;
}

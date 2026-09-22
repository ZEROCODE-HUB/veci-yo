import { supabase } from "@/shared/services/supabase";
import type { GestionZona, ZonaComunConfig } from "@/stores/zonas-store";
import type { ReservaZona, PersonaReserva, ZonaComun } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";
import { formatDate } from "@/shared/utils";

type EstadoReservaDB = Database["public"]["Enums"]["estado_reserva"];
type TipoParticipanteDB = Database["public"]["Enums"]["tipo_participante"];
type AsistenciaDB = Database["public"]["Enums"]["asistencia_participante"];

/**
 * El prototipo tenía TRES entidades para la misma zona común —`ZonaComun`,
 * `ZonaComunConfig` y `GestionZona`— con campos equivalentes de nombre distinto
 * (`reglamento`/`reglas`, `duracionMaxima`/`duracionPermitida`) y tipos
 * incompatibles para el mismo concepto (`horariosDisponibles` era `Horario[]`
 * en una y `string[]` en otra).
 *
 * En la base es una sola tabla. Este archivo deriva de ella las tres formas que
 * consumen las pantallas, para no reescribirlas todas de una vez.
 */

const SELECT_ZONA = `
  id, nombre, tipo, descripcion, emoji, imagen_path,
  horario_apertura, horario_cierre, dias_habilitados,
  duracion_minima_min, duracion_maxima_min, tiempo_min_entre_reservas,
  capacidad_maxima, cupos_simultaneos, usa_slots,
  requiere_aprobacion, restringida_huesped,
  permite_estancia_corta, permite_estancia_larga,
  monto_garantia, costo_limpieza, costo_reserva, moneda,
  reglamento, activa, condominio_id,
  fechas:zona_fecha_especial ( fecha, tipo, motivo, hora_apertura, hora_cierre )
`;

const SELECT_RESERVA = `
  id, zona_id, unidad_id, numero, fecha, hora_inicio, hora_fin,
  estado, acompanantes, comentarios, comprobante_path, motivo_rechazo,
  solicitada_por, resuelta_por, resuelta_en,
  unidad:unidad_id ( codigo ),
  zona:zona_id ( nombre, requiere_aprobacion ),
  participantes:participante_reserva ( id, nombre, tipo, asistencia )
`;

const ESTADO_DESDE_BASE: Record<EstadoReservaDB, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobado",
  rechazada: "Rechazado",
  en_curso: "En curso",
  finalizada: "Finalizado",
  cancelada: "Cancelado",
};

export const ESTADO_HACIA_BASE: Record<string, EstadoReservaDB> = {
  Pendiente: "pendiente",
  Aprobado: "aprobada",
  Aprobada: "aprobada",
  Rechazado: "rechazada",
  Rechazada: "rechazada",
  "En curso": "en_curso",
  Finalizado: "finalizada",
  Finalizada: "finalizada",
  Cancelado: "cancelada",
  Cancelada: "cancelada",
};

const PARTICIPANTE_DESDE_BASE: Record<TipoParticipanteDB, string> = {
  residente: "Residente",
  visitante: "Visitante",
  huesped_temporal: "Huésped Temporal",
};

export const PARTICIPANTE_HACIA_BASE: Record<string, TipoParticipanteDB> = {
  Residente: "residente",
  Visitante: "visitante",
  "Huésped Temporal": "huesped_temporal",
};

/** `llego: boolean | 'salio'` era un tri-estado disfrazado de booleano. */
function asistenciaDesdeBase(valor: AsistenciaDB): boolean | "salio" {
  if (valor === "salio") return "salio";
  return valor === "presente";
}

export function asistenciaHaciaBase(valor: boolean | "salio"): AsistenciaDB {
  if (valor === "salio") return "salio";
  return valor ? "presente" : "pendiente";
}

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

const hhmm = (v: string | null) => (v ? v.slice(0, 5) : "");

// ---------------------------------------------------------------------------
// Zonas
// ---------------------------------------------------------------------------

function mapearGestionZona(fila: any): GestionZona {
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipo: fila.tipo ?? "",
    descripcion: fila.descripcion ?? "",
    imagen: fila.imagen_path ?? null,
    horarioApertura: hhmm(fila.horario_apertura),
    horarioCierre: hhmm(fila.horario_cierre),
    duracionMinima: fila.duracion_minima_min ?? 0,
    duracionMaxima: fila.duracion_maxima_min ?? 0,
    tiempoMinimoEntreReservas: fila.tiempo_min_entre_reservas ?? 0,
    diasHabilitados: (fila.dias_habilitados ?? []).map(String),
    fechasEspeciales: (fila.fechas ?? []).map((f: any) => ({
      fecha: f.fecha,
      tipo: f.tipo,
      motivo: f.motivo ?? "",
      horaApertura: hhmm(f.hora_apertura) || undefined,
      horaCierre: hhmm(f.hora_cierre) || undefined,
    })),
    montoGarantia: Number(fila.monto_garantia ?? 0),
    costoLimpieza: Number(fila.costo_limpieza ?? 0),
    costoReserva: Number(fila.costo_reserva ?? 0),
    moneda: fila.moneda ?? "COP",
    activa: fila.activa ?? true,
    usaSlots: fila.usa_slots ?? false,
    duracionPermitida: fila.duracion_maxima_min ?? undefined,
    permiteCorta: fila.permite_estancia_corta ?? true,
    permiteLarga: fila.permite_estancia_larga ?? true,
    reglamento: fila.reglamento ?? "",
  } as GestionZona;
}

/**
 * Devuelve la interseccion de las dos formas que conviven en las pantallas:
 * `ZonaComunConfig` la usan los formularios y `ZonaComun` las tarjetas. Es la
 * herencia de haber tenido tres tipos para la misma entidad.
 */
/**
 * Franjas en las que se puede reservar, a partir del horario de la zona y de
 * su duracion maxima: "08:00 - 10:00", "10:00 - 12:00"...
 *
 * El prototipo las traia fijas por zona en `zonasComunesConfigInit`. Al quitar
 * ese mock quedaron en `[]`, con lo que el selector de horas no ofrecia nada;
 * se generan aqui a partir de lo que la zona tiene configurado.
 */
export function franjas(
  apertura: string | null,
  cierre: string | null,
  duracionMin: number | null,
): string[] {
  if (!apertura || !cierre) return [];

  const aMinutos = (hora: string) => {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const aTexto = (minutos: number) =>
    `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

  const inicio = aMinutos(apertura);
  const fin = aMinutos(cierre);
  // Sin duracion configurada, franjas de dos horas: es lo que usaba el
  // prototipo para la mayoria de las zonas.
  const paso = duracionMin && duracionMin > 0 ? duracionMin : 120;
  if (fin <= inicio) return [];

  const resultado: string[] = [];
  for (let desde = inicio; desde + paso <= fin; desde += paso) {
    resultado.push(`${aTexto(desde)} - ${aTexto(desde + paso)}`);
  }
  return resultado;
}

function mapearZonaConfig(fila: any): ZonaComunConfig & ZonaComun {
  return {
    id: fila.id,
    nombre: fila.nombre,
    emoji: fila.emoji ?? "🏛️",
    descripcion: fila.descripcion ?? "",
    horariosDisponibles: franjas(
      fila.horario_apertura,
      fila.horario_cierre,
      fila.duracion_maxima_min,
    ),
    duracionPermitida: fila.duracion_maxima_min ?? 60,
    reglas: fila.reglamento ?? "",
    capacidadMaxima: fila.capacidad_maxima ?? 0,
    requiereAprobacion: fila.requiere_aprobacion ?? false,
    disponibles: fila.cupos_simultaneos ?? 1,
    total: fila.cupos_simultaneos ?? 1,
    usaSlots: fila.usa_slots ?? false,
    restringidaHuesped: fila.restringida_huesped ?? false,
    // `ZonaCard` consume la forma `ZonaComun`, que nombra estos dos campos
    // distinto que `ZonaComunConfig`. Es la herencia de tener tres tipos para
    // la misma entidad; se completan aqui hasta unificarlos.
    duracionMaxima: fila.duracion_maxima_min ?? 60,
    reglamento: fila.reglamento ?? "",
    // La grilla de horas libres iba de 08:00 a 22:00 fija, sin mirar cuando
    // abre cada zona.
    horarioApertura: hhmm(fila.horario_apertura),
    horarioCierre: hhmm(fila.horario_cierre),
    // El formulario mostraba "$5 USD por persona" y "$100 USD" fijos, mientras
    // la zona guarda sus importes en la moneda del condominio.
    costoReserva: Number(fila.costo_reserva ?? 0),
    costoLimpieza: Number(fila.costo_limpieza ?? 0),
    montoGarantia: Number(fila.monto_garantia ?? 0),
    moneda: fila.moneda ?? null,
  } as ZonaComunConfig & ZonaComun;
}

export async function obtenerZonas() {
  const { data, error } = await supabase
    .from("zona_comun")
    .select(SELECT_ZONA)
    .is("deleted_at", null)
    .order("nombre");

  if (error) throw error;
  const filas = data ?? [];

  const gestion: Record<string, GestionZona> = {};
  const config: Record<string, ZonaComunConfig & ZonaComun> = {};
  for (const fila of filas) {
    gestion[(fila as any).id] = mapearGestionZona(fila);
    config[(fila as any).id] = mapearZonaConfig(fila);
  }
  return { gestion, config };
}

export interface DatosZona {
  condominioId: string;
  nombre: string;
  tipo?: string;
  descripcion?: string;
  emoji?: string;
  horarioApertura?: string;
  horarioCierre?: string;
  diasHabilitados?: number[];
  duracionMinima?: number;
  duracionMaxima?: number;
  tiempoMinimoEntreReservas?: number;
  capacidadMaxima?: number;
  cuposSimultaneos?: number;
  usaSlots?: boolean;
  requiereAprobacion?: boolean;
  restringidaHuesped?: boolean;
  montoGarantia?: number;
  costoLimpieza?: number;
  costoReserva?: number;
  moneda?: string;
  reglamento?: string;
  activa?: boolean;
}

function haciaFila(datos: Partial<DatosZona>) {
  return {
    nombre: datos.nombre,
    tipo: datos.tipo ?? null,
    descripcion: datos.descripcion ?? null,
    emoji: datos.emoji ?? null,
    horario_apertura: datos.horarioApertura || null,
    horario_cierre: datos.horarioCierre || null,
    dias_habilitados: datos.diasHabilitados,
    duracion_minima_min: datos.duracionMinima,
    duracion_maxima_min: datos.duracionMaxima,
    tiempo_min_entre_reservas: datos.tiempoMinimoEntreReservas,
    capacidad_maxima: datos.capacidadMaxima,
    cupos_simultaneos: datos.cuposSimultaneos,
    usa_slots: datos.usaSlots,
    requiere_aprobacion: datos.requiereAprobacion,
    restringida_huesped: datos.restringidaHuesped,
    monto_garantia: datos.montoGarantia,
    costo_limpieza: datos.costoLimpieza,
    costo_reserva: datos.costoReserva,
    // La base exige moneda si hay algun costo; sin costos puede quedar nula.
    moneda: datos.moneda ?? "COP",
    reglamento: datos.reglamento ?? null,
    activa: datos.activa,
  };
}

export async function crearZona(datos: DatosZona) {
  const { data, error } = await supabase
    .from("zona_comun")
    .insert({
      ...haciaFila(datos),
      condominio_id: datos.condominioId,
      nombre: datos.nombre,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function actualizarZona(zonaId: string, datos: Partial<DatosZona>) {
  const { error } = await supabase
    .from("zona_comun")
    .update(haciaFila(datos))
    .eq("id", zonaId);
  if (error) throw error;
}

/** Borrado lógico: las reservas históricas siguen apuntando a la zona. */
export async function eliminarZona(zonaId: string) {
  const { error } = await supabase
    .from("zona_comun")
    .update({ deleted_at: new Date().toISOString(), activa: false })
    .eq("id", zonaId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

function mapearReserva(fila: any, usuarioId?: string): ReservaZona {
  const participantes: PersonaReserva[] = (fila.participantes ?? []).map(
    (p: any) => ({
      uuid: p.id,
      nombre: p.nombre,
      llego: asistenciaDesdeBase(p.asistencia as AsistenciaDB),
      tipoParticipante:
        PARTICIPANTE_DESDE_BASE[p.tipo as TipoParticipanteDB] ?? "Residente",
    }),
  );

  const [anio, mes, dia] = (fila.fecha ?? "").split("-");

  return {
    uuid: fila.id,
    id: idNumerico(fila.id),
    zonaId: fila.zona_id,
    unidadId: fila.unidad_id,
    depto: fila.unidad?.codigo ?? "",
    nombre: fila.zona?.nombre ?? "",
    acompanantes: fila.acompanantes ?? 0,
    reservaNum: fila.numero ?? "",
    horario: `${hhmm(fila.hora_inicio)} - ${hhmm(fila.hora_fin)}`,
    estado: ESTADO_DESDE_BASE[fila.estado as EstadoReservaDB],
    personas: participantes,
    fecha: anio ? `${dia}/${mes}/${anio}` : undefined,
    comentarios: fila.comentarios ?? undefined,
    comprobante: fila.comprobante_path ?? null,
    requiereAprobacion: fila.zona?.requiere_aprobacion ?? false,
    // `fecha` va en dd/MM/yyyy porque es lo que se pinta; ordenarla como
    // texto ordenaria por dia, asi que se conserva tambien la fecha ISO.
    fechaIso: fila.fecha ?? undefined,
    solicitadaPor: fila.solicitada_por ?? undefined,
    esMia: Boolean(usuarioId) && fila.solicitada_por === usuarioId,
  } as ReservaZona;
}

export async function obtenerReservas(): Promise<ReservaZona[]> {
  /**
   * `esMia` se resuelve aqui, comparando `solicitada_por` con quien tiene la
   * sesion abierta. Antes nadie la asignaba nunca y las tres pantallas que la
   * consultan caian a un respaldo que comparaba el nombre de la persona con
   * `reserva.nombre`, que es **el nombre de la zona**. Es decir: "Mis
   * reservas" mostraba 0 para todo el mundo, salvo que alguien se llamara
   * "Piscina".
   */
  const { data: sesion } = await supabase.auth.getSession();
  const usuarioId = sesion.session?.user.id;

  const { data, error } = await supabase
    .from("reserva_zona")
    .select(SELECT_RESERVA)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((fila) => mapearReserva(fila, usuarioId));
}

export interface NuevaReserva {
  zonaId: string;
  unidadId: string;
  fecha: string; // dd/MM/yyyy
  horaInicio: string;
  horaFin: string;
  acompanantes?: number;
  comentarios?: string;
  /** Numero visible de la reserva; se muestra al usuario al confirmar. */
  numero?: string;
  participantes?: Array<{ nombre: string; tipo?: string }>;
}

export async function crearReserva(datos: NuevaReserva) {
  const [dia, mes, anio] = datos.fecha.split("/");
  const { data, error } = await supabase
    .from("reserva_zona")
    .insert({
      zona_id: datos.zonaId,
      unidad_id: datos.unidadId,
      fecha: `${anio}-${mes}-${dia}`,
      hora_inicio: datos.horaInicio,
      hora_fin: datos.horaFin,
      acompanantes: datos.acompanantes ?? 0,
      comentarios: datos.comentarios || null,
      numero: datos.numero ?? `R-${Date.now().toString().slice(-6)}`,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (datos.participantes?.length) {
    const { error: errorP } = await supabase.from("participante_reserva").insert(
      datos.participantes.map((p) => ({
        reserva_id: data.id,
        nombre: p.nombre,
        tipo: p.tipo ? PARTICIPANTE_HACIA_BASE[p.tipo] : "residente",
      })),
    );
    if (errorP) throw errorP;
  }
  return data.id;
}

/**
 * Aprobar o rechazar deja constancia de quién resolvió y cuándo: la base lo
 * exige con un CHECK, porque es la decisión que habilita el uso de un espacio
 * pago y tiene que poder auditarse.
 */
export async function resolverReserva(
  reservaUuid: string,
  estado: string,
  motivoRechazo?: string,
) {
  const { data: sesion } = await supabase.auth.getSession();
  const estadoDB = ESTADO_HACIA_BASE[estado];
  const resuelve = estadoDB === "aprobada" || estadoDB === "rechazada";

  const { error } = await supabase
    .from("reserva_zona")
    .update({
      estado: estadoDB,
      ...(resuelve
        ? {
            resuelta_por: sesion.session?.user.id ?? null,
            resuelta_en: new Date().toISOString(),
            motivo_rechazo: motivoRechazo ?? null,
          }
        : {}),
    })
    .eq("id", reservaUuid);
  if (error) throw error;
}

/** Edicion de los datos de la reserva por parte de la administracion. */
export async function actualizarReserva(
  reservaUuid: string,
  datos: {
    fecha?: string;        // dd/MM/yyyy
    horaInicio?: string;
    horaFin?: string;
    comentarios?: string;
  },
) {
  let fecha: string | undefined;
  if (datos.fecha) {
    const [dia, mes, anio] = datos.fecha.split("/");
    fecha = `${anio}-${mes}-${dia}`;
  }
  const { error } = await supabase
    .from("reserva_zona")
    .update({
      fecha,
      hora_inicio: datos.horaInicio,
      hora_fin: datos.horaFin,
      comentarios: datos.comentarios,
    })
    .eq("id", reservaUuid);
  if (error) throw error;
}

export async function eliminarReserva(reservaUuid: string) {
  const { error } = await supabase
    .from("reserva_zona")
    .delete()
    .eq("id", reservaUuid);
  if (error) throw error;
}

export async function actualizarParticipante(
  participanteUuid: string,
  datos: { nombre?: string; llego?: boolean | "salio"; tipoParticipante?: string },
) {
  const { error } = await supabase
    .from("participante_reserva")
    .update({
      nombre: datos.nombre,
      asistencia:
        datos.llego !== undefined ? asistenciaHaciaBase(datos.llego) : undefined,
      tipo: datos.tipoParticipante
        ? PARTICIPANTE_HACIA_BASE[datos.tipoParticipante]
        : undefined,
    })
    .eq("id", participanteUuid);
  if (error) throw error;
}

/** El residente sube el comprobante y la administración aprueba a mano. */
export async function subirComprobante(reservaUuid: string, archivo: Blob) {
  const ruta = `${reservaUuid}/comprobante-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("reservas")
    .upload(ruta, archivo, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  const { error: errorFila } = await supabase
    .from("reserva_zona")
    .update({ comprobante_path: ruta })
    .eq("id", reservaUuid);
  if (errorFila) throw errorFila;
  return ruta;
}

export { formatDate };

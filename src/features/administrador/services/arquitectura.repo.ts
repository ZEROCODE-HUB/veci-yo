import { supabase } from "@/shared/services/supabase";
import type { Fila } from "@/shared/types";
import type {
  Deposito,
  Porteria,
  Torre,
  Unidad,
} from "@/stores/admin-store";
import type { Database } from "@/shared/types/database.types";

type TipoPorteriaDB = Database["public"]["Enums"]["tipo_porteria"];
type EstadoUnidadDB = Database["public"]["Enums"]["estado_unidad"];
type TipoEstacionamientoDB = Database["public"]["Enums"]["tipo_estacionamiento"];

/**
 * Arquitectura del condominio: torres, unidades, depósitos, estacionamientos y
 * porterías.
 *
 * Dos cosas cambian respecto del prototipo:
 *
 * 1. Los conteos (pisos, sótanos, cocheras, entradas) eran `string`. En la base
 *    son enteros, así que la traducción ocurre aquí y no en cada pantalla.
 * 2. Los estacionamientos eran un contador global `{total, ocupados}` más un
 *    mapa `spot -> clave`. Ahora son filas, así que la ocupación se puede
 *    auditar y liberar sin condiciones de carrera.
 */

const num = (v?: string | null) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).match(/-?\d+/)?.[0]);
  return Number.isFinite(n) ? n : undefined;
};

const txt = (v?: number | null) => (v === null || v === undefined ? "" : String(v));

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Torres
// ---------------------------------------------------------------------------

function mapearTorre(fila: Fila<"torre">): Torre {
  return {
    uuid: fila.id,
    id: idNumerico(fila.id),
    numero: fila.numero,
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? "",
    pisos: txt(fila.pisos),
    sotanos: txt(fila.sotanos),
    cocherasVisitas: txt(fila.cocheras_visitas),
    cocherasPrivadas: txt(fila.cocheras_privadas),
    almacenPrivados: txt(fila.almacenes_privados),
    entradasPeatonales: txt(fila.entradas_peatonales),
    entradasVehiculares: txt(fila.entradas_vehiculares),
    nomenclaturaDesde: fila.nomenclatura_desde ?? "",
    nomenclaturaHasta: fila.nomenclatura_hasta ?? "",
  } as Torre;
}

function torreHaciaFila(datos: Partial<Torre>) {
  return {
    nombre: datos.nombre,
    descripcion: datos.descripcion || null,
    pisos: num(datos.pisos),
    sotanos: num(datos.sotanos),
    cocheras_visitas: num(datos.cocherasVisitas) ?? 0,
    cocheras_privadas: num(datos.cocherasPrivadas) ?? 0,
    almacenes_privados: num(datos.almacenPrivados) ?? 0,
    entradas_peatonales: num(datos.entradasPeatonales) ?? 0,
    entradas_vehiculares: num(datos.entradasVehiculares) ?? 0,
    nomenclatura_desde: datos.nomenclaturaDesde || null,
    nomenclatura_hasta: datos.nomenclaturaHasta || null,
  };
}

// ---------------------------------------------------------------------------
// Consulta única
// ---------------------------------------------------------------------------

export interface Arquitectura {
  torres: Torre[];
  unidades: Unidad[];
  depositos: Deposito[];
  porterias: Porteria[];
  estacionamientos: Array<{
    uuid: string;
    codigo: string;
    ubicacion: string;
    tipo: TipoEstacionamientoDB;
    unidadId: string | null;
    torreNumero: number | null;
    ocupado: boolean;
  }>;
}

export async function obtenerArquitectura(): Promise<Arquitectura> {
  const [torres, unidades, depositos, porterias, estacionamientos] =
    await Promise.all([
      supabase.from("torre").select("*").is("deleted_at", null).order("numero"),
      supabase
        .from("unidad")
        .select("id, codigo, piso, estado, tipologia_id, torre:torre_id ( id, numero )")
        .is("deleted_at", null)
        .order("codigo"),
      supabase
        .from("deposito")
        .select("id, codigo, ubicacion, unidad_id, torre:torre_id ( numero ), unidad:unidad_id ( codigo )")
        .order("codigo"),
      supabase.from("porteria").select("*").is("deleted_at", null).order("nombre"),
      supabase
        .from("estacionamiento")
        /*
          En una sola pieza y no concatenando: Supabase deduce el tipo de la
          respuesta **del literal** del `select`, asi que partido en dos cadenas
          devolvia `GenericStringError` y el mapeo de abajo tenia que ir con
          `any` para compilar.
        */
        .select(
          `id, codigo, ubicacion, tipo, unidad_id,
           torre:torre_id ( numero ),
           asignaciones:asignacion_estacionamiento ( liberado_en )`,
        )
        .order("codigo"),
    ]);

  for (const r of [torres, unidades, depositos, porterias, estacionamientos]) {
    if (r.error) throw r.error;
  }

  return {
    torres: (torres.data ?? []).map(mapearTorre),
    unidades: (unidades.data ?? []).map((f) => ({
      uuid: f.id,
      id: idNumerico(f.id),
      codigo: f.codigo,
      torreNumero: f.torre?.numero ?? 0,
      torreId: f.torre?.id,
      piso: f.piso,
      tipologiaId: f.tipologia_id ?? undefined,
      estado: f.estado,
    })) as Unidad[],
    depositos: (depositos.data ?? []).map((f) => ({
      uuid: f.id,
      id: idNumerico(f.id),
      codigo: f.codigo,
      torreNumero: f.torre?.numero ?? 0,
      ubicacion: f.ubicacion ?? "",
      unidadId: f.unidad_id,
      departamentoCodigo: f.unidad?.codigo ?? "",
    })) as unknown as Deposito[],
    porterias: (porterias.data ?? []).map((f) => ({
      uuid: f.id,
      id: idNumerico(f.id),
      nombre: f.nombre,
      tipo: f.tipo,
      ubicacion: f.ubicacion ?? "",
      telefono: f.telefono ?? "",
    })) as unknown as Porteria[],
    estacionamientos: (estacionamientos.data ?? []).map((f) => ({
      uuid: f.id,
      codigo: f.codigo,
      ubicacion: f.ubicacion ?? "",
      tipo: f.tipo,
      unidadId: f.unidad_id,
      torreNumero: f.torre?.numero ?? null,
      // Ocupado = tiene una asignacion sin liberar.
      ocupado: (f.asignaciones ?? []).some((a) => a.liberado_en === null),
    })),
  };
}

// ---------------------------------------------------------------------------
// Torres
// ---------------------------------------------------------------------------

export async function crearTorre(condominioId: string, datos: Partial<Torre>) {
  // El numero es correlativo dentro del condominio; lo calcula la base al leer
  // el maximo actual, no el cliente.
  const { data: ultimas } = await supabase
    .from("torre")
    .select("numero")
    .eq("condominio_id", condominioId)
    .order("numero", { ascending: false })
    .limit(1);

  const siguiente = (ultimas?.[0]?.numero ?? 0) + 1;

  const { error } = await supabase.from("torre").insert({
    ...torreHaciaFila(datos),
    condominio_id: condominioId,
    numero: siguiente,
    nombre: datos.nombre || `Torre ${siguiente}`,
  });
  if (error) throw error;
}

export async function actualizarTorre(uuid: string, datos: Partial<Torre>) {
  const { error } = await supabase
    .from("torre")
    .update(torreHaciaFila(datos))
    .eq("id", uuid);
  if (error) throw error;
}

/** Borrado logico: las unidades historicas siguen apuntando a la torre. */
export async function eliminarTorre(uuid: string) {
  const { error } = await supabase
    .from("torre")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", uuid);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

export async function crearUnidad(
  condominioId: string,
  datos: { torreId: string; codigo: string; piso: number; tipologiaId?: string },
) {
  const { error } = await supabase.from("unidad").insert({
    condominio_id: condominioId,
    torre_id: datos.torreId,
    codigo: datos.codigo,
    piso: datos.piso,
    tipologia_id: datos.tipologiaId ?? null,
  });
  if (error) throw error;
}

export async function actualizarUnidad(
  uuid: string,
  datos: { codigo?: string; piso?: number; estado?: EstadoUnidadDB },
) {
  const { error } = await supabase
    .from("unidad")
    .update({ codigo: datos.codigo, piso: datos.piso, estado: datos.estado })
    .eq("id", uuid);
  if (error) throw error;
}

export async function eliminarUnidad(uuid: string) {
  const { error } = await supabase
    .from("unidad")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", uuid);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Depositos
// ---------------------------------------------------------------------------

export async function crearDeposito(
  condominioId: string,
  datos: { codigo: string; torreId?: string; ubicacion?: string; unidadId?: string },
) {
  const { error } = await supabase.from("deposito").insert({
    condominio_id: condominioId,
    codigo: datos.codigo,
    torre_id: datos.torreId ?? null,
    ubicacion: datos.ubicacion || null,
    unidad_id: datos.unidadId ?? null,
  });
  if (error) throw error;
}

export async function actualizarDeposito(
  uuid: string,
  datos: { codigo?: string; ubicacion?: string; unidadId?: string | null },
) {
  const { error } = await supabase
    .from("deposito")
    .update({
      codigo: datos.codigo,
      ubicacion: datos.ubicacion,
      unidad_id: datos.unidadId,
    })
    .eq("id", uuid);
  if (error) throw error;
}

export async function eliminarDeposito(uuid: string) {
  const { error } = await supabase.from("deposito").delete().eq("id", uuid);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Porterias
// ---------------------------------------------------------------------------

export async function crearPorteria(
  condominioId: string,
  datos: { nombre: string; tipo: TipoPorteriaDB; ubicacion?: string; telefono?: string },
) {
  const { error } = await supabase.from("porteria").insert({
    condominio_id: condominioId,
    nombre: datos.nombre,
    tipo: datos.tipo,
    ubicacion: datos.ubicacion || null,
    telefono: datos.telefono || null,
  });
  if (error) throw error;
}

export async function actualizarPorteria(
  uuid: string,
  datos: { nombre?: string; tipo?: TipoPorteriaDB; ubicacion?: string; telefono?: string },
) {
  const { error } = await supabase.from("porteria").update(datos).eq("id", uuid);
  if (error) throw error;
}

export async function eliminarPorteria(uuid: string) {
  const { error } = await supabase
    .from("porteria")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", uuid);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Estacionamientos
// ---------------------------------------------------------------------------

export async function crearEstacionamiento(
  condominioId: string,
  datos: {
    codigo: string;
    tipo: TipoEstacionamientoDB;
    torreId?: string;
    ubicacion?: string;
    unidadId?: string;
  },
) {
  const { error } = await supabase.from("estacionamiento").insert({
    condominio_id: condominioId,
    codigo: datos.codigo,
    tipo: datos.tipo,
    torre_id: datos.torreId ?? null,
    ubicacion: datos.ubicacion || null,
    unidad_id: datos.unidadId ?? null,
  });
  if (error) throw error;
}

/**
 * Asigna un lugar de visita. El índice único parcial de la base impide que dos
 * visitas ocupen el mismo lugar a la vez, cosa que el mapa en memoria del
 * prototipo no podía garantizar.
 */
export async function asignarEstacionamiento(
  estacionamientoUuid: string,
  visitaUuid: string,
) {
  const { error } = await supabase.from("asignacion_estacionamiento").insert({
    estacionamiento_id: estacionamientoUuid,
    visita_id: visitaUuid,
  });
  if (error) throw error;
}

export async function liberarEstacionamiento(estacionamientoUuid: string) {
  const { error } = await supabase
    .from("asignacion_estacionamiento")
    .update({ liberado_en: new Date().toISOString() })
    .eq("estacionamiento_id", estacionamientoUuid)
    .is("liberado_en", null);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Tipologias y personal de porteria
// ---------------------------------------------------------------------------
// No estaban aqui porque la pantalla de Arquitectura no las edita, pero el
// store las servia desde `adminMockData` y las leen el directorio, el
// alojamiento del huesped y el perfil del guardia.

export async function obtenerTipologias(condominioId: string) {
  const { data, error } = await supabase
    .from("tipologia")
    .select("id, nombre, metros_cuadrados, habitaciones, banos")
    .eq("condominio_id", condominioId)
    .order("nombre");

  if (error) throw error;

  return (data ?? []).map((f) => ({
    uuid: f.id,
    id: idNumerico(f.id),
    nombre: f.nombre,
    metrosCuadrados: Number(f.metros_cuadrados ?? 0),
    habitaciones: f.habitaciones ?? 0,
    banos: f.banos ?? 0,
  }));
}

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/**
 * Los guardias no son una tabla aparte: son membresias de condominio con rol
 * 'guardia'. En el prototipo eran dos personas fijas ("Roberto Hornado" y
 * "Juan Franco") con cedula y correo inventados, y la garita era texto libre.
 */
export async function obtenerGuardias(condominioId: string) {
  const { data, error } = await supabase
    .from("membresia_condominio")
    .select(
      `id, nombre, telefono,
       porteria:porteria_id ( nombre ),
       turnos:turno_guardia ( dia_semana, hora_inicio, hora_fin )`,
    )
    .eq("condominio_id", condominioId)
    .eq("rol", "guardia")
    .eq("activo", true)
    .order("nombre");

  if (error) throw error;

  const hhmm = (h: string | null) => (h ? h.slice(0, 5) : "");

  return (data ?? []).map((f) => ({
    uuid: f.id,
    id: idNumerico(f.id),
    nombre: f.nombre ?? "",
    telefono: f.telefono ?? "",
    garita: f.porteria?.nombre ?? "",
    turnos: [...(f.turnos ?? [])]
      .sort((a, b) => a.dia_semana - b.dia_semana)
      .map((t) => ({
        dia: DIAS_SEMANA[t.dia_semana] ?? "",
        horaInicio: hhmm(t.hora_inicio),
        horaFin: hhmm(t.hora_fin),
      })),
  }));
}

/**
 * Quien responde por cada unidad: propietario, anfitrion primario y admin
 * primario, con su telefono.
 *
 * El directorio los mostraba fijos -- "Juan Lopez", "Maria Perez" y "Carlos
 * Gomez" con tres telefonos peruanos -- en TODAS las unidades, asi que la
 * pantalla de contactos de la administracion no servia para llamar a nadie.
 *
 * Solo lo lee el personal del condominio: la politica de `membresia_unidad`
 * ya lo impone.
 */
export async function obtenerContactosPorUnidad(condominioId: string) {
  const { data, error } = await supabase
    .from("membresia_unidad")
    .select(
      `unidad_id, nombre, telefono, rol,
       es_anfitrion_primario, es_admin_primario,
       unidad:unidad_id ( condominio_id )`,
    )
    .eq("activo", true);

  if (error) throw error;

  const vacio = { nombre: "Sin asignar", telefono: "" };
  const porUnidad: Record<
    string,
    { propietario: typeof vacio; anfitrion: typeof vacio; administrador: typeof vacio }
  > = {};

  for (const f of data ?? []) {
    if (f.unidad?.condominio_id !== condominioId) continue;
    const actual = (porUnidad[f.unidad_id] ??= {
      propietario: { ...vacio },
      anfitrion: { ...vacio },
      administrador: { ...vacio },
    });
    const contacto = { nombre: f.nombre ?? "", telefono: f.telefono ?? "" };
    if (f.rol === "propietario") actual.propietario = contacto;
    if (f.es_anfitrion_primario) actual.anfitrion = contacto;
    if (f.es_admin_primario) actual.administrador = contacto;
  }

  return porUnidad;
}

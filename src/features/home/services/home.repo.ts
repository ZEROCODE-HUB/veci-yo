import { supabase } from "@/shared/services/supabase";
import { formatDateInput, formatTime } from "@/shared/utils";
import type { AgendaItem, IngresoSalida, ReputacionInsignia } from "../types/home";

/**
 * Datos del Home.
 *
 * El "Tráfico de ingresos y salidas" del guardia venía de dos arrays fijos
 * (`ingresosSalidasHoy` y `ingresosSalidasManana`) con nombres inventados y
 * departamentos que no existen en ningún condominio. Es la tabla principal de
 * la pantalla de portería: ahora sale de las visitas reales.
 */

const ESTADO_VISIBLE: Record<string, string> = {
  programada: "Programado",
  ingresada: "Ingresó",
  finalizada: "Finalizado",
  cancelada: "Cancelado",
};

const TIPO_VISIBLE: Record<string, string> = {
  amigos: "Visitante",
  temporal: "Profesional",
  permanente: "Proveedor",
  huesped_temporal: "Huésped temporal",
};

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

const hora = (valor: string | null, respaldo?: string | null) => {
  if (valor) return formatTime(new Date(valor));
  return respaldo ? respaldo.slice(0, 5) : "";
};

/**
 * Ingresos y salidas de un día. `dia` es la fecha en formato `yyyy-MM-dd`;
 * la pantalla pide ayer, hoy y mañana.
 */
export async function obtenerIngresosSalidas(
  dia: string,
): Promise<IngresoSalida[]> {
  const { data, error } = await supabase
    .from("visita")
    .select(
      `id, tipo, estado, hora_estimada_llegada, hora_estimada_salida,
       unidad:unidad_id ( codigo ),
       invitados:invitado ( id, nombre, ingreso_en, salida_en )`,
    )
    .eq("fecha_desde", dia)
    .is("deleted_at", null);

  if (error) throw error;

  // Una fila por invitado: la tabla de portería lista personas, no visitas.
  return (data ?? []).flatMap((v) =>
    (v.invitados ?? []).map((i) => ({
      id: idNumerico(i.id),
      nombre: i.nombre,
      tipo: TIPO_VISIBLE[v.tipo] ?? v.tipo,
      depto: v.unidad?.codigo ?? "—",
      horaIngreso: hora(i.ingreso_en, v.hora_estimada_llegada),
      horaSalida: hora(i.salida_en, v.hora_estimada_salida),
      estado: ESTADO_VISIBLE[v.estado] ?? v.estado,
    })),
  ) as IngresoSalida[];
}

/**
 * Insignias acumuladas de una persona.
 *
 * Decisión del 21/07/2026: solo acumulación, sin niveles ni progresión. El
 * modelo no contempla niveles, así que el "Nivel Plata" que muestra la pantalla
 * no tiene de dónde salir — se elimina con esta migración.
 */
export async function obtenerReputacion(
  usuarioId: string,
  condominioId: string,
): Promise<ReputacionInsignia[]> {
  const { data, error } = await supabase
    .from("reconocimiento")
    .select("insignia:insignia_id ( clave, etiqueta, icono )")
    .eq("usuario_id", usuarioId)
    .eq("condominio_id", condominioId);

  if (error) throw error;

  const conteo = new Map<string, ReputacionInsignia>();
  for (const fila of data ?? []) {
    const insignia = Array.isArray(fila.insignia) ? fila.insignia[0] : fila.insignia;
    if (!insignia) continue;
    const actual = conteo.get(insignia.clave);
    if (actual) {
      actual.cantidad += 1;
    } else {
      conteo.set(insignia.clave, {
        key: insignia.clave,
        // Las pantallas heredaron dos nombres para el mismo dato: `emoji` en
        // el Home y `icono` en Reputacion. Se devuelven ambos hasta unificar.
        emoji: insignia.icono ?? "⭐",
        icono: insignia.icono ?? "⭐",
        label: insignia.etiqueta,
        cantidad: 1,
      } as ReputacionInsignia);
    }
  }
  return [...conteo.values()];
}

/*
  Aqui vivia `obtenerEstacionamientosVisita`, escrita y nunca llamada por
  nadie. La ocupacion de los cupos de visita ya sale de `obtenerArquitectura`,
  que es de donde la lee el store que pinta el contador. Dos caminos para el
  mismo numero, uno de ellos muerto: se queda el que se usa.
*/

/**
 * Lo que la persona tiene agendado hoy: sus visitas programadas.
 *
 * La lista era fija ("Niñera 14:30hs", "Parquero 15:30hs", "Consulta Médica
 * 18:30hs") y no salía de ningún lado. Son visitas: ya están en `visita`, con
 * su hora estimada de llegada.
 */
export async function obtenerAgendaHoy(
  unidadIds: string[],
): Promise<AgendaItem[]> {
  if (unidadIds.length === 0) return [];

  const hoy = new Date();
  const dia = formatDateInput(hoy);

  const { data, error } = await supabase
    .from("visita")
    .select(
      `id, tipo, profesion, nombre_evento, hora_estimada_llegada,
       invitados:invitado ( nombre, orden )`,
    )
    .in("unidad_id", unidadIds)
    .eq("fecha_desde", dia)
    .eq("estado", "programada")
    .is("deleted_at", null)
    .order("hora_estimada_llegada");

  if (error) throw error;

  return (data ?? []).map((v) => ({
    id: v.id,
    // El evento tiene nombre propio; un profesional se reconoce por su oficio;
    // el resto, por quien llega.
    titulo:
      v.nombre_evento ??
      v.profesion ??
      [...(v.invitados ?? [])].sort((a, b) => a.orden - b.orden)[0]?.nombre ??
      TIPO_VISIBLE[v.tipo] ??
      v.tipo,
    hora: v.hora_estimada_llegada
      ? `${v.hora_estimada_llegada.slice(0, 5)}hs`
      : "",
  }));
}

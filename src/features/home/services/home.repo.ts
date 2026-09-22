import { supabase } from "@/shared/services/supabase";
import { formatTime } from "@/shared/utils";
import type { IngresoSalida, ReputacionInsignia } from "../types/home";

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
  return (data ?? []).flatMap((v: any) =>
    (v.invitados ?? []).map((i: any) => ({
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
  for (const fila of (data ?? []) as any[]) {
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

/** Ocupación de los estacionamientos de visita del condominio. */
export async function obtenerEstacionamientosVisita(condominioId: string) {
  const { data, error } = await supabase
    .from("estacionamiento")
    .select("id, asignaciones:asignacion_estacionamiento ( liberado_en )")
    .eq("condominio_id", condominioId)
    .eq("tipo", "visitante");

  if (error) throw error;

  const total = (data ?? []).length;
  const ocupados = (data ?? []).filter((e: any) =>
    (e.asignaciones ?? []).some((a: any) => a.liberado_en === null),
  ).length;

  return { total, ocupados, disponibles: total - ocupados };
}

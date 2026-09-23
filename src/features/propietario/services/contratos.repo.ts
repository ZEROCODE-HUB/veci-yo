import { supabase } from "@/shared/services/supabase";
import { formatDate, formatMoney } from "@/shared/utils";

/**
 * Los contratos de arrendamiento de una vivienda.
 *
 * La pantalla de historial mostraba **dos contratos inventados** escritos a
 * mano en el propio archivo —"Contrato N° 16548", uno "Activa" y otro
 * "Finalizado", con fechas de 2024 y 2025— iguales para cualquier vivienda de
 * cualquier condominio. Y el formulario que los crea escribía en un store de
 * Zustand que se perdía al recargar.
 *
 * Los ve quien alquila y quien tiene alquilado, y nadie más: lo que un vecino
 * le cobra a otro no es asunto del edificio.
 */

export interface Contrato {
  id: string;
  numero: string;
  /** Etiqueta de la interfaz: "Activa", "Finalizado", "Cancelado". */
  estado: string;
  /** `dd/MM/yyyy a dd/MM/yyyy`, o "Sin fecha de fin" si es indefinido. */
  rango: string;
  fechaInicio: string;
  fechaFin: string;
  /** Con su moneda; vacío si el contrato no registra importe. */
  monto: string;
  monitoreaPago: boolean;
  /** Cláusulas particulares; vacío si el contrato no tiene ninguna. */
  texto: string;
  archivoPath: string;
}

const HACIA_ETIQUETA: Record<string, string> = {
  vigente: "Activa",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const aFecha = (iso: string | null) =>
  iso ? formatDate(new Date(`${iso}T00:00:00`)) : "";

export async function obtenerContratos(unidadId: string): Promise<Contrato[]> {
  if (!unidadId) return [];

  const { data, error } = await supabase
    .from("contrato_arrendamiento")
    .select(
      "id, numero, estado, fecha_inicio, fecha_fin, monto, moneda, monitorea_pago, texto, archivo_path",
    )
    .eq("unidad_id", unidadId)
    .is("deleted_at", null)
    .order("fecha_inicio", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((fila) => {
    const inicio = aFecha(fila.fecha_inicio);
    const fin = aFecha(fila.fecha_fin);

    return {
      id: fila.id,
      numero: fila.numero ?? "",
      estado: HACIA_ETIQUETA[fila.estado] ?? fila.estado,
      rango: fin ? `${inicio} a ${fin}` : `${inicio} · sin fecha de fin`,
      fechaInicio: inicio,
      fechaFin: fin || "Indefinido",
      monto:
        fila.monto !== null && fila.moneda
          ? formatMoney(Number(fila.monto), String(fila.moneda).trim())
          : "",
      monitoreaPago: Boolean(fila.monitorea_pago),
      texto: fila.texto ?? "",
      archivoPath: fila.archivo_path ?? "",
    };
  });
}

export interface NuevoContrato {
  unidadId: string;
  /** La membresía del inquilino en esa vivienda. */
  membresiaId?: string | null;
  /** `dd/MM/yyyy`, como toda la app. */
  fechaInicio: string;
  duracionMeses?: number | null;
  monto?: number | null;
  moneda?: string | null;
  monitoreaPago?: boolean;
  servicios?: Record<string, boolean>;
  texto?: string;
}

/** `dd/MM/yyyy` -> `yyyy-MM-dd`, que es lo que la base espera. */
function aISO(fecha: string): string {
  const [dia, mes, anio] = fecha.split("/");
  return `${anio}-${mes}-${dia}`;
}

export async function crearContrato(
  datos: NuevoContrato,
  usuarioId: string,
): Promise<Contrato | null> {
  const inicio = aISO(datos.fechaInicio);

  // La fecha de fin sale de la duración, que es lo que el formulario pide: no
  // se piden las dos para que no puedan contradecirse.
  let fin: string | null = null;
  if (datos.duracionMeses && datos.duracionMeses > 0) {
    const fecha = new Date(`${inicio}T00:00:00`);
    fecha.setMonth(fecha.getMonth() + datos.duracionMeses);
    fin = fecha.toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from("contrato_arrendamiento")
    .insert({
      unidad_id: datos.unidadId,
      membresia_id: datos.membresiaId ?? null,
      fecha_inicio: inicio,
      fecha_fin: fin,
      duracion_meses: datos.duracionMeses ?? null,
      monto: datos.monto ?? null,
      moneda: datos.monto != null ? (datos.moneda ?? null) : null,
      monitorea_pago: datos.monitoreaPago ?? false,
      servicios: datos.servicios ?? {},
      texto: datos.texto || null,
      registrado_por: usuarioId,
    })
    .select("id, numero")
    .single();

  if (error) throw error;

  const todos = await obtenerContratos(datos.unidadId);
  return todos.find((c) => c.id === data.id) ?? null;
}

/** Finaliza o cancela un contrato. No se borra: es un historial. */
export async function cerrarContrato(
  contratoId: string,
  estado: "finalizado" | "cancelado",
): Promise<void> {
  const { error } = await supabase
    .from("contrato_arrendamiento")
    .update({ estado })
    .eq("id", contratoId);
  if (error) throw error;
}

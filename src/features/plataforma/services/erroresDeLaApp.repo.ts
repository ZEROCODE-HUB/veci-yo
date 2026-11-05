import { supabase } from "@/shared/services/supabase";
import { formatDateTime } from "@/shared/utils/date.util";
import { desdeLaBase } from "@/shared/utils/reloj.util";

/**
 * Los errores de la app, para el panel del administrador de la app
 * (05/11/2026).
 *
 * La base los devuelve agrupados por dónde pasaron y **sin decir de quién**:
 * el panel no ve nada de una persona concreta (alcance del rol de plataforma,
 * 02/10/2026). Solo cuántas cuentas, no cuáles.
 */
export type TipoDeAnotacion = "error" | "rastro";

export interface GrupoDeErrores {
  donde: string;
  veces: number;
  cuentas: number;
  /** `dd/MM/yyyy HH:mm`, a la hora del edificio de referencia. */
  ultimaVez: string;
  ultimoMensaje: string;
  versiones: string[];
  plataformas: string[];
}

export interface VezDeUnError {
  creadoEn: string;
  mensaje: string;
  detalle: string;
  version: string;
  plataforma: string;
}

export async function obtenerErroresDeLaApp(
  dias: number,
  tipo: TipoDeAnotacion,
): Promise<GrupoDeErrores[]> {
  const { data, error } = await supabase.rpc("panel_errores_de_la_app", {
    p_dias: dias,
    p_tipo: tipo,
  });
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    donde: fila.donde ?? "(sin sitio)",
    veces: fila.veces,
    cuentas: fila.cuentas,
    ultimaVez: formatDateTime(desdeLaBase(fila.ultima_vez)),
    ultimoMensaje: fila.ultimo_mensaje ?? "",
    versiones: fila.versiones ?? [],
    plataformas: fila.plataformas ?? [],
  }));
}

export async function obtenerVecesDeUnError(
  donde: string,
  dias: number,
  tipo: TipoDeAnotacion,
): Promise<VezDeUnError[]> {
  const { data, error } = await supabase.rpc("panel_errores_de_un_sitio", {
    p_donde: donde,
    p_dias: dias,
    p_tipo: tipo,
  });
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    creadoEn: formatDateTime(desdeLaBase(fila.creado_en)),
    mensaje: fila.mensaje ?? "",
    detalle: fila.detalle ?? "",
    version: fila.version ?? "",
    plataforma: fila.plataforma ?? "",
  }));
}

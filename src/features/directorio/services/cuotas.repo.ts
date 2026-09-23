import { supabase } from "@/shared/services/supabase";

/**
 * El pago de la cuota de administración.
 *
 * El KT (flujo 4.6) pide dos vías: una casilla por vivienda y mes, y una carga
 * masiva desde un archivo. Ninguna de las dos escribía en la base: la casilla
 * guardaba en un store de Zustand y se perdía al recargar, y la carga masiva
 * llamaba a `marcarPagosRequest`, que era `await delay(200); return unidadIds;`
 * y a continuación anunciaba "N departamentos marcados como pagados".
 *
 * El Cuadro de Honor sí lee `pago_cuota` para decir quién está al día. O sea
 * que mostraba un estado que ninguna pantalla podía cambiar.
 */

export interface Periodo {
  id: string;
  /** Primer día del mes, `yyyy-MM-dd`. */
  periodo: string;
  monto: number;
  moneda: string;
}

export interface PagoDeUnidad {
  unidadId: string;
  pagado: boolean;
  pagadoEn: string | null;
}

/** Los periodos del condominio, del más reciente al más antiguo. */
export async function obtenerPeriodos(condominioId: string): Promise<Periodo[]> {
  if (!condominioId) return [];

  const { data, error } = await supabase
    .from("cuota_administracion")
    .select("id, periodo, monto, moneda")
    .eq("condominio_id", condominioId)
    .order("periodo", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    periodo: fila.periodo,
    monto: Number(fila.monto),
    moneda: fila.moneda,
  }));
}

export async function obtenerPagos(cuotaId: string): Promise<PagoDeUnidad[]> {
  if (!cuotaId) return [];

  const { data, error } = await supabase
    .from("pago_cuota")
    .select("unidad_id, pagado, pagado_en")
    .eq("cuota_id", cuotaId);

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    unidadId: fila.unidad_id,
    pagado: fila.pagado,
    pagadoEn: fila.pagado_en,
  }));
}

/** La casilla del KT: una vivienda, un periodo. */
export async function marcarPago(params: {
  cuotaId: string;
  unidadId: string;
  pagado: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc("marcar_pago_cuota", {
    p_cuota_id: params.cuotaId,
    p_unidad_id: params.unidadId,
    p_pagado: params.pagado,
  });
  if (error) throw error;
}

export interface ResultadoCargaMasiva {
  marcadas: number;
  noEncontradas: string[];
}

/**
 * La carga masiva, por código de vivienda.
 *
 * Devuelve cuántas marcó y cuáles no encontró. La pantalla anunciaba el
 * tamaño de la lista de entrada, no lo que se había registrado: un archivo con
 * diez códigos de los que solo existen tres decía "10 departamentos marcados".
 */
export async function marcarPagosMasivo(params: {
  cuotaId: string;
  codigos: string[];
}): Promise<ResultadoCargaMasiva> {
  const { data, error } = await supabase.rpc("marcar_pagos_cuota", {
    p_cuota_id: params.cuotaId,
    p_codigos: params.codigos,
  });
  if (error) throw error;

  const fila = Array.isArray(data) ? data[0] : data;
  return {
    marcadas: fila?.marcadas ?? 0,
    noEncontradas: fila?.no_encontradas ?? [],
  };
}

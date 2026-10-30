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
 *
 * Desde el 13/10/2026 la cuota **se configura**: el edificio dice cuánto cobra
 * al mes, en qué moneda y qué día vence, una vivienda puede tener su importe,
 * y el mes se crea solo o a mano. Antes el mes solo existía si alguien lo
 * escribía en la base.
 */

export interface Periodo {
  id: string;
  /** Primer día del mes, `yyyy-MM-dd`. */
  periodo: string;
  monto: number;
  moneda: string;
  venceEn: string | null;
}

export interface PagoDeUnidad {
  unidadId: string;
  pagado: boolean;
  pagadoEn: string | null;
}

export interface ConfiguracionCuotas {
  /** Lo que paga una vivienda sin importe propio. `null`: sin decidir. */
  monto: number | null;
  moneda: string;
  /** Día del mes, del 1 al 28. `null`: la cuota no tiene vencimiento. */
  diaVencimiento: number | null;
  /** Si el mes se crea solo al empezar. */
  automatica: boolean;
}

/** Los periodos del condominio, del más reciente al más antiguo. */
export async function obtenerPeriodos(condominioId: string): Promise<Periodo[]> {
  if (!condominioId) return [];

  const { data, error } = await supabase
    .from("cuota_administracion")
    .select("id, periodo, monto, moneda, vence_en")
    .eq("condominio_id", condominioId)
    .order("periodo", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    periodo: fila.periodo,
    monto: Number(fila.monto),
    moneda: fila.moneda,
    venceEn: fila.vence_en,
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

/** Lo que el edificio cobra. Lo lee cualquier miembro; lo cambia la administración. */
export async function obtenerConfiguracionCuotas(
  condominioId: string,
): Promise<ConfiguracionCuotas | null> {
  if (!condominioId) return null;

  const { data, error } = await supabase
    .from("condominio")
    .select(
      "moneda, cuota_monto, cuota_moneda, cuota_dia_vencimiento, cuota_automatica",
    )
    .eq("id", condominioId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    monto: data.cuota_monto === null ? null : Number(data.cuota_monto),
    // Sin moneda propia, la cuota va en la del edificio.
    moneda: data.cuota_moneda ?? data.moneda,
    diaVencimiento: data.cuota_dia_vencimiento,
    automatica: data.cuota_automatica,
  };
}

export async function guardarConfiguracionCuotas(
  condominioId: string,
  configuracion: ConfiguracionCuotas,
): Promise<void> {
  const { error } = await supabase.rpc("guardar_configuracion_cuotas", {
    p_condominio_id: condominioId,
    // `undefined` no viaja: la base lo lee como «sin decidir», igual que null.
    p_monto: configuracion.monto ?? undefined,
    p_moneda: configuracion.moneda,
    p_dia_vencimiento: configuracion.diaVencimiento ?? undefined,
    p_automatica: configuracion.automatica,
  });
  if (error) throw error;
}

/**
 * Crea el mes de cuota a mano. Sin fecha, el que corre en el edificio.
 *
 * Si ya existía devuelve el mismo: pulsar dos veces no crea dos meses.
 */
export async function crearCuotaDelMes(
  condominioId: string,
  periodo?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("crear_cuota_del_mes", {
    p_condominio_id: condominioId,
    p_periodo: periodo,
  });
  if (error) throw error;
  return data;
}

/** El importe propio de cada vivienda que lo tiene. Las demás pagan el general. */
export async function obtenerCuotasPorUnidad(
  condominioId: string,
): Promise<Record<string, number>> {
  if (!condominioId) return {};

  const { data, error } = await supabase
    .from("unidad")
    .select("id, cuota_monto")
    .eq("condominio_id", condominioId)
    .not("cuota_monto", "is", null);

  if (error) throw error;

  const porUnidad: Record<string, number> = {};
  for (const fila of data ?? []) {
    porUnidad[fila.id] = Number(fila.cuota_monto);
  }
  return porUnidad;
}

/** `null` devuelve la vivienda al importe general. */
export async function guardarCuotaDeUnidad(
  unidadId: string,
  monto: number | null,
): Promise<void> {
  const { error } = await supabase.rpc("guardar_cuota_de_unidad", {
    p_unidad_id: unidadId,
    p_monto: monto ?? undefined,
  });
  if (error) throw error;
}

export interface ComiteDeUnidad {
  /** El propietario tiene cuenta: sin cuenta no puede estar en el comité. */
  tieneCuenta: boolean;
  enComite: boolean;
}

/**
 * Quién está en el comité de propietarios, por vivienda.
 *
 * Se llevaba en la memoria del teléfono, con el **correo** del propietario de
 * clave, y se perdía al recargar. Ahora vive en `comite_propietarios`, con la
 * fecha desde la que cada uno está.
 */
export async function obtenerComite(
  condominioId: string,
): Promise<Record<string, ComiteDeUnidad>> {
  if (!condominioId) return {};

  const { data, error } = await supabase.rpc("comite_por_unidad", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;

  const porUnidad: Record<string, ComiteDeUnidad> = {};
  for (const fila of data ?? []) {
    porUnidad[fila.unidad_id] = {
      tieneCuenta: fila.tiene_cuenta,
      enComite: fila.en_comite,
    };
  }
  return porUnidad;
}

export async function ponerEnComite(
  unidadId: string,
  enComite: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("poner_en_comite", {
    p_unidad_id: unidadId,
    p_en_comite: enComite,
  });
  if (error) throw error;
}

export interface EstadoDeCuota {
  unidadId: string;
  codigo: string;
  responsable: string | null;
  mensual: number;
  variables: number[];
  total: number;
  abonado: number;
  saldo: number;
  estado: "Pagado" | "Pago parcial" | "No pagado";
}

/**
 * Cómo va cada vivienda en un mes: mensual, variables, total, lo pagado y lo
 * que falta (Para Claude 187 y 188, 30/10/2026). Solo la administración.
 */
export async function obtenerEstadoDeCuotas(cuotaId: string): Promise<EstadoDeCuota[]> {
  if (!cuotaId) return [];
  const { data, error } = await supabase.rpc("estado_de_cuotas", { p_cuota_id: cuotaId });
  if (error) throw error;
  return (data ?? []).map((fila) => {
    const total = Number(fila.total ?? 0);
    const abonado = Number(fila.abonado ?? 0);
    return {
      unidadId: fila.unidad_id,
      codigo: fila.codigo,
      responsable: fila.responsable,
      mensual: Number(fila.mensual ?? 0),
      variables: (fila.variables ?? []).map(Number),
      total,
      abonado,
      saldo: Number(fila.saldo ?? 0),
      estado: total > 0 && abonado >= total ? "Pagado" : abonado > 0 ? "Pago parcial" : "No pagado",
    };
  });
}

/** El mensual de la vivienda (null: el general) y los variables de este mes. */
export async function cambiarImporteDeCuota(params: {
  cuotaId: string;
  unidadId: string;
  mensual: number | null;
  variables: number[];
}) {
  const { error } = await supabase.rpc("cambiar_importe_de_cuota", {
    p_cuota_id: params.cuotaId,
    p_unidad_id: params.unidadId,
    // Null vuelve al general: la base lo acepta aunque el tipo generado pida un número.
    p_mensual: params.mensual as number,
    p_variables: params.variables,
  });
  if (error) throw error;
}

/** Un pago de la vivienda en el mes. La base no deja pasar de lo que falta. */
export async function registrarAbono(params: { cuotaId: string; unidadId: string; monto: number }) {
  const { error } = await supabase.rpc("registrar_abono_cuota", {
    p_cuota_id: params.cuotaId,
    p_unidad_id: params.unidadId,
    p_monto: params.monto,
  });
  if (error) throw error;
}

export interface ResultadoDeFila {
  codigo: string;
  registrado: boolean;
  mensaje: string | null;
}

/** Los pagos de la plantilla, fila a fila: cada una dice si entró y, si no, por qué. */
export async function registrarAbonosMasivos(
  cuotaId: string,
  filas: { codigo: string; monto: string }[],
): Promise<ResultadoDeFila[]> {
  const { data, error } = await supabase.rpc("registrar_abonos_masivos", {
    p_cuota_id: cuotaId,
    p_filas: filas,
  });
  if (error) throw error;
  return (data ?? []).map((f) => ({ codigo: f.codigo, registrado: f.registrado, mensaje: f.mensaje }));
}

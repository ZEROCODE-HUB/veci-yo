import { supabase } from "@/shared/services/supabase";
import { formatMonthYear } from "@/shared/utils";

/**
 * Cuadro de honor y reconocimientos.
 *
 * El listado no sale de `unidad` ni de `membresia_unidad`: un residente no
 * puede leer las membresías de otras unidades. Sale de la función
 * `cuadro_honor`, que devuelve solo a quienes están al día y sin exponer
 * montos ni morosidad (ver la migración 20260922080000).
 */

export interface InsigniaRecibida {
  clave: string;
  etiqueta: string;
  icono: string;
  cantidad: number;
}

export interface UnidadCuadroHonor {
  id: string;
  /** Etiqueta tal como la muestra la tarjeta: "Departamento 302 · Torre 2". */
  departamento: string;
  responsable: string;
  responsableUsuarioId: string | null;
  /** «4/6»: meses al día de los últimos. Null si el edificio no lo publica. */
  contador: string | null;
  /** El total. Sirve para ordenar y para contar; no para pintar. */
  insignias: number;
  /**
   * Una por una, que es como estaban en el diseño original.
   *
   * La tarjeta enseñaba «🏅 3», la suma, y eso no distingue a un buen vecino de
   * uno puntual. Las trae la propia función `cuadro_honor` --y no una consulta
   * por vivienda-- aunque `reconocimiento_lectura` dejaría leerlas igual.
   */
  insigniasDetalle: InsigniaRecibida[];
}

export interface InsigniaCatalogo {
  id: string;
  clave: string;
  etiqueta: string;
  icono: string;
}

/**
 * El `jsonb` que devuelve la función, convertido a algo que la pantalla pueda
 * pintar sin `any`.
 *
 * Los tipos generados dan `Json` para una columna `jsonb`, que es cualquier
 * cosa: hay que comprobar la forma aquí en vez de afirmarla con un `as`.
 */
function leerDetalle(valor: unknown): InsigniaRecibida[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((entrada) => {
    if (typeof entrada !== "object" || entrada === null) return [];
    const fila = entrada as Record<string, unknown>;
    if (typeof fila.clave !== "string") return [];
    return [
      {
        clave: fila.clave,
        etiqueta: typeof fila.etiqueta === "string" ? fila.etiqueta : fila.clave,
        icono: typeof fila.icono === "string" ? fila.icono : "⭐",
        cantidad: typeof fila.cantidad === "number" ? fila.cantidad : 0,
      },
    ];
  });
}

export async function obtenerCuadroHonor(
  condominioId: string,
): Promise<UnidadCuadroHonor[]> {
  const { data, error } = await supabase.rpc("cuadro_honor", {
    p_condominio_id: condominioId,
  });

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.unidad_id,
    departamento: `Departamento ${fila.codigo} · Torre ${fila.torre_numero}`,
    responsable: fila.responsable,
    responsableUsuarioId: fila.responsable_usuario_id,
    // Null si el edificio no publica las cuotas: entonces no se dice nada (hueco 13).
    contador:
      fila.periodos_al_dia == null || fila.periodos_totales == null
        ? null
        : `${fila.periodos_al_dia}/${fila.periodos_totales}`,
    insignias: fila.insignias,
    insigniasDetalle: leerDetalle(fila.insignias_detalle),
  }));
}

/** Catálogo de insignias que se pueden otorgar. */
export async function obtenerCatalogoInsignias(): Promise<InsigniaCatalogo[]> {
  const { data, error } = await supabase
    .from("insignia")
    .select("id, clave, etiqueta, icono")
    .order("etiqueta");

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    clave: fila.clave,
    etiqueta: fila.etiqueta,
    icono: fila.icono ?? "⭐",
  }));
}

/**
 * Otorga una insignia a otro residente.
 *
 * `otorgado_por` lo exige la política de la tabla: se firma con quien está en
 * sesión y la base rechaza tanto la firma ajena como el autootorgamiento.
 */
export async function otorgarReconocimiento(params: {
  insigniaId: string;
  destinatarioUsuarioId: string;
  condominioId: string;
  otorganteUsuarioId: string;
  motivo?: string;
}) {
  const { error } = await supabase.from("reconocimiento").insert({
    insignia_id: params.insigniaId,
    usuario_id: params.destinatarioUsuarioId,
    condominio_id: params.condominioId,
    otorgado_por: params.otorganteUsuarioId,
    motivo: params.motivo ?? null,
  });

  if (error) {
    /*
      La regla vive en la base y **ella explica por qué**: desde el 03/10/2026
      es uno al mes por persona, y además solo a vecinos --nada de huéspedes
      temporales--. Antes aquí se traducía el código `23505` a un texto fijo,
      que era correcto cuando la única regla era el índice único y hoy diría
      lo que no es.

      `P0001` es lo que lanza un `raise exception` de plpgsql, y su mensaje ya
      está escrito para que lo lea una persona. Tirarlo y poner otro es el
      defecto que costó el 409 del 02/10.
    */
    throw new Error(error.message || "No se pudo dar el reconocimiento.");
  }
}

export interface PeriodoCuota {
  mes: string;
  /** El periodo en ISO, para pedir su detalle. */
  periodo: string;
  moneda: string;
  esperado: number;
  recibido: number;
  alDia: number;
  atrasados: number;
  porcentaje: number;
  /**
   * Si ese mes tiene cuota definida.
   *
   * El mes en curso sale siempre desde el 03/10/2026 —antes el carrusel
   * saltaba de agosto a junio y nadie sabía si es que todos pagaron o que
   * nadie definió la cuota—. Sin esta bandera, un «0%» de un mes sin cuota se
   * lee como «no ha pagado nadie», que es una acusación falsa.
   */
  tieneCuota: boolean;
}

/**
 * Recaudación por periodo. Agregado: la función no devuelve qué unidad pagó.
 */
export async function obtenerResumenCuotas(
  condominioId: string,
): Promise<PeriodoCuota[]> {
  const { data, error } = await supabase.rpc("resumen_cuotas", {
    p_condominio_id: condominioId,
  });

  if (error) throw error;

  return (data ?? []).map((fila) => {
    const esperado = Number(fila.esperado);
    const recibido = Number(fila.recibido);
    return {
      mes: formatMonthYear(new Date(`${fila.periodo}T00:00:00`)),
      periodo: fila.periodo,
      moneda: fila.moneda,
      esperado,
      recibido,
      alDia: fila.al_dia,
      atrasados: fila.atrasados,
      porcentaje: esperado > 0 ? Math.round((recibido / esperado) * 100) : 0,
      tieneCuota: fila.tiene_cuota ?? true,
    };
  });
}

/**
 * Cuántos días le faltan para poder dar otro reconocimiento. 0 si ya puede.
 *
 * Hasta el 16/10/2026 era «uno al mes» de calendario, contado aquí con el
 * primer día del mes en UTC. La responsable de producto lo cambió a 30 días
 * desde el último, y la cuenta la hace la base (`dias_para_dar_reconocimiento`)
 * con su reloj: dos relojes que cuentan días acaban discrepando, y aquí ya
 * pasó.
 */
export async function diasParaDarReconocimiento(condominioId: string): Promise<number> {
  const { data, error } = await supabase.rpc("dias_para_dar_reconocimiento", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

/** Lo que se publica del estado de las cuotas a los vecinos. */
export type VisibilidadCuotas = "porcentaje" | "quien_pago" | "quien_debe";

export interface UnidadConCuota {
  unidad_id: string;
  codigo: string;
  torre: number;
  responsable: string | null;
  pagado: boolean;
}

/**
 * Quién pagó y quién no, hasta donde el edificio haya decidido publicar.
 *
 * Lo pidió el cliente el 02/10/2026: que sea parametrizable. Publicar quién
 * debe no es una opción técnica —en un edificio pequeño es señalar a un vecino
 * por su nombre— así que lo decide la administración, y ella lo ve entero
 * siempre: es quien cobra.
 *
 * Con la opción más cerrada esto devuelve una lista vacía, que es lo correcto:
 * la pantalla enseña el porcentaje y ya.
 */
export async function obtenerDetalleCuotas(
  condominioId: string,
  periodo?: string,
): Promise<UnidadConCuota[]> {
  const { data, error } = await supabase.rpc("detalle_cuotas", {
    p_condominio_id: condominioId,
    p_periodo: periodo,
  });
  if (error) throw error;
  return (data ?? []) as UnidadConCuota[];
}

/** Lo que el edificio publica hoy. */
export async function obtenerVisibilidadCuotas(
  condominioId: string,
): Promise<VisibilidadCuotas> {
  const { data, error } = await supabase
    .from("condominio")
    .select("cuotas_visibilidad")
    .eq("id", condominioId)
    .maybeSingle();
  if (error) throw error;
  return (data?.cuotas_visibilidad ?? "porcentaje") as VisibilidadCuotas;
}

/** Y lo cambia la administración. */
export async function guardarVisibilidadCuotas(
  condominioId: string,
  visibilidad: VisibilidadCuotas,
): Promise<void> {
  const { error } = await supabase.rpc("guardar_visibilidad_cuotas", {
    p_condominio_id: condominioId,
    p_visibilidad: visibilidad,
  });
  if (error) throw error;
}

/** Si el Cuadro de Honor cuenta el mes en curso (hueco 53): lo elegido o el de la plataforma. */
export async function cuadroHonorCuentaMesEnCurso(condominioId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("cuadro_honor_cuenta_mes_en_curso", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Y lo elige la administración. */
export async function guardarCuadroHonorMesEnCurso(
  condominioId: string,
  cuenta: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("guardar_cuadro_honor_mes_en_curso", {
    p_condominio_id: condominioId,
    p_cuenta: cuenta,
  });
  if (error) throw error;
}

/** La cuota de mi vivienda en el último mes que tenga cuota (15/10/2026). */
export interface MiCuota {
  mes: string;
  monto: number;
  moneda: string;
  venceEn: string | null;
  pagado: boolean;
}

/**
 * El estado de la cuota de **mi** vivienda (hueco 13): nadie podía verlo. El
 * carrusel da el porcentaje del edificio, y la lista, si se publica, la decide
 * la administración; lo propio es otra cosa y siempre se ve. Lo sujeta RLS:
 * `pago_cuota` solo deja leer las de las viviendas de quien pregunta.
 *
 * El mes es el último con cuota, igual que `detalle_cuotas`: el mes en curso
 * casi nunca la tiene todavía.
 */
export async function obtenerMiCuota(
  condominioId: string,
  unidadId: string,
): Promise<MiCuota | null> {
  const { data: cuota, error } = await supabase
    .from("cuota_administracion")
    .select("id, periodo, monto, moneda, vence_en")
    .eq("condominio_id", condominioId)
    .order("periodo", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!cuota) return null;

  const { data: pago, error: alLeerPago } = await supabase
    .from("pago_cuota")
    .select("pagado")
    .eq("cuota_id", cuota.id)
    .eq("unidad_id", unidadId)
    .maybeSingle();
  if (alLeerPago) throw alLeerPago;

  return {
    mes: formatMonthYear(new Date(`${cuota.periodo}T00:00:00`)),
    monto: Number(cuota.monto),
    moneda: cuota.moneda,
    venceEn: cuota.vence_en,
    pagado: pago?.pagado ?? false,
  };
}

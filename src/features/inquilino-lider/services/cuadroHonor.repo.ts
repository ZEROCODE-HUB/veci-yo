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
  /** "12/12" de periodos al día. */
  contador: string;
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
    contador: `${fila.periodos_al_dia}/${fila.periodos_totales}`,
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
 * Si todavía le queda su reconocimiento de este mes.
 *
 * «Regalos por dar» era la constante `1`, sin ningún modelo de cupos detrás.
 * Después pasó a contar **los vecinos a los que todavía no había reconocido**,
 * que era correcto mientras la regla fuera «uno por persona y mes».
 *
 * Desde el 03/10/2026 la regla es otra, pedida por el cliente: **uno al mes, y
 * ya**. Así que la respuesta solo puede ser 1 o 0, y contar vecinos sería
 * prometer ocho regalos que la base va a rechazar —exactamente el defecto que
 * más veces ha aparecido aquí: la pantalla ofreciendo lo que el dato no
 * permite—.
 */
export async function contarRegalosPorDar(params: {
  condominioId: string;
  usuarioId: string;
}): Promise<number> {
  /*
    El primer día del mes **en UTC**, porque es el huso con el que cuenta la
    base: el disparador hace `date_trunc('month', otorgado_en at time zone
    'UTC')`. Con medianoche local, en Colombia (UTC-5) esta cuenta empieza a
    las 05:00 del día 1 y no ve lo que se otorgó esa madrugada: la pantalla
    diría «te queda tu reconocimiento» y la base lo rechazaría.

    Salió al arreglar una prueba que fallaba por exactamente lo mismo.
  */
  const ahora = new Date();
  const inicioDeMes = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  const { count, error } = await supabase
    .from("reconocimiento")
    .select("id", { count: "exact", head: true })
    .eq("otorgado_por", params.usuarioId)
    .eq("condominio_id", params.condominioId)
    .gte("otorgado_en", inicioDeMes.toISOString());

  if (error) throw error;

  return (count ?? 0) > 0 ? 0 : 1;
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

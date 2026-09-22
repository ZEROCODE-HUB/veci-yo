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

export interface UnidadCuadroHonor {
  id: string;
  /** Etiqueta tal como la muestra la tarjeta: "Departamento 302 · Torre 2". */
  departamento: string;
  responsable: string;
  responsableUsuarioId: string | null;
  /** "12/12" de periodos al día. */
  contador: string;
  insignias: number;
}

export interface InsigniaCatalogo {
  id: string;
  clave: string;
  etiqueta: string;
  icono: string;
}

export async function obtenerCuadroHonor(
  condominioId: string,
): Promise<UnidadCuadroHonor[]> {
  const { data, error } = await supabase.rpc("cuadro_honor", {
    p_condominio_id: condominioId,
  });

  if (error) throw error;

  return (data ?? []).map((fila: any) => ({
    id: fila.unidad_id,
    departamento: `Departamento ${fila.codigo} · Torre ${fila.torre_numero}`,
    responsable: fila.responsable,
    responsableUsuarioId: fila.responsable_usuario_id,
    contador: `${fila.periodos_al_dia}/${fila.periodos_totales}`,
    insignias: fila.insignias,
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
    // El índice `reconocimiento_unico_por_mes` es la regla de negocio: una
    // misma insignia a la misma persona, una vez al mes.
    if (error.code === "23505") {
      throw new Error("Ya le diste ese reconocimiento este mes.");
    }
    throw error;
  }
}

export interface PeriodoCuota {
  mes: string;
  moneda: string;
  esperado: number;
  recibido: number;
  alDia: number;
  atrasados: number;
  porcentaje: number;
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

  return (data ?? []).map((fila: any) => {
    const esperado = Number(fila.esperado);
    const recibido = Number(fila.recibido);
    return {
      mes: formatMonthYear(new Date(`${fila.periodo}T00:00:00`)),
      moneda: fila.moneda,
      esperado,
      recibido,
      alDia: fila.al_dia,
      atrasados: fila.atrasados,
      porcentaje: esperado > 0 ? Math.round((recibido / esperado) * 100) : 0,
    };
  });
}

/**
 * Cuántos vecinos quedan por reconocer este mes.
 *
 * "Regalos por dar" era la constante `1`. No había ningún modelo de cupos
 * detrás, así que el número no significaba nada. Con la regla de la base —una
 * insignia por persona y mes— sí hay algo que contar: los vecinos del cuadro
 * de honor a los que esta persona todavía no le dio ningún reconocimiento
 * este mes.
 */
export async function contarRegalosPorDar(params: {
  condominioId: string;
  usuarioId: string;
}): Promise<number> {
  const candidatos = await obtenerCuadroHonor(params.condominioId);
  const vecinos = new Set(
    candidatos
      .map((c) => c.responsableUsuarioId)
      .filter((id): id is string => !!id && id !== params.usuarioId),
  );
  if (vecinos.size === 0) return 0;

  const inicioDeMes = new Date();
  inicioDeMes.setDate(1);
  inicioDeMes.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("reconocimiento")
    .select("usuario_id")
    .eq("otorgado_por", params.usuarioId)
    .eq("condominio_id", params.condominioId)
    .gte("otorgado_en", inicioDeMes.toISOString());

  if (error) throw error;

  for (const fila of data ?? []) vecinos.delete(fila.usuario_id);
  return vecinos.size;
}

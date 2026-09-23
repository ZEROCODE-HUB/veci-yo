import { supabase } from "@/shared/services/supabase";

/**
 * La suscripción de renta corta de una vivienda.
 *
 * Vivía entera en memoria: un `Record<number, {activa}>` de Zustand que se
 * ponía a true con un `setTimeout` de milisegundo y medio y se perdía al
 * recargar. La tabla `suscripcion_renta_corta` existía desde el principio y
 * nadie la consultaba, así que la puerta de entrada de todo el módulo de renta
 * corta —incluido el historial de visitas, que también la miraba— dependía de
 * una bandera que no sobrevivía a cerrar la app.
 *
 * El cobro sigue sin pasarela: eso no se finge aquí ni se anuncia.
 */

export interface Suscripcion {
  id: string;
  estado: "activa" | "vencida" | "cancelada";
  iniciadaEn: string;
  verificacionesBase: number;
}

/**
 * Lo que el edificio impone y lo que solo advierte.
 *
 * `permiteRentaCorta` es la autorización y **bloquea**: sin ella la base
 * rechaza el alta. Los dos números son advertencia, por decisión del KT
 * (flujo 4.1 paso 5); ya se implementaron una vez como bloqueo y hubo que
 * deshacerlo.
 */
export interface LimitesDelCondominio {
  permiteRentaCorta: boolean;
  estanciaMinimaNoches: number | null;
  capacidadMaxima: number | null;
}

export async function obtenerSuscripcion(
  unidadId: string,
): Promise<Suscripcion | null> {
  const { data, error } = await supabase
    .from("suscripcion_renta_corta")
    .select("id, estado, iniciada_en, verificaciones_base")
    .eq("unidad_id", unidadId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    estado: data.estado,
    iniciadaEn: data.iniciada_en,
    verificacionesBase: data.verificaciones_base,
  };
}

export async function obtenerLimites(
  unidadId: string,
): Promise<LimitesDelCondominio | null> {
  const { data, error } = await supabase.rpc("limites_del_condominio", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) return null;

  return {
    permiteRentaCorta: fila.permite_renta_corta ?? true,
    estanciaMinimaNoches: fila.estancia_minima_noches ?? null,
    capacidadMaxima: fila.capacidad_maxima ?? null,
  };
}

/**
 * Activa la suscripción. Si la vivienda ya tuvo una y se canceló, se reactiva
 * la misma fila: la unicidad por unidad es una restricción de la tabla.
 */
export async function activarSuscripcion(unidadId: string): Promise<void> {
  const existente = await obtenerSuscripcion(unidadId);

  if (existente) {
    const { error } = await supabase
      .from("suscripcion_renta_corta")
      .update({ estado: "activa", cancelada_en: null })
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("suscripcion_renta_corta")
    .insert({ unidad_id: unidadId, estado: "activa" });
  if (error) throw error;
}

export async function cancelarSuscripcion(unidadId: string): Promise<void> {
  const { error } = await supabase
    .from("suscripcion_renta_corta")
    .update({ estado: "cancelada", cancelada_en: new Date().toISOString().slice(0, 10) })
    .eq("unidad_id", unidadId);
  if (error) throw error;
}

/**
 * Las advertencias que la pantalla tiene que mostrar para lo que el propietario
 * está configurando. Devuelve frases, no banderas: es lo que se pinta.
 */
export function advertencias(
  limites: LimitesDelCondominio | null,
  configurado: { estanciaMinima: number; capacidad: number },
): string[] {
  if (!limites) return [];
  const avisos: string[] = [];

  if (
    limites.estanciaMinimaNoches !== null &&
    configurado.estanciaMinima < limites.estanciaMinimaNoches
  ) {
    avisos.push(
      `El edificio pide un mínimo de ${limites.estanciaMinimaNoches} ${
        limites.estanciaMinimaNoches === 1 ? "noche" : "noches"
      } y estás configurando ${configurado.estanciaMinima}.`,
    );
  }

  if (
    limites.capacidadMaxima !== null &&
    configurado.capacidad > limites.capacidadMaxima
  ) {
    avisos.push(
      `El aforo máximo del edificio es de ${limites.capacidadMaxima} personas y estás configurando ${configurado.capacidad}.`,
    );
  }

  return avisos;
}

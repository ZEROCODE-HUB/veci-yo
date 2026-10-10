import { supabase } from "@/shared/services/supabase";

/**
 * Recuerda qué vivienda eligió la persona, para abrirle esa la próxima vez.
 *
 * La elección vivía solo en memoria: se perdía al recargar. La base la guarda
 * sobre la membresía **propia** —no recibe de quién, solo de quien llama— y
 * `sesion.ts` ordena las viviendas con ella al entrar.
 */
export async function elegirUnidadActiva(unidadId: string): Promise<void> {
  const { error } = await supabase.rpc("elegir_unidad_activa", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
}

/** Lo que pasa hoy en una de las viviendas de la persona. */
export interface ResumenDeVivienda {
  unidadId: string;
  visitasHoy: number;
  huespedesDentro: number;
  correspondenciaPendiente: number;
  estanciasProximas: number;
}

/**
 * El resumen de **mis** viviendas, para el inicio.
 *
 * El ámbito es `propias` y lo fija la base: aunque quien llama administre el
 * edificio, aquí solo salen las viviendas de las que es miembro (regla 8).
 */
export async function obtenerResumenDeMisViviendas(): Promise<ResumenDeVivienda[]> {
  const { data, error } = await supabase.rpc("resumen_de_mis_viviendas");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    unidadId: fila.unidad_id,
    visitasHoy: fila.visitas_hoy,
    huespedesDentro: fila.huespedes_dentro,
    correspondenciaPendiente: fila.correspondencia_pendiente,
    estanciasProximas: fila.estancias_proximas,
  }));
}

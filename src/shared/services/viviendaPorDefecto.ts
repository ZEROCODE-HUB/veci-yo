/**
 * En qué vivienda entra alguien que tiene más de una.
 *
 * Era «la primera», y la primera salía de una consulta **sin orden**: la que
 * Postgres devolviera antes. Así que quien vive en una vivienda y alquila
 * otra entraba a veces en la suya y a veces en la que alquila, y lo que
 * eligiera en el selector se olvidaba al cerrar la pestaña. El cliente lo vio
 * el 09/10/2026.
 *
 * El orden, de más a menos:
 *
 *   1. **la que eligió la última vez** —se recuerda en la base—;
 *   2. si nunca eligió, **la vivienda en la que reside**;
 *   3. y si tampoco, la que tiene desde hace más tiempo, que al menos es
 *      siempre la misma.
 *
 * Es puro y vive aparte de `sesion.ts` por lo de siempre: `sesion.ts` arrastra
 * el cliente de Supabase y una regla así no se podría probar sin montar la
 * aplicación.
 */
export interface ViviendaParaOrdenar {
  /** Cuándo la eligió como activa, o `null` si nunca. */
  elegidaEn: string | null;
  esResidente: boolean;
  /** Cuándo se dio de alta en ella. Es el desempate estable. */
  creadaEn: string;
}

export function ordenarPorPreferencia<T extends ViviendaParaOrdenar>(
  viviendas: T[],
): T[] {
  return viviendas.slice().sort((a, b) => {
    if (a.elegidaEn !== b.elegidaEn) {
      if (!a.elegidaEn) return 1;
      if (!b.elegidaEn) return -1;
      // Las fechas ISO se ordenan como texto. La más reciente, primero.
      return a.elegidaEn < b.elegidaEn ? 1 : -1;
    }
    if (a.esResidente !== b.esResidente) return a.esResidente ? -1 : 1;
    if (a.creadaEn !== b.creadaEn) return a.creadaEn < b.creadaEn ? -1 : 1;
    return 0;
  });
}

import type { OpcionDeLista } from "@/shared/hooks/useLista";

/**
 * El horario de entrada de una estancia: la base lo guarda en dos columnas
 * `time` y la pantalla lo ofrece con la lista `horarios_de_entrada`, cuyas
 * opciones llevan su `desde` y su `hasta` en `extra` («24 horas» es
 * 00:00–23:59).
 *
 * Hasta el 28/10/2026 la pantalla guardaba el **nombre** --«14:00 a 20:00»-- y
 * aquí se partía por « a » para sacar las dos horas. Con el nombre editable
 * por el administrador, renombrar una opción habría guardado basura en una
 * columna `time`. Ahora las horas salen del `extra` y el nombre solo se pinta.
 */

/** «14:00:00» → «14:00». La base devuelve las horas con segundos. */
export const horaCorta = (v?: string | null) => (v ? v.slice(0, 5) : "");

/** Las dos horas de una opción, o `null` si su `extra` no las trae bien. */
export function horasDeLaOpcion(
  opcion: OpcionDeLista | undefined,
): { desde: string; hasta: string } | null {
  const { desde, hasta } = opcion?.extra ?? {};
  const esHora = (v: unknown): v is string => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
  return esHora(desde) && esHora(hasta) ? { desde, hasta } : null;
}

/** La opción que corresponde a un horario guardado, si alguna coincide. */
export function opcionDelHorario(
  opciones: OpcionDeLista[],
  desde?: string | null,
  hasta?: string | null,
): OpcionDeLista | undefined {
  if (!desde || !hasta) return undefined;
  return opciones.find((o) => {
    const horas = horasDeLaOpcion(o);
    return horas?.desde === horaCorta(desde) && horas?.hasta === horaCorta(hasta);
  });
}

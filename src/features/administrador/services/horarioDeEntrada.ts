/**
 * El horario de entrada de una estancia: la pantalla lo ofrece como texto
 * («14:00 a 20:00», «24 horas») y la base lo guarda en dos columnas `time`.
 * Las dos direcciones viven juntas para que no se separen.
 */

const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : "");

export function rango(desde?: string | null, hasta?: string | null) {
  if (!desde || !hasta) return "";
  // La vuelta de `partirRango("24 horas")`. Sin esto, «24 horas» se guardaba
  // como 00:00–23:59, se leía como «00:00 a 23:59», que no es ninguna opción
  // del desplegable, y al reabrir salía vacío (17/10/2026).
  if (hhmm(desde) === "00:00" && hhmm(hasta) === "23:59") return "24 horas";
  return `${hhmm(desde)} a ${hhmm(hasta)}`;
}

export function partirRango(valor?: string) {
  if (!valor) return { desde: null, hasta: null };
  // "24 horas" no es un rango; se representa como el dia completo.
  if (/24\s*horas/i.test(valor)) return { desde: "00:00", hasta: "23:59" };
  const partes = valor.split(/\s+a\s+/).map((v) => v.trim());
  return { desde: partes[0] || null, hasta: partes[1] || null };
}

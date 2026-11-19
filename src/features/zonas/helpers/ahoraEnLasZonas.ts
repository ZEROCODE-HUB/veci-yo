/**
 * Las reservas que están en curso ahora mismo (18/11/2026, pedido del
 * cliente: «el guardia debe poder ver quién está ahora en las zonas
 * comunes»). Pura, para poder probarla sin montar la pantalla.
 */
export interface ReservaEnElDia {
  fechaIso?: string | null;
  /** «10:00 - 12:00». */
  horario?: string | null;
  estado?: string | null;
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function estaEnCurso(r: ReservaEnElDia, hoy: string, horaActual: string): boolean {
  if ((r.fechaIso ?? "") !== hoy) return false;
  if (r.estado === "Cancelado" || r.estado === "Rechazado" || r.estado === "Pendiente") return false;
  const [desde, hasta] = String(r.horario ?? "").split(/\s*-\s*/);
  if (!desde || !hasta) return false;
  const ahora = aMinutos(horaActual);
  return aMinutos(desde) <= ahora && ahora < aMinutos(hasta);
}

/** «12:00» + 30 → «12:30». Sin pasar de medianoche. */
export function horaMas(hhmm: string, minutos: number): string {
  const total = Math.min(aMinutos(hhmm) + minutos, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

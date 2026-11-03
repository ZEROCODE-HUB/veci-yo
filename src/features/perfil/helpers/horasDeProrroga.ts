/** Cuántas horas por delante se ofrecen al pedir una prórroga. */
const HORAS_POR_DELANTE = 8;
const PASO = 15;

/**
 * Las horas que se pueden pedir en una prórroga (Para Claude 213, 03/11/2026):
 * desde el siguiente cuarto de hora después de `ahora` (`HH:mm`, la hora del
 * edificio) y cada 15 minutos, unas horas por delante. Pasada la medianoche
 * sigue en 00:00: la base entiende que una hora que ya pasó hoy es la de
 * mañana. Sin hora, se usa la del teléfono.
 */
export function horasDesde(ahora: string | null, telefono: Date = new Date()): string[] {
  const [h, m] = ahora && /^\d{2}:\d{2}$/.test(ahora)
    ? ahora.split(":").map(Number)
    : [telefono.getHours(), telefono.getMinutes()];
  const primera = (Math.floor((h * 60 + m) / PASO) + 1) * PASO;
  const salida: string[] = [];
  for (let minuto = primera; minuto <= primera + HORAS_POR_DELANTE * 60 - PASO; minuto += PASO) {
    const delDia = minuto % (24 * 60);
    salida.push(
      `${String(Math.floor(delDia / 60)).padStart(2, "0")}:${String(delDia % 60).padStart(2, "0")}`,
    );
  }
  return salida;
}

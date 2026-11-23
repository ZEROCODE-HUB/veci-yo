/**
 * Un plazo en minutos, como se dice: «45 min», «2 h», «1 h 30 min»
 * (23/11/2026: el plazo del comprobante pasó de horas a horas y minutos).
 */
export function textoDelPlazo(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

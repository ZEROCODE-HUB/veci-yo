/**
 * El profesional permanente de la vivienda (17/11/2026). Desde el 18/11/2026
 * se registra en Visitas › Profesional permanente: aquí queda cómo se
 * presenta en la lista.
 */
/** Cómo se presenta en la lista: oficio y si tiene la app. */
export function detalleDelTrabajador(t: {
  oficio: string | null;
  conApp: boolean;
  tieneCuenta: boolean;
}): string {
  const app = !t.conApp
    ? "sin app"
    : t.tieneCuenta
      ? "con app"
      : "con app: falta que acepte la invitación";
  return `${t.oficio?.trim() || "Profesional permanente"} · ${app}`;
}

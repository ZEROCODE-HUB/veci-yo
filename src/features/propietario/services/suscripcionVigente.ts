import type { Suscripcion } from "./suscripcion.repo";

/**
 * Si la renta corta funciona hoy.
 *
 * No basta con `estado === "activa"`. Al darse de baja se **respeta el mes ya
 * pagado** --decisión del cliente del 29/09/2026-- así que la suscripción se
 * queda activa con una fecha de término, y deja de valer cuando esa fecha pasa.
 *
 * Vive en su propio archivo, separada del repositorio, por lo mismo que
 * `residentesActuales`: el repositorio importa el cliente de Supabase, que
 * arrastra React Native, y las pruebas unitarias corren en Node --«Flow is not
 * supported» al intentar leerlo--. Una regla que nadie puede probar sin montar
 * la aplicación es una regla que no se prueba.
 *
 * Las dos fechas son `yyyy-MM-dd` y se comparan como texto: construir un `Date`
 * con una fecha suelta la interpreta en UTC y al oeste de Greenwich cae en el
 * día anterior.
 */
export function suscripcionVigente(
  suscripcion: Pick<Suscripcion, "estado" | "canceladaEn"> | null,
  hoy: string = hoyEnIso(),
): boolean {
  if (!suscripcion || suscripcion.estado !== "activa") return false;
  if (!suscripcion.canceladaEn) return true;
  // El último día cuenta: quien pagó hasta el 30 lo tiene el 30.
  return suscripcion.canceladaEn >= hoy;
}

/** `yyyy-MM-dd` de hoy, que es como la base guarda estas fechas. */
export function hoyEnIso(momento: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${momento.getFullYear()}-${dos(momento.getMonth() + 1)}-${dos(
    momento.getDate(),
  )}`;
}

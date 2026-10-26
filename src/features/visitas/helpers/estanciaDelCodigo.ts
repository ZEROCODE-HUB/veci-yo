import type { EstanciaDelCodigo } from "../services/porteria.repo";

/** «2026-10-29» a «29/10/2026», sin pasar por el reloj del teléfono. */
function fecha(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/**
 * Qué decirle al guardia cuando el QR es de una estancia que todavía no puede
 * abrir, o que ya pasó (26/10/2026). Antes no se decía nada: la pantalla de
 * Visitas no la encontraba en su lista y se quedaba igual.
 *
 * `null` si se puede abrir.
 */
export function porQueNoSeAbre(e: EstanciaDelCodigo): string | null {
  if (e.laVe) return null;
  const donde = e.unidad ? `de la ${e.unidad}` : "de este edificio";
  const cuando =
    e.fechaDesde && e.fechaHasta && e.fechaHasta !== e.fechaDesde
      ? `del ${fecha(e.fechaDesde)} al ${fecha(e.fechaHasta)}`
      : e.fechaDesde
        ? `del ${fecha(e.fechaDesde)}`
        : "";
  if (e.estado === "cancelada") return `Esa reserva ${donde} está cancelada.`;
  if (e.estado === "finalizada") return `Esa reserva ${donde} ya terminó.`;
  return `Esa reserva es ${donde}${cuando ? `, ${cuando}` : ""}. La portería la ve desde el día antes de la llegada hasta la salida.`;
}

/** Si lo escrito parece un código de estancia y no un nombre o un depto. */
export function pareceCodigo(texto: string, largoMinimo: number): boolean {
  const limpio = texto.trim().replace(/^VECIYO:/i, "");
  return limpio.length >= largoMinimo && /^[A-F0-9]+$/i.test(limpio);
}

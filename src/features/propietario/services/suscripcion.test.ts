import { describe, expect, it } from "vitest";
import { suscripcionVigente } from "./suscripcionVigente";
import type { Suscripcion } from "./suscripcion.repo";

/**
 * Si la renta corta funciona hoy.
 *
 * Darse de baja **no corta el servicio en el momento**: se respeta el mes ya
 * pagado (decisión del cliente del 29/09/2026). Así que la suscripción se queda
 * en `activa` con una fecha de término, y lo que decide es esa fecha.
 *
 * Es una comparación de fechas, que es de las cosas que se equivocan sin hacer
 * ruido: un `>` en lugar de `>=` le quita a alguien el último día que pagó, y
 * eso no se nota mirando la pantalla.
 */
const suscripcion = (parcial: Partial<Suscripcion> = {}): Suscripcion => ({
  id: "s1",
  estado: "activa",
  iniciadaEn: "2026-09-01",
  verificacionesBase: 20,
  canceladaEn: null,
  ...parcial,
});

describe("si la renta corta está vigente", () => {
  it("sin baja pedida, funciona", () => {
    expect(suscripcionVigente(suscripcion(), "2026-09-29")).toBe(true);
  });

  it("con baja pedida, sigue funcionando hasta el día del vencimiento", () => {
    const conBaja = suscripcion({ canceladaEn: "2026-10-31" });
    expect(suscripcionVigente(conBaja, "2026-09-29")).toBe(true);
    // El último día cuenta: quien pagó hasta el 31 lo tiene el 31.
    expect(suscripcionVigente(conBaja, "2026-10-31")).toBe(true);
  });

  it("y al día siguiente ya no", () => {
    const conBaja = suscripcion({ canceladaEn: "2026-10-31" });
    expect(suscripcionVigente(conBaja, "2026-11-01")).toBe(false);
  });

  it("cancelada de verdad no funciona, aunque la fecha sea futura", () => {
    /*
      La baja inmediata --cuando no quedaba mes pagado-- deja el estado en
      `cancelada`. Ahí la fecha no manda.
    */
    const cancelada = suscripcion({
      estado: "cancelada",
      canceladaEn: "2030-01-01",
    });
    expect(suscripcionVigente(cancelada, "2026-09-29")).toBe(false);
  });

  it("una vencida tampoco, y sin suscripción tampoco", () => {
    expect(suscripcionVigente(suscripcion({ estado: "vencida" }), "2026-09-29")).toBe(
      false,
    );
    expect(suscripcionVigente(null, "2026-09-29")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { horasMaximas } from "./zonas.helpers";

/**
 * Minutos que se leían como horas.
 *
 * `zona_comun.duracion_maxima_min` está en minutos, y la aplicación lo trataba
 * como horas en tres sitios. Con la piscina —120 minutos— la pantalla decía
 * "Horario libre (máx 120 h)" y el desplegable de duración de la reserva se
 * construía con `Array.from({length: 120})`: ofrecía de "1 hora" a "120
 * horas", cinco días seguidos de piscina.
 *
 * Y el formulario de la administración tenía **dos campos sobre la misma
 * columna**, uno etiquetado "(min)" y otro "(horas)".
 */
describe("horasMaximas", () => {
  it("dos horas de piscina son 2, no 120", () => {
    expect(horasMaximas(120)).toBe(2);
  });

  it("cuatro horas del salón son 4", () => {
    expect(horasMaximas(240)).toBe(4);
  });

  it("nunca ofrece menos de una hora", () => {
    // Una zona configurada con 30 minutos no puede dejar el desplegable vacío.
    expect(horasMaximas(30)).toBe(1);
    expect(horasMaximas(0)).toBe(1);
  });

  it("sin dato configurado, una hora", () => {
    expect(horasMaximas(undefined)).toBe(1);
    expect(horasMaximas(null)).toBe(1);
  });

  it("redondea hacia abajo: 90 minutos son una hora entera", () => {
    // Ofrecer "1 hora" y media hora suelta complicaría el formulario sin
    // necesidad; la reserva de 90 minutos no está contemplada hoy.
    expect(horasMaximas(90)).toBe(1);
  });
});

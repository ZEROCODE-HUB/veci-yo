import { describe, expect, it } from "vitest";
import { partirRango, rango } from "./horarioDeEntrada";

/**
 * Lo que se guarda tiene que volver igual al formulario. «24 horas» se
 * guardaba como 00:00–23:59 y al reabrir se leía «00:00 a 23:59», que no es
 * ninguna opción del desplegable: salía vacío (17/10/2026).
 */
describe("el horario de entrada, de ida y vuelta", () => {
  it.each(["24 horas", "08:30 a 13:30", "14:00 a 20:00"])("%s", (texto) => {
    const { desde, hasta } = partirRango(texto);
    // La base devuelve las horas con segundos.
    expect(rango(desde && `${desde}:00`, hasta && `${hasta}:00`)).toBe(texto);
  });

  it("sin horario es vacío en las dos direcciones", () => {
    expect(partirRango("")).toEqual({ desde: null, hasta: null });
    expect(rango(null, null)).toBe("");
  });
});

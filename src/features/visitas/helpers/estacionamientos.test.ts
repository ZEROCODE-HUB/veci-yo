import { describe, expect, it } from "vitest";
import { avisoDeEstacionamientos } from "./estacionamientos";

/**
 * Hueco 17 (25/10/2026): si la reserva trae más vehículos que estacionamientos
 * ofrece el anfitrión, se avisa y no se bloquea.
 */
describe("el aviso de estacionamientos al anfitrión", () => {
  it("no dice nada mientras caben", () => {
    expect(avisoDeEstacionamientos(0, 2)).toBeNull();
    expect(avisoDeEstacionamientos(2, 2)).toBeNull();
  });

  it("avisa en cuanto hay uno de más, con los dos números", () => {
    expect(avisoDeEstacionamientos(3, 2)).toMatch(/2 estacionamientos y tu huésped trae 3 vehículos/);
    expect(avisoDeEstacionamientos(2, 1)).toMatch(/1 estacionamiento y/);
  });

  it("con cero manda a indicarlos, sin afirmar que no hay", () => {
    expect(avisoDeEstacionamientos(1, 0)).toMatch(/No has indicado estacionamientos/);
  });

  it("sin el dato, no avisa", () => {
    expect(avisoDeEstacionamientos(4, null)).toBeNull();
    expect(avisoDeEstacionamientos(4, undefined)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { ayudaDeEstacionamientos, sinEstacionamiento, topeDeVehiculos } from "./estacionamientos";

/**
 * Hueco 17 (25/10/2026): vacío no limita, 0 no admite vehículos y un número
 * es el máximo.
 */
describe("los vehículos y los estacionamientos del alojamiento", () => {
  it("vacío no limita: manda el tope general", () => {
    expect(topeDeVehiculos(null, 5)).toBe(5);
    expect(topeDeVehiculos(undefined, 5)).toBe(5);
    expect(ayudaDeEstacionamientos(null)).toBeNull();
    expect(sinEstacionamiento(null)).toBe(false);
  });

  it("un número es el máximo, sin pasar del general", () => {
    expect(topeDeVehiculos(2, 5)).toBe(2);
    expect(topeDeVehiculos(9, 5)).toBe(5);
    expect(ayudaDeEstacionamientos(2)).toMatch(/Máximo 2.*2 estacionamientos/);
    expect(ayudaDeEstacionamientos(1)).toMatch(/1 estacionamiento para/);
  });

  it("con 0 no se registra ninguno", () => {
    expect(topeDeVehiculos(0, 5)).toBe(0);
    expect(sinEstacionamiento(0)).toBe(true);
    expect(ayudaDeEstacionamientos(0)).toMatch(/no se pueden registrar vehículos/);
  });
});

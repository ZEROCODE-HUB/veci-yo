import { describe, expect, it } from "vitest";
import { nombreDeVecino } from "./nombreDeVecino";

describe("el nombre de un vecino", () => {
  it("lleva el depto detrás", () => {
    expect(nombreDeVecino("Marcela Sierra", "301")).toBe("Marcela Sierra · 301");
  });

  it("y si no vive aquí, va solo", () => {
    /*
      La administración y la portería no tienen depto. Un «· sin depto» o un
      separador colgando saldría en cada mensaje que escriben.
    */
    expect(nombreDeVecino("Roberto Hornado", null)).toBe("Roberto Hornado");
    expect(nombreDeVecino("Roberto Hornado", "")).toBe("Roberto Hornado");
    expect(nombreDeVecino("Roberto Hornado", "   ")).toBe("Roberto Hornado");
  });

  it("y sin nombre queda el depto, que es lo que hay en el censo", () => {
    // La lista de «no votaron» sale de las unidades, no de las personas.
    expect(nombreDeVecino("", "402")).toBe("402");
  });

  it("dos deptos caben los dos", () => {
    // `viviendas_de_en` los agrega: quien tiene dos no se queda con uno al azar.
    expect(nombreDeVecino("Guillermo Provenzano", "101, 205")).toBe(
      "Guillermo Provenzano · 101, 205",
    );
  });
});

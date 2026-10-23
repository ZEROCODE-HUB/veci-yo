import { describe, expect, it } from "vitest";
import { llamadaPorInternet } from "./llamadaPorInternet";

/**
 * «Llamar» es la única puerta para llamar desde el 23/10/2026 (el cliente
 * pidió quitar el «Intercomunicador» aparte, como en el prototipo). Lo que se
 * comprueba es por dónde sale cada llamada.
 */
const vecino = { rolActivo: "propietario", unidadId: "", unidadActivaId: "u102" };

describe("por dónde sale la llamada", () => {
  it("un vecino a la portería: por internet", () => {
    expect(llamadaPorInternet({ ...vecino, destino: "porteria:p1" })).toBe(true);
  });

  it("un vecino a la administración: por el teléfono", () => {
    expect(llamadaPorInternet({ ...vecino, destino: "administracion" })).toBe(false);
  });

  it("sin vivienda desde la que llamar, no hay llamada por internet", () => {
    expect(
      llamadaPorInternet({ ...vecino, destino: "porteria:p1", unidadActivaId: null }),
    ).toBe(false);
  });

  it("la portería a una vivienda: por internet", () => {
    expect(
      llamadaPorInternet({ rolActivo: "guardia", destino: "", unidadId: "u102", unidadActivaId: null }),
    ).toBe(true);
  });

  it("la administración a una vivienda: por el teléfono", () => {
    expect(
      llamadaPorInternet({ rolActivo: "administrador", destino: "", unidadId: "u102", unidadActivaId: null }),
    ).toBe(false);
  });
});

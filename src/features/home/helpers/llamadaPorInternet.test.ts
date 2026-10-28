import { describe, expect, it } from "vitest";
import { llamadaPorInternet } from "./llamadaPorInternet";

/**
 * «Llamar» es la única puerta para llamar desde el 23/10/2026. Lo que se
 * comprueba es qué llamada por la app sale de cada elección. Desde el
 * 28/10/2026 la administración también llama y recibe por la app.
 */
const C = "condo";
const vecino = { rolActivo: "propietario", unidadId: "", unidadActivaId: "u102", condominioId: C };
const guardia = { rolActivo: "guardia", unidadId: "", unidadActivaId: null, condominioId: C };
const admin = { rolActivo: "administrador", unidadId: "", unidadActivaId: null, condominioId: C };

describe("qué llamada por la app sale de cada elección", () => {
  it("un vecino a la portería, desde su vivienda", () => {
    expect(llamadaPorInternet({ ...vecino, destino: "porteria:p1" })).toEqual({
      destino: "porteria",
      desdeUnidadId: "u102",
    });
  });

  it("un vecino a la administración, también por la app", () => {
    expect(llamadaPorInternet({ ...vecino, destino: "administracion" })).toEqual({
      destino: "administracion",
      desdeUnidadId: "u102",
    });
  });

  it("sin vivienda desde la que llamar, no hay llamada por la app", () => {
    expect(
      llamadaPorInternet({ ...vecino, destino: "porteria:p1", unidadActivaId: null }),
    ).toBeNull();
  });

  it("la portería a una vivienda", () => {
    expect(llamadaPorInternet({ ...guardia, destino: "vivienda", unidadId: "u102" })).toEqual({
      destino: "vivienda",
      aUnidadId: "u102",
    });
  });

  it("la portería a la administración", () => {
    expect(llamadaPorInternet({ ...guardia, destino: "administracion" })).toEqual({
      destino: "administracion",
      condominioId: C,
    });
  });

  it("la administración a una vivienda", () => {
    expect(llamadaPorInternet({ ...admin, destino: "", unidadId: "u102" })).toEqual({
      destino: "vivienda",
      aUnidadId: "u102",
    });
  });

  it("la administración a la portería", () => {
    expect(llamadaPorInternet({ ...admin, destino: "porteria:p1" })).toEqual({
      destino: "porteria",
      condominioId: C,
    });
  });

  it("el personal sin vivienda elegida todavía, nada", () => {
    expect(llamadaPorInternet({ ...admin, destino: "vivienda" })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { participaEnLaEncuesta } from "./anuncios.helpers";

describe("participaEnLaEncuesta", () => {
  const paraPorteria = { votacion: true, paraPorteria: true };
  const paraVecinos = { votacion: true, paraPorteria: false };

  it("la portería vota una encuesta dirigida a ella", () => {
    expect(participaEnLaEncuesta(paraPorteria, "guardia")).toBe(true);
  });

  it("la portería no vota una que no va para ella", () => {
    expect(participaEnLaEncuesta(paraVecinos, "guardia")).toBe(false);
  });

  it("el huésped temporal no vota nunca", () => {
    expect(participaEnLaEncuesta(paraPorteria, "huesped-temporal")).toBe(false);
  });

  it("un propietario vota", () => {
    expect(participaEnLaEncuesta(paraVecinos, "propietario")).toBe(true);
  });

  it("un anuncio sin votación no se vota", () => {
    expect(
      participaEnLaEncuesta({ votacion: false, paraPorteria: true }, "guardia"),
    ).toBe(false);
  });
});

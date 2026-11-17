import { describe, expect, it } from "vitest";
import { entraAlRegistrar } from "./entraAlRegistrar";

describe("entraAlRegistrar", () => {
  /*
    17/11/2026: lo que registra la portería entra siempre, traiga documento o
    no. Hasta ese día, con documento y el edificio exigiendo verificarlo, nacía
    por llegar.
  */
  it("lo que registra la portería nace dentro", () => {
    expect(entraAlRegistrar({ esGuardia: true, esEstancia: false })).toBe(true);
  });

  it("lo que registra un vecino nunca nace dentro", () => {
    expect(entraAlRegistrar({ esGuardia: false, esEstancia: false })).toBe(false);
  });

  it("una estancia de huésped tampoco", () => {
    expect(entraAlRegistrar({ esGuardia: true, esEstancia: true })).toBe(false);
  });
});

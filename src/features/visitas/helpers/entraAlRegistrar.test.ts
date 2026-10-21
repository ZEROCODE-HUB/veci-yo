import { describe, expect, it } from "vitest";
import { entraAlRegistrar } from "./entraAlRegistrar";

const base = { esGuardia: true, esEstancia: false, exigeDocumento: true };

describe("entraAlRegistrar", () => {
  it("con documento y el edificio exigiendo verificarlo, la visita nace por llegar", () => {
    expect(entraAlRegistrar({ ...base, documentos: ["12345678"] })).toBe(false);
  });

  it("basta con que lo traiga un acompañante", () => {
    expect(entraAlRegistrar({ ...base, documentos: ["", "79888777"] })).toBe(false);
  });

  it("sin documento, entra al registrarla", () => {
    expect(entraAlRegistrar({ ...base, documentos: ["", "  "] })).toBe(true);
  });

  it("si el edificio no exige verificar, entra aunque traiga documento", () => {
    expect(
      entraAlRegistrar({ ...base, exigeDocumento: false, documentos: ["12345678"] }),
    ).toBe(true);
  });

  it("lo que registra un vecino nunca nace dentro", () => {
    expect(
      entraAlRegistrar({ ...base, esGuardia: false, exigeDocumento: false, documentos: [] }),
    ).toBe(false);
  });

  it("una estancia de huésped tampoco", () => {
    expect(
      entraAlRegistrar({ ...base, esEstancia: true, exigeDocumento: false, documentos: [] }),
    ).toBe(false);
  });
});

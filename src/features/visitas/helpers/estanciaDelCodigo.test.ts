import { describe, expect, it } from "vitest";
import { pareceCodigo, porQueNoSeAbre } from "./estanciaDelCodigo";

const base = {
  visitaId: "v1",
  laVe: false,
  unidad: "102",
  fechaDesde: "2026-10-29",
  fechaHasta: "2026-11-01",
  estado: "programada",
};

describe("porQueNoSeAbre", () => {
  it("si la portería la ve, no hay nada que decir", () => {
    expect(porQueNoSeAbre({ ...base, laVe: true })).toBeNull();
  });

  it("si es otro día, dice de qué vivienda y cuándo (QA 26/10/2026)", () => {
    expect(porQueNoSeAbre(base)).toBe(
      "Esa reserva es de la 102, del 29/10/2026 al 01/11/2026. La portería la ve desde el día antes de la llegada hasta la salida.",
    );
  });

  it("cancelada o terminada, lo dice", () => {
    expect(porQueNoSeAbre({ ...base, estado: "cancelada" })).toBe("Esa reserva de la 102 está cancelada.");
    expect(porQueNoSeAbre({ ...base, estado: "finalizada" })).toBe("Esa reserva de la 102 ya terminó.");
  });
});

describe("pareceCodigo", () => {
  it("un código de estancia, con o sin el prefijo del QR", () => {
    expect(pareceCodigo("7A0C1B2C3D4E", 12)).toBe(true);
    expect(pareceCodigo("VECIYO:7A0C1B2C3D4E", 12)).toBe(true);
  });

  it("un nombre, un depto o una placa, no", () => {
    expect(pareceCodigo("Ana", 12)).toBe(false);
    expect(pareceCodigo("102", 12)).toBe(false);
    expect(pareceCodigo("ABC123", 12)).toBe(false);
    expect(pareceCodigo("Guillermo Provenzano", 12)).toBe(false);
  });
});

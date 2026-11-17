import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PuntualidadDelMes } from "./PuntualidadDelMes";

/**
 * La puntualidad de un mes en la tarjeta del carrusel (17/11/2026): lo que
 * cuenta la base, escrito como lo pidió el cliente.
 */
const mes = {
  periodo: "2026-10-01",
  moneda: "COP",
  venceEn: "2026-10-10",
  yaVencio: true,
  viviendas: 240,
  enFecha: 180,
  conAtraso: 30,
  sinPagar: 30,
  esperado: 2_400_000,
  pagadoEnFecha: 1_800_000,
  pagadoConAtraso: 300_000,
  pendiente: 300_000,
};

describe("la puntualidad del mes", () => {
  it("dice viviendas y dinero, a tiempo y en mora", () => {
    render(<PuntualidadDelMes puntualidad={mes} />);
    expect(screen.getByText("180 de 240 al día (75 %)")).toBeDefined();
    expect(screen.getByText("Pagado en fecha: 1.800.000 COP (75 %)")).toBeDefined();
    expect(screen.getByText("30 de 240 pagaron con atraso (13 %)")).toBeDefined();
    expect(screen.getByText("Pagado en mora: 300.000 COP (13 %)")).toBeDefined();
    expect(screen.getByText("30 de 240 en mora (13 %)")).toBeDefined();
    expect(screen.getByText("Vence el 10/10/2026")).toBeDefined();
  });

  it("antes del vencimiento lo que falta no se llama mora", () => {
    render(<PuntualidadDelMes puntualidad={{ ...mes, yaVencio: false }} />);
    expect(screen.getByText("30 de 240 todavía sin pagar (13 %)")).toBeDefined();
    expect(screen.queryByText("30 de 240 en mora (13 %)")).toBeNull();
  });
});

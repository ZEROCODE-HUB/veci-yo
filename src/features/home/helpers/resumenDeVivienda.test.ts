import { describe, expect, it } from "vitest";
import { resumenEnFrases } from "./resumenDeVivienda";

const base = {
  unidadId: "u1",
  visitasHoy: 0,
  huespedesDentro: 0,
  correspondenciaPendiente: 0,
  estanciasProximas: 0,
};

describe("lo que dice la tarjeta de una vivienda", () => {
  it("solo lo que hay, y en singular cuando es uno", () => {
    expect(
      resumenEnFrases({ ...base, huespedesDentro: 1, correspondenciaPendiente: 3 }),
    ).toEqual(["1 huésped dentro", "3 paquetes en portería"]);
  });

  it("sin nada, ninguna frase: no dice «0 paquetes»", () => {
    expect(resumenEnFrases(base)).toEqual([]);
  });

  it("y sin resumen todavía, tampoco", () => {
    expect(resumenEnFrases(undefined)).toEqual([]);
  });

  it("primero quién está dentro, que es lo que más importa", () => {
    const frases = resumenEnFrases({
      ...base,
      visitasHoy: 2,
      huespedesDentro: 2,
      estanciasProximas: 1,
    });
    expect(frases).toEqual(["2 huéspedes dentro", "2 visitas hoy", "1 reserva próxima"]);
  });
});

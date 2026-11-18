import { describe, expect, it } from "vitest";
import { cuentaDelEdificio, leerIndiceDeVotacion, problemaDelIndice } from "./indiceDeVotacion";

/**
 * El índice de votación es un porcentaje del edificio (18/11/2026): vacío al
 * principio, de más de 0 a 100, y entre todos no pasan de 100.
 */
describe("el índice de votación de un departamento", () => {
  it("vacío es «sin índice», no 1 ni 0", () => {
    expect(leerIndiceDeVotacion("")).toBeNull();
    expect(leerIndiceDeVotacion("  ")).toBeNull();
    expect(problemaDelIndice("")).toBeNull();
  });

  it("se escribe con coma o con punto", () => {
    expect(leerIndiceDeVotacion("12,5")).toBe(12.5);
    expect(leerIndiceDeVotacion("12.5")).toBe(12.5);
  });

  it("va de más de 0 a 100", () => {
    expect(problemaDelIndice("0")).toMatch(/mayor que 0/);
    expect(problemaDelIndice("100,01")).toMatch(/no puede pasar de 100/);
    expect(problemaDelIndice("100")).toBeNull();
    expect(problemaDelIndice("0,0001")).toBeNull();
    expect(problemaDelIndice("1,2,3")).toMatch(/porcentaje/);
  });

  it("dice cuánto quedaría el edificio, y avisa si pasa de 100", () => {
    expect(cuentaDelEdificio(60, "15")).toEqual({
      pasa: false,
      texto: "Los demás departamentos suman 60 %. Con este, el edificio quedaría en 75 % de 100 %.",
    });
    const pasa = cuentaDelEdificio(87.5, "20");
    expect(pasa.pasa).toBe(true);
    expect(pasa.texto).toMatch(/sumaría 107,5 %/);
    expect(pasa.texto).toMatch(/como máximo 12,5 %/);
  });
});

import { describe, expect, it } from "vitest";
import { opcionPorIndice } from "./indiceDelEdificio";

/** «Según el índice» solo con todos los departamentos sumando 100 % (18/11/2026). */
describe("contar una encuesta según el índice", () => {
  it("con el 100 % se puede", () => {
    expect(opcionPorIndice({ suma: 100, viviendas: 5, sinIndice: 0, completo: true }).sePuede).toBe(true);
  });

  it("sin el 100 % no, y dice cuánto suma y cuántos faltan", () => {
    const r = opcionPorIndice({ suma: 87.5, viviendas: 5, sinIndice: 2, completo: false });
    expect(r.sePuede).toBe(false);
    expect(r.detalle).toBe(
      "Todavía no se puede: los departamentos suman 87,5 % y 2 departamentos no tienen índice, y tienen que sumar 100 %. Se completa en Arquitectura › Torres, al editar cada departamento.",
    );
  });

  it("todos con índice pero sin llegar a 100, tampoco", () => {
    const r = opcionPorIndice({ suma: 99, viviendas: 5, sinIndice: 0, completo: false });
    expect(r.sePuede).toBe(false);
    expect(r.detalle).toMatch(/^Todavía no se puede: los departamentos suman 99 %, y tienen/);
  });

  it("mientras no se sabe, no se deja elegir", () => {
    expect(opcionPorIndice(null).sePuede).toBe(false);
  });
});

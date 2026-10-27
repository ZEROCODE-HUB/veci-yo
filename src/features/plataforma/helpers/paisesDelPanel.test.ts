import { describe, expect, it } from "vitest";
import type { PaisDelPanel } from "../services/plataforma.repo";
import { paisesDelPanel } from "./paisesDelPanel";

function pais(codigo: string, altaDeEdificio: boolean, edificios = 0): PaisDelPanel {
  return {
    codigo,
    nombre: codigo,
    prefijo: "",
    moneda: "",
    zonaHoraria: "",
    policia: "",
    etiquetaFiscal: "",
    mayoriaDeEdad: 18,
    reportaSire: false,
    altaDeEdificio,
    activo: true,
    edificios,
    documentos: [],
  };
}

describe("paisesDelPanel", () => {
  it("enseña solo los países con alta de edificios", () => {
    const lista = [pais("CO", true), pais("AR", false), pais("PE", true), pais("US", false)];
    expect(paisesDelPanel(lista).map((p) => p.codigo)).toEqual(["CO", "PE"]);
  });

  it("no esconde un país que ya tiene edificios aunque se le quite el alta", () => {
    expect(paisesDelPanel([pais("CO", false, 2)]).map((p) => p.codigo)).toEqual(["CO"]);
  });
});

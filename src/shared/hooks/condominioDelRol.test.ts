import { describe, expect, it } from "vitest";
import { condominioDelRol } from "./condominioDelRol";

// Camila (multirol): guardia en Pino —primera en la lista— y administradora en Roble.
const CONDOMINIOS = [
  { condominioId: "pino", rol: "guardia" },
  { condominioId: "roble", rol: "administrador" },
];
const UNIDADES = [
  { unidadId: "cedro-101", condominioId: "cedro" },
  { unidadId: "olivo-102", condominioId: "olivo" },
];

describe("el edificio del rol activo", () => {
  it("como administración, el que administra aunque no sea el primero", () => {
    expect(condominioDelRol("administrador", CONDOMINIOS, UNIDADES, undefined)).toBe("roble");
  });

  it("como portería, el de su puesto", () => {
    expect(condominioDelRol("guardia", [...CONDOMINIOS].reverse(), UNIDADES, undefined)).toBe("pino");
  });

  it("como vecina, el de la vivienda elegida arriba", () => {
    expect(condominioDelRol("inquilino-lider", CONDOMINIOS, UNIDADES, { unidadId: "olivo-102" })).toBe("olivo");
  });

  it("el coadministrador, si no administra", () => {
    expect(
      condominioDelRol("administrador", [{ condominioId: "x", rol: "guardia" }, { condominioId: "y", rol: "coadministrador" }], [], undefined),
    ).toBe("y");
  });
});

import { describe, expect, it } from "vitest";
import { esParaElRol } from "./audienciaPorRol";
import { tiposQuePuedeRegistrar } from "@/features/visitas/helpers/tiposQuePuedeRegistrar";

/** El profesional permanente (18/11/2026): lo suyo y nada más. */
describe("el profesional permanente", () => {
  it("ve lo que va para los profesionales, no lo de los residentes", () => {
    expect(esParaElRol({ trabajadores: true }, "trabajador")).toBe(true);
    expect(esParaElRol({ residentes: true, propietarios: true }, "trabajador")).toBe(false);
    // Y un residente no ve lo que es solo para los profesionales.
    expect(esParaElRol({ trabajadores: true }, "inquilino-lider")).toBe(false);
  });

  it("registra solo amigos y profesionales temporales", () => {
    expect(
      tiposQuePuedeRegistrar({ esGuardia: false, esAdmin: false, esHuesped: false, esTrabajador: true, rentaCortaPermitida: true }),
    ).toEqual(["amigos", "temporal"]);
  });
});

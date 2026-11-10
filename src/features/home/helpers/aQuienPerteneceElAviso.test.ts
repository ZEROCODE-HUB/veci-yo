import { describe, expect, it } from "vitest";
import type { Ubicacion } from "@/shared/types";
import { aQuienPerteneceElAviso, hayQueCambiarParaVerlo } from "./aQuienPerteneceElAviso";

/**
 * De qué vivienda y con qué rol es un aviso (10/11/2026): quien administra el
 * edificio y es propietario del 102 recibe en la misma bandeja los avisos de
 * las dos cosas.
 */
const vivienda = (p: Partial<Ubicacion>): Ubicacion => ({
  id: 1,
  direccion: "",
  favorito: false,
  ...p,
});

const ubicaciones = [
  vivienda({ id: 1, unidadId: "u-102", rol: "propietario", torreNumero: 1, codigo: "102", favorito: true }),
  vivienda({ id: 2, unidadId: "u-103", rol: "propietario", torreNumero: 1, codigo: "103" }),
];
const roles = ["administrador", "guardia", "propietario"] as const;

describe("de quién es un aviso", () => {
  it("el de una visita del 102 es del 102 como propietario", () => {
    const p = aQuienPerteneceElAviso({ unidadId: "u-102" }, ubicaciones, [...roles]);
    expect(p?.rol).toBe("propietario");
    expect(p?.ubicacionId).toBe(1);
    expect(p?.etiqueta).toMatch(/102/);
    expect(p?.etiqueta).toMatch(/Propietario/);
  });

  it("el de una reserva por aprobar es de la administración", () => {
    const p = aQuienPerteneceElAviso({ deLaAdministracion: true }, ubicaciones, [...roles]);
    expect(p).toEqual({ rol: "administrador", etiqueta: "Administración" });
  });

  it("de una vivienda que no es suya, no se inventa nada", () => {
    expect(aQuienPerteneceElAviso({ unidadId: "u-999" }, ubicaciones, [...roles])).toBeNull();
  });
});

describe("cuándo hay que cambiar para verlo", () => {
  const del102 = aQuienPerteneceElAviso({ unidadId: "u-102" }, ubicaciones, [...roles]);
  const del103 = aQuienPerteneceElAviso({ unidadId: "u-103" }, ubicaciones, [...roles]);

  it("entrando como administración, un aviso del 102 pide cambiar", () => {
    expect(hayQueCambiarParaVerlo(del102, "administrador", ubicaciones)).toBe(true);
  });

  it("entrando como propietario del 102, no", () => {
    expect(hayQueCambiarParaVerlo(del102, "propietario", ubicaciones)).toBe(false);
  });

  it("como propietario del 102, uno del 103 pide cambiar de vivienda", () => {
    expect(hayQueCambiarParaVerlo(del103, "propietario", ubicaciones)).toBe(true);
  });

  it("sin saber de dónde es, se abre como siempre", () => {
    expect(hayQueCambiarParaVerlo(null, "administrador", ubicaciones)).toBe(false);
  });
});

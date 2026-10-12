import { describe, expect, it } from "vitest";
import type { UnidadDisponible } from "@/shared/hooks/useUnidadesDisponibles";
import {
  etiquetaDeUnidad,
  pisosDe,
  sinEntregaEnPuerta,
  soloVisibles,
  unidadesVisibles,
} from "./destinos";

const EDIFICIO = "edificio";

const unidad = (
  codigo: string,
  torreNumero: number,
  piso: number,
): UnidadDisponible => ({
  unidadId: `u-${torreNumero}-${codigo}`,
  condominioId: EDIFICIO,
  codigo,
  piso,
  torreNumero,
  torreNombre: "",
  torre: `Torre ${torreNumero}`,
});

// El edificio de prueba, tal cual: la 301 está en la torre 2.
const U101 = unidad("101", 1, 1);
const U102 = unidad("102", 1, 1);
const U205 = unidad("205", 2, 2);
const U301 = unidad("301", 2, 3);
const TODAS = [U101, U102, U205, U301];

describe("a qué viviendas va un envío", () => {
  it("el piso filtra, además de la torre", () => {
    expect(unidadesVisibles(TODAS, "Torre 2", "2")).toEqual([U205]);
    // Lo que vio el cliente: torre 2 no tiene piso 1, así que no hay nada.
    expect(unidadesVisibles(TODAS, "Torre 2", "1")).toEqual([]);
  });

  it("sin torre ni piso salen todas", () => {
    expect(unidadesVisibles(TODAS)).toEqual(TODAS);
    expect(unidadesVisibles(TODAS, "", "")).toEqual(TODAS);
  });

  it("los pisos que se ofrecen son los de esa torre", () => {
    expect(pisosDe(TODAS, "Torre 2")).toEqual(["2", "3"]);
    expect(pisosDe(TODAS, "Torre 1")).toEqual(["1"]);
    expect(pisosDe(TODAS)).toEqual(["1", "2", "3"]);
  });

  it("lo marcado que deja de verse se desmarca", () => {
    const marcadas = [U101.unidadId, U205.unidadId];
    expect(soloVisibles(marcadas, unidadesVisibles(TODAS, "Torre 2"))).toEqual([
      U205.unidadId,
    ]);
  });

  it("dos viviendas con el mismo código en torres distintas no se confunden", () => {
    const gemela = unidad("101", 2, 1);
    const visibles = unidadesVisibles([...TODAS, gemela], "Torre 2", "1");
    expect(visibles).toEqual([gemela]);
    expect(soloVisibles([U101.unidadId], visibles)).toEqual([]);
  });

  it("la torre va en la etiqueta solo cuando hace falta", () => {
    expect(etiquetaDeUnidad(U205, false)).toBe("205");
    expect(etiquetaDeUnidad(U205, true)).toBe("T2 · 205");
  });
});

describe("la entrega en puerta la autoriza la administración", () => {
  const delEdificio = (entregaDirecta: boolean | null) => ({
    condominioId: EDIFICIO,
    unidadId: null,
    entregaDirecta,
  });
  const deLaUnidad = (u: UnidadDisponible, entregaDirecta: boolean | null) => ({
    condominioId: EDIFICIO,
    unidadId: u.unidadId,
    entregaDirecta,
  });

  it("si el edificio la prohíbe, ninguna vivienda la tiene", () => {
    expect(sinEntregaEnPuerta([delEdificio(false)], [U205, U301])).toEqual([
      U205,
      U301,
    ]);
  });

  it("y si la permite, todas", () => {
    expect(sinEntregaEnPuerta([delEdificio(true)], [U205, U301])).toEqual([]);
  });

  it("lo escrito para la vivienda manda sobre lo del edificio", () => {
    const permisos = [delEdificio(false), deLaUnidad(U205, true)];
    expect(sinEntregaEnPuerta(permisos, [U205, U301])).toEqual([U301]);

    const alReves = [delEdificio(true), deLaUnidad(U205, false)];
    expect(sinEntregaEnPuerta(alReves, [U205, U301])).toEqual([U205]);
  });

  it("una vivienda que no dice nada hereda lo del edificio", () => {
    const permisos = [delEdificio(false), deLaUnidad(U205, null)];
    expect(sinEntregaEnPuerta(permisos, [U205])).toEqual([U205]);
  });

  it("si nadie ha dicho nada, no está prohibida", () => {
    expect(sinEntregaEnPuerta([], [U205])).toEqual([]);
    expect(sinEntregaEnPuerta([delEdificio(null)], [U205])).toEqual([]);
  });

  it("lo que diga otro edificio no cuenta", () => {
    const ajeno = { condominioId: "otro", unidadId: null, entregaDirecta: false };
    expect(sinEntregaEnPuerta([ajeno], [U205])).toEqual([]);
  });
});

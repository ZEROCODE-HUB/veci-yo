import { describe, expect, it } from "vitest";
import { ordenarPorPreferencia } from "./viviendaPorDefecto";

/**
 * En qué vivienda entra alguien que tiene más de una.
 *
 * La «activa» era la primera de una consulta sin orden. Esto fija el orden:
 * la que eligió, si no la que habita, si no la más antigua.
 */
const v = (
  nombre: string,
  parcial: Partial<{ elegidaEn: string | null; esResidente: boolean; creadaEn: string }> = {},
) => ({
  nombre,
  elegidaEn: null,
  esResidente: false,
  creadaEn: "2026-01-01T00:00:00Z",
  ...parcial,
});

const nombres = (lista: { nombre: string }[]) => lista.map((x) => x.nombre);

describe("la vivienda por defecto", () => {
  it("la que eligió la última vez va primero, aunque resida en otra", () => {
    const orden = ordenarPorPreferencia([
      v("donde vive", { esResidente: true }),
      v("la que eligió", { elegidaEn: "2026-10-09T10:00:00Z" }),
    ]);
    expect(nombres(orden)).toEqual(["la que eligió", "donde vive"]);
  });

  it("entre dos elegidas, la más reciente", () => {
    const orden = ordenarPorPreferencia([
      v("ayer", { elegidaEn: "2026-10-08T10:00:00Z" }),
      v("hoy", { elegidaEn: "2026-10-09T10:00:00Z" }),
    ]);
    expect(nombres(orden)).toEqual(["hoy", "ayer"]);
  });

  it("si nunca eligió, la vivienda en la que reside", () => {
    // El caso del cliente: vive en una y alquila otra, y entraba en la segunda.
    const orden = ordenarPorPreferencia([
      v("la que alquila", { creadaEn: "2025-01-01T00:00:00Z" }),
      v("donde vive", { esResidente: true, creadaEn: "2026-06-01T00:00:00Z" }),
    ]);
    expect(nombres(orden)).toEqual(["donde vive", "la que alquila"]);
  });

  it("y si no reside en ninguna, la más antigua: siempre la misma", () => {
    const orden = ordenarPorPreferencia([
      v("la nueva", { creadaEn: "2026-06-01T00:00:00Z" }),
      v("la de siempre", { creadaEn: "2024-03-01T00:00:00Z" }),
    ]);
    expect(nombres(orden)).toEqual(["la de siempre", "la nueva"]);
  });

  it("no cambia la lista que recibe", () => {
    const original = [v("b", { creadaEn: "2026-02-01T00:00:00Z" }), v("a")];
    ordenarPorPreferencia(original);
    expect(nombres(original)).toEqual(["b", "a"]);
  });
});

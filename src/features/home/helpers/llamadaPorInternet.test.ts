import { describe, expect, it } from "vitest";
import {
  llamadaPorInternet,
  quienesContestanEnLaVivienda,
  TODOS_EN_LA_VIVIENDA,
} from "./llamadaPorInternet";

/**
 * «Llamar» es la única puerta para llamar desde el 23/10/2026. Lo que se
 * comprueba es qué llamada por la app sale de cada elección. Desde el
 * 28/10/2026 la administración también llama y recibe por la app.
 */
const C = "condo";
const vecino = { rolActivo: "propietario", unidadId: "", unidadActivaId: "u102", condominioId: C };
const guardia = { rolActivo: "guardia", unidadId: "", unidadActivaId: null, condominioId: C };
const admin = { rolActivo: "administrador", unidadId: "", unidadActivaId: null, condominioId: C };

describe("qué llamada por la app sale de cada elección", () => {
  it("un vecino a la portería, desde su vivienda", () => {
    expect(llamadaPorInternet({ ...vecino, destino: "porteria:p1" })).toEqual({
      destino: "porteria",
      desdeUnidadId: "u102",
    });
  });

  it("un vecino a la administración, también por la app", () => {
    expect(llamadaPorInternet({ ...vecino, destino: "administracion" })).toEqual({
      destino: "administracion",
      desdeUnidadId: "u102",
    });
  });

  it("sin vivienda desde la que llamar, no hay llamada por la app", () => {
    expect(
      llamadaPorInternet({ ...vecino, destino: "porteria:p1", unidadActivaId: null }),
    ).toBeNull();
  });

  it("la portería a una vivienda", () => {
    expect(llamadaPorInternet({ ...guardia, destino: "vivienda", unidadId: "u102" })).toEqual({
      destino: "vivienda",
      aUnidadId: "u102",
    });
  });

  it("la portería a la administración", () => {
    expect(llamadaPorInternet({ ...guardia, destino: "administracion" })).toEqual({
      destino: "administracion",
      condominioId: C,
    });
  });

  it("la administración a una vivienda", () => {
    expect(llamadaPorInternet({ ...admin, destino: "", unidadId: "u102" })).toEqual({
      destino: "vivienda",
      aUnidadId: "u102",
    });
  });

  it("la administración a la portería", () => {
    expect(llamadaPorInternet({ ...admin, destino: "porteria:p1" })).toEqual({
      destino: "porteria",
      condominioId: C,
    });
  });

  it("el personal sin vivienda elegida todavía, nada", () => {
    expect(llamadaPorInternet({ ...admin, destino: "vivienda" })).toBeNull();
  });

  // 17/11/2026: elegir a quién de la vivienda, o «Todos».
  it("a una persona de la vivienda, con su id", () => {
    expect(
      llamadaPorInternet({ ...guardia, destino: "vivienda", unidadId: "u102", aUsuarioId: "ana" }),
    ).toEqual({ destino: "vivienda", aUnidadId: "u102", aUsuarioId: "ana" });
  });

  it("«Todos» no lleva persona: suena en todos", () => {
    expect(
      llamadaPorInternet({ ...admin, destino: "", unidadId: "u102", aUsuarioId: "" }),
    ).toEqual({ destino: "vivienda", aUnidadId: "u102" });
  });

  it("la persona solo cuenta al llamar a una vivienda", () => {
    expect(
      llamadaPorInternet({ ...guardia, destino: "administracion", aUsuarioId: "ana" }),
    ).toEqual({ destino: "administracion", condominioId: C });
    expect(
      llamadaPorInternet({ ...vecino, destino: "porteria:p1", aUsuarioId: "ana" }),
    ).toEqual({ destino: "porteria", desdeUnidadId: "u102" });
  });
});

describe("a quién de la vivienda (17/11/2026)", () => {
  it("«Todos» primero y después quien recibe llamadas por la app, sin repetir", () => {
    expect(
      quienesContestanEnLaVivienda([
        { usuarioId: "ana", nombre: "Ana Ruiz", recibeLlamadasApp: true },
        { usuarioId: "ana", nombre: "Ana Ruiz", recibeLlamadasApp: true },
        { usuarioId: "luis", nombre: "Luis", recibeLlamadasApp: false },
        { usuarioId: null, nombre: "Sin app", recibeLlamadasApp: false },
        { usuarioId: "eva", nombre: " ", recibeLlamadasApp: true },
      ]),
    ).toEqual([
      { value: TODOS_EN_LA_VIVIENDA, label: "Todos (contesta el primero)" },
      { value: "ana", label: "Ana Ruiz" },
      { value: "eva", label: "Sin nombre" },
    ]);
  });

  it("si nadie recibe llamadas por la app, no hay a quién elegir", () => {
    expect(
      quienesContestanEnLaVivienda([{ usuarioId: "luis", nombre: "Luis", recibeLlamadasApp: false }]),
    ).toEqual([]);
  });
});

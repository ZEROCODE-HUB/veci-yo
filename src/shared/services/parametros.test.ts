import { describe, expect, it } from "vitest";
import {
  ParametroDesconocido,
  parametroBooleano,
  parametroLista,
  parametroNumero,
  parametroTexto,
} from "./parametros";

const mapa = {
  dias: "7",
  tope: "8.5",
  encendido: "TRUE",
  apagado: "false",
  recordatorios: "[7, 3, 1]",
  nombre: "Huésped por confirmar",
  roto: "muchos",
  noLista: "{}",
};

describe("leer un parámetro", () => {
  it("convierte cada tipo", () => {
    expect(parametroNumero(mapa, "dias")).toBe(7);
    expect(parametroNumero(mapa, "tope")).toBe(8.5);
    expect(parametroBooleano(mapa, "encendido")).toBe(true);
    expect(parametroBooleano(mapa, "apagado")).toBe(false);
    expect(parametroLista<number>(mapa, "recordatorios")).toEqual([7, 3, 1]);
    expect(parametroTexto(mapa, "nombre")).toBe("Huésped por confirmar");
  });

  it("un parámetro que no llegó revienta en vez de inventar un valor", () => {
    expect(() => parametroNumero(mapa, "no_existe")).toThrow(ParametroDesconocido);
    expect(() => parametroTexto(mapa, "no_existe")).toThrow(/Parámetro desconocido/);
  });

  it("un valor que no corresponde al tipo revienta", () => {
    expect(() => parametroNumero(mapa, "roto")).toThrow(/no es un número/);
    expect(() => parametroBooleano(mapa, "dias")).toThrow(/true\/false/);
    expect(() => parametroLista(mapa, "noLista")).toThrow(/no es una lista/);
  });
});

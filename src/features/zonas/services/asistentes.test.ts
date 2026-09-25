import { describe, expect, it } from "vitest";
import {
  cuantosAsistentes,
  opcionesDeAsistentes,
  SOLO_YO,
  topeDeAcompanantes,
} from "./asistentes";

describe("cuánta gente va a la reserva", () => {
  it("«Solo yo» es una opción, no un hueco en blanco", () => {
    /*
      Ir solo era dejar el desplegable vacio, que es una respuesta que nadie
      adivina. Lo dijo el cliente: «no se puede poner 0 o ninguna... o solo
      yo, o algo».
    */
    const opciones = opcionesDeAsistentes(4);
    expect(opciones[0]).toBe(SOLO_YO);
    expect(cuantosAsistentes(SOLO_YO)).toBe(0);
  });

  it("el titular ocupa sitio: los acompañantes caben en lo que queda", () => {
    // La piscina admite 20 personas, asi que 19 acompañantes como mucho.
    const piscina = opcionesDeAsistentes(20);
    expect(piscina.at(-1)).toBe("19 personas");
    expect(piscina).toHaveLength(20); // «Solo yo» + 19

    // Antes llegaba a «20 personas», que con el titular son 21 en una zona
    // de 20.
    expect(piscina).not.toContain("20 personas");
  });

  it("singular y plural", () => {
    expect(opcionesDeAsistentes(3)).toEqual([SOLO_YO, "1 persona", "2 personas"]);
  });

  it("una zona de una sola persona solo ofrece ir solo", () => {
    expect(opcionesDeAsistentes(1)).toEqual([SOLO_YO]);
    // Y una sin capacidad declarada tampoco inventa acompañantes.
    expect(opcionesDeAsistentes(0)).toEqual([SOLO_YO]);
  });

  it("la cuenta sale del texto de la opción", () => {
    expect(cuantosAsistentes("1 persona")).toBe(1);
    expect(cuantosAsistentes("12 personas")).toBe(12);
  });

  it("y lo que no se entiende cuenta cero, no un disparate", () => {
    /*
      Antes se hacia `Number(opcion.split(" ")[0]) || 0`, que con «Solo yo»
      daba `NaN || 0` = 0 por accidente. Funcionaba, y funcionar por accidente
      es lo que se rompe al tocar la etiqueta.
    */
    expect(cuantosAsistentes("")).toBe(0);
    expect(cuantosAsistentes(null)).toBe(0);
    expect(cuantosAsistentes(undefined)).toBe(0);
    expect(cuantosAsistentes("lo que sea")).toBe(0);
    expect(cuantosAsistentes("-3 personas")).toBe(0);
  });

  it("todas las opciones que se ofrecen se saben contar", () => {
    // La ida y la vuelta, que es donde se separan los vocabularios.
    const opciones = opcionesDeAsistentes(6);
    expect(opciones.map(cuantosAsistentes)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

/**
 * Manda el tope mas pequeño de los dos.
 *
 * Lo pidio el cliente: «la cantidad de personas no deberia ser mas bien
 * acorde a la cantidad de huespedes?». La piscina admite veinte y la 102 se
 * alquila para cinco: Tomas no puede llevar diecinueve a la piscina, porque
 * sus acompañantes son la gente de su estancia.
 */
describe("los dos topes: la zona y la vivienda", () => {
  it("manda la vivienda cuando es mas pequeña", () => {
    // Piscina de 20, alojamiento para 5: cuatro acompañantes.
    expect(topeDeAcompanantes({ capacidadZona: 20, maxHuespedes: 5 })).toBe(4);
    expect(opcionesDeAsistentes(20, 5)).toEqual([
      SOLO_YO,
      "1 persona",
      "2 personas",
      "3 personas",
      "4 personas",
    ]);
  });

  it("manda la zona cuando es mas pequeña", () => {
    // Una lavanderia de dos no admite cuatro aunque duerman cinco.
    expect(topeDeAcompanantes({ capacidadZona: 2, maxHuespedes: 5 })).toBe(1);
  });

  it("sin alojamiento, manda la zona sola", () => {
    // Un residente no tiene `max_huespedes`: su tope es la zona.
    expect(topeDeAcompanantes({ capacidadZona: 20 })).toBe(19);
    expect(topeDeAcompanantes({ capacidadZona: 20, maxHuespedes: null })).toBe(19);
    expect(topeDeAcompanantes({ capacidadZona: 20, maxHuespedes: 0 })).toBe(19);
  });

  it("y nunca sale un tope negativo", () => {
    expect(topeDeAcompanantes({ capacidadZona: 1, maxHuespedes: 1 })).toBe(0);
    expect(topeDeAcompanantes({ capacidadZona: 0 })).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { cuantosAsistentes, opcionesDeAsistentes, SOLO_YO } from "./asistentes";

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

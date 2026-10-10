import { describe, expect, it } from "vitest";
import { numeroEntreIguales } from "./numeroEntreIguales";

/**
 * Como se titulan las fichas de acompañante.
 *
 * Antes se titulaban por la posicion en la lista --«Acompañante 1, 2, 3»-- y
 * cada una llevaba un interruptor preguntando si era menor, que es lo que el
 * contador de arriba acababa de responder. El cliente lo zanjo el 09/10/2026:
 * «directo dime que rellene el nombre del adulto y abajo del menor».
 *
 * Lo que esto comprueba es que cada clase se cuenta por su cuenta. Numerar por
 * la posicion global da «Adulto 1, Menor 2, Menor 3», donde el 2 no significa
 * nada.
 */

const gente = (...menores: boolean[]) =>
  menores.map((esMenor) => ({ esMenor }));

describe("el número de una ficha entre las de su clase", () => {
  it("cuenta los adultos y los menores por separado", () => {
    // Un adulto y dos menores: el primer menor es el 1, no el 2.
    const lista = gente(false, true, true);

    expect(numeroEntreIguales(lista, 0)).toBe(1);
    expect(numeroEntreIguales(lista, 1)).toBe(1);
    expect(numeroEntreIguales(lista, 2)).toBe(2);
  });

  it("sin menores, los adultos se numeran de corrido", () => {
    const lista = gente(false, false, false);

    expect(numeroEntreIguales(lista, 0)).toBe(1);
    expect(numeroEntreIguales(lista, 1)).toBe(2);
    expect(numeroEntreIguales(lista, 2)).toBe(3);
  });

  it("y sin adultos, los menores igual", () => {
    const lista = gente(true, true);

    expect(numeroEntreIguales(lista, 0)).toBe(1);
    expect(numeroEntreIguales(lista, 1)).toBe(2);
  });

  it("un índice que no existe no revienta la pantalla", () => {
    // El `map` del JSX no puede pasarlo, pero una lista que se encoge
    // mientras se pinta sí: devuelve 1 en vez de tirar la pantalla entera.
    expect(numeroEntreIguales(gente(false), 7)).toBe(1);
    expect(numeroEntreIguales([], 0)).toBe(1);
  });
});

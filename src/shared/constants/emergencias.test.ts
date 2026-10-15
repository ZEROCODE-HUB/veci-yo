import { describe, expect, it } from "vitest";
import { policiaDelPais } from "./emergencias";

/**
 * El número de la policía según el país del edificio (15/10/2026).
 *
 * Era un 123 escrito a fuego en la portería: el de Colombia. En Perú es el 105.
 */
describe("el número de la policía de cada país", () => {
  it("Colombia y Perú, los dos donde opera hoy Veciyo", () => {
    expect(policiaDelPais("CO")).toBe("123");
    expect(policiaDelPais("PE")).toBe("105");
  });

  it("sin país o con uno que no se conoce, no se adivina", () => {
    expect(policiaDelPais(null)).toBe("");
    expect(policiaDelPais("ZZ")).toBe("");
  });

  it("da igual cómo venga escrito el código", () => {
    expect(policiaDelPais("pe")).toBe("105");
  });
});

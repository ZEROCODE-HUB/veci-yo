import { describe, expect, it } from "vitest";
import { cuentaDeAcompanantes } from "./acompanantes";

/**
 * El número y la lista tienen que decir lo mismo. Es la comprobación que
 * faltaba: `acompanantes` es un entero y `participante_reserva` son filas, y
 * nadie miraba si cuadraban.
 */
describe("cuántos acompañantes lleva una reserva", () => {
  it("son los nombres escritos, sin descontar al titular", () => {
    // El caso real: Tomás reserva la lavandería con Marina y Julián. La lista
    // no incluye a Tomás, así que son dos, no uno.
    expect(
      cuentaDeAcompanantes([{ nombre: "Marina Vega" }, { nombre: "Julián Vega" }]),
    ).toBe(2);
  });

  it("va solo: cero", () => {
    expect(cuentaDeAcompanantes([])).toBe(0);
  });

  it("los campos en blanco no son personas", () => {
    // Elegir «3 personas» y escribir dos nombres deja un campo vacío.
    expect(
      cuentaDeAcompanantes([
        { nombre: "Marina Vega" },
        { nombre: "   " },
        { nombre: "" },
      ]),
    ).toBe(1);
    expect(cuentaDeAcompanantes([{ nombre: null }, { nombre: undefined }, {}])).toBe(
      0,
    );
  });

  it("cuadra con la lista que se manda a la base", () => {
    /*
      Las dos cosas salen del mismo sitio en el formulario, y el defecto fue
      justo que no: la lista mandaba los nombres enteros y el numero restaba
      uno.
    */
    const asistentes = [
      { nombre: "Marina Vega" },
      { nombre: "" },
      { nombre: "Julián Vega" },
    ];
    const participantes = asistentes.filter((p) => p.nombre?.trim());
    expect(cuentaDeAcompanantes(asistentes)).toBe(participantes.length);
  });
});

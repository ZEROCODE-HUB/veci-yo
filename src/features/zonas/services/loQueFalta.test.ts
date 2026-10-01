import { describe, expect, it } from "vitest";
import { frasede, loQueFalta } from "./loQueFalta";

const completo = {
  hora: "07:30 - 08:30",
  pideNumero: true,
  numero: "Lavanderia N°2",
  aceptaReglamento: true,
};

describe("qué le falta a la reserva", () => {
  it("nada, cuando está todo", () => {
    expect(loQueFalta(completo)).toEqual([]);
    expect(frasede([])).toBe("");
  });

  it("el número cuenta, que era justo el que se colaba", () => {
    /*
      `numero` era `z.string().optional()` en el esquema y no entraba en el
      `disabled` del boton, asi que se podia reservar sin elegir lavadora. Y
      desde que la base asigna el primer puesto libre a quien llega sin
      numero, el fallo dejo de verse: la reserva salia bien.
    */
    expect(loQueFalta({ ...completo, numero: "" })).toEqual([
      "elegir el número",
    ]);
  });

  it("pero solo si la zona tiene más de un puesto", () => {
    // La piscina es una. No hay nada que elegir y no puede faltar.
    expect(
      loQueFalta({ ...completo, pideNumero: false, numero: "" }),
    ).toEqual([]);
  });

  it("la hora y el reglamento siguen contando", () => {
    expect(loQueFalta({ ...completo, hora: "" })).toEqual(["elegir una hora"]);
    expect(loQueFalta({ ...completo, aceptaReglamento: false })).toEqual([
      "aceptar el reglamento",
    ]);
  });

  it("y se dicen todas juntas, en una frase que se lee", () => {
    const falta = loQueFalta({
      ...completo,
      numero: "",
      aceptaReglamento: false,
    });
    expect(falta).toEqual(["elegir el número", "aceptar el reglamento"]);
    expect(frasede(falta)).toBe(
      "Falta elegir el número y aceptar el reglamento.",
    );
  });

  it("tres cosas se separan con comas y una «y»", () => {
    expect(
      frasede(["elegir una hora", "elegir el número", "aceptar el reglamento"]),
    ).toBe("Falta elegir una hora, elegir el número y aceptar el reglamento.");
  });

  it("los acompañantes no faltan nunca: se puede ir solo", () => {
    // «Cantidad de personas que asistiran junto al titular» no tiene opcion
    // para cero, asi que dejarlo en blanco **es** ir solo. Por eso es
    // opcional y por eso la etiqueta lo dice.
    expect(loQueFalta(completo)).toEqual([]);
  });
});

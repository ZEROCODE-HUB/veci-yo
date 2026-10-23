import { describe, expect, it } from "vitest";
import { compararDocumento } from "./compararDocumento";

/**
 * Lo que lee el celular de una cédula es texto sucio: saltos de línea, puntos
 * en el número, mayúsculas sin tildes. La comparación es flexible a propósito
 * (el cliente, hueco 2), pero no tanto como para dar por buena cualquier cosa.
 */
const ficha = { numero: "1012345678", nombre: "Tomás", apellidos: "Gómez Ruiz" };

const cedula = `REPUBLICA DE COLOMBIA
IDENTIFICACION PERSONAL
CEDULA DE CIUDADANIA
NUMERO 1.012.345.678
GOMEZ RUIZ
APELLIDOS
TOMAS
NOMBRES`;

describe("comparar el documento escaneado con el registrado", () => {
  it("el número, aunque venga con puntos", () => {
    expect(compararDocumento(cedula, ficha)).toBe("numero");
  });

  it("el número con espacios o guiones también", () => {
    expect(compararDocumento("No. 1 012 345-678", ficha)).toBe("numero");
  });

  it("sin el número, el nombre completo sin tildes vale", () => {
    expect(compararDocumento("GOMEZ RUIZ\nTOMAS", { ...ficha, numero: "999999" })).toBe("nombre");
  });

  it("solo una parte del nombre no basta", () => {
    expect(compararDocumento("TOMAS PEREZ", { ...ficha, numero: "999999" })).toBeNull();
  });

  it("otro número no coincide", () => {
    expect(compararDocumento("NUMERO 1.098.765.432\nPEREZ\nANA", ficha)).toBeNull();
  });

  it("un número registrado demasiado corto no se busca: casaría con cualquier cosa", () => {
    expect(compararDocumento("2026 123", { numero: "123", nombre: "Ana" })).toBeNull();
  });
});

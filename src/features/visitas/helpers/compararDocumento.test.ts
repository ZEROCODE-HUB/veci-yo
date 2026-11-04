import { describe, expect, it } from "vitest";
import { compararDocumento, diagnosticoDeLaComparacion } from "./compararDocumento";

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

  // Para Claude 225 (04/11/2026): el mismo documento salía «no coincide».
  it("las letras que el lector confunde con cifras se leen como cifras", () => {
    expect(compararDocumento("NUMERO 1.0l2.345.67B", ficha)).toBe("numero");
    expect(compararDocumento("No. 52O.l34", { numero: "520134" })).toBe("numero");
  });

  it("en un número de 6 cifras o más se perdona una cifra mal leída", () => {
    expect(compararDocumento("NUMERO 1.012.845.678", ficha)).toBe("numero");
    expect(compararDocumento("52O.l39", { numero: "520134" })).toBe("numero");
  });

  it("dos cifras mal leídas ya no", () => {
    expect(compararDocumento("NUMERO 1.012.845.670\nPEREZ\nANA", ficha)).toBeNull();
  });

  it("con 5 cifras no se perdona ninguna", () => {
    expect(compararDocumento("12346", { numero: "12345" })).toBeNull();
  });

  it("separadores con comas o barras", () => {
    expect(compararDocumento("1,012,345,678", ficha)).toBe("numero");
    expect(compararDocumento("1/012/345/678", ficha)).toBe("numero");
  });

  it("un pasaporte con letras se busca tal cual", () => {
    expect(compararDocumento("PASAPORTE\nAB 123 456", { numero: "AB123456" })).toBe("numero");
  });

  it("basta una palabra del nombre y una de los apellidos", () => {
    const conSegundoNombre = { numero: "999999", nombre: "Tomás Andrés", apellidos: "Gómez Ruiz" };
    expect(compararDocumento("GOMEZ\nTOMAS", conSegundoNombre)).toBe("nombre");
  });

  it("solo los apellidos no bastan", () => {
    expect(compararDocumento("GOMEZ RUIZ", { ...ficha, numero: "999999" })).toBeNull();
  });

  it("una letra mal leída en una palabra larga se perdona", () => {
    const gonzalez = { numero: "999999", nombre: "María", apellidos: "González" };
    expect(compararDocumento("GONZALEZ\nMARIA", gonzalez)).toBe("nombre");
    expect(compararDocumento("G0NZALEZ\nMARIA", gonzalez)).toBe("nombre");
  });

  it("en una palabra corta no se perdona ninguna letra", () => {
    expect(compararDocumento("GONZALEZ\nMARlO", { numero: "999999", nombre: "Ana", apellidos: "González" })).toBeNull();
  });

  it("la ñ se compara como n (la zona de lectura del documento no la trae)", () => {
    expect(compararDocumento("NUNEZ<<JOSE", { numero: "999999", nombre: "José", apellidos: "Núñez" })).toBe(
      "nombre",
    );
  });

  it("el diagnóstico dice cuánto casó, sin datos de la persona", () => {
    const d = diagnosticoDeLaComparacion("NUMERO 1.098.345.678\nPEREZ\nTOMAS", ficha);
    expect(d).toBe("número: 8 de 10 cifras; nombre: 1 de 1; apellidos: 0 de 2");
    expect(d).not.toMatch(/tomas|gomez|1012345678/i);
  });
});

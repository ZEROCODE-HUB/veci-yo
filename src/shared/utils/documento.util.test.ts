import { describe, expect, it } from "vitest";
import { errorDeDocumento, pistaDeDocumento } from "./documento.util";

const cedula = { soloCifras: true, largoMinimo: 5, largoMaximo: 12 };
const dni = { soloCifras: true, largoMinimo: 8, largoMaximo: 8 };
const pasaporte = { soloCifras: false, largoMinimo: 6, largoMaximo: 9 };

describe("el aviso del documento nombra el documento (23/11/2026)", () => {
  it("cada error dice «número de documento», no solo «número»", () => {
    for (const error of [
      errorDeDocumento("1234", cedula),
      errorDeDocumento("AB12", cedula),
      errorDeDocumento("AB!!12", pasaporte),
      errorDeDocumento("12"),
    ]) {
      expect(error).toMatch(/número de documento/);
    }
  });

  it("dice el largo que se acepta y cuánto tiene", () => {
    expect(errorDeDocumento("1234", cedula)).toMatch(/entre 5 y 12 cifras \(tiene 4\)/);
    expect(errorDeDocumento("1234567", dni)).toMatch(/tener 8 cifras/);
    expect(errorDeDocumento("AB12", pasaporte)).toMatch(/entre 6 y 9 caracteres/);
  });

  it("lo que vale no da error", () => {
    expect(errorDeDocumento("1.036.654.321", cedula)).toBe("");
    expect(errorDeDocumento("", cedula)).toBe("");
  });

  it("la pista dice lo que se acepta, y nada sin regla", () => {
    expect(pistaDeDocumento(cedula)).toBe("Solo números, entre 5 y 12 cifras");
    expect(pistaDeDocumento(dni)).toBe("Solo números, 8 cifras");
    expect(pistaDeDocumento(pasaporte)).toBe("Letras y números, entre 6 y 9 caracteres");
    expect(pistaDeDocumento(null)).toBe("");
  });
});

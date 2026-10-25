import { describe, expect, it } from "vitest";
import {
  errorDeCorreo,
  errorDeDocumento,
  errorDeTelefono,
  errorDeVehiculos,
  yaPaso,
} from "./validarVisita";

/**
 * Cada regla con su contrario al lado: sin el caso que pasa, una función que
 * rechazara todo daría lo mismo.
 */
/** Los valores de hoy de telefono_largo_minimo / telefono_largo_maximo. */
const LARGO = { minimo: 7, maximo: 15 };

/** El largo de la placa que trae la base hoy (`placa_largo_*`). */
const L = { minimo: 4, maximo: 8 };

describe("lo que una visita nueva no puede llevar", () => {
  it("un documento con símbolos o demasiado corto", () => {
    expect(errorDeDocumento("ABC!!")).not.toBe("");
    expect(errorDeDocumento("12")).not.toBe("");
    expect(errorDeDocumento("10.203.040")).toBe("");
    expect(errorDeDocumento("AB123456")).toBe("");
    // Vacío no es un error: en una visita de amigos es opcional.
    expect(errorDeDocumento("  ")).toBe("");
    // Con la regla del país, la suya (una cédula colombiana: 5 a 12 cifras).
    const cedula = { soloCifras: true, largoMinimo: 5, largoMaximo: 12 };
    expect(errorDeDocumento("1036654321", cedula)).toBe("");
    expect(errorDeDocumento("AB123456", cedula)).toMatch(/solo números/);
    expect(errorDeDocumento("1234", cedula)).toMatch(/entre 5 y 12/);
    expect(errorDeDocumento("1234567890123", cedula)).toMatch(/entre 5 y 12/);
    // Y los números de la regla son los del panel, no unos escritos aquí.
    const dniPeru = { soloCifras: true, largoMinimo: 8, largoMaximo: 8 };
    expect(errorDeDocumento("1234567", dniPeru)).toMatch(/entre 8 y 8/);
    expect(errorDeDocumento("AB123456", { soloCifras: false, largoMinimo: 4, largoMaximo: 20 })).toBe("");
  });

  it("un correo sin arroba o sin dominio", () => {
    expect(errorDeCorreo("correo-malo")).not.toBe("");
    expect(errorDeCorreo("a@b")).not.toBe("");
    expect(errorDeCorreo("ana@ejemplo.com")).toBe("");
    expect(errorDeCorreo("")).toBe("");
  });

  it("un teléfono que no se puede marcar", () => {
    expect(errorDeTelefono("12", LARGO)).not.toBe("");
    expect(errorDeTelefono("300 123 4567", LARGO)).toBe("");
    expect(errorDeTelefono("", LARGO)).toBe("");
  });

  it("un vehículo sin placa, con una placa rara o repetida", () => {
    expect(errorDeVehiculos([""], L)).toMatch(/placa de cada/);
    expect(errorDeVehiculos(["A!"], L)).toMatch(/Revisa la placa/);
    expect(errorDeVehiculos(["ABC123", "abc-123"], L)).toMatch(/repetida/);
    expect(errorDeVehiculos(["ABC123", "XYZ987"], L)).toBe("");
    expect(errorDeVehiculos([], L)).toBe("");
    // El largo es el de la base, medido sin espacios ni guiones.
    expect(errorDeVehiculos(["AB-1 23"], L)).toBe("");
    expect(errorDeVehiculos(["ABC123456"], L)).toMatch(/entre 4 y 8/);
    expect(errorDeVehiculos(["ABC123456"], { minimo: 4, maximo: 10 })).toBe("");
  });

  it("un día que ya pasó", () => {
    expect(yaPaso("2026-10-05", "2026-10-12")).toBe(true);
    expect(yaPaso("2026-10-12", "2026-10-12")).toBe(false);
    expect(yaPaso("2026-10-13", "2026-10-12")).toBe(false);
  });
});

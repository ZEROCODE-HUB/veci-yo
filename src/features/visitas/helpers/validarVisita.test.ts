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

describe("lo que una visita nueva no puede llevar", () => {
  it("un documento con símbolos o demasiado corto", () => {
    expect(errorDeDocumento("ABC!!")).not.toBe("");
    expect(errorDeDocumento("12")).not.toBe("");
    expect(errorDeDocumento("10.203.040")).toBe("");
    expect(errorDeDocumento("AB123456")).toBe("");
    // Vacío no es un error: en una visita de amigos es opcional.
    expect(errorDeDocumento("  ")).toBe("");
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
    expect(errorDeVehiculos([""])).toMatch(/placa de cada/);
    expect(errorDeVehiculos(["A!"])).toMatch(/Revisa la placa/);
    expect(errorDeVehiculos(["ABC123", "abc-123"])).toMatch(/repetida/);
    expect(errorDeVehiculos(["ABC123", "XYZ987"])).toBe("");
    expect(errorDeVehiculos([])).toBe("");
  });

  it("un día que ya pasó", () => {
    expect(yaPaso("2026-10-05", "2026-10-12")).toBe(true);
    expect(yaPaso("2026-10-12", "2026-10-12")).toBe(false);
    expect(yaPaso("2026-10-13", "2026-10-12")).toBe(false);
  });
});

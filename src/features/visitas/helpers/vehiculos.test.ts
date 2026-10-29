import { describe, expect, it } from "vitest";
import { placasConResponsable } from "./vehiculos";

describe("los vehículos de una visita, en una línea", () => {
  it("cada uno dice quién responde por él", () => {
    expect(
      placasConResponsable([
        { placa: "ABC123", responsable: "Oscar Prueba" },
        { placa: "XYZ987" },
      ]),
    ).toBe("ABC123 (responde Oscar Prueba) · XYZ987");
  });

  it("con marca y color, los dice detrás de la placa (hueco 27)", () => {
    expect(
      placasConResponsable([{ placa: "ABC123", marca: "Mazda", color: "gris", responsable: "Oscar" }]),
    ).toBe("ABC123, Mazda gris (responde Oscar)");
  });

  it("sin vehículos no escribe nada", () => {
    expect(placasConResponsable([])).toBe("");
    expect(placasConResponsable(undefined)).toBe("");
  });
});

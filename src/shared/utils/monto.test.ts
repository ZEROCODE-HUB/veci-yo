import { describe, expect, it } from "vitest";
import { montoDesdeTexto } from "./monto";

describe("un importe tecleado, a número", () => {
  it("el punto de los miles no es una coma decimal", () => {
    // El caso real: «850.000» se guardaba como 850.
    expect(montoDesdeTexto("850.000")).toBe(850000);
    expect(montoDesdeTexto("1.500.000")).toBe(1500000);
    expect(montoDesdeTexto("1,500,000")).toBe(1500000);
  });

  it("y los decimales se respetan", () => {
    expect(montoDesdeTexto("1.500.000,50")).toBe(1500000.5);
    expect(montoDesdeTexto("850000,5")).toBe(850000.5);
    expect(montoDesdeTexto("99.9")).toBe(99.9);
  });

  it("sin separadores es lo que es", () => {
    expect(montoDesdeTexto("850000")).toBe(850000);
    expect(montoDesdeTexto(" $ 850000 ")).toBe(850000);
  });

  it("vacío es «sin monto», no cero", () => {
    expect(montoDesdeTexto("")).toBeNull();
    expect(montoDesdeTexto("   ")).toBeNull();
  });

  it("lo que no es un importe, se dice", () => {
    expect(montoDesdeTexto("mucho")).toBeNaN();
    expect(montoDesdeTexto("12.34.5")).toBeNaN();
    expect(montoDesdeTexto("-500")).toBeNaN();
  });
});

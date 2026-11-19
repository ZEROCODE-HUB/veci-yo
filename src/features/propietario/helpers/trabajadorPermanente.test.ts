import { describe, expect, it } from "vitest";
import { detalleDelTrabajador } from "./trabajadorPermanente";

describe("detalleDelTrabajador", () => {
  it("dice si tiene la app o si falta que acepte", () => {
    expect(detalleDelTrabajador({ oficio: "Chofer", conApp: false, tieneCuenta: false })).toBe("Chofer · sin app");
    expect(detalleDelTrabajador({ oficio: null, conApp: true, tieneCuenta: false })).toMatch(/falta que acepte/);
    expect(detalleDelTrabajador({ oficio: "Empleada", conApp: true, tieneCuenta: true })).toBe("Empleada · con app");
  });
});

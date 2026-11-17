import { describe, expect, it } from "vitest";
import { detalleDelTrabajador, errorDelTrabajador } from "./trabajadorPermanente";

const BASE = { nombre: "Rosa Pérez", oficio: "", codigoPais: "CO", telefono: "", conApp: false, correo: "" };

describe("errorDelTrabajador", () => {
  it("sin app basta el nombre", () => {
    expect(errorDelTrabajador(BASE)).toBeNull();
    expect(errorDelTrabajador({ ...BASE, nombre: " " })).toBe("Falta el nombre");
  });

  it("con app pide el correo", () => {
    expect(errorDelTrabajador({ ...BASE, conApp: true })).toMatch(/correo/);
    expect(errorDelTrabajador({ ...BASE, conApp: true, correo: "rosa@correo.com" })).toBeNull();
  });

  it("el teléfono, si va, lleva cifras", () => {
    expect(errorDelTrabajador({ ...BASE, telefono: "abc" })).toMatch(/cifras/);
    expect(errorDelTrabajador({ ...BASE, telefono: "300 123 4567" })).toBeNull();
  });
});

describe("detalleDelTrabajador", () => {
  it("dice si tiene la app o si falta que acepte", () => {
    expect(detalleDelTrabajador({ oficio: "Chofer", conApp: false, tieneCuenta: false })).toBe("Chofer · sin app");
    expect(detalleDelTrabajador({ oficio: null, conApp: true, tieneCuenta: false })).toMatch(/falta que acepte/);
    expect(detalleDelTrabajador({ oficio: "Empleada", conApp: true, tieneCuenta: true })).toMatch(/contesta el intercomunicador/);
  });
});

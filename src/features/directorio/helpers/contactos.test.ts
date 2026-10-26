import { describe, expect, it } from "vitest";
import { enlaceDeWhatsApp, numeroParaMarcar } from "./contactos";

describe("contactos de la vivienda", () => {
  it("marca con el prefijo del país", () => {
    expect(numeroParaMarcar("CO", "310 555-1001")).toBe("+57 3105551001");
  });

  it("sin país marca el número tal cual, sin inventarle prefijo", () => {
    expect(numeroParaMarcar(null, "3105551001")).toBe("3105551001");
  });

  it("WhatsApp lleva el número internacional entero", () => {
    expect(enlaceDeWhatsApp("PE", "987 654 321")).toBe("https://wa.me/51987654321");
  });

  it("sin país no hay enlace de WhatsApp", () => {
    expect(enlaceDeWhatsApp(null, "987654321")).toBeNull();
    expect(enlaceDeWhatsApp("CO", "")).toBeNull();
  });
});

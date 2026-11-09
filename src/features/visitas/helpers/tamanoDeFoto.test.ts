import { describe, expect, it } from "vitest";
import { tamanoParaLeer } from "./tamanoDeFoto";

describe("tamanoParaLeer", () => {
  it("elige el más pequeño entre 1920 y 2600 por el lado largo", () => {
    expect(tamanoParaLeer(["4000x3000", "640x480", "1280x720", "2048x1536", "1920x1080"])).toBe(
      "1920x1080",
    );
  });

  it("nunca la foto entera, que tumbaba la app (26/10/2026)", () => {
    expect(tamanoParaLeer(["640x480", "1280x960", "4000x3000"])).toBe("1280x960");
  });

  it("si todos pasan del máximo, el más pequeño", () => {
    expect(tamanoParaLeer(["4000x3000", "3264x2448"])).toBe("3264x2448");
  });

  it("si ninguno llega, el más grande que haya", () => {
    expect(tamanoParaLeer(["320x240", "640x480"])).toBe("640x480");
  });

  it("ignora los preajustes sin medidas, y sin medidas no elige", () => {
    expect(tamanoParaLeer(["Photo", "High", "1920x1080"])).toBe("1920x1080");
    expect(tamanoParaLeer(["Photo", "High"])).toBeUndefined();
    expect(tamanoParaLeer([])).toBeUndefined();
  });

  it("en iPhone, la foto entera (09/11/2026: con 1920x1080 salía de 1080x926)", () => {
    expect(tamanoParaLeer(["Photo", "High", "1920x1080"], "ios")).toBe("Photo");
    expect(tamanoParaLeer(["1920x1080"], "ios")).toBe("1920x1080");
    expect(tamanoParaLeer(["Photo", "1920x1080"], "android")).toBe("1920x1080");
  });
});

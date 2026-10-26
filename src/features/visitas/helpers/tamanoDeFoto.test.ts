import { describe, expect, it } from "vitest";
import { tamanoParaLeer } from "./tamanoDeFoto";

describe("tamanoParaLeer", () => {
  it("elige el más pequeño que llega a 1280 por el lado largo", () => {
    expect(tamanoParaLeer(["4000x3000", "640x480", "1280x720", "1920x1080"])).toBe("1280x720");
  });

  it("no se queda con uno que no llega, aunque sea el más pequeño", () => {
    expect(tamanoParaLeer(["320x240", "1600x1200", "4000x3000"])).toBe("1600x1200");
  });

  it("si ninguno llega, el más grande que haya", () => {
    expect(tamanoParaLeer(["320x240", "640x480"])).toBe("640x480");
  });

  it("ignora los preajustes sin medidas, y sin medidas no elige", () => {
    expect(tamanoParaLeer(["Photo", "High", "1920x1080"])).toBe("1920x1080");
    expect(tamanoParaLeer(["Photo", "High"])).toBeUndefined();
    expect(tamanoParaLeer([])).toBeUndefined();
  });
});

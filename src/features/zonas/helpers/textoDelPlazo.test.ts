import { describe, expect, it } from "vitest";
import { textoDelPlazo } from "./textoDelPlazo";

describe("el plazo en palabras", () => {
  it("solo minutos, solo horas, o las dos", () => {
    expect(textoDelPlazo(45)).toBe("45 min");
    expect(textoDelPlazo(120)).toBe("2 h");
    expect(textoDelPlazo(90)).toBe("1 h 30 min");
  });
});

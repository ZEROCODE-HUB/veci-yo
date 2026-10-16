import { describe, expect, it } from "vitest";
import { claveDeIcono } from "./claveDeIcono";

describe("qué ilustración le toca a una zona", () => {
  it("la clave que eligió la administración", () => {
    expect(claveDeIcono({ emoji: "gym", nombre: "Lo que sea" })).toBe("gym");
  });
  it("si guarda un emoji, por el nombre", () => {
    expect(claveDeIcono({ emoji: "🏊", nombre: "Piscina" })).toBe("piscina");
    expect(claveDeIcono({ emoji: "🏛️", nombre: "Lavandería 2" })).toBe("lavanderia");
    expect(claveDeIcono({ emoji: "", nombre: "Sala de juegos" })).toBe("sala-juegos");
    expect(claveDeIcono({ emoji: "", nombre: "Gimnasio" })).toBe("gym");
  });
  it("sin coincidencia, ninguna: se queda el emoji", () => {
    expect(claveDeIcono({ emoji: "🎉", nombre: "Salón de eventos" })).toBeNull();
  });
});

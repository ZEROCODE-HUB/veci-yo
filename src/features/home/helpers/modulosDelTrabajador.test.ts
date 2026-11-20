import { describe, expect, it } from "vitest";
import { modulosDelTrabajador } from "./modulosDelTrabajador";

const MODULOS = [
  { id: "correspondencia", label: "Correspondencia" },
  { id: "visitas", label: "Visitas" },
  { id: "zonas-comunes", label: "Zonas Comunes" },
  { id: "anuncios", label: "Anuncios y encuestas" },
  { id: "ranking", label: "Cuadro de Honor" },
  { id: "reglas", label: "Gestión y Renta Corta" },
];

describe("los módulos del profesional permanente", () => {
  it("con permiso de crear visitas: Visitas y Anuncios, nada más", () => {
    expect(modulosDelTrabajador(MODULOS, true).map((m) => m.id)).toEqual(["visitas", "anuncios"]);
  });

  it("sin el permiso: solo Anuncios", () => {
    expect(modulosDelTrabajador(MODULOS, false).map((m) => m.id)).toEqual(["anuncios"]);
  });

  it("Anuncios sin «encuestas»: no vota", () => {
    expect(modulosDelTrabajador(MODULOS, false)[0].label).toBe("Anuncios");
  });
});

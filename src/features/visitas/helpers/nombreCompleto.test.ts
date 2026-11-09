import { describe, expect, it } from "vitest";
import { nombreCompletoDeLaVisita } from "./nombreCompleto";

describe("nombre completo del titular (Correcciones fila 24)", () => {
  it("nombre y apellidos del primer invitado", () => {
    expect(
      nombreCompletoDeLaVisita({ nombre: "Marie", invitados: [{ nombre: "Marie", apellidos: "Dupont Leclerc" }] as never }),
    ).toBe("Marie Dupont Leclerc");
  });
  it("sin apellidos, el nombre; sin invitados, el de la visita", () => {
    expect(nombreCompletoDeLaVisita({ nombre: "Ana", invitados: [{ nombre: "Ana" }] as never })).toBe("Ana");
    expect(nombreCompletoDeLaVisita({ nombre: "Luis", invitados: [] })).toBe("Luis");
  });
});

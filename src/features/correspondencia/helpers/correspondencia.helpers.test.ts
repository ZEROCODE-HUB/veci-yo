import { describe, expect, it } from "vitest";
import { textoPaso } from "./correspondencia.helpers";

/**
 * La línea de cada paso del paquete. Salía «Recibido … por undefined» cuando
 * no había nombre (15/10/2026).
 */
describe("el texto de un paso del paquete", () => {
  it("con nombre, dice quién", () => {
    expect(textoPaso("registro", { fecha: "15/10/2026", hora: "17:58", por: "Juan Franco" })).toBe(
      "Registrado 15/10/2026 hora 17:58 por Juan Franco",
    );
  });

  it("sin nombre, no escribe «undefined»", () => {
    expect(textoPaso("recibido", { fecha: "15/10/2026", hora: "17:58" })).toBe(
      "Recibido 15/10/2026 hora 17:58",
    );
    expect(textoPaso("entregado", { fecha: "15/10/2026", hora: "18:00" })).toBe(
      "Entregado 15/10/2026 hora 18:00",
    );
  });
});

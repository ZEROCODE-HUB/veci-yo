import { describe, expect, it } from "vitest";
import { useUIStore } from "./ui-store";

/**
 * Lo que dice el aviso rojo.
 *
 * El 12/10/2026 el cliente intentó reconocerse a sí mismo y leyó en pantalla
 * «new row for relation "reconocimiento" violates check constraint
 * "reconocimiento_no_autootorgado"». La traducción existía; quien mostraba el
 * aviso no pasaba por ella, y como él había casi veinte sitios.
 */
const ultimo = () => useUIStore.getState().toasts.at(-1)!.message;

describe("el aviso de error", () => {
  it("traduce la restricción que conoce", () => {
    useUIStore
      .getState()
      .addToast(
        'new row for relation "reconocimiento" violates check constraint "reconocimiento_no_autootorgado"',
        "error",
      );
    expect(ultimo()).toBe("No puedes darte un reconocimiento a ti mismo.");
  });

  it("y calla la que no: nunca el nombre de una tabla", () => {
    useUIStore
      .getState()
      .addToast(
        'new row for relation "cosa" violates check constraint "cosa_rara"',
        "error",
      );
    expect(ultimo()).not.toMatch(/relation|constraint|cosa/);
    expect(ultimo().trim()).not.toBe("");
  });

  it("deja pasar la frase escrita para leerse", () => {
    useUIStore
      .getState()
      .addToast("Esta encuesta admite un solo voto por persona", "error");
    expect(ultimo()).toBe("Esta encuesta admite un solo voto por persona");
  });

  it("y no toca los avisos que no son de error", () => {
    useUIStore.getState().addToast("Guardado", "success");
    expect(ultimo()).toBe("Guardado");
  });
});

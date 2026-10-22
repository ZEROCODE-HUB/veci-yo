import { describe, expect, it } from "vitest";
import { limitesDeLasFechas } from "./EditarEstancia";

/**
 * Al cambiar las fechas de una estancia se podía elegir una salida anterior a
 * la llegada, y al revés (Para Claude, 21/10/2026).
 */
const hoy = new Date(2026, 9, 22, 15);
const dia = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-");

describe("limitesDeLasFechas", () => {
  it("la salida se ofrece desde el día siguiente a la llegada", () => {
    const l = limitesDeLasFechas("2026-10-25", "2026-10-28", hoy);
    expect(dia(l.salidaMinima)).toBe("2026-10-26");
    expect(dia(l.llegadaMinima)).toBe("2026-10-22");
    expect(l.error).toBeNull();
  });

  it("una salida igual o anterior a la llegada es un error", () => {
    expect(limitesDeLasFechas("2026-10-25", "2026-10-25", hoy).error).toMatch(/un día después/);
    expect(limitesDeLasFechas("2026-10-25", "2026-10-23", hoy).error).toMatch(/un día después/);
  });

  it("mover la llegada después de la salida también es un error", () => {
    expect(limitesDeLasFechas("2026-10-30", "2026-10-28", hoy).error).toMatch(/un día después/);
  });

  it("si ya entraron (llegada pasada), la salida se ofrece desde hoy", () => {
    const l = limitesDeLasFechas("2026-10-20", "2026-10-24", hoy);
    expect(dia(l.salidaMinima)).toBe("2026-10-22");
    expect(l.error).toBeNull();
  });
});

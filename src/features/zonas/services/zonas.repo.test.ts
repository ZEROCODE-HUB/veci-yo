import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/services/supabase", () => ({ supabase: {} }));
vi.mock("@/shared/utils", () => ({ formatDate: (d: Date) => d.toISOString() }));

const { franjas } = await import("./zonas.repo");

/**
 * Las franjas horarias de una zona común.
 *
 * El prototipo las traía fijas por zona. Al quitar ese mock quedaron en `[]` y
 * el selector de horas de la reserva no ofrecía nada: se generan a partir del
 * horario de la zona y de su duración máxima.
 */

describe("franjas", () => {
  it("parte el horario en tramos de la duración máxima", () => {
    // La piscina del condominio de prueba: 08:00 a 20:00, 120 minutos.
    expect(franjas("08:00:00", "20:00:00", 120)).toEqual([
      "08:00 - 10:00",
      "10:00 - 12:00",
      "12:00 - 14:00",
      "14:00 - 16:00",
      "16:00 - 18:00",
      "18:00 - 20:00",
    ]);
  });

  it("no pasa del horario de cierre", () => {
    // De 08:00 a 13:00 con tramos de 2 h entran dos, no dos y media.
    expect(franjas("08:00:00", "13:00:00", 120)).toEqual([
      "08:00 - 10:00",
      "10:00 - 12:00",
    ]);
  });

  it("respeta los tramos de una hora", () => {
    expect(franjas("06:00:00", "09:00:00", 60)).toEqual([
      "06:00 - 07:00",
      "07:00 - 08:00",
      "08:00 - 09:00",
    ]);
  });

  it("sin duración configurada usa tramos de dos horas", () => {
    expect(franjas("10:00:00", "14:00:00", null)).toEqual([
      "10:00 - 12:00",
      "12:00 - 14:00",
    ]);
  });

  it("sin horario no inventa franjas", () => {
    expect(franjas(null, "20:00:00", 120)).toEqual([]);
    expect(franjas("08:00:00", null, 120)).toEqual([]);
  });

  it("devuelve vacío si el cierre no es posterior a la apertura", () => {
    expect(franjas("20:00:00", "08:00:00", 120)).toEqual([]);
  });

  it("devuelve vacío si no cabe ni un tramo completo", () => {
    // Una zona abierta una hora no admite reservas de dos.
    expect(franjas("08:00:00", "09:00:00", 120)).toEqual([]);
  });
});

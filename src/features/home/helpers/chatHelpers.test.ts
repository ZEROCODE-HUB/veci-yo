import { describe, expect, it } from "vitest";
import { cuandoFue, nombreDelDia } from "./chatHelpers";

describe("las fechas del chat", () => {
  const hoy = new Date(2026, 9, 17, 10, 0);

  it("el día de un mensaje: hoy, ayer o la fecha", () => {
    expect(nombreDelDia("17/10/2026", hoy)).toBe("Hoy");
    expect(nombreDelDia("16/10/2026", hoy)).toBe("Ayer");
    expect(nombreDelDia("02/10/2026", hoy)).toBe("02/10/2026");
    expect(nombreDelDia("", hoy)).toBe("");
  });

  it("en la lista, la hora si fue hoy", () => {
    expect(cuandoFue("17/10/2026", "09:15", hoy)).toBe("09:15");
    expect(cuandoFue("16/10/2026", "23:50", hoy)).toBe("Ayer");
    expect(cuandoFue("24/09/2026", "00:06", hoy)).toBe("24/09/2026");
  });

  it("ayer cruza el cambio de mes", () => {
    expect(nombreDelDia("30/09/2026", new Date(2026, 9, 1, 8, 0))).toBe("Ayer");
  });
});

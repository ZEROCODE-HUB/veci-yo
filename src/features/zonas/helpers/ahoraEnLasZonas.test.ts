import { describe, expect, it } from "vitest";
import { estaEnCurso, horaMas } from "./ahoraEnLasZonas";

/** Quién está ahora en las zonas comunes (18/11/2026), para la portería. */
describe("una reserva en curso", () => {
  const hoy = "2026-11-18";
  it("es de hoy, aprobada, y la hora cae dentro", () => {
    expect(estaEnCurso({ fechaIso: hoy, horario: "10:00 - 12:00", estado: "Aprobado" }, hoy, "11:15")).toBe(true);
    expect(estaEnCurso({ fechaIso: hoy, horario: "10:00 - 12:00", estado: "Aprobado" }, hoy, "12:00")).toBe(false);
    expect(estaEnCurso({ fechaIso: hoy, horario: "10:00 - 12:00", estado: "Pendiente" }, hoy, "11:15")).toBe(false);
    expect(estaEnCurso({ fechaIso: "2026-11-19", horario: "10:00 - 12:00", estado: "Aprobado" }, hoy, "11:15")).toBe(false);
  });
  it("ampliar suma minutos sin pasar de medianoche", () => {
    expect(horaMas("12:00", 30)).toBe("12:30");
    expect(horaMas("23:45", 30)).toBe("23:59");
  });
});

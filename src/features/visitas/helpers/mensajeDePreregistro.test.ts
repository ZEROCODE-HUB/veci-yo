import { describe, expect, it } from "vitest";
import { mensajeDePreregistro } from "./mensajeDePreregistro";

describe("el mensaje del preregistro", () => {
  it("dice dónde y cuándo, pide completarlo 48 horas antes y lleva el enlace", () => {
    const m = mensajeDePreregistro({
      nombre: "Laura",
      vivienda: "102",
      torre: 1,
      condominio: "Las Barranqueras",
      ciudad: "Medellín",
      desde: "2026-11-05",
      hasta: "2026-11-08",
      enlace: "https://web/access/abc",
    });
    expect(m).toContain("Hola, Laura.");
    expect(m).toContain("Tu reserva en el alojamiento 102, torre 1, de Las Barranqueras, en Medellín del 05/11/2026 al 08/11/2026.");
    expect(m).toContain("48 horas antes de tu llegada");
    expect(m.endsWith("https://web/access/abc")).toBe(true);
  });

  it("acepta las fechas ya en dd/MM/yyyy (la ficha de la reserva)", () => {
    const m = mensajeDePreregistro({ desde: "05/11/2026", hasta: "08/11/2026", enlace: "x" });
    expect(m).toContain("del 05/11/2026 al 08/11/2026");
  });

  it("sin nombre ni datos sigue teniendo sentido", () => {
    const m = mensajeDePreregistro({ enlace: "https://web/access/abc" });
    expect(m.startsWith("Hola. Tu reserva. El edificio requiere")).toBe(true);
  });
});

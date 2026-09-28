import { describe, expect, it } from "vitest";
import { visitDateLabel } from "./visitas.helpers";
import type { VisitaItem } from "@/shared/types/visita";

/**
 * La línea que la portería lee en la lista de visitas.
 *
 * Salió recorriendo la aplicación como guardia: se registró la entrada de una
 * visita prevista para el 22 y la tarjeta dijo «Ingresó el 22/09/2026 a las
 * 16:07», con la fecha **prevista** y la hora **real** en la misma frase. La
 * base tenía bien el dato --`ingreso_en` es un `timestamptz`--; lo que se
 * perdía era la fecha al mapear, porque solo se extraía la hora.
 *
 * Importa porque es una afirmación sobre un hecho: si alguien pregunta cuándo
 * entró esa persona, la pantalla respondía un día que no fue.
 */
const base = {
  id: "1",
  nombre: "Lucía Fernández",
  tipo: "amigos",
  vehiculos: [],
  esEvento: false,
} as unknown as VisitaItem;

describe("la línea de fecha de una visita pasada", () => {
  it("dice el día en que se registró la entrada, no el previsto", () => {
    const item: VisitaItem = {
      ...base,
      fechaDesde: "22/09/2026",
      horaIngreso: "16:07",
      fechaIngreso: "28/09/2026",
    };
    expect(visitDateLabel(item)).toBe("Ingresó el 28/09/2026 a las 16:07");
  });

  it("y si no hay marca de entrada guardada, cae en la fecha prevista", () => {
    // Las visitas anteriores a que se guardara `ingreso_en` no tienen el dato.
    const item: VisitaItem = {
      ...base,
      fechaDesde: "22/09/2026",
      horaIngreso: "16:07",
    };
    expect(visitDateLabel(item)).toBe("Ingresó el 22/09/2026 a las 16:07");
  });

  it("sin entrada registrada solo dice que visitó ese día", () => {
    const item: VisitaItem = { ...base, fechaDesde: "22/09/2026" };
    expect(visitDateLabel(item)).toBe("Visitó el 22/09/2026");
  });
});

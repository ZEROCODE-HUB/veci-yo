import { describe, expect, it } from "vitest";
import { agruparParaPorteria, grupoDePorteria } from "./gruposDePorteria";
import type { VisitaItem } from "@/shared/types";

/**
 * La lista de la portería, partida en Hoy, Dentro y Mañana (11/10/2026).
 */
const HOY = "2026-10-11";
// El valor actual de `porteria_dias_a_la_vista`: hoy y mañana.
const DIAS_A_LA_VISTA = 2;

let siguiente = 1;
const visita = (datos: Partial<VisitaItem>): VisitaItem =>
  ({
    id: siguiente++,
    estado: "Programada",
    nombre: "",
    tipo: "amigos",
    ...datos,
  }) as VisitaItem;

describe("en qué grupo cae una visita", () => {
  it("quien ya entró está dentro, aunque su estancia siga mañana", () => {
    expect(
      grupoDePorteria({ estado: "Ingresado", fechaDesde: "12/10/2026" }, HOY),
    ).toBe("dentro");
  });

  it("la que llega mañana es de mañana", () => {
    expect(
      grupoDePorteria({ estado: "Programada", fechaDesde: "12/10/2026" }, HOY),
    ).toBe("manana");
  });

  it("la de hoy es de hoy", () => {
    expect(
      grupoDePorteria({ estado: "Programada", fechaDesde: "11/10/2026" }, HOY),
    ).toBe("hoy");
  });

  it("sin fecha es de hoy: es lo que se anota con la persona en la puerta", () => {
    expect(grupoDePorteria({ estado: "Programada" }, HOY)).toBe("hoy");
  });

  it("una estancia que empezó ayer y no ha entrado sigue siendo de hoy", () => {
    expect(
      grupoDePorteria({ estado: "Programada", fechaDesde: "10/10/2026" }, HOY),
    ).toBe("hoy");
  });
});

describe("la lista agrupada", () => {
  it("va Hoy, Dentro y Mañana, cada grupo con su título y su cuenta", () => {
    const filas = agruparParaPorteria(
      [
        visita({ nombre: "mañana", fechaDesde: "12/10/2026" }),
        visita({ nombre: "dentro", estado: "Ingresado" }),
        visita({ nombre: "hoy 1", fechaDesde: "11/10/2026" }),
        visita({ nombre: "hoy 2", fechaDesde: "11/10/2026" }),
      ],
      HOY,
      DIAS_A_LA_VISTA,
    );

    expect(
      filas.map((f) =>
        f.clase === "titulo" ? `${f.titulo} (${f.cuantas})` : f.item.nombre,
      ),
    ).toEqual([
      "Hoy (2)",
      "hoy 1",
      "hoy 2",
      "Dentro (1)",
      "dentro",
      "Mañana (1)",
      "mañana",
    ]);
  });

  it("un grupo vacío no deja título", () => {
    const filas = agruparParaPorteria(
      [visita({ nombre: "dentro", estado: "Ingresado" })],
      HOY,
      DIAS_A_LA_VISTA,
    );
    expect(filas.filter((f) => f.clase === "titulo")).toHaveLength(1);
  });

  it("dentro de un grupo, primero quien dijo a qué hora llega, por hora", () => {
    const filas = agruparParaPorteria(
      [
        visita({ nombre: "sin hora", fechaDesde: "11/10/2026" }),
        visita({
          nombre: "a las 18",
          fechaDesde: "11/10/2026",
          horaEstimadaLlegada: "18:00",
        }),
        visita({
          nombre: "a las 9",
          fechaDesde: "11/10/2026",
          horaEstimadaLlegada: "09:00",
        }),
      ],
      HOY,
      DIAS_A_LA_VISTA,
    );
    expect(
      filas.flatMap((f) => (f.clase === "visita" ? [f.item.nombre] : [])),
    ).toEqual(["a las 9", "a las 18", "sin hora"]);
  });

  it("no pierde ni repite ninguna", () => {
    const todas = [
      visita({ fechaDesde: "11/10/2026" }),
      visita({ fechaDesde: "12/10/2026" }),
      visita({ estado: "Ingresado" }),
      visita({ estado: "Finalizado", fechaDesde: "11/10/2026" }),
    ];
    const filas = agruparParaPorteria(todas, HOY, DIAS_A_LA_VISTA);
    expect(filas.filter((f) => f.clase === "visita")).toHaveLength(todas.length);
  });
  it("lo que llega después de los días a la vista no se lista", () => {
    // Con dos días (hoy y mañana) pasado mañana no sale; con tres, sí, y el
    // grupo ya no se puede llamar «Mañana».
    const pasado = [visita({ nombre: "pasado", fechaDesde: "13/10/2026" })];
    expect(agruparParaPorteria(pasado, HOY, DIAS_A_LA_VISTA)).toEqual([]);
    const conTres = agruparParaPorteria(pasado, HOY, 3);
    expect(conTres[0]).toMatchObject({ clase: "titulo", titulo: "Próximos días" });
  });
});

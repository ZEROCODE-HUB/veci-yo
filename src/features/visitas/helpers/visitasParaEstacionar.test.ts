import { describe, expect, it } from "vitest";
import type { VisitaItem } from "@/shared/types";
import { visitasParaEstacionar } from "./visitasParaEstacionar";

function visita(datos: Partial<VisitaItem>): VisitaItem {
  return {
    id: 1,
    tipo: "amigos",
    nombre: "Ana",
    ci: "",
    estado: "Programada",
    invitados: [],
    tieneVehiculo: true,
    esEvento: false,
    vehiculos: [],
    ...datos,
  } as VisitaItem;
}

describe("a quien se le puede dar un estacionamiento", () => {
  it("a quien esta por llegar o ya esta dentro, con su vivienda al lado", () => {
    const opciones = visitasParaEstacionar([
      visita({ uuid: "a", nombre: "Ana", torre: "1", depto: "101" }),
      visita({ uuid: "b", nombre: "Luis", estado: "Ingresado", depto: "205" }),
    ]);

    expect(opciones).toEqual([
      { value: "a", label: "Ana (1-101)" },
      { value: "b", label: "Luis (--205)" },
    ]);
  });

  it("no a quien ya se fue ni a quien se cancelo: nadie soltaria ese cupo", () => {
    const opciones = visitasParaEstacionar([
      visita({ uuid: "a", estado: "Finalizado" }),
      visita({ uuid: "b", estado: "Cancelado" }),
      visita({ uuid: "c", estado: "Ingresado" }),
    ]);

    expect(opciones.map((o) => o.value)).toEqual(["c"]);
  });

  it("ni a una visita sin identificador, que no se podria guardar", () => {
    expect(visitasParaEstacionar([visita({ uuid: undefined })])).toEqual([]);
  });

  it("solo las de hoy: ni la que ya salió ni la que llega a fin de mes (15/10/2026)", () => {
    const hoy = new Date(2026, 9, 15);
    const opciones = visitasParaEstacionar(
      [
        visita({ uuid: "hoy", fechaDesde: "15/10/2026", fechaHasta: "16/10/2026" }),
        visita({ uuid: "dentro", fechaDesde: "13/10/2026", fechaHasta: "15/10/2026" }),
        visita({ uuid: "salio", fechaDesde: "12/10/2026", fechaHasta: "13/10/2026" }),
        visita({ uuid: "futura", fechaDesde: "29/10/2026", fechaHasta: "31/10/2026" }),
        visita({ uuid: "sin-fecha" }),
      ],
      hoy,
    );
    expect(opciones.map((o) => o.value)).toEqual(["hoy", "dentro", "sin-fecha"]);
  });
});

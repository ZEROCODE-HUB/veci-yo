import { describe, expect, it } from "vitest";
import type { CorrespondenciaItem } from "@/shared/types";
import {
  filtrarCorrespondencia,
  filtrosOcultosActivos,
  opcionesDeCorrespondencia,
  type CriteriosDeCorrespondencia,
} from "./lista";

const envio = (
  campos: Partial<CorrespondenciaItem> & { uuid: string },
): CorrespondenciaItem => ({
  id: 1,
  empresa: "DHL",
  unidad: "205",
  nombre: "",
  ci: "",
  estado: "En Portería",
  fecha: "10/10/2026",
  categoria: "Paquetería",
  logistica: "DHL",
  descripcion: "",
  entregaEnPuerta: false,
  torre: "Torre 2",
  piso: "2",
  estadoEncomienda: "Buen estado",
  ...campos,
});

const SIN_FILTROS: CriteriosDeCorrespondencia = {
  busqueda: "",
  estados: [],
  categoria: "",
  soloEntregaEnPuerta: false,
  fechaDesde: "",
  fechaHasta: "",
};

const A = envio({ uuid: "a", fecha: "08/10/2026", unidad: "101" });
const B = envio({
  uuid: "b",
  fecha: "10/10/2026",
  estado: "Entregado",
  categoria: "Sobres",
  entregaEnPuerta: true,
});
const C = envio({ uuid: "c", fecha: "02/11/2026", nombre: "Ana Ruiz" });
const TODOS = [A, B, C];

const ids = (items: CorrespondenciaItem[]) => items.map((i) => i.uuid);

describe("qué se ve en la lista de correspondencia", () => {
  it("sin filtros se ve todo", () => {
    expect(ids(filtrarCorrespondencia(TODOS, SIN_FILTROS))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("las fechas filtran, las dos puntas incluidas", () => {
    const entre = {
      ...SIN_FILTROS,
      fechaDesde: "2026-10-08",
      fechaHasta: "2026-10-10",
    };
    expect(ids(filtrarCorrespondencia(TODOS, entre))).toEqual(["a", "b"]);
  });

  it("y comparan fechas, no letras: noviembre va después de octubre", () => {
    // «02/11» es menor que «10/10» como texto. Como fecha, no.
    const desde = { ...SIN_FILTROS, fechaDesde: "2026-10-09" };
    expect(ids(filtrarCorrespondencia(TODOS, desde))).toEqual(["b", "c"]);
    const hasta = { ...SIN_FILTROS, fechaHasta: "2026-10-09" };
    expect(ids(filtrarCorrespondencia(TODOS, hasta))).toEqual(["a"]);
  });

  it("se busca también por departamento", () => {
    expect(
      ids(filtrarCorrespondencia(TODOS, { ...SIN_FILTROS, busqueda: "101" })),
    ).toEqual(["a"]);
    expect(
      ids(filtrarCorrespondencia(TODOS, { ...SIN_FILTROS, busqueda: " ana " })),
    ).toEqual(["c"]);
  });

  it("estado, categoría y entrega en puerta se suman", () => {
    expect(
      ids(
        filtrarCorrespondencia(TODOS, { ...SIN_FILTROS, estados: ["Entregado"] }),
      ),
    ).toEqual(["b"]);
    expect(
      ids(filtrarCorrespondencia(TODOS, { ...SIN_FILTROS, categoria: "Sobres" })),
    ).toEqual(["b"]);
    expect(
      ids(
        filtrarCorrespondencia(TODOS, {
          ...SIN_FILTROS,
          soloEntregaEnPuerta: true,
          estados: ["En Portería"],
        }),
      ),
    ).toEqual([]);
  });

  it("se sabe cuántos filtros hay puestos con el panel plegado", () => {
    expect(filtrosOcultosActivos(SIN_FILTROS)).toBe(0);
    expect(
      filtrosOcultosActivos({
        ...SIN_FILTROS,
        categoria: "Sobres",
        fechaDesde: "2026-10-01",
        // La búsqueda y los estados están siempre a la vista: no cuentan.
        busqueda: "x",
        estados: ["Entregado"],
      }),
    ).toBe(2);
  });
});

describe("qué se puede hacer con un envío", () => {
  const acciones = (estado: CorrespondenciaItem["estado"]) =>
    opcionesDeCorrespondencia(estado).map((o) => o.accion);

  it("no se ofrece dejarlo como ya está", () => {
    expect(acciones("En Portería")).toEqual(["notificar", "entregar", "informar", "eliminar"]);
    expect(acciones("Entregado")).toEqual(["devolver", "informar", "eliminar"]);
    expect(acciones("No Recibido")).toEqual(["recibir", "informar", "eliminar"]);
  });

  it("eliminar es la única marcada como peligrosa", () => {
    const peligrosas = opcionesDeCorrespondencia("En Portería").filter(
      (o) => o.peligrosa,
    );
    expect(peligrosas.map((o) => o.accion)).toEqual(["eliminar"]);
  });
});

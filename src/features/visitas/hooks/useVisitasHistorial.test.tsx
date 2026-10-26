import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { VisitaItem } from "@/shared/types";
import { useVisitasHistorial } from "./useVisitasHistorial";

/**
 * El buscador de la lista de visitas (26/10/2026): el Inicio de la portería
 * ofrece buscar por nombre, depto, placa o código, así que la lista tiene que
 * encontrar por los cuatro. Antes no miraba la placa ni el código, y de los
 * huéspedes solo el nombre de pila.
 */
const visita = (n: number, extra: Partial<VisitaItem>): VisitaItem =>
  ({
    id: n,
    uuid: `v${n}`,
    nombre: `Visita ${n}`,
    tipo: "huesped-temporal",
    estado: "Pendiente",
    depto: String(100 + n),
    invitados: [],
    vehiculos: [],
    ...extra,
  }) as unknown as VisitaItem;

const items = [
  visita(1, {
    invitados: [{ nombre: "Ana", apellidos: "Pérez Gil", llego: false }],
    vehiculos: [{ placa: "ABC-123" } as VisitaItem["vehiculos"][number]],
    codigoAcceso: "7A0C1B2C3D4E",
  }),
  visita(2, { invitados: [{ nombre: "Luis", apellidos: "Gómez", llego: false }] }),
];

function buscar(termino: string) {
  const { result } = renderHook(() => useVisitasHistorial(items));
  act(() => result.current.setSearch(termino));
  return result.current.filteredItems.map((i) => i.uuid);
}

describe("buscar en la lista de visitas", () => {
  it("por apellido del huésped", () => {
    expect(buscar("pérez")).toEqual(["v1"]);
  });

  it("por placa, sin importar guiones ni mayúsculas", () => {
    expect(buscar("abc123")).toEqual(["v1"]);
  });

  it("por el código de la estancia, también con el prefijo del QR", () => {
    expect(buscar("7A0C1B2C3D4E")).toEqual(["v1"]);
    expect(buscar("VECIYO:7a0c1b2c3d4e")).toEqual(["v1"]);
  });

  it("el depto sigue siendo entero", () => {
    expect(buscar("102")).toEqual(["v2"]);
  });
});

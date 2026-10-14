import { describe, expect, it } from "vitest";
import type { VisitaItem } from "@/shared/types";
import { estanciasPorRecordar, mensajeDeRecordatorio } from "./porRecordar";

const estancia = (parcial: Partial<VisitaItem>): VisitaItem =>
  ({
    id: 1,
    uuid: "v",
    tipo: "huesped-temporal",
    nombre: "Ana",
    ci: "",
    estado: "Programada",
    invitados: [{ nombre: "Ana", llego: false, timeline: {} }],
    tieneVehiculo: false,
    esEvento: false,
    vehiculos: [],
    fechaDesde: "16/10/2026",
    ...parcial,
  }) as VisitaItem;

const HOY = "2026-10-14";

describe("estanciasPorRecordar", () => {
  it("sale la que llega en 3 días o menos sin preregistro", () => {
    expect(estanciasPorRecordar([estancia({})], HOY).map((e) => e.dias)).toEqual([2]);
    expect(estanciasPorRecordar([estancia({ fechaDesde: "17/10/2026" })], HOY)).toHaveLength(1);
    expect(estanciasPorRecordar([estancia({ fechaDesde: "14/10/2026" })], HOY)).toHaveLength(1);
  });

  it("no la que llega más tarde, ni la que ya pasó", () => {
    expect(estanciasPorRecordar([estancia({ fechaDesde: "18/10/2026" })], HOY)).toEqual([]);
    expect(estanciasPorRecordar([estancia({ fechaDesde: "13/10/2026" })], HOY)).toEqual([]);
  });

  it("ni la que ya cerró su preregistro, ni una cancelada, ni una visita corriente", () => {
    const cerrada = estancia({
      invitados: [{ nombre: "Ana", llego: false, timeline: { precheckinCerrado: true } }],
    });
    expect(estanciasPorRecordar([cerrada], HOY)).toEqual([]);
    expect(estanciasPorRecordar([estancia({ estado: "Cancelado" })], HOY)).toEqual([]);
    expect(estanciasPorRecordar([estancia({ tipo: "amigos" })], HOY)).toEqual([]);
  });

  it("de la más urgente a la menos", () => {
    const lista = estanciasPorRecordar(
      [estancia({ uuid: "b", fechaDesde: "17/10/2026" }), estancia({ uuid: "a" })],
      HOY,
    );
    expect(lista.map((e) => e.visita.uuid)).toEqual(["a", "b"]);
  });
});

describe("mensajeDeRecordatorio", () => {
  it("lleva el enlace y dice cuándo llega", () => {
    const m = mensajeDeRecordatorio("Ana", 1, "https://x/access/t");
    expect(m).toContain("mañana");
    expect(m).toContain("https://x/access/t");
  });
});

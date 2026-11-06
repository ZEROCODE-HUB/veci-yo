import { describe, expect, it } from "vitest";
import { opcionesDeArriba } from "./opcionesDeArriba";
import type { MembresiaCondominio } from "@/shared/services/sesion";
import type { Ubicacion } from "@/shared/types";

const condominio = (rol: MembresiaCondominio["rol"]): MembresiaCondominio =>
  ({
    condominioId: "c1",
    condominioNombre: "Green Tower 2",
    rol,
    porteriaId: null,
  }) as MembresiaCondominio;

const vivienda = (id: number, rol: Ubicacion["rol"], codigo: string, favorito = false) =>
  ({ id, rol, codigo, direccion: "Green Tower 2", favorito }) as Ubicacion;

describe("opcionesDeArriba", () => {
  // El caso de la captura del 06/11/2026: administradora, guardia y dueña.
  const base = {
    rolesDisponibles: ["administrador", "guardia", "propietario-no-residente"] as const,
    condominios: [condominio("administrador"), condominio("guardia")],
    ubicaciones: [vivienda(1, "propietario-no-residente", "103", true)],
    ubicacionActivaId: 1,
  };

  it("una fila por rol y sitio, cada una con su rol, sin repetir el activo", () => {
    const opciones = opcionesDeArriba({ ...base, rolesDisponibles: [...base.rolesDisponibles], rolActivo: "administrador" });
    expect(opciones.map((o) => o.etiqueta)).toEqual([
      "Admin · Green Tower 2",
      "Guardia · Green Tower 2",
      "Propietario no residente · Green Tower 2 · 103",
    ]);
    expect(opciones.filter((o) => o.activa).map((o) => o.rol)).toEqual(["administrador"]);
  });

  it("como propietaria, la activa es su vivienda", () => {
    const opciones = opcionesDeArriba({
      ...base,
      rolesDisponibles: [...base.rolesDisponibles],
      rolActivo: "propietario-no-residente",
    });
    expect(opciones.filter((o) => o.activa).map((o) => o.ubicacionId)).toEqual([1]);
  });

  it("un coadministrador sale como administración, y una sola vez", () => {
    const opciones = opcionesDeArriba({
      rolActivo: "administrador",
      rolesDisponibles: ["administrador"],
      condominios: [condominio("administrador"), condominio("coadministrador")],
      ubicaciones: [],
    });
    expect(opciones.map((o) => o.etiqueta)).toEqual(["Admin · Green Tower 2"]);
  });

  it("dos viviendas del mismo rol son dos filas", () => {
    const opciones = opcionesDeArriba({
      rolActivo: "propietario",
      rolesDisponibles: ["propietario"],
      condominios: [],
      ubicaciones: [vivienda(1, "propietario", "101", true), vivienda(2, "propietario", "102")],
      ubicacionActivaId: 1,
    });
    expect(opciones.map((o) => o.etiqueta)).toEqual([
      "Propietario · Green Tower 2 · 101",
      "Propietario · Green Tower 2 · 102",
    ]);
  });
});

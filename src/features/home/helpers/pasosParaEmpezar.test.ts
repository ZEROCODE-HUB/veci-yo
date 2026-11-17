import { describe, expect, it, vi } from "vitest";
import {
  cuentaDePasos,
  pasosDelAdministrador,
  pasosDelGuardia,
  pasosDelPropietario,
  type DatosDelAdministrador,
  type DatosDelPropietario,
} from "./pasosParaEmpezar";

/** «Tu edificio, paso a paso» (16/11/2026): qué pasos hay y cuáles están hechos. */

const EDIFICIO_VACIO: DatosDelAdministrador = {
  torres: 0,
  viviendas: 0,
  viviendasConPropietario: 0,
  estacionamientos: 0,
  garitas: 0,
  guardias: 0,
  zonas: 0,
  reglamentos: 0,
};

const EDIFICIO_LISTO: DatosDelAdministrador = {
  torres: 2,
  viviendas: 20,
  viviendasConPropietario: 20,
  estacionamientos: 30,
  garitas: 1,
  guardias: 3,
  zonas: 4,
  reglamentos: 1,
};

const hechos = (pasos: { id: string; hecho: boolean }[]) =>
  pasos.filter((p) => p.hecho).map((p) => p.id);

describe("la administración", () => {
  it("un edificio recién creado tiene los siete pasos pendientes", () => {
    const pasos = pasosDelAdministrador(EDIFICIO_VACIO);
    expect(pasos.map((p) => p.id)).toEqual([
      "torres",
      "estacionamientos",
      "garitas",
      "guardias",
      "zonas",
      "propietarios",
      "reglamento",
    ]);
    expect(hechos(pasos)).toEqual([]);
    expect(cuentaDePasos(pasos)).toEqual({ hechos: 0, total: 7, completa: false });
  });

  it("con todo dado de alta la lista está completa", () => {
    expect(cuentaDePasos(pasosDelAdministrador(EDIFICIO_LISTO)).completa).toBe(true);
  });

  it("una torre sin departamentos no cuenta como hecha", () => {
    const pasos = pasosDelAdministrador({ ...EDIFICIO_VACIO, torres: 1 });
    expect(pasos.find((p) => p.id === "torres")?.hecho).toBe(false);
  });

  it("los propietarios están hechos solo cuando todas las viviendas tienen uno, y lo dice", () => {
    const a_medias =pasosDelAdministrador({ ...EDIFICIO_LISTO, viviendasConPropietario: 12 });
    const paso = a_medias.find((p) => p.id === "propietarios");
    expect(paso?.hecho).toBe(false);
    expect(paso?.nota).toBe("12 de 20 departamentos");
  });

  it("sin viviendas no se dan por asignados los propietarios", () => {
    const paso = pasosDelAdministrador(EDIFICIO_VACIO).find((p) => p.id === "propietarios");
    expect(paso?.hecho).toBe(false);
    expect(paso?.nota).toBeUndefined();
  });

  it("cada paso lleva a la pantalla y pestaña donde se hace", () => {
    const destinos = Object.fromEntries(
      pasosDelAdministrador(EDIFICIO_VACIO).map((p) => [p.id, p.destino]),
    );
    expect(destinos.torres).toEqual({ ruta: "AdministradorArquitectura", params: { pestana: "Torres" } });
    expect(destinos.estacionamientos).toEqual({
      ruta: "AdministradorArquitectura",
      params: { pestana: "Estacionamientos" },
    });
    expect(destinos.garitas).toEqual({ ruta: "AdministradorArquitectura", params: { pestana: "Porterías" } });
    expect(destinos.guardias).toEqual({ ruta: "AdministradorSeguridad" });
    expect(destinos.zonas).toEqual({ ruta: "GestionZonas" });
    expect(destinos.reglamento).toEqual({ ruta: "AdministradorPermisos" });
  });
});

describe("el propietario", () => {
  const activar = vi.fn();
  const BASE: DatosDelPropietario = {
    tieneVivienda: true,
    enAlquiler: false,
    hayQuienViva: false,
    cocheras: 1,
    vehiculos: 0,
    avisos: { disponible: true, permiso: false, activar },
  };

  it("quién vive, vehículos y avisos (el teléfono ya lo pide el registro)", () => {
    expect(pasosDelPropietario(BASE).map((p) => p.id)).toEqual([
      "residentes",
      "vehiculos",
      "avisos",
    ]);
  });

  it("sin estacionamiento no se le piden vehículos", () => {
    expect(pasosDelPropietario({ ...BASE, cocheras: 0 }).map((p) => p.id)).not.toContain("vehiculos");
  });

  it("en una vivienda que se alquila no se pregunta quién vive", () => {
    expect(pasosDelPropietario({ ...BASE, enAlquiler: true }).map((p) => p.id)).not.toContain("residentes");
  });

  it("en la web, donde no hay avisos, no se piden", () => {
    const pasos = pasosDelPropietario({ ...BASE, avisos: { disponible: false, permiso: false, activar } });
    expect(pasos.map((p) => p.id)).not.toContain("avisos");
  });

  it("los avisos se activan desde la fila, y ya activados la fila no hace nada", () => {
    expect(pasosDelPropietario(BASE).find((p) => p.id === "avisos")?.accion).toBe(activar);
    const activados = pasosDelPropietario({ ...BASE, avisos: { disponible: true, permiso: true, activar } });
    const paso = activados.find((p) => p.id === "avisos");
    expect(paso?.hecho).toBe(true);
    expect(paso?.accion).toBeUndefined();
  });
});

describe("el guardia", () => {
  const avisos = { disponible: false, permiso: false, activar: () => {} };

  it("sin garita ni turno, le dice que se lo pida a la administración y no lleva a ninguna parte", () => {
    const pasos = pasosDelGuardia({ garita: "", turnos: 0, avisos });
    for (const id of ["garita", "turno"]) {
      const paso = pasos.find((p) => p.id === id);
      expect(paso?.hecho).toBe(false);
      expect(paso?.nota).toBe("Pídeselo a la administración");
      expect(paso?.destino).toBeUndefined();
      expect(paso?.accion).toBeUndefined();
    }
  });

  it("con garita, la nombra", () => {
    const paso = pasosDelGuardia({ garita: "Garita principal", turnos: 2, avisos })[0];
    expect(paso.texto).toBe("Tu garita: Garita principal");
    expect(paso.hecho).toBe(true);
  });
});

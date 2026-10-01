import { describe, expect, it } from "vitest";
import { permisosDeVisitas } from "./useVisitasPermisos";
import type { RolActivo } from "@/shared/types";

const permisos = (rol: RolActivo, ubicaciones = 1, suscripcion = true) =>
  permisosDeVisitas(rol, ubicaciones, suscripcion);

/**
 * Quién ve qué en la pantalla de Visitas.
 *
 * Lo revisó el cliente mirándola como huésped temporal y salieron dos
 * controles que no podían hacer nada. Los dos venían de agrupar al huésped
 * con la portería y la administración, que es un atajo que funciona hasta que
 * deja de funcionar.
 */
describe("los permisos de la pantalla de visitas", () => {
  it("filtrar por torre y departamento es para quien mira el edificio entero", () => {
    /*
      El huesped estaba en esa lista y tiene **un solo departamento**: los dos
      desplegables solo podian devolver lo que ya estaba viendo, o nada.
    */
    expect(permisos("guardia").puedeFiltrarTorrePiso).toBe(true);
    expect(permisos("administrador").puedeFiltrarTorrePiso).toBe(true);
    expect(permisos("huesped-temporal").puedeFiltrarTorrePiso).toBe(false);
    expect(permisos("propietario").puedeFiltrarTorrePiso).toBe(false);
    expect(permisos("inquilino-lider").puedeFiltrarTorrePiso).toBe(false);
  });

  it("una barra de una sola pestaña no se pinta", () => {
    // Al huesped se le pintaba «Visitas» y al pulsarla seguia en «Visitas».
    const huesped = permisos("huesped-temporal");
    expect(huesped.tipoTabs).toHaveLength(1);
    expect(huesped.mostrarTipoTabs).toBe(false);

    const propietario = permisos("propietario");
    expect(propietario.tipoTabs.length).toBeGreaterThan(1);
    expect(propietario.mostrarTipoTabs).toBe(true);
  });

  it("y tampoco cuando la vivienda no tiene renta corta", () => {
    /*
      Sin reservas de huesped, «Todos» y «Visitas» enseñarian lo mismo. El
      hook ya lo resolvia dejando una sola pestaña; lo que faltaba era no
      pintarla.
    */
    const sinSuscripcion = permisos("propietario", 1, false);
    expect(sinSuscripcion.tipoTabs).toHaveLength(1);
    expect(sinSuscripcion.mostrarTipoTabs).toBe(false);
  });

  it("el huésped puede registrar visitas, y eso sigue igual", () => {
    // Que **deba** poder es otra discusion --depende de
    // `visitas_de_huespedes`, la regla que no lee nadie-- y esta en
    // REVISAR-A-OJO. Aqui solo se fija lo que hace hoy.
    expect(permisos("huesped-temporal").puedeCrear).toBe(true);
    expect(permisos("huesped-temporal").puedeEliminar).toBe(false);
  });
});

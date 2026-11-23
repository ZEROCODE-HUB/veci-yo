import { describe, expect, it } from "vitest";
import {
  permisosConfigurablesDe,
  resumenDelRol,
  rolQueSeCreaDe,
  veLasPantallasDeLaVivienda,
} from "./capacidadesDelRol";

/**
 * El resumen «Podrá / No podrá» al crear un rol de la vivienda (17/11/2026):
 * lo configurable sale de la base y lo fijo de la lista, que es la misma con
 * la que la app esconde las pantallas al trabajador permanente.
 */
describe("resumenDelRol", () => {
  const configurables = permisosConfigurablesDe([
    { rol: "residente", accion: "registrar_visitas", permitido: true },
    { rol: "residente", accion: "reservar_zonas", permitido: false },
    { rol: "residente", accion: "invitar_a_la_vivienda", permitido: false },
    { rol: "inquilino_lider", accion: "invitar_a_la_vivienda", permitido: true },
  ]);

  it("lo configurable sale de la base: si el panel le quita reservar al residente, el resumen lo dice", () => {
    const r = resumenDelRol("residente", configurables);
    expect(r.podra).toContain("Registrar visitas");
    expect(r.noPodra).toContain("Reservar zonas comunes");
    expect(r.noPodra).toContain("Invitar a otras personas a la vivienda");
  });

  it("al invertir el permiso en la base, cambia el resumen", () => {
    const otra = permisosConfigurablesDe([
      { rol: "residente", accion: "reservar_zonas", permitido: true },
    ]);
    expect(resumenDelRol("residente", otra).podra).toContain("Reservar zonas comunes");
  });

  it("mientras no llega la base, lo configurable no se afirma ni se niega", () => {
    const r = resumenDelRol("residente");
    expect([...r.podra, ...r.noPodra]).not.toContain("Reservar zonas comunes");
    expect(r.podra).toContain("Ver la correspondencia");
  });

  // Desde el 18/11/2026 ve también los anuncios que van para él.
  it("el trabajador con app contesta el intercomunicador y ve sus anuncios", () => {
    const r = resumenDelRol("trabajador_con_app", configurables);
    expect(r.podra).toEqual([
      "Entrar a la app con su cuenta",
      "Contestar el citófono y autorizar la visita que anuncia la portería",
      "Figurar en el directorio de la vivienda, para que la portería lo llame",
      "Ver los anuncios de la administración",
    ]);
    for (const vedado of [
      "Ver las visitas de la vivienda",
      "Ver la correspondencia",
      "Ver las zonas comunes",
      "Reservar zonas comunes",
      "Participar en el Cuadro de Honor",
    ]) {
      expect(r.noPodra).toContain(vedado);
    }
  });

  it("el trabajador sin app no entra ni contesta: solo figura en el directorio", () => {
    const r = resumenDelRol("trabajador_sin_app", configurables);
    expect(r.podra).toEqual([
      "Figurar en el directorio de la vivienda, para que la portería lo llame",
    ]);
    expect(r.noPodra).toContain("Entrar a la app con su cuenta");
  });

  it("el propietario siempre puede lo configurable", () => {
    expect(resumenDelRol("propietario", {}).noPodra).toEqual([]);
  });

  it("el anfitrión configura la renta corta; el residente no", () => {
    expect(resumenDelRol("coadministrador", configurables).podra).toContain("Configurar la renta corta");
    expect(resumenDelRol("residente", configurables).noPodra).toContain("Configurar la renta corta");
  });
});

describe("rolQueSeCreaDe y la navegación", () => {
  it("el corresidente es un residente y el huésped no se crea aquí", () => {
    expect(rolQueSeCreaDe("corresidente")).toBe("residente");
    expect(rolQueSeCreaDe("huesped_temporal")).toBeNull();
  });

  // Desde el 18/11/2026 tiene su Inicio (anuncios y, con permiso, visitas).
  it("el trabajador tiene su Inicio; los demás también", () => {
    expect(veLasPantallasDeLaVivienda("trabajador")).toBe(true);
    expect(veLasPantallasDeLaVivienda("inquilino-lider")).toBe(true);
    expect(veLasPantallasDeLaVivienda("huesped-temporal")).toBe(true);
  });
});

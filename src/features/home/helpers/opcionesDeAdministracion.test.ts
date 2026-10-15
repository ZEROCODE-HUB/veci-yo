import { describe, expect, it } from "vitest";
import { opcionesDeAdministracion } from "./opcionesDeAdministracion";

const OPCIONES = [
  { key: "arquitectura" },
  { key: "seguridad" },
  { key: "coadministradores" },
  { key: "canales" },
  { key: "reportes" },
];
const claves = (lista: { key: string }[]) => lista.map((o) => o.key);

describe("las tarjetas del panel de administración", () => {
  it("el administrador las ve todas", () => {
    expect(claves(opcionesDeAdministracion(OPCIONES, { rol: "administrador" as const, permisos: {} }))).toEqual(
      claves(OPCIONES),
    );
  });

  it("el coadministrador no ve las que su permiso le niega, ni coadministradores", () => {
    const coadmin = { rol: "coadministrador" as const, permisos: { modificarSeguridad: false, contestarChat: true } };
    expect(claves(opcionesDeAdministracion(OPCIONES, coadmin))).toEqual([
      "arquitectura",
      "canales",
      "reportes",
    ]);
  });

  it("y sin la clave anotada, como la base, cuenta como permitido", () => {
    const coadmin = { rol: "coadministrador" as const, permisos: {} };
    expect(claves(opcionesDeAdministracion(OPCIONES, coadmin))).toContain("seguridad");
  });
});

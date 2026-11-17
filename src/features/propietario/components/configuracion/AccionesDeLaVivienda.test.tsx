import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccionesDeLaVivienda } from "./AccionesDeLaVivienda";
import { loQueVeEnLaVivienda } from "../../helpers/loQueVeEnLaVivienda";

/**
 * El residente ve solo lo de vivir ahí (17/11/2026, plan aprobado por el
 * cliente): en Viviendas › Configuración no se le ofrece invitar gente, la
 * renta corta, los contratos ni los servicios. Aunque el panel le deje
 * invitar a su rol, aquí no se le ofrece.
 */

function montar(rol: Parameters<typeof loQueVeEnLaVivienda>[0], invitarPorPermiso: boolean) {
  const ve = loQueVeEnLaVivienda(rol, invitarPorPermiso);
  render(
    <AccionesDeLaVivienda
      puedeInvitar={ve.puedeInvitar}
      puedeConfigurarElAlojamiento={ve.puedeConfigurarElAlojamiento}
      puedeGestionarLaVivienda={ve.puedeGestionarLaVivienda}
      onInvitar={() => {}}
      onFuncionalidades={() => {}}
      onContratos={() => {}}
      onServicios={() => {}}
    />,
  );
  return ve;
}

describe("el menú de la vivienda", () => {
  it("al residente no le ofrece invitar, renta corta, contratos ni servicios", () => {
    const ve = montar("residente", true);
    expect(ve.esSoloResidente).toBe(true);
    expect(screen.queryByText("Invitar a alguien a la vivienda")).toBeNull();
    expect(screen.queryByText(/Huéspedes Temporales/)).toBeNull();
    expect(screen.queryByText("Contratos de arrendamiento")).toBeNull();
    expect(screen.queryByText("Servicios contratados")).toBeNull();
  });

  it("al propietario sí (control positivo)", () => {
    const ve = montar("propietario", false);
    expect(ve.esSoloResidente).toBe(false);
    expect(screen.getByText("Invitar a alguien a la vivienda")).toBeDefined();
    expect(screen.getByText(/Huéspedes Temporales/)).toBeDefined();
    expect(screen.getByText("Contratos de arrendamiento")).toBeDefined();
    expect(screen.getByText("Servicios contratados")).toBeDefined();
  });

  it("al anfitrión le deja la renta corta, sin contratos ni servicios", () => {
    montar("coadministrador", false);
    expect(screen.getByText(/Huéspedes Temporales/)).toBeDefined();
    expect(screen.queryByText("Contratos de arrendamiento")).toBeNull();
  });
});

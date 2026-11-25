import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccionesDeLaVivienda } from "./AccionesDeLaVivienda";
import { loQueVeEnLaVivienda } from "../../helpers/loQueVeEnLaVivienda";

/**
 * El residente ve solo lo de vivir ahí (17/11/2026, plan aprobado por el
 * cliente): en Viviendas › Configuración no se le ofrece la renta corta, los
 * contratos ni los servicios. «Invitar» va junto a la gente de la vivienda
 * desde el 25/11/2026 y lo decide `puedeInvitar` en la pantalla.
 */

function montar(rol: Parameters<typeof loQueVeEnLaVivienda>[0], invitarPorPermiso: boolean) {
  const ve = loQueVeEnLaVivienda(rol, invitarPorPermiso);
  render(
    <AccionesDeLaVivienda
      puedeConfigurarElAlojamiento={ve.puedeConfigurarElAlojamiento}
      puedeGestionarLaVivienda={ve.puedeGestionarLaVivienda}
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
    expect(ve.puedeInvitar).toBe(false);
    expect(screen.queryByText(/Renta corta/)).toBeNull();
    expect(screen.queryByText("Contratos de arrendamiento")).toBeNull();
    expect(screen.queryByText("Servicios contratados")).toBeNull();
  });

  it("al propietario sí (control positivo)", () => {
    const ve = montar("propietario", false);
    expect(ve.esSoloResidente).toBe(false);
    expect(ve.puedeInvitar).toBe(true);
    expect(screen.getByText(/Renta corta/)).toBeDefined();
    expect(screen.getByText("Contratos de arrendamiento")).toBeDefined();
    expect(screen.getByText("Servicios contratados")).toBeDefined();
  });

  it("al anfitrión le deja la renta corta, sin contratos ni servicios", () => {
    montar("coadministrador", false);
    expect(screen.getByText(/Renta corta/)).toBeDefined();
    expect(screen.queryByText("Contratos de arrendamiento")).toBeNull();
  });
});

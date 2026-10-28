import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InvitacionesPendientes } from "./InvitacionesPendientes";
import type { InvitacionPendiente } from "../../services/invitacionesUnidad.repo";

/**
 * «Revocar» revocaba al primer toque y sin avisar (27/10/2026): el enlace deja
 * de valer y quien lo recibió ya no puede entrar. Ahora pregunta antes.
 */

const PENDIENTE = {
  id: "inv-1",
  nombre: "Diana Prueba",
  correo: "diana@veciyo.test",
  rol: "huesped_temporal",
  vigenteHasta: "2026-11-01",
} as unknown as InvitacionPendiente;

function montar() {
  const onRevocar = vi.fn();
  render(<InvitacionesPendientes pendientes={[PENDIENTE]} onRevocar={onRevocar} />);
  return onRevocar;
}

describe("revocar una invitación", () => {
  it("pulsar «Revocar» solo pregunta", () => {
    const onRevocar = montar();
    fireEvent.click(screen.getByText("Revocar"));
    expect(screen.getByText(/¿Revocar la invitación de Diana Prueba\?/)).toBeDefined();
    expect(onRevocar).not.toHaveBeenCalled();
  });

  it("«Cancelar» no revoca y cierra la pregunta", () => {
    const onRevocar = montar();
    fireEvent.click(screen.getByText("Revocar"));
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.queryByText(/¿Revocar la invitación/)).toBeNull();
    expect(onRevocar).not.toHaveBeenCalled();
  });

  it("«Sí, revocar» revoca esa invitación", () => {
    const onRevocar = montar();
    fireEvent.click(screen.getByText("Revocar"));
    fireEvent.click(screen.getByText("Sí, revocar"));
    expect(onRevocar).toHaveBeenCalledWith("inv-1");
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EstadoDelCelular } from "@/shared/services/avisosPush.logica";

/**
 * «Avisos en este celular» (22/10/2026).
 *
 * Lo que tiene que estar a la vista: si el celular puede recibir avisos, el
 * botón para dar el permiso cuando falta. El aviso de prueba se quitó a pedido
 * del cliente (29/10/2026).
 */
let estado: EstadoDelCelular = { disponible: true, permiso: false, registrado: false };
const activar = vi.fn();

vi.mock("../../hooks/useAvisosEnEsteCelular", () => ({
  useAvisosEnEsteCelular: () => ({ estado, activar, activando: false }),
}));

const { AvisosEnEsteCelular } = await import("./AvisosEnEsteCelular");

describe("avisos en este celular", () => {
  it("en el navegador dice que ahí no llegan, y no ofrece botones", () => {
    estado = { disponible: false, permiso: false, registrado: false };
    render(<AvisosEnEsteCelular />);
    screen.getByText(/Desde el navegador no se pueden recibir/);
    expect(screen.queryByText("Enviarme un aviso de prueba")).toBeNull();
  });

  it("sin permiso, lo dice y ofrece activarlo", async () => {
    estado = { disponible: true, permiso: false, registrado: false };
    activar.mockClear();
    render(<AvisosEnEsteCelular />);
    screen.getByText("Todavía no tiene permiso para mostrar avisos");
    await userEvent.click(screen.getByText("Activar avisos en este celular"));
    expect(activar).toHaveBeenCalled();
  });

  it("con permiso y registrado, no vuelve a pedir el permiso", () => {
    estado = { disponible: true, permiso: true, registrado: true };
    render(<AvisosEnEsteCelular />);
    screen.getByText("Está registrado para recibir avisos");
    expect(screen.queryByText("Activar avisos en este celular")).toBeNull();
  });
});

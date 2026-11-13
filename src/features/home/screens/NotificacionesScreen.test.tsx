import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * «Cargando» y «no hay nada» no son lo mismo.
 *
 * Son dos situaciones distintas --«todavía no lo sé» y «lo sé, y no hay»-- y la
 * segunda es una **afirmación**: quien la lee deja de esperar y se va. Ya pasó
 * en el Centro de Atención, donde la pantalla decía que no había ninguna PQRS
 * mientras las estaba pidiendo.
 */
let estado: Record<string, unknown> = {};

vi.mock("../hooks/useNotificaciones", () => ({
  useNotificaciones: () => estado,
  useNotificacionesSinLeer: () => 0,
}));

const { NotificacionesScreen } = await import("./NotificacionesScreen");

beforeEach(() => {
  estado = {
    notificaciones: [],
    marcarLeida: () => {},
    marcarTodasLeidas: () => {},
    carga: { cargando: false },
    marcandoTodas: false,
  };
});

describe("la bandeja de notificaciones vacía", () => {
  it("mientras carga no afirma que no hay ninguna", () => {
    estado.carga = { cargando: true };

    render(<NotificacionesScreen />);

    // Desde el 13/11/2026 la espera son bloques grises, con su nombre.
    expect(screen.getByLabelText(/Cargando/)).toBeDefined();
    expect(
      screen.queryByText("No tienes notificaciones por el momento"),
    ).toBeNull();
  });

  it("si la carga falla, lo dice y deja reintentar, sin afirmar que no hay", () => {
    // Antes una red caída se leía «No tienes notificaciones» (13/11/2026).
    estado.carga = { cargando: false, fallo: true, reintentar: () => {} };

    render(<NotificacionesScreen />);

    expect(screen.getByText(/No se pudo cargar tus notificaciones/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeDefined();
    expect(
      screen.queryByText("No tienes notificaciones por el momento"),
    ).toBeNull();
  });

  it("y cuando ya lo sabe, lo dice", () => {
    // El control positivo: sin él, el caso de arriba pasaría igual con la
    // pantalla muda para siempre.
    render(<NotificacionesScreen />);

    expect(
      screen.getByText("No tienes notificaciones por el momento"),
    ).toBeDefined();
  });
});

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
    isLoading: false,
  };
});

describe("la bandeja de notificaciones vacía", () => {
  it("mientras carga no afirma que no hay ninguna", () => {
    estado.isLoading = true;

    render(<NotificacionesScreen />);

    expect(screen.getByText("Buscando tus notificaciones...")).toBeDefined();
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

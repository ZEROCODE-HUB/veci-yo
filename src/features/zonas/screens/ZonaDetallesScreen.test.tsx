import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * La pantalla de una zona común, que es la del residente.
 *
 * Hasta el 02/10/2026 era el **único** sitio donde se podía aprobar o rechazar
 * una reserva, escondido tras el menú de una reserva y condicionado al rol. O
 * sea que la pantalla que se llama «Gestión de Zonas Comunes» era justo la que
 * no dejaba resolver nada (R-37), y ésta cambiaba de funciones según quién la
 * mirara.
 *
 * Decidido con el cliente: resolver se hace desde administración, y ésta se
 * queda con lo que cualquiera puede hacer con **su** reserva.
 */
let estado: Record<string, unknown> = {};

vi.mock("../hooks/useZonaDetalles", () => ({
  useZonaDetalles: () => estado,
}));

const { ZonaDetallesScreen } = await import("./ZonaDetallesScreen");

const RESERVA = {
  uuid: "r1",
  id: 1,
  estado: "Pendiente",
  fechaIso: "2027-01-10",
  hora: "10:00 - 12:00",
  nombre: "Sofía",
};

beforeEach(() => {
  estado = {
    zona: { id: "z1", nombre: "Piscina" },
    zonaConfig: null,
    cargando: false,
    esGuardiaAdmin: true,
    esGuardia: false,
    codigosDe: () => [],
    eliminarReserva: () => {},
    reservas: [RESERVA],
    menuItem: RESERVA,
    setMenuItem: () => {},
    deleteItem: null,
    setDeleteItem: () => {},
  };
});

describe("el menú de una reserva en la pantalla de la zona", () => {
  it("ya no ofrece aprobar ni rechazar, ni a la administración", () => {
    render(<ZonaDetallesScreen />);

    expect(screen.queryByText("Aprobar reserva")).toBeNull();
    expect(screen.queryByText("Rechazar reserva")).toBeNull();
    expect(screen.queryByText("Estado: Reservado")).toBeNull();
  });

  it("y sigue dejando cancelar la reserva, que eso sí es de aquí", () => {
    /*
      El control positivo. Sin él, el caso de arriba pasaría igual con el menú
      entero vacío --o con la pantalla rota--, que es la forma clásica de un
      caso negativo que no comprueba nada.
    */
    render(<ZonaDetallesScreen />);

    expect(screen.getByText("Cancelar reserva")).toBeDefined();
  });
});

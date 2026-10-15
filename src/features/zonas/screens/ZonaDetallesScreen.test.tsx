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

// «Enviar a PQRs» abre una PQRS de verdad: aquí no se pulsa, solo hace falta
// que el hook no pida la red.
vi.mock("@/features/perfil/hooks/useReclamos", () => ({
  useReclamos: () => ({ crear: { isPending: false, mutateAsync: vi.fn() } }),
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
    personNames: [],
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

describe("lo que ve la portería en una zona (15/10/2026)", () => {
  const LIBRE = { hour: "10:00", reservations: [], ajenas: 0, libres: 1, cupos: 1 };

  it("ve la grilla de la maqueta, con la franja libre como «Libre» y sus pestañas", () => {
    estado = { ...estado, esGuardia: true, dayFilter: "hoy", freeHours: [LIBRE], menuItem: null };
    render(<ZonaDetallesScreen />);

    expect(screen.getByText("Libre")).toBeDefined();
    expect(screen.queryByText(/\+ Reservar/)).toBeNull();
    expect(screen.getByText("Cancelada")).toBeDefined();
  });

  it("un vecino sigue pudiendo reservar, y no tiene esas pestañas", () => {
    // El control: sin él, el caso de arriba pasaría con la grilla rota para todos.
    estado = { ...estado, esGuardia: false, dayFilter: "hoy", freeHours: [LIBRE], menuItem: null };
    render(<ZonaDetallesScreen />);

    expect(screen.getByText(/\+ Reservar/)).toBeDefined();
    expect(screen.queryByText("Libre")).toBeNull();
    expect(screen.queryByText("Cancelada")).toBeNull();
  });
});

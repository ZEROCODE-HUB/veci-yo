import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReservaZona } from "@/shared/types";
import { textoCompleto } from "@/pruebas/texto";

/**
 * «Mis reservas», la lista de la pantalla de Zonas Comunes.
 *
 * Es donde uno viene a mirar qué reservó, y es justo donde se me olvidó
 * pintar el número de lavadora: lo puse en la tarjeta de la franja y en el
 * modal de éxito, y el cliente lo vio al primer vistazo. Con tres reservas el
 * mismo día a la misma hora, sin el número son tres renglones idénticos.
 */
let rol = "propietario";
let reservas: ReservaZona[] = [];

vi.mock("@/stores", () => ({
  useAuthStore: (selector: (estado: unknown) => unknown) =>
    selector({ rolActivo: rol }),
}));
vi.mock("../hooks", () => ({
  useZonas: () => ({
    reservas,
    zonasComunesConfig: {
      z1: { id: "z1", nombre: "Lavanderia", emoji: "🧺" },
    },
  }),
}));
vi.mock("@/assets/icons/zonas", () => ({ zonaIcons2: {} }));

const { MisReservas } = await import("./MisReservas");

const reserva = (parcial: Partial<ReservaZona> = {}): ReservaZona =>
  ({
    id: 1,
    uuid: "r1",
    zonaId: "z1",
    depto: "102",
    nombre: "Lavanderia",
    acompanantes: 0,
    reservaNum: "368803",
    horario: "06:00 - 07:00",
    estado: "Aprobado",
    personas: [],
    esMia: true,
    fecha: "25/09/2026",
    fechaIso: "2026-09-25",
    ...parcial,
  }) as ReservaZona;

beforeEach(() => {
  rol = "propietario";
  reservas = [];
});

describe("mis reservas", () => {
  it("dice qué lavadora tocó", () => {
    reservas = [reserva({ numeroRecurso: 2 })];
    render(<MisReservas />);
    expect(
      screen.getByText(textoCompleto("06:00 - 07:00 · N°2")),
    ).toBeDefined();
  });

  it("y distingue tres reservas del mismo día a la misma hora", () => {
    /*
      El caso real de la 102: sin el numero son tres renglones identicos y no
      hay forma de saber a que lavadora ir.
    */
    reservas = [
      reserva({ id: 1, uuid: "a", numeroRecurso: 1 }),
      reserva({ id: 2, uuid: "b", numeroRecurso: 2 }),
      reserva({ id: 3, uuid: "c", numeroRecurso: 3 }),
    ];
    render(<MisReservas />);
    for (const numero of [1, 2, 3]) {
      expect(
        screen.getByText(textoCompleto(`06:00 - 07:00 · N°${numero}`)),
      ).toBeDefined();
    }
  });

  it("en una zona de un solo puesto no inventa número", () => {
    reservas = [reserva({ numeroRecurso: null })];
    render(<MisReservas />);
    expect(screen.getByText(textoCompleto("06:00 - 07:00"))).toBeDefined();
  });

  it("no lista las canceladas ni las rechazadas", () => {
    // Una reserva cancelada no es «mi reserva»: la franja tambien dejo de
    // pintarlas (hallazgo 27).
    reservas = [
      reserva({ id: 1, uuid: "a", estado: "Cancelado" }),
      reserva({ id: 2, uuid: "b", estado: "Rechazado" }),
    ];
    render(<MisReservas />);
    expect(screen.getByText("No tienes reservas activas.")).toBeDefined();
  });

  it("ordena por fecha de verdad, no por el texto dd/MM/yyyy", () => {
    /*
      Ordenar «15/11/2026» y «23/09/2026» como texto pone noviembre antes que
      septiembre. Por eso se ordena por la fecha ISO.
    */
    reservas = [
      reserva({ id: 1, uuid: "a", fecha: "15/11/2026", fechaIso: "2026-11-15" }),
      reserva({ id: 2, uuid: "b", fecha: "23/09/2026", fechaIso: "2026-09-23" }),
    ];
    render(<MisReservas />);
    const fechas = screen
      .getAllByText(/\d{2}\/\d{2}\/\d{4}/)
      .map((nodo) => nodo.textContent);
    expect(fechas).toEqual(["23/09/2026", "15/11/2026"]);
  });

  it("y cambiar de rol con la lista montada no rompe la pantalla", () => {
    /*
      Marcela cambia de administradora a propietaria de la 301 desde la
      cabecera, sin salir de la pantalla. Si el componente llama a menos hooks
      en un rol que en otro, React tira «Rendered fewer hooks than expected» y
      la pantalla se cae entera.
    */
    rol = "propietario";
    reservas = [reserva()];
    const { rerender } = render(<MisReservas />);
    expect(screen.getByText("Mis reservas")).toBeDefined();

    rol = "administrador";
    expect(() => rerender(<MisReservas />)).not.toThrow();
  });

  it("no se le enseña a la portería ni a la administración", () => {
    rol = "guardia";
    const { container } = render(<MisReservas />);
    expect(container.innerHTML).toBe("");
  });

  it("con `soloDeHoy`, una reserva de otro día no sale", () => {
    /*
      El bloque «Hoy» del inicio metía esta lista entera debajo de su título, y
      la lista trae todas las propias: una inquilina con una reserva de la
      piscina del 25 la veía ahí el 29, con «Mis reservas 1», como si fuera de
      hoy. Salió recorriendo el inicio como inquilina líder.
    */
    vi.setSystemTime(new Date(2026, 8, 29, 10, 0));
    reservas = [reserva({ fecha: "25/09/2026", fechaIso: "2026-09-25" })];

    // Sin la marca se sigue viendo, que es lo que quiere la pantalla de Zonas.
    const sinMarca = render(<MisReservas />);
    expect(screen.getByText("Mis reservas")).toBeDefined();
    sinMarca.unmount();

    // Con ella y sin ninguna de hoy, `hideIfEmpty` la quita entera.
    render(<MisReservas soloDeHoy hideIfEmpty />);
    expect(screen.queryByText("Mis reservas")).toBeNull();
  });

  it("y la de hoy sí sale con `soloDeHoy`", () => {
    vi.setSystemTime(new Date(2026, 8, 29, 10, 0));
    reservas = [reserva({ fecha: "29/09/2026", fechaIso: "2026-09-29" })];
    render(<MisReservas soloDeHoy hideIfEmpty />);
    expect(screen.getByText("Mis reservas")).toBeDefined();
  });
});

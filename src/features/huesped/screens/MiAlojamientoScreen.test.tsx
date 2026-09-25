import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { textoCompleto } from "@/pruebas/texto";

/**
 * «Mi alojamiento»: lo que el huésped viene a buscar.
 *
 * Es la pantalla que más depende de otra persona --lo que Sofía escriba por
 * la noche lo lee Tomás por la mañana-- y la que más fácil se rompe en
 * silencio: si el libro llega vacío, la pantalla tiene que decir **por qué**.
 * Decir el motivo equivocado manda a un huésped a perseguir a su anfitrión
 * por algo que está perfectamente cargado.
 */
let alojamiento: Record<string, unknown> = {};

vi.mock("../hooks/useMiAlojamiento", () => ({
  useMiAlojamiento: () => alojamiento,
}));

const { MiAlojamientoScreen } = await import("./MiAlojamientoScreen");

const ficha = {
  descripcion: "Apartamento de dos habitaciones con terraza.",
  numHabitaciones: 3,
  maxHuespedes: 5,
  estacionamientos: 2,
  permiteMascotas: true,
  aptoNinos: false,
};

const libro = {
  wifiName: "ChicHomes_102",
  wifiPassword: "clave-de-prueba",
  doorPassword: "9876",
  instructions: "La puerta del edificio es la segunda a la derecha.",
  notes: "La basura se saca los martes.",
};

const base = {
  ubicacionActiva: { codigo: "102", nombre: "Torre 1 · 102" },
  unidad: { codigo: "102", piso: 1 },
  tipologia: { id: "t1", nombre: "2 ambientes" },
  config: ficha,
  guestbook: libro,
  hasGuestbook: true,
  llegadaPendiente: null,
};

beforeEach(() => {
  alojamiento = { ...base };
});

describe("mi alojamiento", () => {
  it("enseña la ficha que cargó la anfitriona", () => {
    render(<MiAlojamientoScreen />);
    expect(screen.getByText(/Apartamento de dos habitaciones/)).toBeDefined();
    expect(screen.getByText(textoCompleto("3"))).toBeDefined();
    expect(screen.getByText(textoCompleto("Hasta 5"))).toBeDefined();
    expect(screen.getByText(textoCompleto("Permitidas"))).toBeDefined();
    expect(screen.getByText(textoCompleto("No apto"))).toBeDefined();
  });

  it("y las credenciales de la puerta, que es a lo que se viene", () => {
    render(<MiAlojamientoScreen />);
    expect(screen.getByText(textoCompleto("ChicHomes_102"))).toBeDefined();
    expect(screen.getByText(textoCompleto("clave-de-prueba"))).toBeDefined();
    expect(screen.getByText(textoCompleto("9876"))).toBeDefined();
    expect(screen.getByText(/segunda a la derecha/)).toBeDefined();
    expect(screen.getByText(/basura se saca los martes/)).toBeDefined();
  });

  it("sin ficha lo dice, en vez de inventarse una", () => {
    /*
      Antes se enseñaba una ficha fija --«Departamento de 2 habitaciones, 1
      cama queen»-- igual para cualquier vivienda, tuviera o no suscripcion.
    */
    alojamiento = { ...base, config: null };
    render(<MiAlojamientoScreen />);
    expect(
      screen.getByText(/todavía no tiene ficha de alojamiento/),
    ).toBeDefined();
  });

  it("si la estancia aún no empieza, dice eso y no que falte cargarlo", () => {
    /*
      Este es el que tiene consecuencias. Las credenciales no se entregan
      hasta el dia de entrada, asi que el libro llega vacio a proposito. Si se
      le dice al huesped que el anfitrion no ha cargado nada, se le manda a
      perseguirlo por algo que esta hecho.
    */
    alojamiento = {
      ...base,
      guestbook: null,
      hasGuestbook: false,
      llegadaPendiente: "2026-10-02",
    };
    render(<MiAlojamientoScreen />);
    expect(screen.queryByText(/Tu Guestbook aún está vacío/)).toBeNull();
  });

  it("y si de verdad está vacío, entonces sí lo dice", () => {
    alojamiento = {
      ...base,
      guestbook: null,
      hasGuestbook: false,
      llegadaPendiente: null,
    };
    render(<MiAlojamientoScreen />);
    expect(screen.getByText(/Tu Guestbook aún está vacío/)).toBeDefined();
  });

  it("un libro a medias no cuenta como libro", () => {
    // `hasGuestbook` sale de si hay algo que enseñar: un libro con todos los
    // campos vacios es un libro vacio, aunque la fila exista.
    alojamiento = { ...base, guestbook: {}, hasGuestbook: false };
    render(<MiAlojamientoScreen />);
    expect(screen.getByText(/Tu Guestbook aún está vacío/)).toBeDefined();
  });
});

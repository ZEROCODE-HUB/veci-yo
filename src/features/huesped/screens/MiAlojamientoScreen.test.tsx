import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

/*
  `react-native-qrcode-svg` publica JSX dentro de archivos `.js`: Metro lo
  traduce y Vite no. Se dobla por un texto con el valor del QR, que es lo que
  aquí importa comprobar.
*/
vi.mock("react-native-qrcode-svg", () => ({
  default: ({ value }: { value: string }) => `QR:${value}`,
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

describe("el QR de la estancia (14/10/2026)", () => {
  it("con el preregistro cerrado, enseña el QR y deja compartirlo", () => {
    alojamiento = {
      ...base,
      acceso: {
        codigo: "ABC123",
        fechaDesde: "2026-10-20",
        fechaHasta: "2026-10-23",
        condominio: "Las Barranqueras",
        unidad: "102",
      },
    };
    render(<MiAlojamientoScreen />);
    expect(screen.getByText(textoCompleto("Tu QR de entrada"))).toBeDefined();
    expect(screen.getByText("QR:VECIYO:ABC123")).toBeDefined();
    expect(screen.getByText(textoCompleto("Compartir como imagen"))).toBeDefined();
  });

  it("sin código no enseña nada", () => {
    render(<MiAlojamientoScreen />);
    expect(screen.queryByText(textoCompleto("Tu QR de entrada"))).toBeNull();
  });
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

  it("mientras carga no dice que esté vacío", () => {
    /*
      La vivienda sale del store que se llena al arrancar la aplicación. Hasta
      que llega, las dos consultas ni se lanzan y la ficha y el libro son nulos
      --que es lo mismo que devuelven cuando de verdad no hay nada--.

      Así que al entrar por primera vez la pantalla afirmaba «Esta vivienda
      todavía no tiene ficha de alojamiento» y «Tu libro del huésped aún está vacío»
      sobre una vivienda que tenía las dos cosas. Es lo primero que lee alguien
      que acaba de llegar al edificio, y le decía que su anfitrión no había
      subido nada.
    */
    alojamiento = {
      ...base,
      config: null,
      guestbook: null,
      hasGuestbook: false,
      cargando: true,
    };
    render(<MiAlojamientoScreen />);

    screen.getByText(textoCompleto("Cargando tu alojamiento…"));
    expect(screen.queryByText(/todavía no tiene ficha/)).toBeNull();
    expect(screen.queryByText(/libro del huésped aún está vacío/)).toBeNull();
  });

  it("si no se pudo leer, dice eso y no que esté vacío", () => {
    /*
      Un corte deja la ficha y el libro en nulo, igual que «no hay nada». La
      pantalla afirmaba que el anfitrión no había cargado nada (13/10/2026).
    */
    const reintentar = vi.fn();
    alojamiento = {
      ...base,
      config: null,
      guestbook: null,
      hasGuestbook: false,
      falloLaFicha: true,
      falloElLibro: true,
      reintentar,
    };
    render(<MiAlojamientoScreen />);

    expect(screen.getByText(/No pudimos leer los datos/)).toBeDefined();
    expect(screen.queryByText(/todavía no tiene ficha/)).toBeNull();
    expect(screen.queryByText(/libro del huésped aún está vacío/)).toBeNull();

    fireEvent.click(screen.getByText("Reintentar"));
    expect(reintentar).toHaveBeenCalledTimes(1);
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
    expect(screen.queryByText(/Tu libro del huésped aún está vacío/)).toBeNull();
  });

  it("y si de verdad está vacío, entonces sí lo dice", () => {
    alojamiento = {
      ...base,
      guestbook: null,
      hasGuestbook: false,
      llegadaPendiente: null,
    };
    render(<MiAlojamientoScreen />);
    expect(screen.getByText(/Tu libro del huésped aún está vacío/)).toBeDefined();
  });

  it("un libro a medias no cuenta como libro", () => {
    // `hasGuestbook` sale de si hay algo que enseñar: un libro con todos los
    // campos vacios es un libro vacio, aunque la fila exista.
    alojamiento = { ...base, guestbook: {}, hasGuestbook: false };
    render(<MiAlojamientoScreen />);
    expect(screen.getByText(/Tu libro del huésped aún está vacío/)).toBeDefined();
  });
});

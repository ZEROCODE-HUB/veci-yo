import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VisitaItem } from "@/shared/types";
import { ReservaHuespedCard } from "./ReservaHuespedCard";

/**
 * Cuántas personas dice la tarjeta de una reserva.
 *
 * El cliente reservó para dos personas el 09/10/2026, abrió la lista y leyó
 * «👤 1»: «pero en esta pantalla solo me sale 1, ¿está bien?». No lo estaba.
 *
 * La tarjeta contaba las **fichas que existen**, y una estancia nace con el
 * titular y nada más: los acompañantes a los que el anfitrión no les pone
 * nombre no se crean, porque los rellena el huésped desde su enlace. Así que
 * una reserva para dos se leía como una reserva para una, y parecía que se
 * había perdido lo configurado.
 */

const reserva = (extra: Partial<VisitaItem> = {}): VisitaItem =>
  ({
    id: 1,
    tipo: "huesped-temporal",
    nombre: "Huésped por confirmar",
    estado: "Programada",
    fechaDesde: "23/10/2026",
    fechaHasta: "24/10/2026",
    invitados: [{ nombre: "Huésped por confirmar" }],
    vehiculos: [],
    ...extra,
  }) as unknown as VisitaItem;

const pintar = (item: VisitaItem) =>
  render(
    <ReservaHuespedCard item={item} onPress={() => {}} onMenuPress={() => {}} />,
  );

describe("las personas de una reserva", () => {
  it("dice cuántas faltan por confirmar", () => {
    // El caso del cliente: reservó para dos y solo existe la ficha del titular.
    pintar(reserva({ huespedesPrevistos: 2 }));

    expect(screen.getByText("👤 1 de 2")).toBeTruthy();
  });

  it("cuando ya están todas, solo el número", () => {
    /*
      «2 de 2» es ruido: lo que el «de» aporta es que falta gente. El control
      positivo del caso de arriba, ademas: sin él, poner siempre «x de y»
      pasaría igual.
    */
    pintar(
      reserva({
        huespedesPrevistos: 2,
        invitados: [{ nombre: "Ana" }, { nombre: "Luis" }],
      } as Partial<VisitaItem>),
    );

    expect(screen.getByText("👤 2")).toBeTruthy();
    expect(screen.queryByText(/de 2/)).toBeNull();
  });

  it("sin el dato se cuenta lo que hay, como siempre", () => {
    // Las reservas anteriores al 09/10/2026 y las del calendario de Airbnb no
    // traen el número: ahí «1» es toda la verdad que se tiene.
    pintar(reserva());

    expect(screen.getByText("👤 1")).toBeTruthy();
  });

  it("dice cuántos menores se esperan, aunque su ficha no exista", () => {
    /*
      El caso del cliente: reservó «2 personas, 1 menor» y del menor no
      quedaba nada, porque su ficha no se crea sin nombre. Contar las fichas
      daría cero justo cuando el aviso hace falta.
    */
    pintar(reserva({ huespedesPrevistos: 2, menoresPrevistos: 1 }));

    expect(screen.getByText("👶 1")).toBeTruthy();
  });

  it("sin menores no se pinta nada", () => {
    // El control negativo: un «👶 0» en cada reserva de adultos es ruido.
    pintar(reserva({ huespedesPrevistos: 2, menoresPrevistos: 0 }));

    expect(screen.queryByText(/👶/)).toBeNull();
  });

  it("si vienen más de los previstos, no se resta", () => {
    /*
      Puede pasar con una reserva anterior al tope, o si el anfitrión baja el
      número después. «3 de 2» sería absurdo y «👤 2» estaría mintiendo sobre
      quién va a llegar: se cuenta lo que hay.
    */
    pintar(
      reserva({
        huespedesPrevistos: 2,
        invitados: [{ nombre: "Ana" }, { nombre: "Luis" }, { nombre: "Eva" }],
      } as Partial<VisitaItem>),
    );

    expect(screen.getByText("👤 3")).toBeTruthy();
  });
});

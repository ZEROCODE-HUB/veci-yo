import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VisitaItem } from "@/shared/types";
import { MenuDeVisita } from "./MenuDeVisita";

/**
 * Los tres puntos de una reserva de huésped (10/11/2026, decidido con el
 * cliente): «Abrir la reserva» siempre; «Eliminar» solo si no entró nadie;
 * con gente dentro, «Terminar estancia»; terminada, ninguna de las dos.
 */
const reserva = (p: Partial<VisitaItem>): VisitaItem =>
  ({ id: 1, uuid: "v1", tipo: "huesped-temporal", estado: "Programada", nombre: "Lina", invitados: [], ...p }) as VisitaItem;

const pintar = (item: VisitaItem) =>
  render(
    <MenuDeVisita
      item={item}
      puedeEliminar
      esAdmin={false}
      onClose={vi.fn()}
      onAbrirReserva={vi.fn()}
      onTerminar={vi.fn()}
      onEliminar={vi.fn()}
      onDenunciar={vi.fn()}
    />,
  );

describe("los tres puntos de una reserva", () => {
  it("sin nadie dentro: abrir y eliminar", () => {
    pintar(reserva({}));
    expect(screen.getByText("Abrir la reserva")).toBeTruthy();
    expect(screen.getByText("Eliminar")).toBeTruthy();
    expect(screen.queryByText("Editar")).toBeNull();
    expect(screen.queryByText("Terminar estancia")).toBeNull();
  });

  it("con alguien dentro: terminar, no eliminar", () => {
    pintar(reserva({ estado: "Ingresado" }));
    expect(screen.getByText("Terminar estancia")).toBeTruthy();
    expect(screen.queryByText("Eliminar")).toBeNull();
  });

  it("programada pero con alguien que ya entró: tampoco eliminar", () => {
    pintar(reserva({ invitados: [{ llego: true }] as VisitaItem["invitados"] }));
    expect(screen.queryByText("Eliminar")).toBeNull();
  });

  it("terminada: ni terminar ni eliminar", () => {
    pintar(reserva({ estado: "Finalizado" }));
    expect(screen.getByText("Abrir la reserva")).toBeTruthy();
    expect(screen.queryByText("Eliminar")).toBeNull();
    expect(screen.queryByText("Terminar estancia")).toBeNull();
  });
});

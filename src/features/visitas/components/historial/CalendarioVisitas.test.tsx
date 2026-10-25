import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { VisitaItem } from "@/shared/types";
import { CalendarioVisitas } from "./CalendarioVisitas";

/**
 * La vista Calendario de Visitas.
 *
 * Las celdas pintaban dos nombres en letra de 10 px que no se leían, y la
 * tercera visita del día no aparecía en ningún sitio (auditoría de
 * responsividad, 25/10/2026). Se comprueba lo que se ve: el contador del día
 * y la lista entera al tocarlo.
 */
const visita = (id: number, nombre: string, fechaDesde: string): VisitaItem =>
  ({ id, tipo: "amigos", nombre, estado: "Aceptado", fechaDesde }) as unknown as VisitaItem;

const VISITAS = [
  visita(1, "Ana Pérez", "15/10/2026"),
  visita(2, "Bruno Díaz", "15/10/2026"),
  visita(3, "Carla Ruiz", "15/10/2026"),
  visita(4, "Diego Mora", "20/10/2026"),
];

describe("el calendario de visitas", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("cada día dice cuántas visitas tiene, también la tercera", () => {
    render(<CalendarioVisitas items={VISITAS} onSelect={() => {}} />);
    expect(screen.getByLabelText("Día 15, 3 visitas")).toBeTruthy();
    expect(screen.getByLabelText("Día 20, 1 visita")).toBeTruthy();
    expect(screen.getByLabelText("Día 16, sin visitas")).toBeTruthy();
  });

  it("al tocar un día salen todas sus visitas, con el nombre entero", () => {
    const onSelect = vi.fn();
    render(<CalendarioVisitas items={VISITAS} onSelect={onSelect} />);
    expect(screen.queryByText("Carla Ruiz")).toBeNull();

    fireEvent.click(screen.getByLabelText("Día 15, 3 visitas"));
    expect(screen.getByText("Visitas del 15/10/2026")).toBeTruthy();
    for (const nombre of ["Ana Pérez", "Bruno Díaz", "Carla Ruiz"]) {
      expect(screen.getByText(nombre)).toBeTruthy();
    }
    expect(screen.queryByText("Diego Mora")).toBeNull();

    fireEvent.click(screen.getByText("Carla Ruiz"));
    expect(onSelect).toHaveBeenCalledWith(VISITAS[2]);
  });

  it("un día sin visitas lo dice", () => {
    render(<CalendarioVisitas items={VISITAS} onSelect={() => {}} />);
    fireEvent.click(screen.getByLabelText("Día 16, sin visitas"));
    expect(screen.getByText("Sin visitas el 16/10/2026")).toBeTruthy();
  });
});

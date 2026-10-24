import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FechasEscritas, conBarras, leerFecha } from "./FechasEscritas";

/**
 * Las fechas de la estancia escritas a mano (24/10/2026): lo que se escribe
 * bien llega al calendario; lo que no, dice por qué.
 */

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 1));
});
afterEach(() => vi.useRealTimers());

const montar = (props: Partial<Parameters<typeof FechasEscritas>[0]> = {}) => {
  const onRango = vi.fn();
  render(
    <FechasEscritas entrada={null} salida={null} onRango={onRango} minNoches={3} maxNoches={5} {...props} />,
  );
  const [llegada, salida] = screen.getAllByPlaceholderText("dd/mm/aaaa");
  return { onRango, llegada, salida };
};

describe("las fechas escritas", () => {
  it("pone las barras solas y lee solo días que existen", () => {
    expect(conBarras("24102026")).toBe("24/10/2026");
    expect(leerFecha("31/02/2026")).toBeNull();
    expect(leerFecha("10/10/2026")).toEqual(new Date(2026, 9, 10));
  });

  it("una llegada y una salida válidas llegan al calendario", () => {
    const { onRango, llegada, salida } = montar();
    fireEvent.change(llegada, { target: { value: "10102026" } });
    expect(onRango).toHaveBeenLastCalledWith(new Date(2026, 9, 10), null);
    fireEvent.change(salida, { target: { value: "14102026" } });
    expect(onRango).toHaveBeenLastCalledWith(new Date(2026, 9, 10), new Date(2026, 9, 14));
  });

  it("una salida fuera del mínimo o del máximo dice cuál", () => {
    const { onRango, llegada, salida } = montar();
    fireEvent.change(llegada, { target: { value: "10102026" } });
    fireEvent.change(salida, { target: { value: "11102026" } });
    expect(screen.getByText("Mínimo 3 noches")).toBeTruthy();
    fireEvent.change(salida, { target: { value: "20102026" } });
    expect(screen.getByText("Máximo 5 noches")).toBeTruthy();
    expect(onRango).toHaveBeenCalledTimes(1);
  });

  it("no acepta un día que ya pasó ni uno reservado", () => {
    const { llegada } = montar({ ocupados: new Set(["2026-10-12"]) });
    fireEvent.change(llegada, { target: { value: "15092026" } });
    expect(screen.getByText("Ese día ya pasó")).toBeTruthy();
    fireEvent.change(llegada, { target: { value: "12102026" } });
    expect(screen.getByText("Ese día ya está reservado")).toBeTruthy();
    fireEvent.change(llegada, { target: { value: "11102026" } });
    expect(screen.getByText("No caben 3 noches antes de otra reserva")).toBeTruthy();
  });
});

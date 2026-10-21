import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { VisitaItem } from "@/shared/types";

/**
 * Las anotaciones de ingreso y salida que escribe la portería.
 *
 * El cliente lo vio el 20/10/2026 (T-023): «hay un bug que hace que las letras
 * no se escriban». Cada tecla iba a la base y el campo se pintaba con lo que
 * volvía, que llega tarde: mientras tanto el campo volvía al valor viejo y se
 * comía las letras. Aquí la base «no contesta» nunca --el `item` no cambia--,
 * que es el peor caso de lo que pasaba.
 */

// Las placas piden datos a la base: aquí no son el asunto.
vi.mock("./VehiculosEnPorteria", () => ({ VehiculosEnPorteria: () => null }));

const { VisitaGuardiaDetail } = await import("./VisitaGuardiaDetail");

const visita = {
  id: 1,
  uuid: "v1",
  tipo: "visita",
  nombre: "Armando Barrera",
  estado: "Programada",
  fechaDesde: "20/10/2026",
  fechaHasta: "20/10/2026",
  anotacionesIngreso: "",
  anotacionesSalida: "",
  invitados: [],
  vehiculos: [],
} as unknown as VisitaItem;

const escribir = (campo: HTMLElement, texto: string) => {
  let llevado = "";
  for (const letra of texto) {
    llevado += letra;
    fireEvent.change(campo, { target: { value: llevado } });
  }
};

afterEach(() => vi.useRealTimers());

describe("las anotaciones de la portería", () => {
  it("no se comen letras aunque la base tarde en contestar", () => {
    vi.useFakeTimers();
    const guardar = vi.fn();
    render(<VisitaGuardiaDetail item={visita} onUpdateEntryNotes={guardar} />);
    const campo = screen.getByPlaceholderText(
      "Observaciones al recibir a la visita",
    ) as HTMLTextAreaElement;

    escribir(campo, "Trae un paquete");

    expect(campo.value).toBe("Trae un paquete");
  });

  it("se guardan una vez, al dejar de escribir, con el texto entero", () => {
    vi.useFakeTimers();
    const guardar = vi.fn();
    render(<VisitaGuardiaDetail item={visita} onUpdateEntryNotes={guardar} />);
    const campo = screen.getByPlaceholderText(
      "Observaciones al recibir a la visita",
    );

    escribir(campo, "Trae un paquete");
    expect(guardar).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(guardar).toHaveBeenCalledTimes(1);
    expect(guardar).toHaveBeenCalledWith("Trae un paquete");
  });

  it("al salir del campo se guarda sin esperar", () => {
    const guardar = vi.fn();
    render(<VisitaGuardiaDetail item={visita} onUpdateExitNotes={guardar} />);
    const campo = screen.getByPlaceholderText(
      "Observaciones al retirarse la visita",
    );

    escribir(campo, "Salió con prisa");
    fireEvent.blur(campo);

    expect(guardar).toHaveBeenCalledWith("Salió con prisa");
  });
});

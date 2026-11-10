import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FechasDeLaVisita } from "./FechasDeLaVisita";
import { AmigosEnLaEstancia } from "./AmigosEnLaEstancia";
import type { AltaDeVisita } from "./tipos";

/**
 * Con un huésped alojado, las visitas de amigos son del huésped (10/11/2026):
 * al propietario se le tachan esas noches en el calendario, y al crear una
 * reserva encima de amigos ya anunciados se le enseñan para cancelarlos.
 */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 10, 10, 0));
});
afterEach(() => vi.useRealTimers());

const alta = (p: Partial<AltaDeVisita>) =>
  ({
    esGuardia: false,
    esGuardiaOAdmin: false,
    esHuesped: false,
    tipoSeleccionado: "amigos",
    selectedDate: new Date(2026, 10, 10),
    setSelectedDate: vi.fn(),
    diasOcupados: new Set(["2026-11-20", "2026-11-21"]),
    ...p,
  }) as unknown as AltaDeVisita;

describe("el calendario de amigos con un huésped alojado", () => {
  it("al propietario le dice que esos días son del huésped", () => {
    render(<FechasDeLaVisita alta={alta({})} />);
    expect(screen.getByText(/En los días tachados hay un huésped alojado/)).toBeTruthy();
  });

  it("al huésped no", () => {
    render(<FechasDeLaVisita alta={alta({ esHuesped: true })} />);
    expect(screen.queryByText(/En los días tachados/)).toBeNull();
  });

  it("en una visita temporal (un técnico) tampoco", () => {
    render(<FechasDeLaVisita alta={alta({ tipoSeleccionado: "temporal" })} />);
    expect(screen.queryByText(/En los días tachados/)).toBeNull();
  });
});

describe("una reserva encima de amigos ya anunciados", () => {
  it("los enseña y deja cancelarlos uno a uno", async () => {
    vi.useRealTimers();
    const cancelar = vi.fn(() => Promise.resolve());
    render(
      <AmigosEnLaEstancia
        visitas={[{ visitaId: "a1", fecha: "2026-11-20", nombre: "Pepe" }]}
        onCancelarVisita={cancelar}
        onGuardarIgual={vi.fn()}
        onCerrar={vi.fn()}
      />,
    );
    expect(screen.getByText("Pepe")).toBeTruthy();
    expect(screen.getByText("20/11/2026")).toBeTruthy();
    await userEvent.click(screen.getByText("Cancelar visita"));
    expect(cancelar).toHaveBeenCalledWith("a1");
    expect(screen.getByText("Guardar la reserva igual")).toBeTruthy();
    expect(screen.getByText("Elegir otras fechas")).toBeTruthy();
  });
});

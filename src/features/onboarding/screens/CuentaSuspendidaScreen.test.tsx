import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * La pantalla de cuenta suspendida (24/10/2026): con el motivo si se conoce
 * --tenía la sesión abierta-- y, si no, diciendo que va por correo.
 * «Entendido» la cierra.
 */

let estado: Record<string, unknown> = {};
const cerrar = vi.fn();

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (elegir: (s: Record<string, unknown>) => unknown) => elegir(estado),
}));
vi.mock("@/shared/hooks", () => ({
  useParametrosDeLaBase: () => ({ listo: true, texto: () => "soporte@veciyo.com" }),
}));

const { CuentaSuspendidaScreen } = await import("./CuentaSuspendidaScreen");

beforeEach(() => {
  cerrar.mockReset();
  estado = { suspension: { motivo: "Uso indebido de la portería" }, cerrarAvisoDeSuspension: cerrar };
});

describe("la cuenta suspendida", () => {
  it("dice que está suspendida, el motivo y a quién escribir", () => {
    render(<CuentaSuspendidaScreen />);
    expect(screen.getByText("Tu cuenta está suspendida")).toBeTruthy();
    expect(screen.getByText("Motivo: Uso indebido de la portería")).toBeTruthy();
    expect(screen.getByText("Si crees que es un error, escríbenos a soporte@veciyo.com.")).toBeTruthy();
  });

  it("sin motivo conocido, dice que va por correo", () => {
    estado = { ...estado, suspension: { motivo: null } };
    render(<CuentaSuspendidaScreen />);
    expect(screen.getByText(/Te enviamos el motivo a tu correo/)).toBeTruthy();
  });

  it("«Entendido» la cierra", () => {
    render(<CuentaSuspendidaScreen />);
    fireEvent.click(screen.getByText("Entendido"));
    expect(cerrar).toHaveBeenCalled();
  });
});

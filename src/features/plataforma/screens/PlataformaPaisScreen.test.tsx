import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Un país del panel mientras carga y si la carga falla (13/11/2026). Antes, una
 * red caída se leía «Ese país no existe». Se dobla el hook y la ruta: lo que se
 * comprueba es lo que se ve.
 */
const estadoDelHook = { cargando: false, fallo: false };
const reintentar = vi.fn();

// La navegación de verdad no arranca en jsdom; aquí solo hace falta la ruta.
vi.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { codigo: "CO" } }),
  useNavigation: () => ({ navigate: vi.fn(), goBack: vi.fn() }),
  createNavigationContainerRef: () => ({ isReady: () => false, current: null }),
}));

vi.mock("../hooks/usePanelDeLaApp", () => ({
  usePaisesDeLaApp: () => ({
    paises: [],
    monedas: [],
    cargando: estadoDelHook.cargando,
    error: estadoDelHook.fallo ? new Error("red") : null,
    estado: { cargando: estadoDelHook.cargando, fallo: estadoDelHook.fallo, reintentar },
    esDueno: true,
    cambiar: { isPending: false, mutateAsync: vi.fn() },
    cambiarDocumento: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

const { PlataformaPaisScreen } = await import("./PlataformaPaisScreen");

describe("un país del panel", () => {
  it("mientras carga enseña la silueta, no «Ese país no existe»", () => {
    estadoDelHook.cargando = true;
    estadoDelHook.fallo = false;
    render(<PlataformaPaisScreen />);
    expect(screen.getByLabelText(/Cargando el país/)).toBeTruthy();
    expect(screen.queryByText("Ese país no existe.")).toBeNull();
  });

  it("si la carga falla, lo dice y ofrece reintentar", () => {
    estadoDelHook.cargando = false;
    estadoDelHook.fallo = true;
    render(<PlataformaPaisScreen />);
    expect(screen.getByText(/No se pudo cargar el país/)).toBeTruthy();
    expect(screen.getByLabelText("Reintentar")).toBeTruthy();
    expect(screen.queryByText("Ese país no existe.")).toBeNull();
  });

  it("si cargó y no está, sí dice que no existe", () => {
    estadoDelHook.cargando = false;
    estadoDelHook.fallo = false;
    render(<PlataformaPaisScreen />);
    expect(screen.getByText("Ese país no existe.")).toBeTruthy();
  });
});

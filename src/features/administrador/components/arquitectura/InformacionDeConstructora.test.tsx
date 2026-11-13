import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * La constructora cuando su lectura no llega (13/11/2026). Antes, si fallaba,
 * salían los campos vacíos con «Guardar información» activo, y pulsarlo
 * escribía blancos encima de lo guardado. Se dobla la lectura: lo que se
 * comprueba es lo que se ve.
 */
const lectura = { modo: "pendiente" as "pendiente" | "falla" | "llega" };

vi.mock("@/shared/hooks", () => ({ useCondominioActivo: () => "condominio-1" }));
vi.mock("@/stores", () => ({
  useUIStore: (elegir: (s: { addToast: () => void }) => unknown) => elegir({ addToast: () => {} }),
}));
vi.mock("../../services/constructora.repo", () => ({
  guardarConstructora: vi.fn(),
  obtenerConstructora: () =>
    lectura.modo === "pendiente"
      ? new Promise(() => {})
      : lectura.modo === "falla"
        ? Promise.reject(new Error("red"))
        : Promise.resolve({
            nombre: "Constructora Sur",
            anioEntrega: "2024",
            garantiaHasta: "",
            responsablePostventa: "",
            correoPostventa: "",
            telefono: "",
            codigoPais: "CO",
          }),
}));

const { InformacionDeConstructora } = await import("./InformacionDeConstructora");

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <InformacionDeConstructora />
    </QueryClientProvider>,
  );
}

describe("la información de la constructora", () => {
  it("mientras carga enseña la silueta y no el botón de guardar", () => {
    lectura.modo = "pendiente";
    montar();
    expect(screen.getByLabelText(/Cargando la constructora/)).toBeTruthy();
    expect(screen.queryByText("Guardar información")).toBeNull();
  });

  it("si la lectura falla, lo dice y no deja guardar blancos", async () => {
    lectura.modo = "falla";
    montar();
    expect(await screen.findByText(/No se pudo cargar la constructora/)).toBeTruthy();
    expect(screen.getByLabelText("Reintentar")).toBeTruthy();
    expect(screen.queryByText("Guardar información")).toBeNull();
  });

  it("cuando llega, el formulario sale con lo guardado", async () => {
    lectura.modo = "llega";
    montar();
    expect(await screen.findByText("Guardar información")).toBeTruthy();
    expect(screen.getByDisplayValue("Constructora Sur")).toBeTruthy();
  });
});

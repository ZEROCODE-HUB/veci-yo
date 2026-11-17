import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * «Completa tus datos» (16/11/2026): quien entra con Google llena el mismo
 * formulario que el registro, sin correo ni contraseña. Se dobla lo que habla
 * con la base; lo que se comprueba es qué pide y que sin todo no guarda.
 */

const guardar = vi.fn(async () => {});
vi.mock("@/shared/layouts", () => ({
  ScreenLayout: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (elegir: (s: unknown) => unknown) =>
    elegir({
      usuario: { nombre: "Ana", apellido: "Pérez", correo: "ana@gmail.com", tipoDocumento: "", verificado: false },
      sincronizarContexto: async () => {},
      cerrarSesion: () => {},
    }),
}));
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (elegir: (s: unknown) => unknown) => elegir({ addToast: () => {} }),
}));
vi.mock("@/shared/services/sesion", () => ({ completarMisDatos: (d: unknown) => guardar(d) }));
vi.mock("@/shared/hooks", () => ({
  useParametrosDeLaBase: () => ({
    listo: true,
    numero: (clave: string) =>
      ({ nombre_largo_minimo: 2, nombre_largo_maximo: 40, telefono_largo_minimo: 7, telefono_largo_maximo: 12 })[clave] ?? 0,
  }),
  useDocumentosParaRegistrarse: () => ({
    listo: true,
    reglas: [{ tipo: "cedula_ciudadania", nombre: "Cédula de ciudadanía" }],
  }),
}));
vi.mock("../hooks/useDocumentosLegales", () => ({
  useDocumentosLegales: () => ({ documentos: [], cargando: false }),
}));
vi.mock("../components", () => ({ LegalAccordion: () => null }));

const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { CompletarDatosScreen } = await import("./CompletarDatosScreen");

function Pantalla() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <CompletarDatosScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => guardar.mockClear());

describe("completa tus datos", () => {
  it("dice con qué correo entró y no pide correo ni contraseña", () => {
    render(<Pantalla />);
    screen.getByText(/Entraste con Google \(ana@gmail.com\)/);
    expect(screen.queryByText(/Contraseña/)).toBeNull();
    expect(screen.queryByText(/^Correo/)).toBeNull();
    screen.getAllByText(/Número de teléfono/);
    screen.getAllByText(/Identificación/);
  });

  it("sin aceptar los términos el botón no guarda", async () => {
    render(<Pantalla />);
    fireEvent.click(screen.getByText("Guardar y entrar"));
    await waitFor(() => expect(guardar).not.toHaveBeenCalled());
  });
});

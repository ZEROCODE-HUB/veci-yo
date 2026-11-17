import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/** El código de 6 cifras que deja la sesión abierta (17/11/2026). */

const confirmar = vi.fn<(correo: string, codigo: string) => Promise<void>>(async () => {});
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (elegir: (s: unknown) => unknown) => elegir({ confirmarCorreoReal: confirmar }),
}));
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (elegir: (s: unknown) => unknown) => elegir({ addToast: () => {} }),
}));
vi.mock("@/shared/services/correoPorConfirmar", () => ({ olvidarCorreoPorConfirmar: async () => {} }));
vi.mock("@/shared/services/sesion", () => ({ reenviarCodigoDeConfirmacion: async () => {} }));

const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { CodigoDeConfirmacion } = await import("./CodigoDeConfirmacion");

function Caja() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <CodigoDeConfirmacion correo="ana@ejemplo.com" onCambiarDeCorreo={() => {}} />
    </QueryClientProvider>
  );
}

describe("el código de confirmación", () => {
  it("dice a qué correo llegó y no deja entrar hasta tener las 6 cifras", async () => {
    render(<Caja />);
    screen.getByText(/código de 6 cifras a ana@ejemplo.com/);
    fireEvent.click(screen.getByText("Entrar"));
    expect(confirmar).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("123456"), { target: { value: "12 34 56 7" } });
    fireEvent.click(screen.getByText("Entrar"));
    await waitFor(() => expect(confirmar).toHaveBeenCalledWith("ana@ejemplo.com", "123456"));
  });

  it("reenviar espera un minuto", () => {
    render(<Caja />);
    screen.getByText(/Reenviar el código \(\d+ s\)/);
  });
});

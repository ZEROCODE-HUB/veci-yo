import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * La invitación decide sola entre «Iniciar sesión» y «Crear cuenta»
 * (16/11/2026, cliente: «se abre la app, le muestra la invitación y pues la
 * app decide si debe crear cuenta o iniciar sesión»).
 *
 * Se doblan la navegación, la sesión y el servicio: lo que se comprueba es
 * qué botón se ofrece en cada caso, no la llamada a la base (eso lo hace el
 * recorrido `una-sola-forma-de-invitar`).
 */

const navegar = vi.fn();
const reiniciar = vi.fn();
vi.mock("@/shared/layouts", () => ({
  ScreenLayout: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/shared/hooks", () => ({
  useNavegacionEntrada: () => ({ navigate: navegar, reset: reiniciar, goBack: () => {} }),
}));
vi.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { token: "t0k3n" } }),
}));

const sesion = { autenticado: false, usuario: null as { correo: string } | null };
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (elegir: (s: unknown) => unknown) =>
    elegir({ ...sesion, sincronizarContexto: async () => {} }),
}));
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (elegir: (s: unknown) => unknown) => elegir({ addToast: () => {} }),
}));
vi.mock("@/shared/services/invitacionPendiente", () => ({
  recordarInvitacion: () => {},
  olvidarInvitacion: () => {},
}));

let tieneCuenta: boolean | null = null;
let rol = "guardia";
vi.mock("@/shared/services/invitaciones", () => ({
  consultarInvitacion: async () => ({
    condominio: "Las Barranqueras",
    unidad: rol === "propietario" ? "301" : null,
    rol,
    correo: "ana@ejemplo.com",
    nombre: "Ana",
    expiraEn: "2030-01-01",
    vigente: true,
  }),
  laInvitacionTieneCuenta: async () => tieneCuenta,
  aceptarInvitacion: async () => "id",
  rechazarInvitacion: async () => {},
}));

const { AceptarInvitacionScreen } = await import("./AceptarInvitacionScreen");

beforeEach(() => {
  navegar.mockClear();
  reiniciar.mockClear();
  sesion.autenticado = false;
  sesion.usuario = null;
  tieneCuenta = null;
  rol = "guardia";
});

describe("sin sesión", () => {
  it("si el correo ya tiene cuenta, solo «Iniciar sesión», y llega con el correo puesto", async () => {
    tieneCuenta = true;
    render(<AceptarInvitacionScreen />);
    fireEvent.click(await screen.findByText("Iniciar sesión"));
    expect(screen.queryByText("Crear cuenta")).toBeNull();
    screen.getByText(/Ya tienes una cuenta con ana@ejemplo.com/);
    expect(navegar).toHaveBeenCalledWith("Auth", {
      screen: "Login",
      params: { correo: "ana@ejemplo.com" },
    });
  });

  it("si no la tiene, solo «Crear cuenta»", async () => {
    tieneCuenta = false;
    render(<AceptarInvitacionScreen />);
    fireEvent.click(await screen.findByText("Crear cuenta"));
    expect(screen.queryByText("Iniciar sesión")).toBeNull();
    expect(navegar).toHaveBeenCalledWith("Auth", { screen: "Registro" });
  });

  it("si no se sabe, ofrece las dos", async () => {
    tieneCuenta = null;
    render(<AceptarInvitacionScreen />);
    await screen.findByText("Iniciar sesión");
    screen.getByText("Crear cuenta");
  });
});

describe("con sesión", () => {
  it("con el mismo correo, «Aceptar invitación»", async () => {
    sesion.autenticado = true;
    sesion.usuario = { correo: "Ana@Ejemplo.com" };
    render(<AceptarInvitacionScreen />);
    await screen.findByText("Aceptar invitación");
    expect(screen.queryByText("Iniciar sesión")).toBeNull();
  });

  it("con otro correo, dice que cierre sesión y no deja aceptar", async () => {
    sesion.autenticado = true;
    sesion.usuario = { correo: "otra@ejemplo.com" };
    render(<AceptarInvitacionScreen />);
    await screen.findByText(/pero esta invitación es para ana@ejemplo.com/);
    expect(screen.queryByText("Aceptar invitación")).toBeNull();
  });

  it("la del propietario se acepta en Inicio, con sus términos", async () => {
    rol = "propietario";
    sesion.autenticado = true;
    sesion.usuario = { correo: "ana@ejemplo.com" };
    render(<AceptarInvitacionScreen />);
    fireEvent.click(await screen.findByText("Ir a mi invitación"));
    expect(screen.queryByText("Aceptar invitación")).toBeNull();
    expect(reiniciar).toHaveBeenCalled();
  });
});

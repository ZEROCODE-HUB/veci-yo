import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * La pestaña del medio de la portería (15/10/2026).
 *
 * El cliente: «debería salir como en la vista de los otros usuarios, con esos
 * mismos iconos o imágenes». Desde el 30/10/2026 (Para Claude 165) solo lleva
 * lo que no está a mano en otro sitio: el directorio y los estacionamientos de
 * visita están en el Inicio de la portería, el chat y las llamadas en el botón
 * flotante, y el historial de S.O.S. en Perfil.
 */
const navegar = vi.fn();

vi.mock("@/stores", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({
      rolActivo: "guardia",
      condominios: [
        {
          condominioId: "c1",
          condominioNombre: "Las Barranqueras",
          rol: "guardia",
          porteriaId: null,
          permisos: { chat: true, llamadas: true },
        },
      ],
    }),
}));
vi.mock("@/shared/hooks", () => ({
  useNavegacion: () => ({}),
  useCondominioActivo: () => "c1",
}));
vi.mock("@/navigation/helpers/navigation.helpers", () => ({
  navigateToRoute: (_n: unknown, ruta: string) => navegar(ruta),
}));

const { PorteriaResumen } = await import("./PorteriaResumen");

beforeEach(() => {
  navegar.mockClear();
});

describe("la portería ve sus opciones como los demás", () => {
  it("en tarjetas, con el nombre de su edificio arriba", () => {
    render(<PorteriaResumen />);
    expect(screen.getByText("Las Barranqueras")).toBeDefined();
    for (const titulo of ["Visitas", "Correspondencia", "Zonas Comunes", "Anuncios"]) {
      expect(screen.getByRole("button", { name: titulo })).toBeDefined();
    }
  });

  it("cada tarjeta abre su pantalla", () => {
    render(<PorteriaResumen />);
    fireEvent.click(screen.getByRole("button", { name: "Zonas Comunes" }));
    expect(navegar).toHaveBeenCalledWith("ZonasComunes");
  });

  // Para Claude 165 (30/10/2026): se quitaron porque ya están en otro sitio,
  // y aquí solo repetían. Con el chat y las llamadas habilitados, tampoco.
  it("no repite lo que ya está a mano en otro sitio", () => {
    render(<PorteriaResumen />);
    for (const titulo of [
      "Estacionamientos de visita",
      "Directorio de propiedades",
      "Chat",
      "Llamar a una vivienda",
      "Intercomunicador",
    ]) {
      expect(screen.queryByRole("button", { name: titulo })).toBeNull();
    }
    expect(screen.queryByText(/S\.O\.S\./)).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * La pestaña del medio de la portería (15/10/2026).
 *
 * El cliente: «debería salir como en la vista de los otros usuarios, con esos
 * mismos iconos o imágenes, y no veo el chat o demás cosas». El chat y las
 * llamadas son de la portería solo si la administración los habilita (KT): si
 * no, se ven apagados y dicen quién los enciende, en vez de no estar.
 */
let permisos: Record<string, unknown> = {};
const navegar = vi.fn();

vi.mock("@/stores", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({
      rolActivo: "guardia",
      condominios: [
        { condominioId: "c1", condominioNombre: "Las Barranqueras", rol: "guardia", porteriaId: null, permisos },
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
vi.mock("@/features/visitas/hooks", () => ({ useVisitas: () => ({ items: [] }) }));
vi.mock("./EstacionamientosDeVisitaModal", () => ({ EstacionamientosDeVisitaModal: () => null }));

const { PorteriaResumen } = await import("./PorteriaResumen");

beforeEach(() => {
  navegar.mockClear();
});

describe("la portería ve sus opciones como los demás", () => {
  it("todas, en tarjetas", () => {
    permisos = { chat: true, llamadas: true };
    render(<PorteriaResumen />);
    for (const titulo of [
      "Visitas",
      "Correspondencia",
      "Zonas Comunes",
      "Estacionamientos de visita",
      "Directorio de propiedades",
      "Chat",
      "Llamar a una vivienda",
    ]) {
      expect(screen.getByRole("button", { name: titulo })).toBeDefined();
    }
    // Una sola puerta para llamar, como en el prototipo (23/10/2026).
    expect(screen.queryByRole("button", { name: "Intercomunicador" })).toBeNull();
  });

  it("con el chat habilitado, el chat abre", () => {
    permisos = { chat: true, llamadas: true };
    render(<PorteriaResumen />);
    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    expect(navegar).toHaveBeenCalledWith("Chat");
  });

  it("sin habilitar, el chat se ve apagado y dice quién lo enciende", () => {
    permisos = { chat: false, llamadas: false };
    render(<PorteriaResumen />);
    fireEvent.click(screen.getByRole("button", { name: "Chat, no habilitado" }));
    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByText(/no te ha habilitado el chat/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Llamar a una vivienda, no habilitado" })).toBeDefined();
  });
});

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { textoCompleto } from "@/pruebas/texto";

/** La versión de la app y sus últimos cambios, en el Perfil (21/10/2026). */
vi.mock("@/shared/version/version.generado", () => ({
  VERSION: "1.0.0",
  COMMIT: "a1b2c3d",
  PUBLICADA_EN: new Date(2026, 9, 21, 11, 5).toISOString(),
  CAMBIOS: [{ fecha: "2026-10-21", puntos: ["La llamada ya no se corta sola."] }],
}));

const { VersionDeLaApp } = await import("./VersionDeLaApp");

describe("la versión de la app", () => {
  it("dice qué versión es y cuándo se publicó", () => {
    render(<VersionDeLaApp />);
    screen.getByText(textoCompleto("Versión 1.0.0 (a1b2c3d)"));
    screen.getByText(textoCompleto("Publicada el 21/10/2026 a las 11:05"));
  });

  it("enseña los últimos cambios al pedirlos", () => {
    render(<VersionDeLaApp />);
    expect(screen.queryByText(/La llamada ya no se corta sola/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver últimos cambios" }));
    screen.getByText("21/10/2026");
    screen.getByText(/La llamada ya no se corta sola/);
  });
});

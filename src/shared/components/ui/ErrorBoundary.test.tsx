import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Text } from "react-native";

/**
 * Lo que sale cuando algo revienta al pintarse (26/10/2026): un aviso en vez
 * de la pantalla en blanco que vio el tester al escanear, y el error anotado en
 * la base con el sitio donde pasó.
 */
const anotado: Array<{ tipo: string; donde: string; mensaje: string }> = [];
vi.mock("@/shared/services/erroresDeLaApp", () => ({
  anotarEnLaBase: (tipo: string, donde: string, mensaje: string) => anotado.push({ tipo, donde, mensaje }),
  describirError: (e: Error) => ({ mensaje: e.message, detalle: e.stack }),
}));

const { ErrorBoundary } = await import("./ErrorBoundary");

let revienta = true;
function Fragil() {
  if (revienta) throw new Error("se rompió al pintar");
  return <Text>Todo bien</Text>;
}

let silenciar: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  anotado.length = 0;
  revienta = true;
  // React escribe en la consola el error que atrapa: aquí es lo esperado.
  silenciar = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => silenciar.mockRestore());

describe("ErrorBoundary", () => {
  it("enseña un aviso, no una pantalla en blanco, y anota el error", () => {
    render(
      <ErrorBoundary donde="app">
        <Fragil />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo falló en esta pantalla")).toBeDefined();
    expect(anotado).toEqual([{ tipo: "error", donde: "app", mensaje: "se rompió al pintar" }]);
  });

  it("«Volver a intentarlo» vuelve a pintar lo de dentro", async () => {
    render(
      <ErrorBoundary donde="app">
        <Fragil />
      </ErrorBoundary>,
    );
    revienta = false;
    await userEvent.click(screen.getByText("Volver a intentarlo"));
    expect(screen.getByText("Todo bien")).toBeDefined();
  });

  it("con alFallar, enseña lo que le digan", () => {
    render(
      <ErrorBoundary donde="escaneo del documento" alFallar={() => <Text>La cámara falló</Text>}>
        <Fragil />
      </ErrorBoundary>,
    );
    expect(screen.getByText("La cámara falló")).toBeDefined();
    expect(anotado[0].donde).toBe("escaneo del documento");
  });
});

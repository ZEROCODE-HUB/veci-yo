import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PasoParaEmpezar } from "../helpers/pasosParaEmpezar";

/**
 * «Tu edificio, paso a paso» (16/11/2026). El cliente: «una card indicando la
 * lista de cosas que debe hacer… que le lleve a la pantalla, y ya».
 */
const navegar = vi.fn();

vi.mock("@/shared/hooks", () => ({
  useNavegacion: () => ({}),
}));
vi.mock("@/navigation/helpers/navigation.helpers", () => ({
  navigateToRoute: (_n: unknown, ruta: string, params?: object) => navegar(ruta, params),
}));

const { ListaParaEmpezar } = await import("./ListaParaEmpezar");

const LISTA = { cargando: false };

const activar = vi.fn();
const PASOS: PasoParaEmpezar[] = [
  {
    id: "torres",
    texto: "Crea las torres y sus departamentos",
    hecho: true,
    destino: { ruta: "AdministradorArquitectura", params: { pestana: "Torres" } },
  },
  {
    id: "propietarios",
    texto: "Asigna los propietarios",
    hecho: false,
    nota: "12 de 20 departamentos",
    destino: { ruta: "AdministradorArquitectura", params: { pestana: "Torres" } },
  },
  { id: "guardias", texto: "Invita a los guardias", hecho: false, destino: { ruta: "AdministradorSeguridad" } },
  { id: "avisos", texto: "Activa los avisos en este celular", hecho: false, accion: activar },
  { id: "garita", texto: "Tu garita asignada", hecho: false, nota: "Pídeselo a la administración" },
];

beforeEach(() => {
  navegar.mockClear();
  activar.mockClear();
});

describe("la lista para empezar", () => {
  it("dice cuántos van y marca cada fila como lista o pendiente", () => {
    render(<ListaParaEmpezar titulo="Tu edificio, paso a paso" pasos={PASOS} carga={LISTA} />);
    expect(screen.getByText("Tu edificio, paso a paso")).toBeDefined();
    expect(screen.getByText("1 de 5 listos")).toBeDefined();
    expect(screen.getByRole("button", { name: "Crea las torres y sus departamentos, listo" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Asigna los propietarios, pendiente" })).toBeDefined();
    expect(screen.getByText("12 de 20 departamentos")).toBeDefined();
  });

  it("al tocar una fila va a su pantalla, con la pestaña", () => {
    render(<ListaParaEmpezar titulo="T" pasos={PASOS} carga={LISTA} />);
    fireEvent.click(screen.getByRole("button", { name: "Asigna los propietarios, pendiente" }));
    expect(navegar).toHaveBeenCalledWith("AdministradorArquitectura", { pestana: "Torres" });
    fireEvent.click(screen.getByRole("button", { name: "Invita a los guardias, pendiente" }));
    expect(navegar).toHaveBeenCalledWith("AdministradorSeguridad", undefined);
  });

  it("una fila con acción la hace en el sitio, sin navegar", () => {
    render(<ListaParaEmpezar titulo="T" pasos={PASOS} carga={LISTA} />);
    fireEvent.click(screen.getByRole("button", { name: "Activa los avisos en este celular, pendiente" }));
    expect(activar).toHaveBeenCalledTimes(1);
    expect(navegar).not.toHaveBeenCalled();
  });

  it("lo que hace la administración no es un botón", () => {
    render(<ListaParaEmpezar titulo="T" pasos={PASOS} carga={LISTA} />);
    expect(screen.queryByRole("button", { name: /Tu garita/ })).toBeNull();
    expect(screen.getByText("Pídeselo a la administración")).toBeDefined();
  });

  it("con todo hecho desaparece", () => {
    const todos = PASOS.map((p) => ({ ...p, hecho: true }));
    const { container } = render(<ListaParaEmpezar titulo="T" pasos={todos} carga={LISTA} />);
    expect(container.textContent).toBe("");
  });

  it("mientras carga no afirma nada pendiente", () => {
    render(<ListaParaEmpezar titulo="Tu edificio, paso a paso" pasos={PASOS} carga={{ cargando: true }} />);
    expect(screen.getByText("Tu edificio, paso a paso")).toBeDefined();
    expect(screen.queryByText(/listos/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("si no se pudo cargar no sale", () => {
    const { container } = render(
      <ListaParaEmpezar titulo="T" pasos={PASOS} carga={{ cargando: false, fallo: true }} />,
    );
    expect(container.textContent).toBe("");
  });
});

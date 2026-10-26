import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * Las cuentas del panel (24/10/2026): «en usuarios debería haber directo la
 * lista con una paginación, no quiero buscar sí o sí».
 *
 * Se prueba lo que se ve: que la lista sale sin escribir nada, que dice
 * cuántas hay y en qué página está, que las flechas piden la página que toca,
 * y que soporte no ve las acciones.
 */

const llamadas: Array<{ texto: string; pagina: number }> = [];
let respuesta: Record<string, unknown> = {};

vi.mock("../hooks/usePanelDeLaApp", () => ({
  useUsuariosDeLaApp: (texto: string, pagina: number) => {
    llamadas.push({ texto, pagina });
    return respuesta;
  },
}));

const { PlataformaUsuariosScreen } = await import("./PlataformaUsuariosScreen");

const cuenta = (n: number) => ({
  usuarioId: `u${n}`,
  nombre: `Persona ${n}`,
  correo: `persona${n}@correo.com`,
  creadaEn: "20/10/2026",
  ultimoIngreso: null,
  correoConfirmado: true,
  bloqueada: n === 2,
  edificios: [{ edificio: "Las Barranqueras 246", rol: "propietario" }],
  rolPlataforma: null,
  motivoSuspension: n === 2 ? "Uso indebido de la portería" : null,
});

beforeEach(() => {
  llamadas.length = 0;
  respuesta = {
    esDueno: true,
    usuarioId: "yo",
    cuentas: [cuenta(1), cuenta(2)],
    total: 45,
    cargando: false,
    error: null,
    actuar: { mutateAsync: vi.fn(), isPending: false },
  };
});

describe("la lista de cuentas", () => {
  it("sale sin buscar nada, con el total y la página", () => {
    render(<PlataformaUsuariosScreen />);

    expect(llamadas[0]).toEqual({ texto: "", pagina: 1 });
    expect(screen.getByText("Persona 1")).toBeTruthy();
    expect(screen.getByText("Persona 2")).toBeTruthy();
    expect(screen.getByText("Suspendida")).toBeTruthy();
    expect(screen.getByText("45 cuentas")).toBeTruthy();
    // 45 cuentas de 20 en 20 son 3 páginas.
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });

  it("«Siguiente» pide la página 2", () => {
    render(<PlataformaUsuariosScreen />);
    fireEvent.click(screen.getByText("Siguiente"));
    expect(llamadas.at(-1)).toEqual({ texto: "", pagina: 2 });
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();
  });

  it("con una sola página no hay flechas", () => {
    respuesta = { ...respuesta, total: 2 };
    render(<PlataformaUsuariosScreen />);
    expect(screen.queryByText("Siguiente")).toBeNull();
    expect(screen.getByText("2 cuentas")).toBeTruthy();
  });

  it("enseña el motivo de la suspensión en su ficha", () => {
    render(<PlataformaUsuariosScreen />);
    fireEvent.click(screen.getByLabelText("Ficha de Persona 2"));
    expect(screen.getByText("Motivo de la suspensión: Uso indebido de la portería")).toBeTruthy();
  });

  it("soporte ve la ficha pero no las acciones", () => {
    respuesta = { ...respuesta, esDueno: false };
    render(<PlataformaUsuariosScreen />);
    fireEvent.click(screen.getByLabelText("Ficha de Persona 1"));
    expect(screen.getByText("Las Barranqueras 246 · Propietario")).toBeTruthy();
    expect(screen.queryByText("Suspender la cuenta")).toBeNull();
  });
});

/*
  QA 26/10/2026 (T-278): «la ficha no muestra la información del usuario al
  hacer click en ella». Tocar la cuenta no hacía nada; solo el botón
  «Acciones» respondía.
*/
describe("la ficha de una cuenta", () => {
  it("se abre al tocar la cuenta, con sus datos y sus acciones", () => {
    render(<PlataformaUsuariosScreen />);
    expect(screen.queryByText("Las Barranqueras 246 · Propietario")).toBeNull();

    const fila = screen.getByLabelText("Ficha de Persona 1");
    expect(fila.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(fila);

    expect(fila.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Alta 20/10/2026 · nunca ha entrado")).toBeTruthy();
    expect(screen.getByText("Correo confirmado")).toBeTruthy();
    expect(screen.getByText("Las Barranqueras 246 · Propietario")).toBeTruthy();
    expect(screen.getByText("Suspender la cuenta")).toBeTruthy();
  });

  it("se cierra al volver a tocarla", () => {
    render(<PlataformaUsuariosScreen />);
    const fila = screen.getByLabelText("Ficha de Persona 1");
    fireEvent.click(fila);
    fireEvent.click(fila);
    expect(screen.queryByText("Alta 20/10/2026 · nunca ha entrado")).toBeNull();
  });
});

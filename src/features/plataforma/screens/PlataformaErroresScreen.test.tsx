import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Los errores de la app en el panel (05/11/2026). Los datos vienen de dos
 * funciones de la base que ya filtran quién puede leerlas; aquí se doblan los
 * hooks y se comprueba lo que se ve: los grupos, las pestañas y las últimas
 * veces de un grupo. Y que **no** sale de quién es ninguna.
 */
const pedidos: string[] = [];
vi.mock("../hooks/useErroresDeLaApp", () => ({
  DIAS_DE_ERRORES: 7,
  useErroresDeLaApp: (tipo: string) => {
    pedidos.push(tipo);
    return {
      grupos:
        tipo === "error"
          ? [
              {
                donde: "contestar desde fuera",
                veces: 3,
                cuentas: 2,
                ultimaVez: "04/11/2026 20:39",
                ultimoMensaje: "Esa llamada ya no está sonando",
                versiones: ["1.0.0 · actualización 98"],
                plataformas: ["android"],
              },
            ]
          : [],
      cargando: false,
      error: null,
      refrescar: async () => {},
      refrescando: false,
    };
  },
  useVecesDeUnError: (donde: string | null) => ({
    veces: donde
      ? [
          {
            creadoEn: "04/11/2026 20:39",
            mensaje: "Esa llamada ya no está sonando",
            detalle: "at contestar (Intercomunicador.tsx:120)",
            version: "1.0.0 · actualización 98",
            plataforma: "android",
          },
        ]
      : [],
    cargando: false,
    error: null,
  }),
}));

const { PlataformaErroresScreen } = await import("./PlataformaErroresScreen");

beforeEach(() => {
  pedidos.length = 0;
});

describe("los errores de la app en el panel", () => {
  it("agrupa por dónde pasó, con cuántas veces y a cuántas cuentas, sin decir cuáles", () => {
    render(<PlataformaErroresScreen />);
    expect(screen.getByText("contestar desde fuera")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText(/2 cuentas · última vez 04\/11\/2026 20:39/)).toBeDefined();
    expect(screen.getByText(/Sin datos de las personas/)).toBeDefined();
  });

  it("al abrir un grupo enseña sus últimas veces", async () => {
    render(<PlataformaErroresScreen />);
    await userEvent.click(screen.getByText("Ver las últimas veces"));
    expect(screen.getByText("at contestar (Intercomunicador.tsx:120)")).toBeDefined();
    expect(screen.getByText("Ocultar las últimas veces")).toBeDefined();
  });

  it("los rastros van en su pestaña, aparte de los errores", async () => {
    render(<PlataformaErroresScreen />);
    expect(screen.getByRole("tab", { name: "Errores" }).getAttribute("aria-selected")).toBe("true");
    await userEvent.click(screen.getByRole("tab", { name: "Rastros" }));
    expect(pedidos).toContain("rastro");
    expect(screen.getByText("Ningún rastro en los últimos 7 días.")).toBeDefined();
  });
});

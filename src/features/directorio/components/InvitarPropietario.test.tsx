import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * La administración invita al propietario desde la ficha de la vivienda
 * (15/10/2026).
 *
 * Lo que se mira aquí es lo que ofrece y qué manda: que el botón no se pueda
 * pulsar sin nombre y correo, que invite como **propietario** a **esa**
 * vivienda, y que, con el correo apagado, enseñe el enlace. Que la base deje a
 * la administración y no a un vecino lo comprueba el recorrido
 * `la-administracion-invita-al-propietario`.
 */
const invitarAUnidad = vi.fn();

vi.mock("@/features/propietario/services/invitacionesUnidad.repo", () => ({
  invitarAUnidad: (...args: unknown[]) => invitarAUnidad(...args),
}));
vi.mock("@/shared/hooks", () => ({ useCondominioActivo: () => "c1" }));

const { InvitarPropietario } = await import("./InvitarPropietario");

function montar(propietarioActual?: string) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InvitarPropietario unidadId="u-102" propietarioActual={propietarioActual} />
    </QueryClientProvider>,
  );
}

function boton() {
  return screen.getByRole("button", { name: "Invitar propietario" });
}

beforeEach(() => {
  invitarAUnidad.mockReset();
});

describe("invitar al propietario de una vivienda", () => {
  it("sin nombre ni correo no se puede", () => {
    montar();
    expect(boton().getAttribute("aria-disabled")).toBe("true");
  });

  it("invita como propietario a esa vivienda y enseña el enlace", async () => {
    invitarAUnidad.mockResolvedValue({ enlace: "https://x/invitacion/abc", correoEnviado: false });
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ej. Ana Restrepo"), {
      target: { value: "Ana Restrepo" },
    });
    fireEvent.change(screen.getByPlaceholderText("ana@correo.com"), {
      target: { value: "Ana@Correo.com" },
    });
    fireEvent.click(boton());
    await waitFor(() => expect(invitarAUnidad).toHaveBeenCalled());
    expect(invitarAUnidad.mock.calls[0][0]).toMatchObject({
      condominioId: "c1",
      unidadId: "u-102",
      rol: "propietario",
      nombre: "Ana Restrepo",
      correo: "ana@correo.com",
    });
    expect(await screen.findByText("https://x/invitacion/abc")).toBeDefined();
  });

  it("si la base lo rechaza, dice por qué", async () => {
    invitarAUnidad.mockRejectedValue({ message: "Solo la administracion puede registrar al propietario de una vivienda" });
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ej. Ana Restrepo"), {
      target: { value: "Ana Restrepo" },
    });
    fireEvent.change(screen.getByPlaceholderText("ana@correo.com"), {
      target: { value: "ana@correo.com" },
    });
    fireEvent.click(boton());
    expect(await screen.findByText(/Solo la administracion puede registrar/)).toBeDefined();
  });

  it("si ya hay dueño, lo dice", () => {
    montar("Guillermo Provenzano");
    expect(screen.getByText(/Ya figura Guillermo Provenzano/)).toBeDefined();
  });
});

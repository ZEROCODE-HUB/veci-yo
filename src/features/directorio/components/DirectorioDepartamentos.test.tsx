import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSeleccionDeViviendas } from "../hooks/useSeleccionDeViviendas";
import type { DirectorioContactos, Unidad } from "../types/directorio";
import type { ResultadoDelMensaje } from "../services/directorio.repo";
import { DirectorioDepartamentos } from "./DirectorioDepartamentos";
import { BarraDeMensaje } from "./BarraDeMensaje";

/**
 * Seleccionar departamentos y escribirles (16/11/2026, cliente: «poder
 * seleccionar masivamente, y poder enviar un mensaje»).
 *
 * Lo que se mira es la cuenta: «Seleccionar todos (N)» marca las que se ven,
 * «Enviar mensaje (N)» dice cuántas van, y lo que deja de verse con un filtro
 * deja de contar. Quién puede enviar lo comprueba la base
 * (`directorio-mensaje-y-personal-permanente.test.ts`); aquí se dobla el
 * envío y se mira lo que se dice al terminar.
 */
const enviar = vi.fn<(unidades: string[], texto: string) => Promise<ResultadoDelMensaje[]>>();
vi.mock("../services/directorio.repo", () => ({
  enviarMensajeAViviendas: (unidades: string[], texto: string) => enviar(unidades, texto),
}));

const unidad = (codigo: string, piso: number): Unidad =>
  ({ id: Number(codigo), uuid: `u-${codigo}`, codigo, piso, torreNumero: 1, estado: "aceptado" }) as Unidad;
const U101 = unidad("101", 1);
const U102 = unidad("102", 1);
const U201 = unidad("201", 2);

const SIN_NADIE: DirectorioContactos = {
  administrador: { nombre: "Sin asignar", telefono: "" },
  anfitrion: { nombre: "Sin asignar", telefono: "" },
  propietario: { nombre: "Sin asignar", telefono: "" },
  personas: [],
};

function Directorio({ unidades, esAdmin = true }: { unidades: Unidad[]; esAdmin?: boolean }) {
  const seleccion = useSeleccionDeViviendas(unidades, "c1");
  return (
    <>
      <DirectorioDepartamentos
        unidades={unidades}
        seleccion={esAdmin ? seleccion : null}
        contactosFor={() => SIN_NADIE}
        depositosDe={() => []}
        vehiculosDe={() => []}
        onAbrir={vi.fn()}
      />
      {esAdmin ? <BarraDeMensaje seleccion={seleccion} /> : null}
    </>
  );
}

const cliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const pintar = (unidades: Unidad[], esAdmin = true) => {
  const qc = cliente();
  const vista = render(
    <QueryClientProvider client={qc}>
      <Directorio unidades={unidades} esAdmin={esAdmin} />
    </QueryClientProvider>,
  );
  return {
    ...vista,
    filtrar: (otras: Unidad[]) =>
      vista.rerender(
        <QueryClientProvider client={qc}>
          <Directorio unidades={otras} esAdmin={esAdmin} />
        </QueryClientProvider>,
      ),
  };
};

beforeEach(() => enviar.mockReset());

describe("seleccionar departamentos", () => {
  it("sin ser administración no hay «Seleccionar»", () => {
    pintar([U101, U102]);
    expect(screen.getByText("Seleccionar")).toBeTruthy();
    render(
      <QueryClientProvider client={cliente()}>
        <Directorio unidades={[U201]} esAdmin={false} />
      </QueryClientProvider>,
    );
    expect(screen.getAllByText("Seleccionar")).toHaveLength(1);
  });

  it("«Seleccionar todos (N)» marca las que se ven y la cuenta llega al botón", () => {
    pintar([U101, U102, U201]);
    fireEvent.click(screen.getByText("Seleccionar"));
    expect(screen.getByText("Enviar mensaje (0)")).toBeTruthy();

    fireEvent.click(screen.getByText("Seleccionar todos (3)"));
    expect(screen.getByText("Enviar mensaje (3)")).toBeTruthy();
    const casillas = screen.getAllByRole("checkbox");
    expect(casillas.map((c) => c.getAttribute("aria-checked"))).toEqual(["true", "true", "true"]);

    // Otra vez, las quita.
    fireEvent.click(screen.getByText("Quitar todos"));
    expect(screen.getByText("Enviar mensaje (0)")).toBeTruthy();
  });

  it("de una en una, y lo que deja de verse con un filtro deja de contar", () => {
    const { filtrar } = pintar([U101, U102, U201]);
    fireEvent.click(screen.getByText("Seleccionar"));
    fireEvent.click(screen.getByLabelText("Torre 1 · Depto 101"));
    fireEvent.click(screen.getByLabelText("Torre 1 · Depto 201"));
    expect(screen.getByText("Enviar mensaje (2)")).toBeTruthy();

    // Filtrado al piso 1: la 201 ya no se ve.
    filtrar([U101, U102]);
    expect(screen.getByText("Enviar mensaje (1)")).toBeTruthy();
    expect(screen.getByText("Seleccionar todos (2)")).toBeTruthy();

    // Al quitar el filtro, la 201 vuelve a verse **sin** marcar.
    filtrar([U101, U102, U201]);
    expect(screen.getByText("Enviar mensaje (1)")).toBeTruthy();
    expect(screen.getByLabelText("Torre 1 · Depto 201").getAttribute("aria-checked")).toBe("false");
  });

  it("al enviar dice a cuántas llegó y cuál falló", async () => {
    enviar.mockResolvedValue([
      { unidadId: "u-101", codigo: "101", enviado: true, motivo: null, conversacionId: "c-1" },
      { unidadId: "u-102", codigo: "102", enviado: false, motivo: "Ese canal esta archivado", conversacionId: null },
    ]);
    pintar([U101, U102]);
    fireEvent.click(screen.getByText("Seleccionar"));
    fireEvent.click(screen.getByText("Seleccionar todos (2)"));
    fireEvent.click(screen.getByText("Enviar mensaje (2)"));

    fireEvent.change(screen.getByPlaceholderText("Escribe el mensaje"), {
      target: { value: "Mañana cortan el agua" },
    });
    fireEvent.click(screen.getByText("Enviar a 2 departamentos"));

    await waitFor(() => expect(screen.getByText("Enviado a 1 departamento")).toBeTruthy());
    expect(enviar).toHaveBeenCalledWith(["u-101", "u-102"], "Mañana cortan el agua");
    expect(screen.getByText("Torre 1 · Depto 102: Ese canal esta archivado")).toBeTruthy();
  });
});

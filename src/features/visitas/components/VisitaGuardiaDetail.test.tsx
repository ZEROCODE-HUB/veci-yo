import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render as montar, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { VisitaItem } from "@/shared/types";

/**
 * La ficha de una visita en la portería.
 *
 * Las anotaciones: el cliente lo vio el 20/10/2026 (T-023): «hay un bug que
 * hace que las letras no se escriban». Cada tecla iba a la base y el campo se
 * pintaba con lo que volvía. Desde el 30/10/2026 (Para Claude 169 y 170) las
 * dos casillas de ingreso y salida son una sola bitácora: se escribe, se pulsa
 * «Guardar anotación» y queda con la hora y quién la puso.
 */

// Las placas piden datos a la base: aquí no son el asunto.
vi.mock("./VehiculosEnPorteria", () => ({ VehiculosEnPorteria: () => null }));

/*
  La bitácora lee y escribe por su repositorio: se dobla para ver qué se le
  pide guardar. La lista viene vacía --lo que importa es lo que se escribe--.
*/
const crearAnotacion = vi.fn();
vi.mock("../services/anotaciones.repo", () => ({
  obtenerAnotaciones: async () => [],
  crearAnotacion: (datos: unknown) => crearAnotacion(datos),
}));

const { VisitaGuardiaDetail } = await import("./VisitaGuardiaDetail");

// La bitácora pasa por React Query: sin el proveedor la ficha ni se monta.
const render = (ui: React.ReactElement) =>
  montar(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {ui}
    </QueryClientProvider>,
  );

beforeEach(() => {
  crearAnotacion.mockReset();
  crearAnotacion.mockResolvedValue(undefined);
});

const visita = {
  id: 1,
  uuid: "v1",
  tipo: "visita",
  nombre: "Armando Barrera",
  estado: "Programada",
  fechaDesde: "20/10/2026",
  fechaHasta: "20/10/2026",
  anotacionesIngreso: "",
  anotacionesSalida: "",
  invitados: [],
  vehiculos: [],
} as unknown as VisitaItem;

const escribir = (campo: HTMLElement, texto: string) => {
  let llevado = "";
  for (const letra of texto) {
    llevado += letra;
    fireEvent.change(campo, { target: { value: llevado } });
  }
};

describe("las anotaciones de la portería", () => {
  it("no se comen letras mientras se escribe", () => {
    render(<VisitaGuardiaDetail item={visita} />);
    const campo = screen.getByPlaceholderText("Escribe una anotación") as HTMLTextAreaElement;

    escribir(campo, "Trae un paquete");

    expect(campo.value).toBe("Trae un paquete");
    // Nada va a la base tecla a tecla: eso era lo que se comía las letras.
    expect(crearAnotacion).not.toHaveBeenCalled();
  });

  it("se guarda una vez, al pulsar guardar, con el texto entero", async () => {
    render(<VisitaGuardiaDetail item={visita} />);
    escribir(screen.getByPlaceholderText("Escribe una anotación"), "Trae un paquete");

    fireEvent.click(screen.getByText("Guardar anotación"));

    await vi.waitFor(() => expect(crearAnotacion).toHaveBeenCalledTimes(1));
    expect(crearAnotacion).toHaveBeenCalledWith(
      expect.objectContaining({ visitaUuid: "v1", texto: "Trae un paquete" }),
    );
  });

  it("lo anotado antes en las dos casillas se sigue viendo", () => {
    render(
      <VisitaGuardiaDetail
        item={{ ...visita, anotacionesIngreso: "Trae un paquete", anotacionesSalida: "Salió con prisa" }}
      />,
    );
    expect(screen.getByText("Anotado al ingreso")).toBeDefined();
    expect(screen.getByText("Trae un paquete")).toBeDefined();
    expect(screen.getByText("Anotado a la salida")).toBeDefined();
    expect(screen.getByText("Salió con prisa")).toBeDefined();
  });

  // Para Claude 170 (30/10/2026): las dos casillas se cambiaron por la bitácora.
  it("ya no tiene las dos casillas de ingreso y salida", () => {
    render(<VisitaGuardiaDetail item={visita} />);
    expect(screen.queryByPlaceholderText("Observaciones al recibir a la visita")).toBeNull();
    expect(screen.queryByPlaceholderText("Observaciones al retirarse la visita")).toBeNull();
  });
});

describe("registrar la salida (hueco 31, 27/10/2026)", () => {
  const dentro = {
    ...visita,
    invitados: [{ uuid: "i1", nombre: "Armando Barrera", llego: true, horaIngreso: "10:00" }],
  } as unknown as VisitaItem;

  it("pide confirmarla antes de registrarla", () => {
    const salida = vi.fn();
    render(<VisitaGuardiaDetail item={dentro} personIndex={0} onToggleDeparture={salida} />);

    fireEvent.click(screen.getByRole("switch", { name: "Registrar salida" }));
    expect(salida).not.toHaveBeenCalled();
    expect(screen.getByText(/no se puede deshacer/)).toBeDefined();

    fireEvent.click(screen.getByText("Sí, registrar salida"));
    expect(salida).toHaveBeenCalledWith(true);
  });

  it("y cancelar no registra nada", () => {
    const salida = vi.fn();
    render(<VisitaGuardiaDetail item={dentro} personIndex={0} onToggleDeparture={salida} />);
    fireEvent.click(screen.getByRole("switch", { name: "Registrar salida" }));
    fireEvent.click(screen.getByText("Cancelar"));
    expect(salida).not.toHaveBeenCalled();
    expect(screen.queryByText(/no se puede deshacer/)).toBeNull();
  });

  it("registrada, en una visita ya no se puede apagar", () => {
    const salio = {
      ...dentro,
      invitados: [{ ...dentro.invitados[0], horaSalida: "12:00" }],
    } as unknown as VisitaItem;
    render(<VisitaGuardiaDetail item={salio} personIndex={0} onToggleDeparture={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Registrar salida" }).getAttribute("aria-disabled")).toBe("true");
    // Ni la entrada, que al desmarcarse arrastraría la salida.
    expect(screen.getByRole("switch", { name: "Registrar entrada" }).getAttribute("aria-disabled")).toBe("true");
  });
});

describe("con quién viene un menor (hueco 36, 27/10/2026)", () => {
  it("la portería lo ve en su ficha", () => {
    const conMenor = {
      ...visita,
      invitados: [
        { uuid: "a1", nombre: "Armando Barrera" },
        { uuid: "m1", nombre: "Lucas Barrera", esMenor: true, responsableId: "a1" },
      ],
    } as unknown as VisitaItem;
    render(<VisitaGuardiaDetail item={conMenor} personIndex={1} />);
    expect(screen.getByText(/viene con Armando Barrera/)).toBeDefined();
  });
});

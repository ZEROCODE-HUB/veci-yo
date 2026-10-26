import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Buscar una visita desde el Inicio de la portería (26/10/2026).
 *
 * El cliente: «escaneé un QR y no me llevó a la reserva», y el buscador no
 * decía que aceptara el código del correo. Se prueba lo que ve el guardia: que
 * un QR de otro día dice de qué vivienda y qué fechas es en vez de no hacer
 * nada, que el mismo QR delante de la cámara no repite la búsqueda, y que el
 * código escrito en el buscador abre su estancia.
 *
 * Se doblan la cámara (en jsdom no hay; el doble deja disparar una lectura), la
 * base y la navegación.
 */
let leerQr: ((data: string) => void) | null = null;
vi.mock("expo-camera", () => ({
  CameraView: (props: { onBarcodeScanned?: (r: { data: string }) => void }) => {
    leerQr = (data) => props.onBarcodeScanned?.({ data });
    return null;
  },
  useCameraPermissions: () => [{ granted: true }, async () => ({ granted: true })],
}));

const buscar = vi.fn();
vi.mock("@/features/visitas/services/porteria.repo", () => ({
  buscarEstanciaPorCodigo: (codigo: string) => buscar(codigo),
}));

const navegar = vi.fn();
vi.mock("@/navigation/helpers/navigation.helpers", () => ({
  navigateToRoute: (_n: unknown, ruta: string, params: unknown) => navegar(ruta, params),
}));

vi.mock("@/shared/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks")>()),
  useNavegacion: () => ({}),
  useParametrosDeLaBase: () => ({ listo: true, error: null, numero: () => 12 }),
}));

const { BuscarEnPorteria } = await import("./BuscarEnPorteria");

const deOtroDia = {
  visitaId: "v-luego",
  laVe: false,
  unidad: "102",
  fechaDesde: "2026-10-29",
  fechaHasta: "2026-11-01",
  estado: "programada",
};
const deHoy = { ...deOtroDia, visitaId: "v-hoy", laVe: true };

beforeEach(() => {
  buscar.mockReset();
  navegar.mockReset();
  leerQr = null;
});

async function abrirElLector() {
  render(<BuscarEnPorteria />);
  await userEvent.click(screen.getByText("Escanear QR"));
}

describe("el QR del huésped", () => {
  it("de hoy, abre su estancia", async () => {
    buscar.mockResolvedValue(deHoy);
    await abrirElLector();
    leerQr?.("VECIYO:7A0C1B2C3D4E");
    await vi.waitFor(() => expect(navegar).toHaveBeenCalledWith("Visitas", { abrir: "v-hoy" }));
  });

  it("de otro día, dice de qué vivienda y qué fechas es, y no navega", async () => {
    buscar.mockResolvedValue(deOtroDia);
    await abrirElLector();
    leerQr?.("VECIYO:7A0C1B2C3D4E");
    expect(await screen.findByText(/Esa reserva es de la 102, del 29\/10\/2026 al 01\/11\/2026/)).toBeDefined();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("el mismo QR delante de la cámara no se busca una y otra vez", async () => {
    buscar.mockResolvedValue(deOtroDia);
    await abrirElLector();
    leerQr?.("VECIYO:7A0C1B2C3D4E");
    await screen.findByText(/Esa reserva es de la 102/);
    leerQr?.("VECIYO:7A0C1B2C3D4E");
    leerQr?.("VECIYO:7A0C1B2C3D4E");
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});

describe("el buscador", () => {
  it("dice que acepta el código", () => {
    render(<BuscarEnPorteria />);
    expect(screen.getByText(/Nombre, depto, placa o código/)).toBeDefined();
  });

  it("con el código del correo, abre su estancia", async () => {
    buscar.mockResolvedValue(deHoy);
    render(<BuscarEnPorteria />);
    await userEvent.type(screen.getByPlaceholderText(/el código del correo/), "7A0C1B2C3D4E");
    await userEvent.click(screen.getByText("Buscar"));
    await vi.waitFor(() => expect(navegar).toHaveBeenCalledWith("Visitas", { abrir: "v-hoy" }));
  });

  it("con el código de una reserva de otro día, lo dice debajo y no navega", async () => {
    buscar.mockResolvedValue(deOtroDia);
    render(<BuscarEnPorteria />);
    await userEvent.type(screen.getByPlaceholderText(/el código del correo/), "9799B0C7BB53");
    await userEvent.click(screen.getByText("Buscar"));
    expect(await screen.findByText(/Esa reserva es de la 102, del 29\/10\/2026/)).toBeDefined();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("con un nombre, busca en la lista", async () => {
    render(<BuscarEnPorteria />);
    await userEvent.type(screen.getByPlaceholderText(/el código del correo/), "Ana");
    await userEvent.click(screen.getByText("Buscar"));
    expect(navegar).toHaveBeenCalledWith("Visitas", { busqueda: "Ana" });
    expect(buscar).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { tiposQuePuedeRegistrar } from "../helpers/tiposQuePuedeRegistrar";

/**
 * Lo que la portería puede registrar (16/11/2026, pedido del cliente: «debe
 * dejar registrar solo amigos o familiares y profesional temporal»).
 *
 * Se le había quitado el alta entera el 01/11/2026 y la pantalla le decía
 * «Desde tu perfil no se registran visitas». Aquí se comprueba lo que **se
 * ve**: las dos tarjetas, y ni el permanente ni el huésped. El estado del
 * formulario se dobla con la lista que calcula el hook de verdad
 * (`tiposQuePuedeRegistrar`); que la base diga lo mismo lo comprueba el
 * recorrido `la-porteria-registra-amigos-y-temporales`.
 */

let rol: "guardia" | "propietario" = "guardia";
const alta = () => ({
  esGuardia: rol === "guardia",
  nacenDentro: false,
  creando: false,
  esAdmin: false,
  esProfesional: false,
  tiposDisponibles: tiposQuePuedeRegistrar({
    esGuardia: rol === "guardia",
    esAdmin: false,
    esHuesped: false,
    rentaCortaPermitida: true,
  }),
  navigation: { goBack: () => {}, setOptions: () => {} },
  tipoSeleccionado: null,
  setTipoSeleccionado: () => {},
  selectedDate: new Date(2026, 10, 16),
  fechaSalida: "",
  nombre: "",
  showSuccess: false,
  visitaCreadaId: null,
  handleGuardar: () => {},
  tipoPreseleccionado: undefined,
  tieneSuscripcion: true,
  cargandoSuscripcion: false,
  cargandoReglas: false,
  showAvisoMenores: false,
  setShowAvisoMenores: () => {},
  amigosEnLaEstancia: null,
  cancelarVisitaDeAmigos: () => {},
  guardarAunqueHayaAmigos: () => {},
  cerrarAmigosEnLaEstancia: () => {},
});

vi.mock("@/features/visitas/hooks", () => ({ useVisitasNuevo: () => alta() }));
vi.mock("../hooks/useDatosDelMensaje", () => ({ useDatosDelMensaje: () => null }));
vi.mock("@/shared/hooks", () => ({
  useParametrosDeLaBase: () => ({ listo: true, numero: () => 5 }),
  useUnidadActiva: () => null,
}));
vi.mock("@/shared/layouts", () => ({
  DesplazableConTeclado: ({ children }: { children: React.ReactNode }) => children,
}));
// El resto del formulario no se pinta sin tipo elegido; se dobla para no
// arrastrar sus consultas.
vi.mock("@/features/visitas/components", async () => ({
  VisitaSuccessView: () => null,
  VisitaTipoCard: (await import("../components/VisitaTipoCard")).VisitaTipoCard,
}));
vi.mock("../components/nuevo/AmigosEnLaEstancia", () => ({ AmigosEnLaEstancia: () => null }));
vi.mock("../components/nuevo/AvisoLegalDeMenores", () => ({ AvisoLegalDeMenores: () => null }));

const { VisitasNuevoScreen } = await import("./VisitasNuevoScreen");

describe("el alta de visitas desde la portería", () => {
  it("ofrece solo amigos o familia y profesional temporal", () => {
    rol = "guardia";
    render(<VisitasNuevoScreen />);

    expect(screen.getByText("Amigos - Familiares")).toBeTruthy();
    expect(screen.getByText("Profesional Temporal")).toBeTruthy();
    expect(screen.queryByText("Profesional Permanente")).toBeNull();
    expect(screen.queryByText("Huésped Temporal")).toBeNull();
    // Ya no le dice que desde su perfil no se registran visitas.
    expect(screen.queryByText(/no se registran visitas/)).toBeNull();
  });

  it("y a un propietario le sigue ofreciendo los cuatro (control)", () => {
    rol = "propietario";
    render(<VisitasNuevoScreen />);

    expect(screen.getByText("Amigos - Familiares")).toBeTruthy();
    expect(screen.getByText("Profesional Permanente")).toBeTruthy();
    expect(screen.getByText("Huésped Temporal")).toBeTruthy();
  });
});

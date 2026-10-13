import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DirectorioAdminPagos } from "./DirectorioAdminPagos";

/**
 * La pantalla de pagos, desde que la cuota se configura (13/10/2026).
 *
 * Lo que se mira es lo que **ofrece**: antes no había forma de crear un mes,
 * la casilla se podía pulsar mientras guardaba, y el botón del comité salía
 * apagado sin decir por qué.
 *
 * El hook se dobla entero: lo que escribe en la base lo comprueba el recorrido
 * `las-cuotas-se-configuran`; aquí importa qué se pinta con cada estado.
 */
const cuotas = {
  periodos: [] as { id: string; periodo: string; monto: number; moneda: string; venceEn: string | null }[],
  periodosLeidos: true,
  periodo: null as null | { id: string; periodo: string; monto: number; moneda: string; venceEn: string | null },
  cuotaId: "",
  setCuotaId: vi.fn(),
  configuracion: { monto: 350000, moneda: "COP", diaVencimiento: 10, automatica: false } as null | {
    monto: number | null;
    moneda: string;
    diaVencimiento: number | null;
    automatica: boolean;
  },
  pagadas: new Set<string>(),
  estaPagada: (_unidad: string) => false,
  marcar: vi.fn(),
  marcarMasivo: vi.fn(),
  marcando: null as string | null,
  cargandoArchivo: false,
  crearMes: vi.fn(),
  creandoMes: false,
  importePropio: (unidad: string): number | null =>
    unidad === "u-102" ? 500000 : null,
  guardarImporte: vi.fn(),
  guardandoImporte: false,
  comiteDe: (unidad: string) => ({
    tieneCuenta: unidad === "u-101",
    enComite: false,
  }),
  cambiarComite: vi.fn(),
  cambiandoComite: null as string | null,
};

vi.mock("../hooks/useCuotas", () => ({ useCuotas: () => cuotas }));
// Lee archivos del dispositivo: no es el asunto de esta prueba.
vi.mock("./CargaMasivaDePagos", () => ({ CargaMasivaDePagos: () => null }));

const UNIDADES = [
  { id: 1, uuid: "u-101", codigo: "101" },
  { id: 2, uuid: "u-102", codigo: "102" },
];

const pintar = () =>
  render(
    <DirectorioAdminPagos unidades={UNIDADES} propietarioDe={() => "Ana"} />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  cuotas.periodos = [];
  cuotas.periodo = null;
  cuotas.cuotaId = "";
  cuotas.marcando = null;
  cuotas.configuracion = {
    monto: 350000,
    moneda: "COP",
    diaVencimiento: 10,
    automatica: false,
  };
});

describe("sin ningún mes de cuota", () => {
  it("ofrece crear el mes que corre", () => {
    pintar();

    fireEvent.click(screen.getByText(/^Crear el mes de /));
    expect(cuotas.crearMes).toHaveBeenCalledTimes(1);
  });

  it("y si no se ha dicho cuánto se cobra, dice dónde decirlo en vez de ofrecerlo", () => {
    cuotas.configuracion = {
      monto: null,
      moneda: "COP",
      diaVencimiento: null,
      automatica: false,
    };
    pintar();

    expect(screen.queryByText(/^Crear el mes de /)).toBeNull();
    expect(screen.getByText(/primero di cuánto se cobra/)).toBeTruthy();
  });

  it("no deja marcar pagado: no hay mes del que marcarlo", () => {
    pintar();

    fireEvent.click(screen.getByLabelText("Pagado · 101"));
    expect(cuotas.marcar).not.toHaveBeenCalled();
  });
});

describe("con un mes elegido", () => {
  beforeEach(() => {
    const mes = {
      id: "c-1",
      periodo: "2026-09-01",
      monto: 350000,
      moneda: "COP",
      venceEn: "2026-09-10",
    };
    cuotas.periodos = [mes];
    cuotas.periodo = mes;
    cuotas.cuotaId = "c-1";
  });

  it("dice cuánto es la cuota y cuándo vence", () => {
    pintar();
    expect(
      screen.getByText(/Cuota del mes: 350\.000 COP · vence el 10\/09\/2026/),
    ).toBeTruthy();
  });

  it("cada vivienda dice lo que paga, y cuál tiene importe propio", () => {
    pintar();
    expect(screen.getByText("Paga 350.000 COP")).toBeTruthy();
    expect(screen.getByText("Paga 500.000 COP · importe propio")).toBeTruthy();
  });

  it("marca el pago de la vivienda que se pulsa", () => {
    pintar();
    fireEvent.click(screen.getByLabelText("Pagado · 102"));
    expect(cuotas.marcar).toHaveBeenCalledWith("u-102", true);
  });

  it("mientras se guarda una casilla, esa no se puede volver a pulsar", () => {
    cuotas.marcando = "u-102";
    pintar();

    fireEvent.click(screen.getByLabelText("Pagado · 102"));
    expect(cuotas.marcar).not.toHaveBeenCalled();

    // El control: la de al lado sigue viva.
    fireEvent.click(screen.getByLabelText("Pagado · 101"));
    expect(cuotas.marcar).toHaveBeenCalledWith("u-101", true);
  });

  it("el comité solo se ofrece para quien tiene cuenta, y si no, se dice por qué", () => {
    pintar();

    // La 101 tiene propietario con cuenta; la 102 no.
    expect(screen.getAllByText("Marcar Comité de Propietarios")).toHaveLength(1);
    expect(
      screen.getByText(/el propietario tiene que tener cuenta en Veciyo/),
    ).toBeTruthy();

    fireEvent.click(screen.getByText("Marcar Comité de Propietarios"));
    expect(cuotas.cambiarComite).toHaveBeenCalledWith("u-101", true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DirectorioAdminPagos } from "./DirectorioAdminPagos";
import type { EstadoDeCuota } from "../services/cuotas.repo";

/**
 * La pantalla de pagos, desde que la cuota se configura (13/10/2026).
 *
 * Lo que se mira es lo que **ofrece**: antes no había forma de crear un mes,
 * se podía registrar dos veces mientras guardaba, y el botón del comité salía
 * apagado sin decir por qué.
 *
 * Desde el 30/10/2026 (Para Claude 188) la casilla «Pagado» ya no existe: cada
 * vivienda tiene «Registrar pago», que pide cuánto pagó, y el estado
 * --pagado, parcial o no pagado-- lo calcula la base.
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
  // Cómo va cada vivienda en el mes: lo calcula la base (Para Claude 187 y 188).
  estados: [] as EstadoDeCuota[],
  estadoDe(unidad: string): EstadoDeCuota | null {
    return this.estados.find((e) => e.unidadId === unidad) ?? null;
  },
  abonar: vi.fn(),
  abonando: null as string | null,
  registrarDesdePlantilla: vi.fn(),
  cargandoPlantilla: false,
  guardarImporteDelMes: vi.fn(),
  guardandoImporteDelMes: false,
  crearMes: vi.fn(),
  creandoMes: false,
  importePropio: (unidad: string): number | null =>
    unidad === "u-102" ? 500000 : null,
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

const sinPagar = (unidadId: string, codigo: string, total: number): EstadoDeCuota => ({
  unidadId,
  codigo,
  responsable: "Ana",
  mensual: total,
  variables: [],
  total,
  abonado: 0,
  saldo: total,
  estado: "No pagado",
});

beforeEach(() => {
  vi.clearAllMocks();
  cuotas.periodos = [];
  cuotas.periodo = null;
  cuotas.cuotaId = "";
  cuotas.abonando = null;
  cuotas.estados = [];
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

  it("no deja registrar un pago: no hay mes del que registrarlo", () => {
    pintar();

    fireEvent.click(screen.getByLabelText("Registrar pago de 101"));
    expect(screen.queryByText("Pago de 101")).toBeNull();
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

  it("registra lo que pagó la vivienda que se pulsa", () => {
    cuotas.estados = [sinPagar("u-101", "101", 350000), sinPagar("u-102", "102", 500000)];
    pintar();

    fireEvent.click(screen.getByLabelText("Registrar pago de 102"));
    fireEvent.change(screen.getByLabelText("Importe que paga (COP) *"), {
      target: { value: "200000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(cuotas.abonar).toHaveBeenCalledWith("u-102", 200000);
  });

  it("la casilla «Pagado» de la lista registra todo lo que falta de esa vivienda", () => {
    cuotas.estados = [sinPagar("u-101", "101", 350000), sinPagar("u-102", "102", 500000)];
    pintar();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pagado (pagó todo lo que falta: 500.000 COP)" }),
    );

    expect(cuotas.abonar).toHaveBeenCalledWith("u-102", 500000);
  });

  it("sin mes elegido, la casilla «Pagado» no se puede marcar", () => {
    pintar();
    const casillas = screen.getAllByRole("checkbox", { name: "Pagado" });
    casillas.forEach((c) => fireEvent.click(c));
    expect(cuotas.abonar).not.toHaveBeenCalled();
  });

  it("no deja registrar más de lo que falta", () => {
    cuotas.estados = [sinPagar("u-101", "101", 350000), sinPagar("u-102", "102", 500000)];
    pintar();

    fireEvent.click(screen.getByLabelText("Registrar pago de 102"));
    fireEvent.change(screen.getByLabelText("Importe que paga (COP) *"), {
      target: { value: "600000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(cuotas.abonar).not.toHaveBeenCalled();
    expect(screen.getByText(/No puede pasar de lo que falta: 500\.000 COP/)).toBeTruthy();
  });

  it("mientras se guarda un pago, esa vivienda no se puede volver a pulsar", () => {
    cuotas.estados = [sinPagar("u-101", "101", 350000), sinPagar("u-102", "102", 500000)];
    cuotas.abonando = "u-102";
    pintar();

    fireEvent.click(screen.getByLabelText("Registrar pago de 102"));
    expect(screen.queryByText("Pago de 102")).toBeNull();

    // El control: la de al lado sigue viva.
    fireEvent.click(screen.getByLabelText("Registrar pago de 101"));
    expect(screen.getByText("Pago de 101")).toBeTruthy();
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

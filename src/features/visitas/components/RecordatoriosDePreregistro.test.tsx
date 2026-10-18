import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { VisitaItem } from "@/shared/types";
import { textoCompleto } from "@/pruebas/texto";
import { formatDate } from "@/shared/utils";

/**
 * La alerta del anfitrión: llegan pronto y sin preregistro (14/10/2026).
 *
 * Lo que se mira aquí es lo que se ve: que salga solo cuando hay alguna, y
 * que sin correo del huésped el botón deje el mensaje listo para pegar.
 */
let items: VisitaItem[] = [];
const recordar = vi.fn();

/*
  Los parámetros de la base se doblan con sus valores actuales (claves.txt de
  configuracion_plataforma): la prueba es de la pantalla, no de la tabla. Una
  clave que no esté aquí revienta, igual que en la app.
*/
const PARAMETROS: Record<string, unknown> = {
  preregistro_alerta_dias: 3,
  porteria_dias_a_la_vista: 2,
  verificaciones_aviso_quedan: 5,
  verificaciones_paquete_tamano: 10,
  personas_vehiculos_tope: 99,
};
const parametro = (clave: string) => {
  if (!(clave in PARAMETROS)) throw new Error(`Parámetro sin doblar: ${clave}`);
  return PARAMETROS[clave];
};
const parametrosDeLaBase = () => ({
  listo: true,
  numero: (clave: string) => parametro(clave) as number,
  texto: (clave: string) => parametro(clave) as string,
  booleano: (clave: string) => parametro(clave) as boolean,
  lista: (clave: string) => parametro(clave) as unknown[],
});
vi.mock("@/shared/hooks", async (original) => ({
  ...((await original()) as Record<string, unknown>),
  useParametrosDeLaBase: () => parametrosDeLaBase(),
}));
vi.mock("@/stores", () => ({
  useUIStore: () => ({ addToast: vi.fn() }),
}));
vi.mock("../hooks/useVisitas", () => ({ useVisitas: () => ({ items }) }));
vi.mock("../services/precheckin.repo", () => ({
  recordarPreregistro: (...args: unknown[]) => recordar(...args),
}));
vi.mock("expo-clipboard", () => ({ setStringAsync: vi.fn() }));

const { RecordatoriosDePreregistro } = await import("./RecordatoriosDePreregistro");

const enDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatDate(d);
};

const estancia = (dias: number): VisitaItem =>
  ({
    id: 1,
    uuid: "v1",
    tipo: "huesped-temporal",
    nombre: "Ana Pérez",
    ci: "",
    estado: "Programada",
    depto: "102",
    invitados: [{ nombre: "Ana Pérez", llego: false, timeline: {} }],
    tieneVehiculo: false,
    esEvento: false,
    vehiculos: [],
    fechaDesde: enDias(dias),
  }) as VisitaItem;

beforeEach(() => {
  recordar.mockReset();
});

describe("llegan pronto y sin preregistro", () => {
  it("no sale si no hay ninguna", () => {
    items = [estancia(10)];
    render(<RecordatoriosDePreregistro />);
    expect(screen.queryByText(textoCompleto("Llegan pronto y sin preregistro"))).toBeNull();
  });

  it("sin correo del huésped, deja el mensaje listo para pegar", async () => {
    items = [estancia(2)];
    recordar.mockResolvedValue({ enlace: "https://web/access/t", correoEnviado: false });
    render(<RecordatoriosDePreregistro />);

    expect(screen.getByText(textoCompleto("Vivienda 102 · Llega en 2 días"))).toBeDefined();
    await userEvent.click(screen.getByText(textoCompleto("Enviar recordatorio")));

    expect(recordar).toHaveBeenCalledWith("v1", 2);
    expect(screen.getByText(/Recuerda hacer tu preregistro antes de llegar: https:\/\/web\/access\/t/)).toBeDefined();
  });
});

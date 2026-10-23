import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { textoCompleto } from "@/pruebas/texto";

/**
 * Lo que la anfitriona ve --y copia-- después de registrar a un huésped.
 *
 * Desde el 23/10/2026 es el **mismo** botón y el mismo mensaje que en la ficha
 * de la reserva: antes aquí salía un texto sin enlace («tu reserva está
 * confirmada… ¡Te esperamos!») y en la ficha el enlace sin texto. Lo que dice
 * el mensaje lo prueba `mensajeDePreregistro.test.ts`; aquí, que la pantalla
 * lo genera con el enlace de **esta** estancia y lo copia entero.
 */
const copiar = vi.hoisted(() => vi.fn(async (_texto: string) => true));
const abrirPrecheckin = vi.hoisted(() => vi.fn());
vi.mock("expo-clipboard", () => ({ setStringAsync: copiar }));
vi.mock("../services/precheckin.repo", () => ({
  abrirPrecheckin,
  reemitirAccesoHuesped: vi.fn(),
}));
vi.mock("@/stores", () => ({
  useUIStore: () => ({ addToast: () => {} }),
}));

const { VisitaSuccessView } = await import("./VisitaSuccessView");

const ENLACE = "https://veciyo-web-seven.vercel.app/access/" + "a".repeat(64);

beforeEach(() => {
  copiar.mockClear();
  abrirPrecheckin.mockReset();
  abrirPrecheckin.mockResolvedValue({ enlace: ENLACE, correoEnviado: false });
});

const pintar = (visitaUuid: string | null = "v-nueva") =>
  render(
    <VisitaSuccessView
      tipoSeleccionado="huesped-temporal"
      nombre="Carla"
      fecha={new Date(2026, 8, 30)}
      fechaSalida="2026-10-05"
      esHT
      estado="Pendiente"
      onVolver={() => {}}
      visitaUuid={visitaUuid}
      datosDelMensaje={{
        nombre: "Carla",
        vivienda: "102",
        torre: 1,
        condominio: "Las Barranqueras",
        desde: "2026-09-30",
        hasta: "2026-10-05",
      }}
    />,
  );

describe("el mensaje para el huésped al crear la reserva", () => {
  it("genera el enlace de esta estancia y copia el mensaje entero, con el enlace dentro", async () => {
    pintar();
    await userEvent.click(screen.getByText(textoCompleto("Enviar preregistro")));
    expect(abrirPrecheckin).toHaveBeenCalledWith("v-nueva");

    await userEvent.click(await screen.findByText(textoCompleto("Copiar mensaje")));
    const copiado = copiar.mock.calls[0]?.[0] ?? "";
    expect(copiado).toContain("Hola, Carla.");
    expect(copiado).toContain("del 30/09/2026 al 05/10/2026");
    expect(copiado).toContain("48 horas antes");
    expect(copiado.endsWith(ENLACE)).toBe(true);
    expect(screen.getByText(textoCompleto("✓ Copiado"))).toBeDefined();
  });

  it("sin la estancia todavía no ofrece enviar nada", () => {
    pintar(null);
    expect(screen.queryByText(textoCompleto("Enviar preregistro"))).toBeNull();
  });
});

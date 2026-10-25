import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { VisitaItem } from "@/shared/types";
import { ReservaGuardiaDetail } from "./ReservaGuardiaDetail";

/*
  Los vehículos de portería comprueban la placa con el largo de la base
  (`placa_largo_*`, 25/10/2026), que se lee por `useParametrosDeLaBase` y pide
  la red. Se dobla con los valores de hoy: lo que se comprueba aquí es la
  llegada del huésped, no de dónde salen esos números.
*/
vi.mock("@/shared/hooks", async (importOriginal) => {
  const PARAMETROS: Record<string, number> = { placa_largo_minimo: 4, placa_largo_maximo: 8 };
  return {
    ...(await importOriginal<typeof import("@/shared/hooks")>()),
    useParametrosDeLaBase: () => ({
      listo: true,
      error: null,
      numero: (clave: string) => {
        if (!(clave in PARAMETROS)) throw new Error(`Falta ${clave}`);
        return PARAMETROS[clave];
      },
    }),
  };
});

/**
 * La portería no deja entrar a un huésped sin verificar su documento.
 *
 * Salió al recorrer la renta corta el 12/10/2026: el guardia marcaba la
 * llegada sin abrir la verificación --estaba en «Ver detalles» y era
 * opcional--, y la ficha le enseñaba el número que luego tenía que «leer en el
 * documento». El cliente decidió las dos cosas: obligatorio y oculto.
 *
 * La base lo rechaza por su cuenta (`invitado_documento_sin_verificar`); esto
 * mira que la pantalla no ofrezca lo que la base va a negar.
 */
const NUMERO = "1098765432";

const reserva = (invitado: Record<string, unknown>): VisitaItem =>
  ({
    id: 1,
    tipo: "huesped-temporal",
    nombre: "Marie Dupont",
    estado: "Programada",
    fechaDesde: "12/10/2026",
    fechaHasta: "13/10/2026",
    ci: NUMERO,
    invitados: [
      {
        uuid: "i1",
        nombre: "Marie Dupont",
        tipoDocumento: "cedula",
        documentoNumero: NUMERO,
        ...invitado,
      },
    ],
    vehiculos: [],
  }) as unknown as VisitaItem;

const pintar = (item: VisitaItem, onToggleArrival = vi.fn()) => {
  render(
    <ReservaGuardiaDetail
      item={item}
      onBack={() => {}}
      onToggleArrival={onToggleArrival}
    />,
  );
  return onToggleArrival;
};

describe("la llegada de un huésped en portería", () => {
  it("no enseña el número del documento", () => {
    pintar(reserva({}));

    expect(screen.queryByText(new RegExp(NUMERO))).toBeNull();
    expect(screen.getByText(/declarado/)).toBeTruthy();
  });

  it("sin verificar, pide el documento y no deja marcar la llegada", () => {
    const alMarcar = pintar(reserva({}));

    expect(
      screen.getByText(/Verificar documento para registrar la llegada/),
    ).toBeTruthy();
    fireEvent.click(screen.getAllByRole("switch")[0]);
    expect(alMarcar).not.toHaveBeenCalled();
  });

  it("verificado, la llegada se marca", () => {
    // El control positivo: sin él, un interruptor siempre muerto pasaría igual.
    const alMarcar = pintar(reserva({ ciVerificado: true }));

    expect(screen.queryByText(/Verificar documento para registrar/)).toBeNull();
    fireEvent.click(screen.getAllByRole("switch")[0]);
    expect(alMarcar).toHaveBeenCalledWith(0, true);
  });

  it("un adulto sin documento no entra, y se dice por qué", () => {
    // Decidido el 12/10/2026: antes pasaba sin verificación.
    const item = reserva({ documentoNumero: undefined });
    (item as { ci?: string }).ci = "";
    const alMarcar = pintar(item);

    expect(screen.getByText(/completar su registro/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("switch")[0]);
    expect(alMarcar).not.toHaveBeenCalled();
  });
});

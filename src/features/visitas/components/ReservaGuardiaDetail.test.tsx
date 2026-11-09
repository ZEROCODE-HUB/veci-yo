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

// Los tipos de vehículo y las plataformas son listas de la base (`useLista`),
// que pide la red: se doblan con la semilla.
vi.mock("@/shared/hooks/useLista", () => import("@/pruebas/listasDeLaBase"));

/*
  La verificación (cámara, escaneo) tiene sus propias pruebas en
  ConfirmarIdentidad.test.tsx. Aquí se dobla: importa que el interruptor la
  abra y que, verificada, la llegada se registre sola (Correcciones fila 22).
*/
vi.mock("./EntradaDelHuesped", () => ({
  EntradaDelHuesped: ({ onVerificado }: { onVerificado?: () => void }) => (
    <button type="button" onClick={() => onVerificado?.()}>
      verificación hecha
    </button>
  ),
}));

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

  it("sin verificar, el interruptor abre la verificación y no marca la llegada todavía", () => {
    const alMarcar = pintar(reserva({}));

    // Ya no hay un botón «Verificar documento» aparte (fila 22).
    expect(screen.queryByText(/Verificar documento para registrar la llegada/)).toBeNull();
    expect(screen.getByText("Registrar llegada (verifica su documento)")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("switch")[0]);
    expect(alMarcar).not.toHaveBeenCalled();
    expect(screen.getByText("verificación hecha")).toBeTruthy();
  });

  it("verificado desde el interruptor, la llegada se registra sola", () => {
    const alMarcar = pintar(reserva({}));
    fireEvent.click(screen.getAllByRole("switch")[0]);
    fireEvent.click(screen.getByText("verificación hecha"));
    expect(alMarcar).toHaveBeenCalledWith(0, true);
  });

  it("una reserva que todavía no empezó no deja registrar la llegada (fila 13)", () => {
    const item = reserva({ ciVerificado: true });
    (item as { fechaDesde: string }).fechaDesde = "01/01/2099";
    (item as { fechaHasta: string }).fechaHasta = "03/01/2099";
    const alMarcar = pintar(item);

    expect(screen.getByText(/empieza el 01\/01\/2099: todavía no puede ingresar/)).toBeTruthy();
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

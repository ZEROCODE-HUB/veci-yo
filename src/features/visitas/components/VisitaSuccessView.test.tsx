import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { textoCompleto } from "@/pruebas/texto";
import { VisitaSuccessView } from "./VisitaSuccessView";

/**
 * Lo que la anfitriona ve --y copia-- después de registrar a un huésped.
 *
 * Hasta el 29/09/2026 una estancia entera medía un día: el formulario tenía un
 * solo calendario y las dos fechas se guardaban iguales, así que el huésped
 * perdía la aplicación, el libro y la clave de la puerta al día siguiente de
 * llegar. Con el día de salida, este mensaje es el que le dice cuándo se va, y
 * por eso tiene que llevar las dos fechas.
 *
 * Se busca la **frase entera** con una cadena exacta, no un trozo con expresión
 * regular: el propio `textoCompleto` lo advierte --con una regex casan también
 * los contenedores y `getByText` falla por ambigua-- y además es lo que el
 * huésped lee.
 */
const ENTRADA = new Date(2026, 8, 30); // 30/09/2026

const pintar = (fechaSalida: string) =>
  render(
    <VisitaSuccessView
      tipoSeleccionado="huesped-temporal"
      nombre="Carla"
      fecha={ENTRADA}
      fechaSalida={fechaSalida}
      esHT
      estado="Pendiente"
      onVolver={() => {}}
    />,
  );

describe("el mensaje para el huésped", () => {
  it("dice las dos fechas de la estancia", () => {
    pintar("2026-10-05");

    expect(
      screen.getByText(
        textoCompleto(
          "Hola Carla, tu reserva de Huésped Temporal está confirmada del 30/09/2026 al 05/10/2026. Te esperamos!",
        ),
      ),
    ).toBeDefined();
  });

  it("y con una sola fecha no repite el día dos veces", () => {
    /*
      Una estancia de un día es legítima, y entonces «del 30 al 30» sobra: se
      dice «el 30». Lo mismo cuando no hay día de salida, que es lo que pasa con
      los otros tipos de visita.
    */
    pintar("2026-09-30");

    expect(
      screen.getByText(
        textoCompleto(
          "Hola Carla, tu reserva de Huésped Temporal está confirmada el 30/09/2026. Te esperamos!",
        ),
      ),
    ).toBeDefined();
  });
});

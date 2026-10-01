import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlojamientoInfoChips } from "./AlojamientoInfoChips";
import type { AlojamientoConfig } from "../../types";

/**
 * La ficha que ve quien se aloja.
 *
 * El horario de check-in lo elige la administración por vivienda --y distinto
 * para estancia corta y larga-- y hasta el 01/10/2026 **no llegaba a ninguna
 * pantalla**: se guardaba en cuatro columnas y ahí moría. El campo venía del
 * prototipo, donde los permisos eran «UI y estado local» y tampoco hacía nada.
 *
 * Decidido con el cliente el 01/10/2026: se enseña aquí, que es donde lo
 * buscaría quien va a llegar.
 */
const BASE: AlojamientoConfig = {
  descripcion: "Dos habitaciones con terraza",
  numHabitaciones: 2,
  maxHuespedes: 4,
  estacionamientos: 1,
  permiteMascotas: true,
  aptoNinos: false,
  checkinDesde: null,
  checkinHasta: null,
};

describe("el horario de check-in en la ficha", () => {
  it("sale cuando la vivienda lo tiene puesto", () => {
    render(
      <AlojamientoInfoChips
        config={{ ...BASE, checkinDesde: "14:00", checkinHasta: "20:00" }}
      />,
    );

    expect(screen.getByText("Check-in:")).toBeDefined();
    expect(screen.getByText("De 14:00 a 20:00")).toBeDefined();
  });

  it("y no sale cuando nadie lo ha decidido", () => {
    /*
      Nulo es «no se ha puesto». Pintar una franja inventada sería peor que no
      pintar nada: quien la lea va a organizar su viaje con ella.
    */
    render(<AlojamientoInfoChips config={BASE} />);

    expect(screen.queryByText("Check-in:")).toBeNull();
  });

  it("y el resto de la ficha sigue estando", () => {
    // El control positivo: sin esto, el caso de arriba pasaría igual con la
    // ficha entera en blanco.
    render(<AlojamientoInfoChips config={BASE} />);

    expect(screen.getByText("Habitaciones:")).toBeDefined();
    expect(screen.getByText("Hasta 4")).toBeDefined();
    expect(screen.getByText("Permitidas")).toBeDefined();
  });
});

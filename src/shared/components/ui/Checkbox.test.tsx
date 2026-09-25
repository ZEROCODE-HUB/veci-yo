import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./Checkbox";
import { Toggle } from "./Toggle";

/**
 * Que una casilla y un interruptor digan si están puestos.
 *
 * Es la tercera vez que aparece el mismo error en este proyecto, así que esta
 * vez queda fijado: **`accessibilityState` no llega al DOM**. React Native lo
 * entiende, react-native-web 0.21 no lo traduce, y el control sale con su rol
 * y sin estado — una casilla que no dice si está marcada, un interruptor que
 * no dice si está puesto.
 *
 * Se descubrió la primera vez en `TiraDeDias`, haciendo pruebas de
 * componente, y se arregló solo allí. La segunda, recorriendo la pantalla de
 * cuotas como administradora: las cuatro casillas de «Pagado» salían sin
 * `aria-checked`, y no había forma de leer cuáles estaban marcadas. Es la
 * causa de R-13, que llevaba días anotado como un olvido de quien las
 * escribió.
 *
 * Estas pruebas no comprueban una preferencia de estilo: comprueban que el
 * atributo **llega**. Si alguien quita el `aria-checked` por parecerle
 * redundante con `accessibilityState`, se ponen rojas.
 */
describe("una casilla", () => {
  it("dice que es una casilla, y cómo se llama", () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Pagado" />);

    const casilla = screen.getByRole("checkbox", { name: "Pagado" });
    expect(casilla).toBeDefined();
  });

  it("y dice si está marcada", () => {
    const { rerender } = render(
      <Checkbox checked={false} onChange={() => {}} label="Pagado" />,
    );
    expect(
      screen.getByRole("checkbox").getAttribute("aria-checked"),
    ).toBe("false");

    rerender(<Checkbox checked onChange={() => {}} label="Pagado" />);
    expect(
      screen.getByRole("checkbox").getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("y al pulsarla avisa del valor contrario, no del suyo", async () => {
    // El error clásico de una casilla: avisar de lo que ya era.
    const cambiar = vi.fn();
    render(<Checkbox checked={false} onChange={cambiar} label="Acepto" />);

    await userEvent.click(screen.getByRole("checkbox"));
    expect(cambiar).toHaveBeenCalledWith(true);
  });
});

describe("un interruptor", () => {
  it("dice que es un interruptor, cómo se llama y si está puesto", () => {
    const { rerender } = render(
      <Toggle value={false} onValueChange={() => {}} label="Anuncié la visita" />,
    );

    const interruptor = screen.getByRole("switch", {
      name: "Anuncié la visita",
    });
    expect(interruptor.getAttribute("aria-checked")).toBe("false");

    rerender(
      <Toggle value onValueChange={() => {}} label="Anuncié la visita" />,
    );
    expect(
      screen.getByRole("switch").getAttribute("aria-checked"),
    ).toBe("true");
  });
});

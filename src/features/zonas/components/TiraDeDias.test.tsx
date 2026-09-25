import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TiraDeDias } from "./TiraDeDias";
import { enISO } from "../services/tiraDeDias";

/**
 * La tira de días de una zona común.
 *
 * `tiraDeDias` y `comoFiltro` ya tienen sus pruebas: saben qué días hay y
 * cómo se traducen al filtro. Lo que **no** comprobaba nadie es que el
 * componente use esas funciones, marque el día correcto y avise al pulsar.
 *
 * Es el hueco que se vio pulsando a mano: una decisión puede estar bien
 * escrita, bien probada, y no estar conectada.
 */
const HOY = new Date(2026, 8, 25, 10, 0);

describe("la tira de días", () => {
  it("empieza en hoy y marca el día que está viendo la grilla", () => {
    vi.setSystemTime(HOY);
    render(<TiraDeDias seleccionado={HOY} onSeleccionar={() => {}} dias={5} />);

    // «HOY» en lugar del nombre del dia, que es lo que pinta la primera.
    expect(screen.getByText("HOY")).toBeDefined();
    expect(screen.getByText("25")).toBeDefined();

    /*
      Se consulta por el rol y su estado, no por el atributo: react-native-web
      omite el atributo cuando el estado es falso, y una prueba que lo mire a
      pelo comprueba esa rareza de la plataforma en vez de lo que le importa a
      quien usa la app.

      Y son `radio`, no `button`: elegir un dia es escoger uno entre varios.
      La primera version eran botones con `aria-selected`, que **no es valido
      en un boton** --lo canto esta prueba-- y dejaba la eleccion muda para un
      lector de pantalla.
    */
    expect(screen.getByRole("radio", { checked: true })).toBe(
      screen.getByRole("radio", { name: /^Hoy,/ }),
    );
  });

  it("solo hay un día marcado a la vez", () => {
    vi.setSystemTime(HOY);
    render(<TiraDeDias seleccionado={HOY} onSeleccionar={() => {}} dias={5} />);

    // `getByRole` con `selected` ya falla si hubiera dos, pero dicho aparte
    // se lee lo que se quiere: uno, no «al menos uno».
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
  });

  it("avisa con la fecha del día que se pulsa", async () => {
    vi.setSystemTime(HOY);
    const elegido = vi.fn();
    render(<TiraDeDias seleccionado={HOY} onSeleccionar={elegido} dias={5} />);

    await userEvent.click(screen.getByRole("radio", { name: /^Mañana,/ }));

    expect(elegido).toHaveBeenCalledTimes(1);
    expect(enISO(elegido.mock.calls[0][0])).toBe("2026-09-26");
  });

  it("no ofrece el pasado", () => {
    vi.setSystemTime(HOY);
    render(<TiraDeDias seleccionado={HOY} onSeleccionar={() => {}} dias={5} />);

    // El 24 es ayer: la base rechaza reservar el pasado y la tira no lo pinta.
    expect(screen.queryByText("24")).toBeNull();
    expect(screen.getByText("26")).toBeDefined();
  });

  it("marca el día elegido aunque no sea hoy", () => {
    vi.setSystemTime(HOY);
    const domingo = new Date(2026, 8, 27);
    render(
      <TiraDeDias seleccionado={domingo} onSeleccionar={() => {}} dias={5} />,
    );

    expect(screen.getByRole("radio", { checked: true })).toBe(
      screen.getByRole("radio", { name: "dom 27" }),
    );
  });
});

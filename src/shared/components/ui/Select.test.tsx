import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./Select";

/**
 * El desplegable, que no tenia ni una prueba y lo montan veinte pantallas.
 *
 * El 09/10/2026 el cliente lo vio apretado en el tipo de vehiculo: «la flecha
 * muy al borde y sin espaciados». La causa estaba en quien lo montaba --110 px
 * fijos para una etiqueta de nueve letras-- pero el componente tampoco se
 * defendia: sin separacion entre el texto y la flecha, y sin recortar lo que
 * no cabe.
 *
 * Lo que se comprueba aqui es lo que se puede comprobar sin mirar: que abre,
 * que elige, y que **se nombra**. Como de apretado se ve es juicio visual y
 * eso necesita una captura, no el DOM: el estilo calculado ya engaño una vez
 * en este proyecto.
 */

const OPCIONES = ["Automóvil", "Camioneta", "Moto"];

describe("el desplegable", () => {
  it("dice qué es y qué tiene elegido", () => {
    // Un lector de pantalla leia «Automóvil» a secas, que no dice de que es.
    render(
      <Select label="Tipo" value="Automóvil" options={OPCIONES} onChange={() => {}} />,
    );

    expect(
      screen.getByRole("button", { name: "Tipo: Automóvil" }),
    ).toBeTruthy();
  });

  it("sin nada elegido se nombra con el texto que invita a elegir", () => {
    render(<Select value={null} options={OPCIONES} onChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Seleccione..." })).toBeTruthy();
  });

  it("al pulsarlo se abre y lo dice", async () => {
    const usuario = userEvent.setup();
    render(
      <Select label="Tipo" value={null} options={OPCIONES} onChange={() => {}} />,
    );

    const boton = screen.getByRole("button", { name: /^Tipo:/ });
    // Antes de abrir no hay opciones: si las hubiera, el caso de abajo
    // pasaría igual con el desplegable roto.
    expect(screen.queryByRole("menuitem", { name: "Moto" })).toBeNull();
    expect(boton.getAttribute("aria-expanded")).toBe("false");

    await usuario.click(boton);

    expect(screen.getByRole("menuitem", { name: "Moto" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^Tipo:/ }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("elegir una opción la devuelve y cierra la lista", async () => {
    const usuario = userEvent.setup();
    const alElegir = vi.fn();
    render(<Select value={null} options={OPCIONES} onChange={alElegir} />);

    await usuario.click(screen.getByRole("button", { name: "Seleccione..." }));
    await usuario.click(screen.getByRole("menuitem", { name: "Camioneta" }));

    expect(alElegir).toHaveBeenCalledWith("Camioneta");
    expect(screen.queryByRole("menuitem", { name: "Moto" })).toBeNull();
  });

  it("la opción elegida se marca, no solo se pinta", async () => {
    const usuario = userEvent.setup();
    render(<Select value="Moto" options={OPCIONES} onChange={() => {}} />);

    await usuario.click(screen.getByRole("button", { name: /Moto/ }));

    expect(
      screen.getByRole("menuitem", { name: "Moto" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen
        .getByRole("menuitem", { name: "Automóvil" })
        .getAttribute("aria-selected"),
    ).toBe("false");
  });
});

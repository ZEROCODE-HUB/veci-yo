import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatosPersona } from "./DatosPersona";

/**
 * Que se pide y que se ofrece, segun el tipo de visita.
 *
 * El 09/10/2026 el cliente lo dijo asi: «el tema de Tipo e Identificacion es
 * opcional, y creo que mejor con un + o con algo recien que se abran esos
 * campos ok? y el nombre igual incluso es opcional we, porque pues dijimos que
 * los huespedes eran quienes rellenaban los datos en el link».
 *
 * Las dos mitades necesitan prueba, y la segunda es la que se olvida: que lo
 * plegado **se pueda desplegar**. Un «+» que no abre nada es exactamente el
 * defecto mas repetido de este proyecto con otra cara, y no lo ve ni el
 * typecheck ni `npm run botones` --el control tiene su `onPress`--.
 */

const props = {
  esProfesional: false,
  esGuardia: false,
  tipoSeleccionado: "huesped-temporal",
  nombre: "",
  setNombre: vi.fn(),
  tipoId: "",
  setTipoId: vi.fn(),
  identificacion: "",
  setIdentificacion: vi.fn(),
  email: "",
  setEmail: vi.fn(),
  telefono: "",
  setTelefono: vi.fn(),
  profesion: "",
  setProfesion: vi.fn(),
  profesionOtro: "",
  setProfesionOtro: vi.fn(),
};

describe("los datos de quien visita", () => {
  it("en una estancia dice que son opcionales y quién los rellena", () => {
    render(<DatosPersona {...props} />);

    expect(screen.getByText(/opcional/)).toBeTruthy();
    expect(screen.getByText(/Los completa el huésped/)).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Lo completa el huésped"),
    ).toBeTruthy();
  });

  it("el documento y el contacto empiezan plegados", () => {
    render(<DatosPersona {...props} />);

    expect(screen.queryByPlaceholderText("email@ejemplo.com")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Añadir documento y contacto" }),
    ).toBeTruthy();
  });

  it("y el «+» los abre de verdad", async () => {
    const usuario = userEvent.setup();
    render(<DatosPersona {...props} />);

    await usuario.click(
      screen.getByRole("button", { name: "Añadir documento y contacto" }),
    );

    expect(screen.getByPlaceholderText("email@ejemplo.com")).toBeTruthy();
    expect(screen.getAllByText(/Identificación/).length).toBeGreaterThan(0);
  });

  it("si ya traen algo escrito, nacen abiertos", () => {
    /*
      Volver atras y encontrarse los campos cerrados **con datos dentro** es
      peor que el ruido que el plegado ahorra: parece que se perdieron.
    */
    render(<DatosPersona {...props} identificacion="1098765432" />);

    expect(screen.getByDisplayValue("1098765432")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Añadir documento y contacto" }),
    ).toBeNull();
  });

  it("con el documento obligatorio no se pliega nada", () => {
    // El control negativo: un profesional temporal **tiene** que dar su
    // identificación, así que esconderla detrás de un «+» sería pedirla
    // y ocultarla a la vez.
    render(
      <DatosPersona
        {...props}
        tipoSeleccionado="temporal"
        esProfesional
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Añadir documento y contacto" }),
    ).toBeNull();
    expect(screen.getByPlaceholderText("Obligatorio")).toBeTruthy();
  });

  it("en una visita normal el nombre no se anuncia como opcional", () => {
    // El otro lado de la primera: sin esto, el caso de arriba pasaría igual
    // con la palabra «opcional» escrita a fuego para todos los tipos.
    render(<DatosPersona {...props} tipoSeleccionado="amigos" />);

    expect(screen.getByText("Nombre y Apellido")).toBeTruthy();
    expect(screen.queryByText(/Los completa el huésped/)).toBeNull();
  });
});

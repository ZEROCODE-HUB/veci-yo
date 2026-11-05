import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  tiposDocumento: [{ value: "pasaporte", label: "Pasaporte" }],
  setTipoId: vi.fn(),
  identificacion: "",
  setIdentificacion: vi.fn(),
  email: "",
  setEmail: vi.fn(),
  telefono: "",
  setTelefono: vi.fn(),
  profesion: "",
  oficios: ["Pintor", "Otros"],
  pideOtraProfesion: false,
  setProfesion: vi.fn(),
  profesionOtro: "",
  setProfesionOtro: vi.fn(),
  verificaDocumento: false,
  setVerificaDocumento: vi.fn(),
};

describe("los datos de quien visita", () => {
  it("en una estancia dice que son opcionales y quién los rellena", () => {
    render(<DatosPersona {...props} />);

    expect(screen.getByText(/· opcional/)).toBeTruthy();
    expect(screen.getByText(/Los completa el huésped/)).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Lo completa el huésped"),
    ).toBeTruthy();
    expect(screen.getByText("Documento (opcional)")).toBeTruthy();
  });

  // 30/10/2026, lo que definió el cliente sobre el documento: «está siempre a
  // la vista». El «+» que lo plegaba ya no sale para nadie.
  it("el documento y el contacto ya no se pliegan detrás de un «+»", () => {
    render(<DatosPersona {...props} />);

    expect(
      screen.queryByRole("button", { name: "Añadir documento y contacto" }),
    ).toBeNull();
    expect(screen.getByPlaceholderText("N° de documento")).toBeTruthy();
    expect(screen.getByPlaceholderText("email@ejemplo.com")).toBeTruthy();
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

  it("a un profesional el documento se le pide como obligatorio", () => {
    // El control de la primera: un profesional temporal **tiene** que dar su
    // identificación, así que no puede decirse «opcional».
    render(
      <DatosPersona
        {...props}
        tipoSeleccionado="temporal"
        esProfesional
      />,
    );

    // El asterisco va en su propio texto: aquí basta con que no diga «opcional».
    expect(screen.getByText("Documento")).toBeTruthy();
    expect(screen.queryByText("Documento (opcional)")).toBeNull();
    expect(screen.getByPlaceholderText("N° de documento")).toBeTruthy();
  });

  it("en una visita normal el nombre no se anuncia como opcional", () => {
    // El otro lado de la primera: sin esto, el caso de arriba pasaría igual
    // con la palabra «opcional» escrita a fuego para todos los tipos.
    render(<DatosPersona {...props} tipoSeleccionado="amigos" />);

    expect(screen.getByText("Nombre y Apellido")).toBeTruthy();
    expect(screen.queryByText(/Los completa el huésped/)).toBeNull();
  });
});

describe("la portería registrando una visita (16/10/2026)", () => {
  // Tiene a la persona delante con el documento en la mano: el tipo y el
  // número van a la vista, y el consejo «recuerda indicar a tu invitado…» es
  // del residente que anuncia, no suyo.
  it("ve el documento sin plegar", () => {
    render(<DatosPersona {...props} tipoSeleccionado="amigos" esGuardia />);
    expect(
      screen.queryByRole("button", { name: "Añadir documento y contacto" }),
    ).toBeNull();
    expect(screen.getByPlaceholderText("N° de documento")).toBeTruthy();
  });

  it("no le dice que le recuerde a su invitado el documento", () => {
    render(
      <DatosPersona {...props} tipoSeleccionado="amigos" esGuardia verificaDocumento />,
    );
    expect(screen.queryByText(/Recuerda indicar a tu invitado/)).toBeNull();
  });

  it("al residente sí se le dice, cuando pide que se verifique", () => {
    render(<DatosPersona {...props} tipoSeleccionado="amigos" verificaDocumento />);
    expect(screen.getByText(/Recuerda indicar a tu invitado/)).toBeTruthy();
  });

  // 30/10/2026: a amigos y familiares el documento solo se les pide si quien
  // invita marca la casilla; sin marcarla no hay nada que recordar.
  it("y sin pedir la verificación, a un amigo no se le recuerda nada", () => {
    render(<DatosPersona {...props} tipoSeleccionado="amigos" />);
    expect(screen.queryByText(/Recuerda indicar a tu invitado/)).toBeNull();
    expect(screen.getByText("Documento (opcional)")).toBeTruthy();
  });
});

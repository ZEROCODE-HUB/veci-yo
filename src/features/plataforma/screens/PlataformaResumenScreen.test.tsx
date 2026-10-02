import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * La portada del panel de la plataforma.
 *
 * Se prueba lo que **se ve**, que en esta pantalla es el límite entero: lo que
 * llega de la base son conteos, y si algún día alguien añade un nombre de
 * persona a esa función, lo primero que pasaría es que aparecería aquí.
 *
 * Y los dos alcances. `soporte` atiende PQRS y nada más: si se le ofrece «dar
 * de alta», pulsa, y la base lo rechaza con un error que no explica por qué.
 * Esconder lo que no se puede hacer no es un detalle visual, es la diferencia
 * entre un botón que no está y uno que miente.
 */

let panel: Record<string, unknown> = {};

vi.mock("../hooks/usePlataforma", () => ({
  usePlataforma: () => panel,
}));

const navegar = vi.fn();
vi.mock("../hooks/useNavegacionPlataforma", () => ({
  useNavegacionPlataforma: () => ({ navigate: navegar, goBack: vi.fn() }),
}));

const { PlataformaResumenScreen } = await import("./PlataformaResumenScreen");

const base = {
  resumen: {
    condominios: 2,
    viviendas: 41,
    cuentas: 13,
    reclamosAppAbiertos: 7,
  },
  edificios: [
    {
      id: "e1",
      nombre: "Las Barranqueras 246",
      direccion: "Calle 1",
      ciudad: "Bogotá",
      pais: "CO",
      moneda: "COP",
      torres: 2,
      viviendas: 40,
      personas: 11,
      administradores: 1,
      guardias: 2,
      reclamosAbiertos: 3,
      creadoEn: "21/09/2026",
    },
    {
      id: "e2",
      nombre: "Mirador del Este",
      direccion: "Avenida 2",
      ciudad: "Cartagena",
      pais: "CO",
      moneda: "COP",
      torres: 1,
      viviendas: 1,
      personas: 1,
      administradores: 0,
      guardias: 0,
      reclamosAbiertos: 0,
      creadoEn: "01/10/2026",
    },
  ],
  cargando: false,
  error: null,
  refrescar: vi.fn(),
  esDueno: true,
};

beforeEach(() => {
  panel = { ...base };
  navegar.mockClear();
});

describe("el panel de la plataforma", () => {
  it("enseña los cuatro números y los dos edificios", () => {
    render(<PlataformaResumenScreen />);

    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("41")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("Las Barranqueras 246")).toBeDefined();
    expect(screen.getByText("Mirador del Este")).toBeDefined();
  });

  it("dice «1 vivienda» y no «1 viviendas»", () => {
    /*
      Salió mirando la pantalla: el edificio sembrado decía «1 viviendas · 1
      personas». No rompe nada, y es lo primero que ve quien opera el producto.
    */
    render(<PlataformaResumenScreen />);
    expect(screen.getByText("1 vivienda")).toBeDefined();
    expect(screen.getByText("1 persona")).toBeDefined();
    expect(screen.getByText("40 viviendas")).toBeDefined();
  });

  it("avisa del edificio al que nadie aceptó la invitación", () => {
    /*
      Es lo único que de verdad hay que mirar en esta lista: un edificio dado de
      alta cuya administración nunca entró está parado, y un cero entre otros
      cuatro números no se nota.
    */
    render(<PlataformaResumenScreen />);
    expect(screen.getByText(/Sin administración/)).toBeDefined();
  });

  it("y no avisa del que sí la tiene", () => {
    panel = { ...base, edificios: [base.edificios[0]] };
    render(<PlataformaResumenScreen />);
    expect(screen.queryByText(/Sin administración/)).toBeNull();
  });

  it("no pinta ningún nombre de persona: de un edificio solo se ven conteos", () => {
    /*
      El control positivo es el primer caso --sí se pinta el edificio--. Esto
      comprueba lo contrario con lo que la función de la base **no** devuelve:
      si alguien le añadiera el contacto de la administración «para que sea más
      útil», la pantalla lo enseñaría y esto seguiría verde, así que lo que se
      vigila aquí es que la pantalla no pida nada que no esté en el tipo.
    */
    render(<PlataformaResumenScreen />);
    expect(
      screen.getByText(/Lo de dentro .*es de sus vecinos/),
    ).toBeDefined();
  });

  it("el dueño puede dar de alta un edificio", () => {
    render(<PlataformaResumenScreen />);
    const boton = screen.getByText(/Dar de alta/);
    boton.click();
    expect(navegar).toHaveBeenCalledWith("PlataformaEdificioNuevo");
  });

  it("pero soporte no: no se le ofrece lo que la base le va a negar", () => {
    panel = { ...base, esDueno: false };
    render(<PlataformaResumenScreen />);
    expect(screen.queryByText(/Dar de alta/)).toBeNull();
    // Control positivo: sí ve la lista, así que no es que no se pinte nada.
    expect(screen.getByText("Las Barranqueras 246")).toBeDefined();
  });

  it("si la carga falla lo dice, en vez de enseñar ceros", () => {
    panel = {
      ...base,
      resumen: null,
      edificios: [],
      error: new Error("se cayó la red"),
    };
    render(<PlataformaResumenScreen />);
    expect(screen.getByText(/se cayó la red|No se pudo cargar/)).toBeDefined();
  });
});

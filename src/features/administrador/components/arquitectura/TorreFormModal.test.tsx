import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TorreFormModal } from "./TorreFormModal";
import { emptyTower } from "../../types";

/*
  El tope de departamentos viene de la base por `useParametrosDeLaBase`, que
  pide la red. Se dobla con el valor de hoy (500): lo que se comprueba es lo
  que enseña el formulario.
*/
vi.mock("@/shared/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks")>()),
  useParametrosDeLaBase: () => ({
    listo: true,
    error: null,
    numero: (clave: string) => {
      if (clave !== "torre_viviendas_maximo") throw new Error(`Falta ${clave}`);
      return 500;
    },
  }),
}));

/**
 * El alta de una torre (16/11/2026). El cliente: «pone 3 departamentos del
 * piso 5 al 7, ah entonces se van a crear 9».
 */
function montar(onSave = vi.fn()) {
  render(
    <TorreFormModal
      visible
      editing={null}
      nextNumber={4}
      initial={emptyTower}
      niveles={[{ nombre: "Sótano 1", nomenclatura: "S1" }]}
      sotanosMaximo={1}
      codigosExistentes={["S1-01", "S1-02"]}
      onClose={() => {}}
      onSave={onSave}
    />,
  );
  return onSave;
}

async function escribirPisos() {
  await userEvent.type(screen.getByPlaceholderText("5"), "5");
  await userEvent.type(screen.getByPlaceholderText("7"), "7");
  await userEvent.type(screen.getByPlaceholderText("3"), "3");
}

describe("el alta de una torre", () => {
  it("enseña cuántos departamentos se van a crear y cuáles", async () => {
    montar();
    await escribirPisos();
    expect(
      screen.getByText(
        "Se crearán 9 departamentos: pisos 5 a 7, 3 por piso (501–503, 601–603, 701–703)",
      ),
    ).toBeDefined();
    // Y el aviso fijo para los pisos distintos.
    expect(screen.getByText(/Si algún piso tiene una cantidad distinta/)).toBeDefined();
  });

  it("con letras: 5A a 7C", async () => {
    montar();
    await escribirPisos();
    await userEvent.click(screen.getByLabelText(/Numeración/));
    await userEvent.click(await screen.findByText("5A, 5B, 5C… (piso y letra)"));
    expect(screen.getByText(/\(5A–5C, 6A–6C, 7A–7C\)/)).toBeDefined();
  });

  it("los estacionamientos por nivel siguen la numeración del nivel", async () => {
    montar();
    const [privados] = screen.getAllByLabelText(/Privados/);
    await userEvent.type(privados, "3");
    expect(screen.getByText("Se crearán 3 estacionamientos: S1-03 a S1-05")).toBeDefined();
  });

  it("y al guardar manda lo mismo que enseñó", async () => {
    const onSave = montar();
    await userEvent.type(screen.getByPlaceholderText("Ej: Torre A"), "Torre Norte");
    await escribirPisos();
    await userEvent.click(screen.getByText("Crear torre"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][1].departamentos).toEqual({
      desde: "5",
      hasta: "7",
      porPiso: "3",
      numeracion: "numero",
    });
  });
});

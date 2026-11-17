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
      if (clave === "torre_viviendas_maximo") return 500;
      if (clave === "torre_viviendas_por_piso_maximo") return 20;
      throw new Error(`Falta ${clave}`);
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

  it("no pide sótanos ni estacionamientos: van después, en su torre (17/11/2026)", () => {
    montar();
    expect(screen.queryByText(/Sótanos/)).toBeNull();
    expect(screen.queryAllByLabelText(/Privados/)).toHaveLength(0);
  });

  it("dice el tope por piso y no deja pasarlo", async () => {
    montar();
    expect(screen.getByText(/máx\. 20/)).toBeDefined();
    await userEvent.type(screen.getByPlaceholderText("5"), "5");
    await userEvent.type(screen.getByPlaceholderText("7"), "7");
    await userEvent.type(screen.getByPlaceholderText("3"), "21");
    expect(screen.getByText("Caben 20 departamentos por piso como mucho.")).toBeDefined();
  });

  it("y al guardar manda lo mismo que enseñó", async () => {
    const onSave = montar();
    await userEvent.type(screen.getByPlaceholderText("Ej: Torre A"), "Torre Norte");
    await escribirPisos();
    await userEvent.click(screen.getByText("Crear torre"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][1].estacionamientos).toEqual([]);
    expect(onSave.mock.calls[0][1].departamentos).toEqual({
      desde: "5",
      hasta: "7",
      porPiso: "3",
      numeracion: "numero",
    });
  });
});

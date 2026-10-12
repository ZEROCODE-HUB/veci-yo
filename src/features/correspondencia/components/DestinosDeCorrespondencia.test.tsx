import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UnidadDisponible } from "@/shared/hooks/useUnidadesDisponibles";
import { DestinosDeCorrespondencia } from "./DestinosDeCorrespondencia";

/**
 * El selector de departamentos de «Agregar correspondencia».
 *
 * El cliente lo vio el 12/10/2026 con «Torre 2, piso 1» elegidos y la 205 y la
 * 301 en pantalla: ninguna de las dos está en el piso 1. El piso no filtraba.
 */

const unidad = (
  codigo: string,
  torreNumero: number,
  piso: number,
): UnidadDisponible => ({
  unidadId: `u-${codigo}`,
  condominioId: "edificio",
  codigo,
  piso,
  torreNumero,
  torreNombre: "",
  torre: `Torre ${torreNumero}`,
});

const UNIDADES = [
  unidad("101", 1, 1),
  unidad("102", 1, 1),
  unidad("205", 2, 2),
  unidad("301", 2, 3),
];
const TORRES = ["Torre 1", "Torre 2"];

function montar(
  props: Partial<React.ComponentProps<typeof DestinosDeCorrespondencia>> = {},
) {
  const onSeleccion = vi.fn();
  const onTorre = vi.fn();
  const onPiso = vi.fn();
  render(
    <DestinosDeCorrespondencia
      unidades={UNIDADES}
      torres={TORRES}
      torre=""
      piso=""
      seleccion={[]}
      onTorre={onTorre}
      onPiso={onPiso}
      onSeleccion={onSeleccion}
      {...props}
    />,
  );
  return { onSeleccion, onTorre, onPiso };
}

const casillas = () =>
  screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"));

describe("a qué departamentos va el envío", () => {
  it("con torre y piso, solo salen los de ese piso de esa torre", () => {
    montar({ torre: "Torre 2", piso: "2" });
    expect(casillas()).toEqual(["Departamento 205, Torre 2"]);
  });

  it("si en ese piso no hay ninguno, lo dice en vez de enseñar los de otro", () => {
    montar({ torre: "Torre 2", piso: "1" });
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(
      screen.getByText("No hay departamentos en esa torre y ese piso."),
    ).toBeTruthy();
  });

  it("marcar uno lo añade a lo que ya estaba marcado", async () => {
    const { onSeleccion } = montar({ seleccion: ["u-101"] });
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Departamento 205, Torre 2" }),
    );
    expect(onSeleccion).toHaveBeenCalledWith(["u-101", "u-205"]);
  });

  it("lo marcado se anuncia como marcado", () => {
    montar({ seleccion: ["u-205"] });
    const marcada = screen.getByRole("checkbox", {
      name: "Departamento 205, Torre 2",
    });
    expect(marcada.getAttribute("aria-checked")).toBe("true");
  });

  it("«Seleccionar todos» marca los que se ven, no los del edificio entero", async () => {
    const { onSeleccion } = montar({ torre: "Torre 2" });
    await userEvent.click(
      screen.getByRole("switch", { name: "Seleccionar todos (2)" }),
    );
    expect(onSeleccion).toHaveBeenCalledWith(["u-205", "u-301"]);
  });

  it("sin torre elegida, cada departamento dice de qué torre es", () => {
    montar();
    expect(screen.getByText("T2 · 205")).toBeTruthy();
  });

  it("el motivo de que falte se enseña junto a los departamentos", () => {
    montar({ error: "Selecciona al menos un departamento" });
    expect(screen.getByText("Selecciona al menos un departamento")).toBeTruthy();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnidadFormModal } from "./UnidadFormModal";
import { unitToForm } from "../../types";
import { useAdminStore } from "@/stores/admin-store";
import type { Unidad } from "@/stores/admin-store";

/**
 * La ficha de un departamento (16/10/2026).
 *
 * El estado se ofrecía con las etiquetas como valor: el guardado
 * --«aceptado»-- no coincidía con ninguna --«Aceptado»-- y salía «Elegir…»; y
 * elegir uno mandaba la etiqueta, que el esquema rechaza sin decir nada.
 * La tipología no se podía elegir en ningún sitio.
 */
const unidad = {
  id: 1,
  uuid: "u-101",
  codigo: "101",
  torreNumero: 1,
  piso: 1,
  estado: "aceptado",
  tipologiaId: "t-duplex",
} as unknown as Unidad;

describe("la ficha de un departamento", () => {
  it("enseña el estado y la tipología que tiene guardados", () => {
    useAdminStore.setState({
      tipologias: [
        { id: 1, uuid: "t-2amb", nombre: "2 ambientes", metrosCuadrados: 62, habitaciones: 2, banos: 1 },
        { id: 2, uuid: "t-duplex", nombre: "Dúplex", metrosCuadrados: 110, habitaciones: 3, banos: 2 },
      ],
    });
    render(
      <UnidadFormModal
        visible
        editing={unidad}
        initial={unitToForm(unidad)}
        onClose={() => {}}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Aceptado")).toBeDefined();
    expect(screen.getByText("Dúplex")).toBeDefined();
  });

  it("y sin tipología lo dice", () => {
    const sin = { ...unidad, tipologiaId: undefined } as unknown as Unidad;
    render(
      <UnidadFormModal
        visible
        editing={sin}
        initial={unitToForm(sin)}
        onClose={() => {}}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Sin tipología")).toBeDefined();
  });
});

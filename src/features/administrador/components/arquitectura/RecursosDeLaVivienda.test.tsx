import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BORRADOR_VACIO,
  RecursosDeLaVivienda,
  RecursosDelBorrador,
  type BorradorDeRecursos,
} from "./RecursosDeLaVivienda";
import type { EstacionamientoDeTorre } from "../../types";

/**
 * Lo elegido se ve elegido (17/11/2026, cliente: «en agregar propietario, y
 * ahí mismo asignar un estacionamiento, no se notaba que ya estaba
 * seleccionado»).
 *
 * El desplegable vuelve a quedar vacío al elegir --sirve para agregar otro--,
 * así que lo único que dice que algo quedó elegido es la tarjeta de abajo. Se
 * comprueba que aparece, con lo que dice de cuándo se guarda: «Se asignará al
 * guardar» en un departamento nuevo y «Asignado» en uno que ya existe.
 */
const NIVELES = { niveles: [{ uuid: "n-s1", nombre: "Sótano 1", nomenclatura: "S1" }], codigosDelEdificio: [] };

const estacionamiento = (uuid: string, codigo: string, unidadId: string | null): EstacionamientoDeTorre => ({
  uuid,
  codigo,
  ubicacion: "",
  tipo: "privado",
  unidadId,
  torreNumero: 1,
  ocupado: false,
  nivelId: "n-s1",
  nivel: "Sótano 1",
});

function ConBorrador({ parkings }: { parkings: EstacionamientoDeTorre[] }) {
  const [borrador, setBorrador] = useState<BorradorDeRecursos>(BORRADOR_VACIO);
  return (
    <RecursosDelBorrador
      parkings={parkings}
      deposits={[]}
      borrador={borrador}
      onCambiar={setBorrador}
      nivelesParaCrear={NIVELES}
    />
  );
}

describe("los estacionamientos de un departamento", () => {
  it("en uno nuevo, lo elegido se marca y dice que se asigna al guardar", async () => {
    const usuario = userEvent.setup();
    render(<ConBorrador parkings={[estacionamiento("e1", "S1-01", null), estacionamiento("e2", "S1-02", null)]} />);

    // Antes de elegir no hay nada marcado: si lo hubiera, el caso pasaría igual.
    expect(screen.queryByLabelText(/S1-01 · Sótano 1: /)).toBeNull();
    expect(screen.getByText("Todavía no tiene estacionamiento.")).toBeTruthy();

    await usuario.click(screen.getByRole("button", { name: /^Elegir un estacionamiento libre/ }));
    await usuario.click(screen.getByRole("menuitem", { name: "S1-01 · Sótano 1" }));

    expect(screen.getByLabelText("S1-01 · Sótano 1: Se asignará al guardar")).toBeTruthy();
    expect(screen.getByText("Estacionamientos (1)")).toBeTruthy();
    // El desplegable ya invita a agregar otro, no a elegir el primero.
    expect(screen.getByRole("button", { name: /^Agregar otro estacionamiento/ })).toBeTruthy();
    expect(screen.queryByText("Todavía no tiene estacionamiento.")).toBeNull();

    // Y «Quitar» lo devuelve a los libres.
    await usuario.click(screen.getAllByText("Quitar")[0]);
    expect(screen.queryByLabelText(/S1-01 · Sótano 1: /)).toBeNull();
  });

  it("en uno que ya existe, el suyo sale como «Asignado» y el libre no", () => {
    render(
      <RecursosDeLaVivienda
        unidadId="u-901"
        parkings={[estacionamiento("e1", "S1-01", "u-901"), estacionamiento("e2", "S1-02", null)]}
        deposits={[]}
        onCreateParking={vi.fn()}
        onUpdateParking={vi.fn()}
        onCreateDeposit={vi.fn()}
        onUpdateDeposit={vi.fn()}
        nivelesParaCrear={NIVELES}
      />,
    );

    expect(screen.getByLabelText("S1-01 · Sótano 1: Asignado")).toBeTruthy();
    expect(screen.queryByLabelText(/S1-02 · Sótano 1: /)).toBeNull();
    expect(screen.getByText("Los estacionamientos de este departamento. Lo que eliges se asigna al momento.")).toBeTruthy();
  });

  it("al elegir uno en un departamento que existe, se asigna a ese departamento", async () => {
    const usuario = userEvent.setup();
    const onUpdateParking = vi.fn();
    render(
      <RecursosDeLaVivienda
        unidadId="u-901"
        parkings={[estacionamiento("e2", "S1-02", null)]}
        deposits={[]}
        onCreateParking={vi.fn()}
        onUpdateParking={onUpdateParking}
        onCreateDeposit={vi.fn()}
        onUpdateDeposit={vi.fn()}
        nivelesParaCrear={NIVELES}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: /^Elegir un estacionamiento libre/ }));
    await usuario.click(screen.getByRole("menuitem", { name: "S1-02 · Sótano 1" }));

    expect(onUpdateParking).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: "e2" }),
      expect.objectContaining({ unidadId: "u-901", tipo: "privado" }),
    );
  });
});

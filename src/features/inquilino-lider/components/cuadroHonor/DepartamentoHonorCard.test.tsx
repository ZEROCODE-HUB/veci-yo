import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DepartamentoHonorCard } from "./DepartamentoHonorCard";
import type { UnidadCuadroHonor } from "../../services/cuadroHonor.repo";

/**
 * El botón de reconocer, en la tarjeta de cada vivienda.
 *
 * Salía también en la vivienda de quien miraba. La lista del popup ya excluía
 * a uno mismo; el atajo de la tarjeta no, y la base lo rechazaba con un error
 * en inglés (12/10/2026).
 */
vi.mock("@/assets/icons/inquilino-lider/reconocimiento-hero.png", () => ({
  default: { uri: "hero.png" },
}));

const vivienda: UnidadCuadroHonor = {
  id: "u1",
  departamento: "Departamento 205 · Torre 2",
  responsable: "Guillermo Provenzano",
  responsableUsuarioId: "usuario-1",
  contador: "6/6",
  insignias: 0,
  insigniasDetalle: [],
};

const boton = () => screen.queryByLabelText("Reconocer a esta vivienda");

describe("reconocer desde la tarjeta", () => {
  it("se ofrece en la vivienda de otro", () => {
    render(
      <DepartamentoHonorCard
        departamento={vivienda}
        puedeParticipar
        onReconocer={() => {}}
      />,
    );
    expect(boton()).not.toBeNull();
  });

  it("y no en la propia", () => {
    render(
      <DepartamentoHonorCard
        departamento={vivienda}
        puedeParticipar
        esPropia
        onReconocer={() => {}}
      />,
    );
    expect(boton()).toBeNull();
  });
});

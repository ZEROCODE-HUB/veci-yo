import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Anuncio } from "../../types/anuncios";
import { AnunciosList } from "./AnunciosList";

// La categoría se nombra con la lista de la base; en jsdom no hay red.
vi.mock("@/shared/hooks/useLista", () => import("@/pruebas/listasDeLaBase"));

/**
 * En la lista no se distinguía un anuncio de una encuesta, ni si la encuesta
 * seguía abierta (Para Claude, 21/10/2026). La fecha de cierre se compara con
 * el día de hoy, así que el reloj se fija.
 */
const fila = (parcial: Partial<Anuncio>): Anuncio => ({
  uuid: "a1",
  id: 1,
  categoria: "administracion",
  titulo: "Corte de agua",
  descripcion: "",
  fechaPublicada: "20/10/2026",
  fechaFinalizacion: "",
  fechaCorta: "20/10/2026",
  votacion: false,
  ...parcial,
});

describe("AnunciosList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 22, 12));
  });
  afterEach(() => vi.useRealTimers());

  it("un anuncio dice «Anuncio» y no lleva estado", () => {
    render(<AnunciosList anuncios={[fila({})]} onPress={() => {}} />);
    expect(screen.getByText("Anuncio")).toBeTruthy();
    expect(screen.queryByText("En curso")).toBeNull();
    expect(screen.queryByText("Cerrada")).toBeNull();
  });

  it("una encuesta abierta dice «Encuesta» y «En curso»", () => {
    render(
      <AnunciosList
        anuncios={[fila({ votacion: true, fechaFinalizacion: "25/10/2026" })]}
        onPress={() => {}}
      />,
    );
    expect(screen.getByText("Encuesta")).toBeTruthy();
    expect(screen.getByText("En curso")).toBeTruthy();
  });

  it("una encuesta que ya terminó dice «Cerrada»", () => {
    render(
      <AnunciosList
        anuncios={[fila({ votacion: true, fechaFinalizacion: "21/10/2026" })]}
        onPress={() => {}}
      />,
    );
    expect(screen.getByText("Cerrada")).toBeTruthy();
    expect(screen.queryByText("En curso")).toBeNull();
  });
});

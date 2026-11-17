import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { textoCompleto } from "@/pruebas/texto";
import { leerResultado } from "../../helpers/resultadoDeEncuesta";
import { ResultadoDeEncuestaCard } from "./ResultadoDeEncuestaCard";

/**
 * Lo que se ve del resultado que calcula la base (17/11/2026): la frase, la
 * barra con la marca del umbral, y nada de números si están ocultos.
 */
const deLaBase = (cambios: Record<string, unknown> = {}) =>
  leerResultado({
    quien_vota: "vivienda",
    como_se_cuenta: "igual",
    regla: "umbral",
    umbral_porcentaje: 70,
    cerrada: false,
    resultados_visibles: true,
    electores: 240,
    total_posible: 240,
    participantes: 70,
    peso_emitido: 70,
    sin_contar: 0,
    umbral_necesario: 168,
    es_si_no: true,
    opciones: [
      { id: "si", etiqueta: "Sí", votos: 40, peso: 40, es_abstencion: false },
      { id: "no", etiqueta: "No", votos: 30, peso: 30, es_abstencion: false },
    ],
    objetivo_id: "si",
    objetivo_etiqueta: "Sí",
    empate: false,
    aprobada: false,
    falta: 128,
    ...cambios,
  })!;

describe("la tarjeta del resultado", () => {
  it("dice cuánto falta y pinta la marca del umbral", () => {
    render(<ResultadoDeEncuestaCard resultado={deLaBase()} enCurso />);
    screen.getByText(
      textoCompleto("De 240 departamentos: 40 sí, 30 no. Aún no se aprueba: faltan 128 para llegar al 70 %."),
    );
    screen.getByText(textoCompleto("Umbral 70 %"));
    screen.getByText(textoCompleto("Falta por votar"));
  });

  it("con los resultados ocultos no enseña la barra ni lo que se votó", () => {
    render(
      <ResultadoDeEncuestaCard
        resultado={deLaBase({
          resultados_visibles: false,
          opciones: [{ id: "si", etiqueta: "Sí" }, { id: "no", etiqueta: "No" }],
        })}
        enCurso
      />,
    );
    expect(screen.queryByText(textoCompleto(/Umbral 70/))).toBeNull();
    expect(screen.queryByText(textoCompleto(/40 sí/))).toBeNull();
    screen.getByText(
      textoCompleto("De 240 departamentos: ya votaron 70. Los resultados se ven cuando la administración los publique."),
    );
  });
});

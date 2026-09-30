import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { textoCompleto } from "@/pruebas/texto";
import type { Anuncio } from "../../types/anuncios";
import { AnuncioResultadosFinales } from "./AnuncioResultadosFinales";

/**
 * La participación de una votación cerrada.
 *
 * El defecto salió recorriendo la encuesta «¿Pintamos la fachada?», que no
 * declara umbral: la tarjeta de votar decía «Progreso 0%» con el voto ya
 * emitido, y esta otra --con el mismo dato-- cerraba diciendo
 * «Participación 100%» aunque no hubiera votado nadie.
 *
 * Los dos números salían de `progreso`, que valía 0 cuando no había umbral, y
 * de dos valores por defecto que lo tapaban: `progreso || 0` en una pantalla y
 * `progreso || 100` en la otra. O sea que el mismo cero significaba «nadie
 * votó» en una y «votaron todos» en la otra.
 *
 * Es de la familia de «una frase que junta dos datos afirma algo que no pasó»:
 * el porcentaje se ve razonable y nada lo delata, porque no hay un dato mal
 * guardado detrás --hay un denominador que no existe--.
 */
const anuncio = (parcial: Partial<Anuncio> = {}): Anuncio =>
  ({
    uuid: "p1",
    id: 1,
    titulo: "¿Pintamos la fachada?",
    categoria: "Administración",
    descripcion: "",
    fechaPublicada: "21/09/2026",
    fechaFinalizacion: "22/09/2026",
    fechaCorta: "21/09/2026",
    votacion: true,
    ocultarResultados: false,
    votacionMultiple: false,
    opcionesVotacion: ["Si", "No"],
    opciones: [
      { uuid: "o1", etiqueta: "Si", votos: 1 },
      { uuid: "o2", etiqueta: "No", votos: 0 },
    ],
    totalVotos: 1,
    ...parcial,
  }) as Anuncio;

describe("los resultados finales de una encuesta", () => {
  it("sin umbral, mide la participación contra el censo, no contra nada", () => {
    // Un voto emitido y tres unidades que no votaron: 1 de 4, o sea 25%.
    render(
      <AnuncioResultadosFinales
        anuncio={anuncio()}
        noVotaron={["101", "103", "201"]}
      />,
    );

    screen.getByText(textoCompleto("Participación: 1 de 4"));
    screen.getByText(textoCompleto("25%"));
    expect(screen.queryByText(textoCompleto("100%"))).toBeNull();
  });

  it("con umbral, lo que manda es el umbral", () => {
    render(
      <AnuncioResultadosFinales
        anuncio={anuncio({ umbral: 10, progreso: 10 })}
        noVotaron={["101", "103", "201"]}
      />,
    );

    screen.getByText(textoCompleto("Participación sobre el umbral de 10"));
    screen.getByText(textoCompleto("10%"));
  });

  it("sin umbral y sin censo no inventa ningún porcentaje", () => {
    /*
      `pendientes_votacion` viene vacío si la votación es secreta o si quien
      mira no administra el condominio. Entonces no hay denominador: antes eso
      daba «Participación 100%», que es la lectura más optimista posible de no
      saber nada.
    */
    render(
      <AnuncioResultadosFinales
        anuncio={anuncio({ totalVotos: 0, opciones: [] })}
        noVotaron={[]}
      />,
    );

    expect(screen.queryByText(/Participación/)).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
    // Y la tarjeta sí se pinta: lo que falta es la barra, no los resultados.
    screen.getByText(textoCompleto("Resultados finales"));
  });
});

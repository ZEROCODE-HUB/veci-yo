import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnuncioVotacionCard } from "./AnuncioVotacionCard";
import type { Anuncio } from "../../types/anuncios";

/**
 * La tarjeta de votar una encuesta.
 *
 * Lo reportó el cliente el 01/10/2026: «voto por una opción, ok se marca, y se
 * bloquea la otra, pero al darle nuevamente en la misma opción que elegí sale
 * un anuncio rojo abajo».
 *
 * Y era exacto: `deshabilitada` se calculaba `!puedeSeguirVotando && !elegida`,
 * así que la opción **ya votada** seguía respondiendo. Pulsarla mandaba un
 * segundo voto, la base lo rechazaba --«Esta encuesta admite un solo voto por
 * persona»-- y el aviso rojo salía por hacer lo que la pantalla ofrecía.
 *
 * En una encuesta de voto múltiple era peor, porque ahí la base **sí** lo
 * acepta: se votaba dos veces la misma opción.
 */
const BASE = {
  uuid: "p1",
  titulo: "¿Pintamos la fachada?",
  opciones: [
    { uuid: "o1", etiqueta: "Sí" },
    { uuid: "o2", etiqueta: "No" },
  ],
  votacionMultiple: false,
} as unknown as Anuncio;

const pintar = (anuncio: Anuncio, misOpciones: string[], onVotar = vi.fn()) => {
  render(
    <AnuncioVotacionCard
      anuncio={anuncio}
      misOpciones={misOpciones}
      votando={false}
      onVotar={onVotar}
    />,
  );
  return onVotar;
};

describe("la encuesta de un solo voto", () => {
  it("la opción que ya elegí no se puede volver a pulsar", () => {
    const onVotar = pintar(BASE, ["o1"]);

    fireEvent.click(screen.getByText("Sí"));

    expect(onVotar).not.toHaveBeenCalled();
  });

  it("ni la otra, que es lo que ya hacía", () => {
    const onVotar = pintar(BASE, ["o1"]);

    fireEvent.click(screen.getByText("No"));

    expect(onVotar).not.toHaveBeenCalled();
  });

  it("pero antes de votar las dos responden", () => {
    /*
      El control positivo. Sin él, los dos casos de arriba pasarían igual con
      la tarjeta entera muerta --que es justo como estuvo esta pantalla hasta
      el 29/09/2026, con los botones sin `onPress`--.
    */
    const onVotar = pintar(BASE, []);

    fireEvent.click(screen.getByText("Sí"));
    expect(onVotar).toHaveBeenCalledWith("o1");

    fireEvent.click(screen.getByText("No"));
    expect(onVotar).toHaveBeenCalledWith("o2");
  });
});

describe("la encuesta de voto múltiple", () => {
  const MULTIPLE = { ...BASE, votacionMultiple: true } as Anuncio;

  it("la ya elegida tampoco, que ahí la base sí acepta el duplicado", () => {
    const onVotar = pintar(MULTIPLE, ["o1"]);

    fireEvent.click(screen.getByText("Sí"));

    expect(onVotar).not.toHaveBeenCalled();
  });

  it("y las que faltan siguen abiertas, que para eso es múltiple", () => {
    const onVotar = pintar(MULTIPLE, ["o1"]);

    fireEvent.click(screen.getByText("No"));

    expect(onVotar).toHaveBeenCalledWith("o2");
  });
});

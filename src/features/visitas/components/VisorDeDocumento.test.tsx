import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VisorDeDocumento } from "./VisorDeDocumento";

/**
 * La foto del documento, a pantalla completa.
 *
 * Se pintaban en miniaturas al 48% y **con `cover`**, que recorta: en una
 * cédula fotografiada apaisada eso se come los bordes, que es donde está el
 * número. Y no se podían abrir. El cliente lo dijo el 09/10/2026: «no deja
 * abrir la imagen en tamaño completo».
 *
 * Es el caso de uso entero de esa pantalla: el anfitrión mira estas fotos
 * para comprobar que el documento es de quien dice ser y que el número
 * coincide con lo que escribió. Para eso hace falta verlo.
 */

const URLS = ["https://x/frente.jpg", "https://x/reverso.jpg"];

describe("el visor del documento", () => {
  it("cerrado no pinta nada", () => {
    // El control de todos los demás: sin esto, pintar siempre pasaría igual.
    render(
      <VisorDeDocumento
        urls={URLS}
        indice={null}
        onCerrar={() => {}}
        onCambiar={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
  });

  it("abierto enseña cuál de cuántas", () => {
    render(
      <VisorDeDocumento
        urls={URLS}
        indice={0}
        onCerrar={() => {}}
        onCambiar={() => {}}
      />,
    );

    expect(screen.getByText("1 de 2")).toBeTruthy();
  });

  it("con una sola no cuenta ni ofrece pasar", () => {
    // «1 de 1» es ruido, y dos flechas apagadas también.
    render(
      <VisorDeDocumento
        urls={[URLS[0]]}
        indice={0}
        onCerrar={() => {}}
        onCambiar={() => {}}
      />,
    );

    expect(screen.getByText("Documento")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  });

  it("deja pasar a la siguiente", () => {
    const alCambiar = vi.fn();
    render(
      <VisorDeDocumento
        urls={URLS}
        indice={0}
        onCerrar={() => {}}
        onCambiar={alCambiar}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Anterior" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeTruthy();
  });

  it("y en la última no hay siguiente", () => {
    render(
      <VisorDeDocumento
        urls={URLS}
        indice={1}
        onCerrar={() => {}}
        onCambiar={() => {}}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Siguiente" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("cierra", async () => {
    const usuario = userEvent.setup();
    const alCerrar = vi.fn();
    render(
      <VisorDeDocumento
        urls={URLS}
        indice={0}
        onCerrar={alCerrar}
        onCambiar={() => {}}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(alCerrar).toHaveBeenCalled();
  });

  it("ofrece ampliarla en el navegador", () => {
    /*
      El zoom de verdad —con los dedos o la rueda— lo hace el navegador mejor
      que cualquier cosa que se escriba aquí, y para comparar el número de una
      cédula hace falta.
    */
    render(
      <VisorDeDocumento
        urls={URLS}
        indice={0}
        onCerrar={() => {}}
        onCambiar={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Abrir en el navegador para ampliar" }),
    ).toBeTruthy();
  });
});

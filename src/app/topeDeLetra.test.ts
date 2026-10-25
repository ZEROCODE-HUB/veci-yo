import { describe, expect, it } from "vitest";
import { conTopeDeLetra, TOPE_DE_LETRA } from "./topeDeLetra";

const TEXTO = { nombre: "Text" };
const VISTA = { nombre: "View" };
const esTexto = (type: unknown) => type === TEXTO;
const crear = (type: unknown, props: Record<string, unknown> | null) => ({ type, props });

describe("el tope de letra", () => {
  const jsx = conTopeDeLetra(crear, esTexto);

  it("se lo pone a un texto que no dice nada", () => {
    expect(jsx(TEXTO, { children: "Hola" }).props).toEqual({
      children: "Hola",
      maxFontSizeMultiplier: TOPE_DE_LETRA,
    });
  });

  it("respeta el de un texto que pide otro", () => {
    expect(jsx(TEXTO, { maxFontSizeMultiplier: 1 }).props).toEqual({ maxFontSizeMultiplier: 1 });
  });

  it("no toca lo que no es texto", () => {
    expect(jsx(VISTA, { children: "x" }).props).toEqual({ children: "x" });
  });

  it("no copia las props cuando no hace falta", () => {
    const props = { children: "x" };
    expect(jsx(VISTA, props).props).toBe(props);
  });
});

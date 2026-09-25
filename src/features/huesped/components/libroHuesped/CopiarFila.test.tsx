import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { textoCompleto } from "@/pruebas/texto";

/**
 * El botón «Copiar» del libro del alojamiento.
 *
 * Copiar el código de la puerta a mano, de una pantalla de móvil, es
 * exactamente donde alguien se equivoca de dígito. Este botón es de los que
 * parecen decorativos --en este proyecto han salido ocho que lo eran-- y la
 * única forma de saberlo es comprobar qué se copia.
 *
 * `expo-clipboard` se dobla **aquí y no en el arranque**: esta prueba sí
 * necesita saber qué le llega al portapapeles, así que tiene que decirlo.
 */
const setStringAsync = vi.fn(async () => true);
vi.mock("expo-clipboard", () => ({ setStringAsync }));

const { CopiarFila } = await import("./CopiarFila");

describe("copiar una credencial", () => {
  it("copia el valor, no la etiqueta", async () => {
    render(<CopiarFila label="Código de la puerta" value="9876" mono />);
    await userEvent.click(screen.getByText(textoCompleto("Copiar")));
    expect(setStringAsync).toHaveBeenCalledWith("9876");
  });

  it("y lo dice, para que se note que pasó algo", async () => {
    /*
      Copiar no se ve: sin confirmacion, la unica forma de saber si funciono
      es pegar en otro sitio. Por eso el boton cambia.
    */
    render(<CopiarFila label="Contraseña Wi-Fi" value="clave" />);
    const boton = screen.getByText(textoCompleto("Copiar"));
    await userEvent.click(boton);
    expect(screen.getByText(textoCompleto("✓ Copiado"))).toBeDefined();
  });

  it("enseña la etiqueta y el valor", () => {
    render(<CopiarFila label="Red" value="ChicHomes_102" />);
    expect(screen.getByText(textoCompleto("Red"))).toBeDefined();
    expect(screen.getByText(textoCompleto("ChicHomes_102"))).toBeDefined();
  });
});

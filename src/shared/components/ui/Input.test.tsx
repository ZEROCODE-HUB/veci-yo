import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

/**
 * Nombres y apellidos con mayúscula al empezar cada palabra (09/11/2026,
 * Correcciones fila 14). En el navegador `autoCapitalize` llega como el
 * atributo `autocapitalize` del campo; en el celular, el teclado lo respeta.
 */
describe("mayúsculas del teclado", () => {
  it("un nombre empieza cada palabra con mayúscula", () => {
    render(<Input label="Nombre" value="" onChangeText={vi.fn()} soloLetras />);
    expect(screen.getByLabelText("Nombre").getAttribute("autocapitalize")).toBe("words");
  });

  it("un correo no pone mayúsculas", () => {
    render(<Input label="Correo" value="" onChangeText={vi.fn()} type="email" />);
    expect(screen.getByLabelText("Correo").getAttribute("autocapitalize")).toBe("none");
  });

  it("lo demás, como una frase", () => {
    render(<Input label="Notas" value="" onChangeText={vi.fn()} />);
    expect(screen.getByLabelText("Notas").getAttribute("autocapitalize")).toBe("sentences");
  });
});

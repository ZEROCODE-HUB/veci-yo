import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LlamadaEnCurso } from "./LlamadaEnCurso";

/** La llamada en curso del intercomunicador (rehecha el 21/10/2026). */
const pintar = (props: Partial<Parameters<typeof LlamadaEnCurso>[0]> = {}) => {
  const onSilenciar = vi.fn();
  const onColgar = vi.fn();
  render(
    <LlamadaEnCurso
      etiqueta="Portería"
      situacion="En llamada"
      tiempo="01:05"
      silencio={false}
      onSilenciar={onSilenciar}
      onColgar={onColgar}
      {...props}
    />,
  );
  return { onSilenciar, onColgar };
};

describe("la llamada en curso", () => {
  it("dice con quién se habla y cuánto lleva", () => {
    pintar();
    screen.getByText("Portería");
    screen.getByText("01:05");
  });

  it("mientras suena no enseña un reloj", () => {
    pintar({ situacion: "Llamando…", tiempo: undefined });
    screen.getByText("Llamando…");
    expect(screen.queryByText(/\d\d:\d\d/)).toBeNull();
  });

  it("silenciar y colgar llaman a lo suyo", () => {
    const { onSilenciar, onColgar } = pintar();
    fireEvent.click(screen.getByRole("button", { name: "Silenciar" }));
    fireEvent.click(screen.getByRole("button", { name: "Colgar" }));
    expect(onSilenciar).toHaveBeenCalledTimes(1);
    expect(onColgar).toHaveBeenCalledTimes(1);
  });

  it("con el micrófono apagado se dice, no solo se pinta", () => {
    pintar({ silencio: true });
    expect(
      screen.getByRole("button", { name: "Activar micrófono" }).getAttribute("aria-pressed"),
    ).toBe("true");
    screen.getByText("Micrófono apagado");
  });
});

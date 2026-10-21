import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./Button";

/**
 * Un doble clic no hace dos veces lo mismo (21/10/2026): al registrar una
 * visita, dos clics seguidos creaban dos visitas.
 */
describe("el botón ante un doble clic", () => {
  it("dos clics seguidos llaman una sola vez", () => {
    const alPulsar = vi.fn();
    render(<Button onPress={alPulsar}>Aceptar</Button>);
    const boton = screen.getByRole("button", { name: "Aceptar" });

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(alPulsar).toHaveBeenCalledTimes(1);
  });

  it("pasado un momento, vuelve a responder", () => {
    vi.useFakeTimers();
    const alPulsar = vi.fn();
    render(<Button onPress={alPulsar}>Aceptar</Button>);
    const boton = screen.getByRole("button", { name: "Aceptar" });

    fireEvent.click(boton);
    vi.advanceTimersByTime(700);
    fireEvent.click(boton);

    expect(alPulsar).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

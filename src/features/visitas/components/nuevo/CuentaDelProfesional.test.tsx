import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CuentaDelProfesional } from "./CuentaDelProfesional";
import type { AltaDeVisita } from "./tipos";

/**
 * «¿Tendrá cuenta en la app?» del profesional permanente (18/11/2026). Lo que
 * importa: sale solo en permanente y para la vivienda, con cuenta dice a qué
 * correo va el acceso y deja elegir los dos permisos.
 */
function alta(cambios: Partial<Record<string, unknown>> = {}) {
  return {
    tipoSeleccionado: "permanente",
    esGuardia: false,
    esAdmin: false,
    email: "rosa@correo.com",
    conCuenta: false,
    setConCuenta: vi.fn(),
    puedeContestarCitofono: true,
    setPuedeContestarCitofono: vi.fn(),
    puedeCrearVisitas: false,
    setPuedeCrearVisitas: vi.fn(),
    ...cambios,
  } as unknown as AltaDeVisita;
}

describe("la cuenta del profesional permanente", () => {
  it("sin cuenta: pregunta y se puede pasar a «Sí»", async () => {
    const v = alta();
    render(<CuentaDelProfesional alta={v} />);
    screen.getByText("¿Tendrá cuenta en la app?");
    expect(screen.queryByText("Puede crear visitas")).toBeNull();
    await userEvent.click(screen.getByText("Sí"));
    expect(v.setConCuenta).toHaveBeenCalledWith(true);
  });

  it("con cuenta: a qué correo va el acceso y los dos permisos", async () => {
    const v = alta({ conCuenta: true });
    render(<CuentaDelProfesional alta={v} />);
    screen.getByText("Le enviaremos el acceso a rosa@correo.com. Tiene que entrar con ese mismo correo.");
    screen.getByText("Puede contestar el citófono");
    screen.getByText("Puede crear visitas");
  });

  it("con cuenta y sin correo, lo pide", () => {
    render(<CuentaDelProfesional alta={alta({ conCuenta: true, email: " " })} />);
    screen.getByText("Escribe su correo arriba: ahí le enviaremos el acceso.");
  });

  it("no sale en otro tipo de visita ni a la portería", () => {
    const { container: temporal } = render(<CuentaDelProfesional alta={alta({ tipoSeleccionado: "temporal" })} />);
    expect(temporal.textContent).toBe("");
    const { container: porteria } = render(<CuentaDelProfesional alta={alta({ esGuardia: true })} />);
    expect(porteria.textContent).toBe("");
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ElegirAQuienEscribir } from "./ElegirAQuienEscribir";
import type { PersonalDePorteria } from "../../services/personalDePorteria.repo";

/**
 * Elegir a quién escribir en la portería (17/11/2026, pedido aprobado por el
 * cliente): cargo y nombre; desde el 18/11/2026 también a quien no está de turno, con aviso. Lo
 * que importa es lo que se ve y lo que se deja pulsar.
 */
const ahora = "2026-11-17T16:00:00"; // martes

const persona = (p: Partial<PersonalDePorteria>): PersonalDePorteria => ({
  membresiaId: "m1",
  nombre: "Federico Valverde",
  cargo: "conserje",
  cargoEtiqueta: "Conserje",
  deTurno: true,
  tieneHorario: true,
  turnos: [],
  ajustes: [],
  ahoraLocal: ahora,
  ...p,
});

function montar(personal: PersonalDePorteria[], onElegir = vi.fn()) {
  render(
    <ElegirAQuienEscribir
      viviendas={[{ unidadId: "u1", etiqueta: "Dpto 101" }]}
      viviendaId="u1"
      onVivienda={() => {}}
      personal={personal}
      cargandoPersonal={false}
      elegido=""
      onElegir={onElegir}
      onStartChat={() => {}}
      abriendo={false}
    />,
  );
  return onElegir;
}

describe("elegir a quién escribir en la portería", () => {
  it("de turno: cargo y nombre, y se puede elegir", async () => {
    const onElegir = montar([persona({})]);
    const fila = screen.getByRole("radio", { name: /Conserje · Federico Valverde/ });
    expect(fila.getAttribute("aria-disabled")).not.toBe("true");
    screen.getByText("De turno ahora");
    await userEvent.click(fila);
    expect(onElegir).toHaveBeenCalledWith("porteria:m1");
  });

  it("fuera de turno: en gris, con su horario, se puede elegir y avisa de cuándo vuelve (18/11/2026)", async () => {
    const fuera = persona({
      membresiaId: "m2",
      nombre: "Ana Ruiz",
      cargo: "seguridad",
      cargoEtiqueta: "Seguridad",
      deTurno: false,
      turnos: [1, 2, 3, 4, 5].map((dia) => ({ dia, inicio: "07:00", fin: "15:00" })),
    });
    const onElegir = montar([fuera]);
    const fila = screen.getByRole("radio", { name: /Seguridad · Ana Ruiz/ });
    expect(fila.getAttribute("aria-disabled")).not.toBe("true");
    screen.getByText("Entra mañana 7:00 · Turno: lun–vie 7:00–15:00");
    await userEvent.click(fila);
    expect(onElegir).toHaveBeenCalledWith("porteria:m2");
    expect(screen.queryByText(/no está de turno/)).toBeNull();
  });

  it("con alguien fuera de turno elegido, dice cuándo vuelve", () => {
    render(
      <ElegirAQuienEscribir
        viviendas={[{ unidadId: "u1", etiqueta: "Dpto 101" }]}
        viviendaId="u1"
        onVivienda={() => {}}
        personal={[
          persona({
            membresiaId: "m2",
            nombre: "Ana Ruiz",
            deTurno: false,
            turnos: [1, 2, 3, 4, 5].map((dia) => ({ dia, inicio: "07:00", fin: "15:00" })),
          }),
        ]}
        cargandoPersonal={false}
        elegido="porteria:m2"
        onElegir={() => {}}
        onStartChat={() => {}}
        abriendo={false}
      />,
    );
    screen.getByText(
      "Ana Ruiz no está de turno: entra mañana 7:00. Le llegará tu mensaje y te contestará cuando vuelva. Si es urgente, elige a quien está de turno ahora.",
    );
  });

  it("sin nadie con chat, lo dice y deja la administración", () => {
    montar([]);
    screen.getByText(/Nadie de la portería tiene el chat habilitado/);
    screen.getByRole("radio", { name: "Administración" });
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampoFecha } from "./CampoFecha";
import { CampoHora } from "./CampoHora";

/**
 * Que al pulsar un campo de fecha u hora **aparezca algo**.
 *
 * Suena a prueba tonta y es la que faltaba. El 02/10/2026 el cliente reportó
 * que «en muchos lugares no se abría el selector de fecha»: dieciséis campos en
 * ocho pantallas usaban `@react-native-community/datetimepicker`, **que en web
 * no tiene implementación** y devuelve `null`. El `Pressable` respondía, el
 * estado cambiaba, el componente se montaba y no se pintaba nada.
 *
 * Lo peor no fue el fallo: fue que `componentes.setup.ts` **doblaba ese paquete
 * con `() => null`**, así que las pruebas de componente reproducían el defecto
 * en vez de detectarlo. El doble se retiró con el paquete.
 *
 * Estas pruebas son la red que no había: comprueban lo único que importaba —que
 * al pulsar aparezca el calendario o la lista de horas—, que es exactamente lo
 * que no pasaba.
 */

describe("el campo de fecha", () => {
  it("al pulsarlo se abre el calendario", async () => {
    const usuario = userEvent.setup();
    render(<CampoFecha label="Fecha desde" value="" onChange={() => {}} />);

    // Antes de pulsar no hay calendario: si lo hubiera, el caso de abajo
    // pasaría igual con el campo roto.
    expect(screen.queryByText("Lun")).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Fecha desde" }));

    // Las iniciales de los días: es el calendario, montado y visible.
    expect(screen.getAllByText("L").length).toBeGreaterThan(0);
  });

  it("enseña la fecha elegida en el formato de la aplicación", () => {
    /*
      Hacia fuera viaja ISO, que es como lo guarda la base; lo que se lee es
      `dd/MM/yyyy`, que es el formato canónico (regla 6). Si los dos se mezclan,
      el filtro de visitas deja de filtrar —ya pasó, y es lo que se arregló con
      este mismo cambio—.
    */
    render(<CampoFecha label="Fecha" value="2026-11-15" onChange={() => {}} />);
    expect(screen.getByText("15/11/2026")).toBeDefined();
  });

  it("devuelve la fecha en ISO, no en lo que se ve", async () => {
    const usuario = userEvent.setup();
    const alCambiar = vi.fn();
    render(<CampoFecha label="Fecha" value="2026-11-15" onChange={alCambiar} />);

    await usuario.click(screen.getByRole("button", { name: "Fecha" }));
    await usuario.click(screen.getByText("20"));

    expect(alCambiar).toHaveBeenCalledWith("2026-11-20");
  });
});

describe("el campo de hora", () => {
  it("al pulsarlo se abre la lista", async () => {
    const usuario = userEvent.setup();
    render(<CampoHora label="Hora de ingreso" value="" onChange={() => {}} />);

    expect(screen.queryByText("08:00")).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Hora de ingreso" }));

    expect(screen.getByText("08:00")).toBeDefined();
    expect(screen.getByText("23:45")).toBeDefined();
  });

  it("devuelve la hora en `HH:mm`, que es como la guarda la base", async () => {
    const usuario = userEvent.setup();
    const alCambiar = vi.fn();
    render(<CampoHora label="Hora" value="" onChange={alCambiar} />);

    await usuario.click(screen.getByRole("button", { name: "Hora" }));
    await usuario.click(screen.getByText("14:30"));

    expect(alCambiar).toHaveBeenCalledWith("14:30");
  });

  it("no deja elegir una hora anterior al mínimo", async () => {
    /*
      Para un «hasta» que sigue a un «desde»: una reserva que termina antes de
      empezar no existe, y la base la rechaza. Mejor no ofrecerla.
    */
    const usuario = userEvent.setup();
    const alCambiar = vi.fn();
    render(
      <CampoHora label="Hora fin" value="" onChange={alCambiar} minima="12:00" />,
    );

    await usuario.click(screen.getByRole("button", { name: "Hora fin" }));
    await usuario.click(screen.getByText("08:00"));
    expect(alCambiar).not.toHaveBeenCalled();

    // Control positivo: una posterior sí se puede elegir.
    await usuario.click(screen.getByText("14:00"));
    expect(alCambiar).toHaveBeenCalledWith("14:00");
  });
});

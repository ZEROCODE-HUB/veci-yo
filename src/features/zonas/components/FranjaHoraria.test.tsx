import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FranjaHoraria } from "./FranjaHoraria";
import type { ReservaZona } from "@/shared/types";
import { textoCompleto } from "@/pruebas/texto";

/**
 * Una franja de la grilla horaria.
 *
 * Aquí han salido cuatro defectos pulsando la app a mano, y ninguno lo podía
 * ver una prueba de función pura: el contador que no se movía, la reserva sin
 * número, la cancelada pintada como si ocupara, y el número de lavadora que
 * se guardaba y no se veía. Todos eran **lo que se pinta**, no lo que se
 * calcula.
 */
const reserva = (parcial: Partial<ReservaZona> = {}): ReservaZona =>
  ({
    id: 1,
    uuid: "r1",
    zonaId: "z1",
    depto: "102",
    nombre: "Lavanderia",
    acompanantes: 0,
    reservaNum: "368803",
    horario: "06:00 - 07:00",
    estado: "Aprobado",
    personas: [],
    /*
      Sin `esMia`, un vecino no ve la reserva: la franja las filtra porque
      `reserva_zona_lectura` le entrega solo las suyas y las ajenas llegan
      por `ocupacion_zona()` como un numero. Lo aprendi escribiendo esta
      prueba con el fixture mal y viendo la franja salir vacia.
    */
    esMia: true,
    ...parcial,
  }) as ReservaZona;

const props = {
  hora: "06:00",
  reservas: [],
  esGestion: false,
  ajenas: 0,
  libres: 4,
  cupos: 4,
  onSeleccionar: () => {},
  onReservar: () => {},
};

describe("una franja de la grilla", () => {
  it("dice cuántos puestos quedan cuando la zona tiene varios", () => {
    render(
      <FranjaHoraria
        {...props}
        reservas={[reserva({ numeroRecurso: 1 })]}
        libres={2}
        cupos={4}
      />,
    );
    expect(
      screen.getByText(textoCompleto("+ Reservar · quedan 2 de 4")),
    ).toBeDefined();
  });

  it("y no cuenta puestos en una zona de uno solo", () => {
    // La piscina es una. «quedan 1 de 1» no le dice nada a nadie.
    render(
      <FranjaHoraria {...props} reservas={[reserva()]} libres={1} cupos={1} />,
    );
    expect(screen.getByText(textoCompleto("+ Reservar"))).toBeDefined();
    expect(screen.queryByText(/quedan/)).toBeNull();
  });

  it("la franja vacía solo ofrece reservar", () => {
    render(<FranjaHoraria {...props} />);
    expect(screen.getByText(textoCompleto("+ Reservar"))).toBeDefined();
  });

  it("y una reserva ajena no se cuela como propia", () => {
    /*
      Control del filtro: la misma reserva sin `esMia` no se pinta. Si un dia
      `propias` dejara de filtrar, un vecino veria el numero de reserva y el
      departamento de otro.
    */
    render(
      <FranjaHoraria
        {...props}
        reservas={[reserva({ esMia: false })]}
        ajenas={1}
        libres={3}
      />,
    );
    expect(screen.queryByText(/368803/)).toBeNull();
    expect(screen.getByText("Ocupado")).toBeDefined();
  });

  it("enseña qué lavadora es la reserva propia", () => {
    /*
      El puesto se guardaba y no se releia en ninguna pantalla: se elegia la
      N°2 y despues no habia forma de saber a cual ir. Esta prueba es la que
      faltaba cuando lo arregle en tres sitios y me deje el cuarto.
    */
    render(
      <FranjaHoraria
        {...props}
        reservas={[reserva({ numeroRecurso: 2 })]}
        libres={3}
      />,
    );
    expect(screen.getByText(textoCompleto("06:00 - 07:00 · N°2"))).toBeDefined();
  });

  it("y sin puesto no inventa un «N°»", () => {
    // Las zonas de un solo puesto no numeran nada.
    render(
      <FranjaHoraria
        {...props}
        reservas={[reserva({ numeroRecurso: null })]}
        libres={0}
        cupos={1}
      />,
    );
    expect(screen.getByText(textoCompleto("06:00 - 07:00"))).toBeDefined();
    /*
      Se busca el sufijo «· N°», no «N°» a secas: el titulo de la insignia es
      «Reserva N° 368803» y tambien lo lleva. La primera version de esta
      prueba fallaba por eso, y era la prueba la que estaba mal.
    */
    expect(screen.queryByText(textoCompleto(/· N°/))).toBeNull();
  });

  it("las reservas ajenas no se enumeran: son «Ocupado»", () => {
    /*
      Pintaba una insignia por cada reserva que solapa la franja. Con la base
      real, la piscina a las 10:00 salia con ciento veinte insignias
      identicas. Para quien no gestiona, la franja dice una sola cosa.
    */
    render(<FranjaHoraria {...props} ajenas={120} libres={0} cupos={1} />);
    expect(screen.getByText("Ocupado")).toBeDefined();
    expect(screen.getByText("120 reservas")).toBeDefined();
  });

  it("una sola ajena se dice en singular", () => {
    render(<FranjaHoraria {...props} ajenas={1} libres={0} cupos={1} />);
    expect(screen.getByText("Otra vivienda")).toBeDefined();
  });

  it("sin huecos no se ofrece reservar", () => {
    render(<FranjaHoraria {...props} libres={0} cupos={4} ajenas={4} />);
    expect(screen.queryByText(/Reservar/)).toBeNull();
  });

  it("al pulsar «+ Reservar» avisa", async () => {
    const reservar = vi.fn();
    render(<FranjaHoraria {...props} onReservar={reservar} />);
    await userEvent.click(screen.getByText(textoCompleto("+ Reservar")));
    expect(reservar).toHaveBeenCalledTimes(1);
  });

  it("y al pulsar la propia, la entrega entera", async () => {
    // El menu de la reserva necesita el uuid, no su posicion en un array.
    const elegida = vi.fn();
    const mia = reserva({ numeroRecurso: 2 });
    render(
      <FranjaHoraria {...props} reservas={[mia]} onSeleccionar={elegida} />,
    );
    await userEvent.click(screen.getByText(textoCompleto("Reserva N° 368803")));
    expect(elegida).toHaveBeenCalledWith(mia);
  });
});

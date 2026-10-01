import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IngresosSalidasTable } from "./IngresosSalidasTable";

/**
 * La tabla de ingresos y salidas del inicio.
 *
 * Salió recorriendo la aplicación como portería: un día sin movimientos
 * pintaba las seis cabeceras --«Nombre», «Tipo», «Depto»...-- y nada debajo.
 * Quien mira eso no sabe si es que no ha entrado nadie o si el dato no llegó,
 * que es justo la duda que no se le puede dejar a quien vigila una puerta.
 */
describe("la tabla de ingresos y salidas", () => {
  const FILA = {
    id: "1",
    nombre: "Ana Torres",
    tipo: "Visita",
    depto: "301",
    horaIngreso: "08:14",
    horaSalida: "09:02",
    estado: "Finalizado",
  };

  it("dice que no hay movimientos en vez de enseñar una tabla vacía", () => {
    render(<IngresosSalidasTable data={[]} />);

    expect(
      screen.getByText("Hoy no hay ingresos ni salidas registrados"),
    ).toBeDefined();
    // Y no la cabecera de una tabla que no tiene ninguna fila.
    expect(screen.queryByText("Depto")).toBeNull();
  });

  it("con datos enseña la tabla y no el aviso", () => {
    render(<IngresosSalidasTable data={[FILA]} />);

    expect(screen.getByText("Ana Torres")).toBeDefined();
    expect(screen.getByText("Depto")).toBeDefined();
    expect(
      screen.queryByText("Hoy no hay ingresos ni salidas registrados"),
    ).toBeNull();
  });
});

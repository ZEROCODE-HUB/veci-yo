import { describe, expect, it } from "vitest";
import { calcularTrafico, HORAS_TURNO } from "./home.helpers";

/**
 * Las barras del grafico de la porteria.
 *
 * «Con vehiculo» salia de comparar el nombre de cada persona con ocho nombres
 * escritos en el codigo. Ahora viene contado de la base, y esto comprueba que
 * cada numero cae en su franja y en su lado.
 */
describe("el grafico de trafico", () => {
  const franjas = [
    { movimiento: "ingreso" as const, hora: 10, esHuesped: false, personas: 3, conVehiculo: 1 },
    { movimiento: "ingreso" as const, hora: 11, esHuesped: true, personas: 2, conVehiculo: 2 },
    { movimiento: "salida" as const, hora: 18, esHuesped: false, personas: 4, conVehiculo: 0 },
    { movimiento: "ingreso" as const, hora: 3, esHuesped: false, personas: 1, conVehiculo: 0 },
  ];
  const franjaDe = (hora: string) => HORAS_TURNO.indexOf(hora);

  it("los ingresos van a su franja de dos horas, separados por tipo", () => {
    const t = calcularTrafico(franjas, true);
    // Las 10 y las 11 son la misma barra.
    expect(t.usadoFamiliar[franjaDe("10:00")]).toBe(3);
    expect(t.usadoTemporal[franjaDe("10:00")]).toBe(2);
    expect(t.usadoPorHora[franjaDe("10:00")]).toBe(5);
    expect(t.usadoVehiculos[franjaDe("10:00")]).toBe(3);
    expect(t.maxVal).toBe(5);
  });

  it("la madrugada cae en la ultima franja", () => {
    const t = calcularTrafico(franjas, true);
    expect(t.usadoFamiliar[HORAS_TURNO.length - 1]).toBe(1);
  });

  it("y las salidas no se mezclan con los ingresos", () => {
    const t = calcularTrafico(franjas, false);
    expect(t.usadoPorHora[franjaDe("18:00")]).toBe(4);
    expect(t.usadoPorHora[franjaDe("10:00")]).toBe(0);
  });

  it("sin datos el maximo es 1: la barra no divide entre cero", () => {
    expect(calcularTrafico([], true).maxVal).toBe(1);
  });
});

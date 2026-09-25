import { describe, expect, it } from "vitest";
import {
  numeroDelPuesto,
  puestosDisponibles,
  puestosOcupados,
  seSolapan,
} from "./puestosDeLaZona";
import type { FranjaOcupada } from "./zonas.repo";

const franja = (
  desde: string,
  hasta: string,
  numero: number | null,
  fecha = "2026-09-25",
): FranjaOcupada => ({ fecha, desde, hasta, propia: false, numero });

describe("qué lavadora queda libre", () => {
  it("saca el número de la etiqueta que pinta el desplegable", () => {
    expect(numeroDelPuesto("Lavanderia N°2")).toBe(2);
    expect(numeroDelPuesto("Salon de eventos N°10")).toBe(10);
    // El nombre de la zona puede llevar números y no son el puesto.
    expect(numeroDelPuesto("Piscina 2 N°3")).toBe(3);
  });

  it("y devuelve null cuando no hay número que sacar", () => {
    expect(numeroDelPuesto("Piscina")).toBeNull();
    expect(numeroDelPuesto("")).toBeNull();
    expect(numeroDelPuesto(null)).toBeNull();
    expect(numeroDelPuesto(undefined)).toBeNull();
  });

  it("tocarse por un extremo no es pisarse", () => {
    // Quien reserva de 06:00 a 07:00 deja la lavadora libre a las 07:00.
    expect(
      seSolapan({ desde: "06:00", hasta: "07:00" }, { desde: "07:00", hasta: "08:00" }),
    ).toBe(false);
    expect(
      seSolapan({ desde: "06:00", hasta: "07:00" }, { desde: "06:30", hasta: "07:30" }),
    ).toBe(true);
  });

  it("los ocupados son los del día y el tramo, sin repetir", () => {
    const ocupacion = [
      franja("06:00", "07:00", 1),
      franja("06:30", "07:30", 3),
      // Otro día: no estorba.
      franja("06:00", "07:00", 2, "2026-09-26"),
      // Otra hora del mismo día: tampoco.
      franja("09:00", "10:00", 4),
      // La misma lavadora otra vez, solapando: no se cuenta dos veces.
      franja("06:15", "06:45", 1),
    ];
    expect(
      puestosOcupados(ocupacion, "2026-09-25", { desde: "06:00", hasta: "07:00" }),
    ).toEqual([1, 3]);
  });

  it("una reserva vieja sin número no bloquea ninguna lavadora", () => {
    /*
      Las reservas anteriores a la migracion tienen `numero_recurso` nulo. Que
      ocupen "alguna" lavadora ya lo impone el disparador de cupos, que cuenta
      reservas. Bloquear una concreta seria inventarse cual.
    */
    expect(
      puestosOcupados([franja("06:00", "07:00", null)], "2026-09-25", {
        desde: "06:00",
        hasta: "07:00",
      }),
    ).toEqual([]);
  });

  it("el desplegable ofrece las que quedan", () => {
    expect(
      puestosDisponibles({ nombreZona: "Lavanderia", puestos: 4, ocupados: [1, 3] }),
    ).toEqual(["Lavanderia N°2", "Lavanderia N°4"]);
  });

  it("y no ofrece nada cuando están las cuatro cogidas", () => {
    expect(
      puestosDisponibles({
        nombreZona: "Lavanderia",
        puestos: 4,
        ocupados: [1, 2, 3, 4],
      }),
    ).toEqual([]);
  });

  it("el viaje entero: lo que se ofrece se puede elegir", () => {
    // Lo que sale del desplegable tiene que volver a ser un numero valido; si
    // la etiqueta y el parseo se separaran, se mandaria `null` y la reserva
    // quedaria otra vez sin puesto, que es el defecto de partida.
    const etiquetas = puestosDisponibles({
      nombreZona: "Lavanderia",
      puestos: 4,
      ocupados: [2],
    });
    expect(etiquetas.map(numeroDelPuesto)).toEqual([1, 3, 4]);
  });
});

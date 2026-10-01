import { describe, expect, it } from "vitest";
import { comoFiltro, diaEnLetra, enISO, tiraDeDias } from "./tiraDeDias";

/** Viernes 25 de septiembre de 2026, a media tarde. */
const HOY = new Date(2026, 8, 25, 15, 30);

describe("la tira de días de una zona", () => {
  it("empieza hoy y no ofrece el pasado", () => {
    const dias = tiraDeDias(HOY, 5);
    expect(dias[0].iso).toBe("2026-09-25");
    expect(dias[0].esHoy).toBe(true);
    expect(dias.every((d) => d.iso >= "2026-09-25")).toBe(true);
  });

  it("son días seguidos, y cruza el fin de mes", () => {
    const dias = tiraDeDias(new Date(2026, 8, 29), 4);
    expect(dias.map((d) => d.iso)).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("trae lo que la píldora pinta: día de la semana y número", () => {
    const [hoy, manana] = tiraDeDias(HOY, 2);
    expect(hoy.diaSemana).toBe("vie");
    expect(hoy.diaMes).toBe(25);
    expect(manana.diaSemana).toBe("sáb");
    expect(manana.esManana).toBe(true);
    expect(hoy.esManana).toBe(false);
  });

  it("la fecha se arma en local, no en UTC", () => {
    /*
      `toISOString().slice(0,10)` daria el dia siguiente desde Colombia a
      partir de las 19:00: la tira empezaria en manana y el vecino no podria
      reservar hoy.
    */
    expect(enISO(new Date(2026, 8, 25, 23, 45))).toBe("2026-09-25");
    expect(enISO(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
});

/**
 * La tira no sustituye al filtro que ya había: lo alimenta. De `dayFilter`
 * sale también la lista de nombres de día con la que se filtran las reservas
 * del histórico, así que hoy y mañana tienen que seguir siendo «hoy» y
 * «manana» y no una fecha suelta equivalente.
 */
describe("cómo se traduce el día elegido al filtro de siempre", () => {
  it("hoy es «hoy»", () => {
    expect(comoFiltro(new Date(2026, 8, 25), HOY)).toEqual({
      dayFilter: "hoy",
      selectedDate: null,
    });
  });

  it("mañana es «manana»", () => {
    expect(comoFiltro(new Date(2026, 8, 26), HOY)).toEqual({
      dayFilter: "manana",
      selectedDate: null,
    });
  });

  it("y cualquier otro día es una fecha suelta, a medianoche", () => {
    const { dayFilter, selectedDate } = comoFiltro(
      new Date(2026, 9, 3, 18, 0),
      HOY,
    );
    expect(dayFilter).toBeNull();
    expect(enISO(selectedDate!)).toBe("2026-10-03");
    // A medianoche: si conservara la hora, comparar dias daria falsos.
    expect(selectedDate!.getHours()).toBe(0);
    expect(selectedDate!.getMinutes()).toBe(0);
  });

  it("la hora del día elegido no cambia la traducción", () => {
    // Pulsar «hoy» a las 23:50 sigue siendo hoy.
    expect(comoFiltro(new Date(2026, 8, 25, 23, 50), HOY).dayFilter).toBe("hoy");
  });
});

describe("el día escrito para leerlo", () => {
  it("dice «Hoy» y «Mañana», que es lo que se reserva casi siempre", () => {
    expect(diaEnLetra(new Date(2026, 8, 25), HOY)).toBe(
      "Hoy, viernes 25 de septiembre",
    );
    expect(diaEnLetra(new Date(2026, 8, 26), HOY)).toBe(
      "Mañana, sábado 26 de septiembre",
    );
  });

  it("y cualquier otro día, con su nombre en mayúscula", () => {
    expect(diaEnLetra(new Date(2026, 9, 3), HOY)).toBe("Sábado 3 de octubre");
    expect(diaEnLetra(new Date(2026, 11, 31), HOY)).toBe(
      "Jueves 31 de diciembre",
    );
  });
});

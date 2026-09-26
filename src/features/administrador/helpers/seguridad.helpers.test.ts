import { afterEach, describe, expect, it, vi } from "vitest";
import type { Guardia, Turno } from "@/shared/types";
import { formatRangoHoras, minutosDeHora } from "@/shared/utils";
import { FRANJAS_TURNO, franjaDeEtiqueta, hourRanges } from "../types";
import {
  isOnShift,
  shiftOfHour,
  turnoSolapaFranja,
} from "./seguridad.helpers";

/**
 * Si el guardia está trabajando ahora mismo.
 *
 * Esto no tenía ninguna prueba, y por eso el defecto duró: el turno se
 * guardaba como el texto «08:00 - 16:00» en un sitio y «08:00 a 16:00» en
 * otro, y las dos funciones que lo volvían a partir esperaban « a ». El borde
 * verde de la lista de la administración **no se encendía nunca**, para nadie,
 * y el `typecheck` y las 166 unitarias pasaban igual.
 *
 * Ahora el turno son dos horas. Estas pruebas son las que habrían visto el
 * defecto: fijan la hora y preguntan por el resultado, no por el formato.
 */

const turno = (dia: string, horaInicio: string, horaFin: string): Turno => ({
  dia,
  horaInicio,
  horaFin,
});

const guardiaCon = (...turnos: Turno[]): Guardia =>
  ({
    id: 1,
    nombre: "Roberto",
    correo: "",
    cedula: "",
    diasCalendario: "",
    garita: "",
    turnos,
  }) as Guardia;

/** Un lunes. `getDay()` de 2026-09-28 es 1. */
const enElReloj = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
};

afterEach(() => {
  vi.useRealTimers();
});

describe("isOnShift", () => {
  it("es verdadero dentro del turno del día", () => {
    enElReloj("2026-09-28T10:30:00");
    expect(isOnShift(guardiaCon(turno("Lunes", "08:00", "16:00")))).toBe(true);
  });

  it("es falso antes de empezar y después de acabar", () => {
    enElReloj("2026-09-28T07:59:00");
    expect(isOnShift(guardiaCon(turno("Lunes", "08:00", "16:00")))).toBe(false);

    vi.setSystemTime(new Date("2026-09-28T16:00:00"));
    // La hora de fin ya no cuenta: a las 16:00 el turno terminó.
    expect(isOnShift(guardiaCon(turno("Lunes", "08:00", "16:00")))).toBe(false);
  });

  it("es falso si el turno es de otro día, aunque la hora cuadre", () => {
    enElReloj("2026-09-28T10:30:00");
    expect(isOnShift(guardiaCon(turno("Martes", "08:00", "16:00")))).toBe(false);
  });

  it("cuenta un turno que cruza la medianoche, a los dos lados", () => {
    /*
      El turno de noche —22:00 a 06:00— acaba con una hora de fin **menor** que
      la de inicio. Comparar «está entre las dos» lo deja fuera siempre, que es
      justo el turno en el que más importa saber quién está.
    */
    const noche = guardiaCon(turno("Lunes", "22:00", "06:00"));

    enElReloj("2026-09-28T23:30:00");
    expect(isOnShift(noche)).toBe(true);

    vi.setSystemTime(new Date("2026-09-28T02:00:00"));
    expect(isOnShift(noche)).toBe(true);

    vi.setSystemTime(new Date("2026-09-28T12:00:00"));
    expect(isOnShift(noche)).toBe(false);
  });

  it("la franja de noche llega hasta el final del día", () => {
    // `18:00 a 24:00` es una de las cuatro que ofrece el selector, y `24:00`
    // no es una hora que un reloj muestre nunca.
    enElReloj("2026-09-28T23:59:00");
    expect(isOnShift(guardiaCon(turno("Lunes", "18:00", "24:00")))).toBe(true);
  });

  it("un turno sin horas no pone a nadie a trabajar", () => {
    enElReloj("2026-09-28T10:30:00");
    expect(isOnShift(guardiaCon(turno("Lunes", "", "")))).toBe(false);
  });

  it("un guardia sin turnos nunca está en turno", () => {
    enElReloj("2026-09-28T10:30:00");
    expect(isOnShift(guardiaCon())).toBe(false);
  });
});

describe("shiftOfHour", () => {
  it("clasifica por la hora de entrada, no por el texto", () => {
    /*
      Antes comparaba `hora.startsWith("06:00")`: cualquier turno que no
      empezara exactamente a las 06:00 o a las 12:00 se clasificaba «Noche»,
      así que el filtro por franja dejaba fuera turnos de la mañana.
    */
    expect(shiftOfHour("06:00")).toBe("Mañana");
    expect(shiftOfHour("09:30")).toBe("Mañana");
    expect(shiftOfHour("12:00")).toBe("Tarde");
    expect(shiftOfHour("19:45")).toBe("Tarde");
    expect(shiftOfHour("22:00")).toBe("Noche");
    expect(shiftOfHour("03:00")).toBe("Noche");
  });
});

describe("las cuatro franjas del selector", () => {
  it("se leen con el mismo formato con el que se pintan los turnos", () => {
    // Si estos dos dejaran de coincidir, el selector mostraría un valor que no
    // corresponde a ninguna opción y aparecería vacío al editar.
    expect(hourRanges).toEqual([
      "00:00 - 06:00",
      "06:00 - 12:00",
      "12:00 - 18:00",
      "18:00 - 24:00",
    ]);
  });

  it("y cada etiqueta devuelve su par de horas", () => {
    for (const franja of FRANJAS_TURNO) {
      const etiqueta = formatRangoHoras(franja.horaInicio, franja.horaFin);
      expect(franjaDeEtiqueta(etiqueta)).toEqual(franja);
    }
  });

  it("una etiqueta que no es ninguna franja no inventa un turno", () => {
    // Era el caso real: el dato guardado decía «08:00 a 16:00» y el selector
    // ofrecía «08:00 - 16:00».
    expect(franjaDeEtiqueta("06:00 a 12:00")).toBeNull();
    expect(franjaDeEtiqueta("")).toBeNull();
  });
});

describe("turnoSolapaFranja", () => {
  const MANANA = { horaInicio: "06:00", horaFin: "12:00" };
  const MADRUGADA = { horaInicio: "00:00", horaFin: "06:00" };
  const NOCHE = { horaInicio: "18:00", horaFin: "24:00" };

  it("un turno que empieza dentro de la franja cuenta", () => {
    /*
      Antes se comparaba el rango con la etiqueta por igualdad de texto, asi que
      «06:00 - 14:00» no era «06:00 - 12:00» y el filtro de la manana no
      devolvia a este guardia, que trabaja justamente de manana.
    */
    expect(turnoSolapaFranja({ horaInicio: "06:00", horaFin: "14:00" }, MANANA)).toBe(true);
  });

  it("y uno que la cruza por completo, tambien", () => {
    expect(turnoSolapaFranja({ horaInicio: "05:00", horaFin: "20:00" }, MANANA)).toBe(true);
  });

  it("uno que acaba justo cuando la franja empieza, no", () => {
    // 01:00 a 06:00 no es un turno «de manana»: acaba cuando esta empieza.
    expect(turnoSolapaFranja({ horaInicio: "01:00", horaFin: "06:00" }, MANANA)).toBe(false);
    // Pero si es de madrugada.
    expect(turnoSolapaFranja({ horaInicio: "01:00", horaFin: "06:00" }, MADRUGADA)).toBe(true);
  });

  it("el turno de noche esta en las dos franjas que toca", () => {
    /*
      22:00 a 06:00 es el turno mas comun de una porteria y el que peor se
      lleva con cualquier comparacion ingenua: acaba «antes» de empezar.
    */
    const deNoche = { horaInicio: "22:00", horaFin: "06:00" };
    expect(turnoSolapaFranja(deNoche, NOCHE)).toBe(true);
    expect(turnoSolapaFranja(deNoche, MADRUGADA)).toBe(true);
    expect(turnoSolapaFranja(deNoche, MANANA)).toBe(false);
  });

  it("un turno sin horas no esta en ninguna franja", () => {
    expect(turnoSolapaFranja({ horaInicio: "", horaFin: "" }, MANANA)).toBe(false);
  });

  it("y cada franja del selector encuentra el turno que la llena", () => {
    for (const franja of FRANJAS_TURNO) {
      expect(turnoSolapaFranja(franja, franja)).toBe(true);
    }
  });
});

describe("formatRangoHoras", () => {
  it("compone el rango en un solo sitio", () => {
    expect(formatRangoHoras("08:00", "16:00")).toBe("08:00 - 16:00");
  });

  it("y no deja un guion suelto cuando falta una hora", () => {
    expect(formatRangoHoras("08:00", "")).toBe("08:00");
    expect(formatRangoHoras("", "")).toBe("");
  });
});

describe("minutosDeHora", () => {
  it("cuenta desde medianoche", () => {
    expect(minutosDeHora("00:00")).toBe(0);
    expect(minutosDeHora("08:30")).toBe(510);
    expect(minutosDeHora("24:00")).toBe(1440);
  });

  it("acepta la hora tal como la guarda Postgres", () => {
    // `time` vuelve como `08:30:00`.
    expect(minutosDeHora("08:30:00")).toBe(510);
  });

  it("y rechaza lo que no es una hora, en vez de devolver NaN", () => {
    /*
      Devolver `NaN` es lo que hacía que la comparación saliera falsa sin que
      nadie se enterara. Un `null` obliga a decidir qué hacer.
    */
    expect(minutosDeHora("")).toBeNull();
    expect(minutosDeHora("08:00 - 16:00")).toBe(480);
    expect(minutosDeHora("mañana")).toBeNull();
    expect(minutosDeHora("25:00")).toBeNull();
    expect(minutosDeHora("24:30")).toBeNull();
    expect(minutosDeHora("08:75")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  estaDeTurno,
  etiquetaDelPersonal,
  fechaMas,
  horaCorta,
  proximaEntrada,
  resumenDelHorario,
  textoDeProximaEntrada,
  type HorarioDelPersonal,
} from "./turnoDelPersonal";

// 17/11/2026 es martes.
const lunAVie: HorarioDelPersonal = {
  turnos: [1, 2, 3, 4, 5].map((dia) => ({ dia, inicio: "07:00", fin: "15:00" })),
  ajustes: [],
};
const nocheDelMartes: HorarioDelPersonal = {
  turnos: [{ dia: 2, inicio: "22:00", fin: "06:00" }],
  ajustes: [],
};

describe("estaDeTurno", () => {
  it("sin horario cargado cuenta como de turno", () => {
    expect(estaDeTurno({ turnos: [], ajustes: [] }, "2026-11-17T03:00:00")).toBe(true);
  });

  it("dentro y fuera de un turno de día", () => {
    expect(estaDeTurno(lunAVie, "2026-11-17T07:00:00")).toBe(true);
    expect(estaDeTurno(lunAVie, "2026-11-17T14:59:00")).toBe(true);
    expect(estaDeTurno(lunAVie, "2026-11-17T15:00:00")).toBe(false);
    expect(estaDeTurno(lunAVie, "2026-11-22T10:00:00")).toBe(false); // domingo
  });

  it("un turno que cruza la medianoche sigue al día siguiente, y solo entonces", () => {
    expect(estaDeTurno(nocheDelMartes, "2026-11-17T23:00:00")).toBe(true);
    expect(estaDeTurno(nocheDelMartes, "2026-11-18T05:59:00")).toBe(true);
    expect(estaDeTurno(nocheDelMartes, "2026-11-18T06:00:00")).toBe(false);
    // La madrugada del martes es la cola del lunes, que no trabaja.
    expect(estaDeTurno(nocheDelMartes, "2026-11-17T03:00:00")).toBe(false);
  });

  it("el ajuste del día manda sobre la semana", () => {
    const libre = { ...lunAVie, ajustes: [{ fecha: "2026-11-17", inicio: null, fin: null }] };
    expect(estaDeTurno(libre, "2026-11-17T10:00:00")).toBe(false);
    const tarde = {
      ...lunAVie,
      ajustes: [{ fecha: "2026-11-17", inicio: "16:00", fin: "20:00" }],
    };
    expect(estaDeTurno(tarde, "2026-11-17T10:00:00")).toBe(false);
    expect(estaDeTurno(tarde, "2026-11-17T17:00:00")).toBe(true);
  });

  it("un día libre por ajuste no corta la cola del turno de la noche anterior", () => {
    const h = {
      ...nocheDelMartes,
      ajustes: [{ fecha: "2026-11-18", inicio: null, fin: null }],
    };
    expect(estaDeTurno(h, "2026-11-18T05:00:00")).toBe(true);
  });
});

describe("textoDeProximaEntrada", () => {
  it("hoy, mañana o el día de la semana", () => {
    expect(textoDeProximaEntrada(lunAVie, "2026-11-17T05:00:00")).toBe("Entra hoy 7:00");
    expect(textoDeProximaEntrada(lunAVie, "2026-11-17T16:00:00")).toBe("Entra mañana 7:00");
    expect(textoDeProximaEntrada(lunAVie, "2026-11-21T09:00:00")).toBe("Entra el lunes 7:00");
    expect(textoDeProximaEntrada(nocheDelMartes, "2026-11-17T12:00:00")).toBe(
      "Entra hoy 22:00",
    );
  });

  it("se salta el día que un ajuste deja libre", () => {
    const h = { ...lunAVie, ajustes: [{ fecha: "2026-11-18", inicio: null, fin: null }] };
    expect(proximaEntrada(h, "2026-11-17T16:00:00")?.fecha).toBe("2026-11-19");
  });

  it("sin turnos no inventa una entrada", () => {
    expect(textoDeProximaEntrada({ turnos: [], ajustes: [] }, "2026-11-17T16:00:00")).toBeNull();
  });
});

describe("resumenDelHorario", () => {
  it("agrupa los días seguidos con las mismas horas", () => {
    expect(resumenDelHorario(lunAVie.turnos)).toBe("Turno: lun–vie 7:00–15:00");
  });

  it("días sueltos y varios horarios, de lunes a domingo", () => {
    expect(
      resumenDelHorario([
        { dia: 0, inicio: "08:00", fin: "12:00" },
        { dia: 1, inicio: "06:00", fin: "14:00" },
        { dia: 3, inicio: "06:00", fin: "14:00" },
        { dia: 6, inicio: "08:00", fin: "12:00" },
      ]),
    ).toBe("Turno: lun, mié 6:00–14:00 · sáb, dom 8:00–12:00");
  });

  it("sin turnos, nada", () => {
    expect(resumenDelHorario([])).toBeNull();
  });
});

describe("piezas", () => {
  it("horaCorta, fechaMas y la etiqueta", () => {
    expect(horaCorta("07:00")).toBe("7:00");
    expect(horaCorta("24:00")).toBe("24:00");
    expect(fechaMas("2026-12-31", 1)).toBe("2027-01-01");
    expect(fechaMas("2026-03-01", -1)).toBe("2026-02-28");
    expect(etiquetaDelPersonal("Conserje", "Federico Valverde")).toBe(
      "Conserje · Federico Valverde",
    );
  });
});

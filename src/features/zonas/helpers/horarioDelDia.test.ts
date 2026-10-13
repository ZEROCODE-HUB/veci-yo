import { describe, expect, it } from "vitest";
import { horarioDelDia, hoyLocalISO } from "./horarioDelDia";

const zona = {
  apertura: "08:00",
  cierre: "22:00",
  // De lunes a viernes.
  diasHabilitados: [1, 2, 3, 4, 5],
  fechasEspeciales: [
    { fecha: "2026-11-03", tipo: "cerrada", motivo: "Mantenimiento" },
    {
      fecha: "2026-11-07",
      tipo: "horario_especial",
      horaApertura: "10:00",
      horaCierre: "12:00",
    },
  ],
};

describe("cuándo abre una zona un día concreto", () => {
  it("un día de la semana que abre, con su horario", () => {
    // Lunes 2 de noviembre de 2026.
    const dia = horarioDelDia({ ...zona, diaISO: "2026-11-02", diaDeLaSemana: 1 });
    expect(dia).toMatchObject({ abre: true, apertura: "08:00", cierre: "22:00" });
  });

  it("un día de la semana que no abre", () => {
    const dia = horarioDelDia({ ...zona, diaISO: "2026-11-08", diaDeLaSemana: 0 });
    expect(dia.abre).toBe(false);
    expect(dia.motivo).toMatch(/día de la semana/);
  });

  it("una fecha cerrada, aunque ese día de la semana abra", () => {
    const dia = horarioDelDia({ ...zona, diaISO: "2026-11-03", diaDeLaSemana: 2 });
    expect(dia.abre).toBe(false);
    expect(dia.motivo).toMatch(/Mantenimiento/);
  });

  it("un horario especial manda, también en un día que no abriría", () => {
    // Sábado: no está entre los habilitados, y aun así abre de 10 a 12.
    const dia = horarioDelDia({ ...zona, diaISO: "2026-11-07", diaDeLaSemana: 6 });
    expect(dia).toMatchObject({ abre: true, apertura: "10:00", cierre: "12:00" });
  });

  it("sin lista de días, abre todos", () => {
    const dia = horarioDelDia({
      diaISO: "2026-11-08",
      diaDeLaSemana: 0,
      apertura: "08:00",
      cierre: "22:00",
    });
    expect(dia.abre).toBe(true);
  });
});

describe("el día de hoy del dispositivo", () => {
  it("no es el de Greenwich", () => {
    /*
      A las 20:00 en Bogotá ya es mañana en UTC. La grilla comparaba el día
      local con `toISOString()`: de noche dejaba de recortar las horas que ya
      pasaron de hoy y recortaba las de mañana.
    */
    const noche = new Date(2026, 9, 13, 21, 30);
    expect(hoyLocalISO(noche)).toBe("2026-10-13");
  });
});

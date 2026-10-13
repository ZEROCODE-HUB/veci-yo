import { formatDateInput } from "@/shared/utils";

/**
 * Cuándo abre una zona **un día concreto**.
 *
 * La zona tiene un horario, unos días de la semana en que abre y unas fechas
 * especiales --cerrada por mantenimiento, o con un horario distinto--. Hasta
 * el 13/10/2026 la grilla solo miraba el horario: ofrecía horas un día en que
 * la zona no abre. La base ya lo rechaza (`respetar_dias_de_la_zona`); esto
 * es para que la pantalla no ofrezca lo que la base va a negar, y diga por
 * qué.
 */
export interface FechaEspecial {
  /** `yyyy-MM-dd`. */
  fecha: string;
  tipo: string;
  motivo?: string;
  horaApertura?: string;
  horaCierre?: string;
}

export interface HorarioDelDia {
  /** Si se puede reservar ese día. */
  abre: boolean;
  /** Por qué no, dicho para quien mira la grilla. Vacío si abre. */
  motivo: string;
  apertura?: string;
  cierre?: string;
}

export function horarioDelDia(datos: {
  /** `yyyy-MM-dd`. */
  diaISO: string;
  /** 0 es domingo, como en la base y en `Date.getDay()`. */
  diaDeLaSemana: number;
  apertura?: string;
  cierre?: string;
  /** Los días de la semana en que abre. Sin lista, todos. */
  diasHabilitados?: number[];
  fechasEspeciales?: FechaEspecial[];
}): HorarioDelDia {
  const especial = datos.fechasEspeciales?.find(
    (f) => f.fecha === datos.diaISO,
  );

  if (especial?.tipo === "cerrada") {
    return {
      abre: false,
      motivo: especial.motivo
        ? `La zona está cerrada ese día: ${especial.motivo}.`
        : "La zona está cerrada ese día.",
    };
  }

  // Una fecha con horario propio manda sobre el día de la semana.
  if (especial?.tipo === "horario_especial") {
    return {
      abre: true,
      motivo: "",
      apertura: especial.horaApertura,
      cierre: especial.horaCierre,
    };
  }

  if (
    datos.diasHabilitados &&
    !datos.diasHabilitados.includes(datos.diaDeLaSemana)
  ) {
    return { abre: false, motivo: "La zona no abre ese día de la semana." };
  }

  return {
    abre: true,
    motivo: "",
    apertura: datos.apertura,
    cierre: datos.cierre,
  };
}

/** El día de hoy **del dispositivo**, en `yyyy-MM-dd`. */
export function hoyLocalISO(ahora: Date = new Date()): string {
  return formatDateInput(ahora);
}

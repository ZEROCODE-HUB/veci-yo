import { z } from "zod";

const turnoSchema = z.object({
  uuid: z.string().optional(),
  dia: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
});

const base = z.object({
    nombre: z.string().trim().min(1, "Escribe el nombre"),
    correo: z.string().trim(),
    cedula: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || /^[A-Za-z0-9.\- ]{4,20}$/.test(v),
        "Revisa el documento: entre 4 y 20 letras o números",
      ),
    diasCalendario: z.string(),
    turnos: z.array(turnoSchema),
    garita: z.string(),
    permisoChat: z.boolean().optional(),
    permisoLlamadas: z.boolean().optional(),
    rotacionActiva: z.boolean().optional(),
    tipoRotacion: z.string().optional(),
    overrides: z
      .array(
        z.object({
          fecha: z.string(),
          horaInicio: z.string(),
          horaFin: z.string(),
        }),
      )
      .optional(),
  });

/**
 * El formulario de un guardia, según sea un alta o una edición.
 *
 * Era un solo esquema que exigía correo **y** un horario siempre. Al editar,
 * el correo llega vacío --la administración no ve el de quien ya es miembro--
 * así que «Continuar» no pasaba hasta inventarse uno, que luego se tiraba. Y
 * al dar de alta se pedía un horario que no se podía guardar: hasta que la
 * persona acepta no hay membresía a la que colgárselo (13/10/2026).
 */
export function guardiaSchemaPara(esAlta: boolean) {
  return base.superRefine((data, context) => {
    if (esAlta) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.correo)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correo"],
          message: data.correo
            ? "Ese correo no parece válido"
            : "Escribe el correo",
        });
      }
      return;
    }
    const completos = data.turnos.filter((t) => t.dia || t.horaInicio);
    if (completos.some((t) => !t.dia || !t.horaInicio)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["turnos"],
        message: "A cada horario le falta el día o la hora.",
      });
    }
    const claves = completos.map((t) => `${t.dia} ${t.horaInicio}`);
    if (new Set(claves).size !== claves.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["turnos"],
        message: "Hay un día y hora repetidos.",
      });
    }
  });
}

// «24:00» es el final del día: el selector lo ofrece y Postgres lo admite.
const HORA = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

/**
 * El ajuste de un día concreto. Sin horas significa que ese día no trabaja.
 *
 * Eran tres campos de texto sin ninguna regla: «mañana» como fecha y «8» como
 * hora pasaban. No se notaba porque el ajuste **no se guardaba en ningún
 * sitio**; al conectarlo irían derechos a una columna `date` y dos `time`.
 */
export const turnoOverrideSchema = z
  .object({
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha"),
    horaInicio: z.string(),
    horaFin: z.string(),
  })
  .superRefine((data, context) => {
    const { horaInicio, horaFin } = data;
    if (!horaInicio && !horaFin) return;
    if (!HORA.test(horaInicio) || !HORA.test(horaFin)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["horaFin"],
        message: "Elige las dos horas, o ninguna si ese día no trabaja",
      });
      return;
    }
    if (horaInicio === horaFin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["horaFin"],
        message: "La salida no puede ser a la misma hora que la entrada",
      });
    }
  });

export const recurringScheduleSchema = z
  .object({
    horaInicio: z.string().min(1, "Elige la hora de entrada"),
    horaFin: z.string().min(1, "Elige la hora de salida"),
    tipoRotacion: z.string(),
  })
  /*
    `horaFin` no pedia nada, asi que se podia guardar un turno con hora de
    entrada y sin salida --y entonces no hay forma de saber si el guardia esta
    trabajando: es lo que hacia que el borde verde no se encendiera--.

    Un turno de noche si puede acabar «antes» de empezar, porque cruza la
    medianoche; lo que no puede es acabar a la misma hora, que seria un turno de
    cero minutos.
  */
  .refine((datos) => datos.horaInicio !== datos.horaFin, {
    path: ["horaFin"],
    message: "La salida no puede ser a la misma hora que la entrada",
  });

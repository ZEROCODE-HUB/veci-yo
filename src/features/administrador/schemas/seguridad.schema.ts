import { z } from "zod";

const turnoSchema = z.object({
  uuid: z.string().optional(),
  dia: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
});

export const guardiaSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es requerido"),
    correo: z.string().trim().min(1, "El correo es requerido"),
    cedula: z.string(),
    diasCalendario: z.string(),
    turnos: z.array(turnoSchema).min(1),
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
  })
  .superRefine((data, context) => {
    if (!data.turnos.some((turno) => turno.horaInicio)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["turnos"],
        message: "Completa el nombre, correo y al menos un horario.",
      });
    }
  });

export const turnoOverrideSchema = z.object({
  fecha: z.string().min(1),
  horaInicio: z.string(),
  horaFin: z.string(),
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

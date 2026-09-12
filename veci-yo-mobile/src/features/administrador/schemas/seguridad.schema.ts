import { z } from "zod";

const turnoSchema = z.object({
  dia: z.string(),
  hora: z.string(),
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
    if (!data.turnos.some((turno) => turno.hora)) {
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

export const recurringScheduleSchema = z.object({
  horaInicio: z.string().min(1),
  horaFin: z.string(),
  tipoRotacion: z.string(),
});

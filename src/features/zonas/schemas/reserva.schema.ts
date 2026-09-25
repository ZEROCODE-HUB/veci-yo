import { z } from "zod";

export const participantTypes = [
  "Residente",
  "Visitante",
  "Huésped Temporal",
] as const;

export const reservaZonaSchema = z.object({
  hora: z.string().min(1, "Seleccione una hora"),
  duracion: z.string().min(1, "Seleccione una duración"),
  numero: z.string().optional(),
  fecha: z.date(),
  peopleCount: z.string().optional(),
  asistentes: z.array(
    z.object({
      nombre: z.string(),
      tipoParticipante: z.enum(participantTypes),
    }),
  ),
  comments: z.string().optional(),
  depto: z.string().min(1, "El departamento es requerido"),
  /*
    Aqui estaba `chargeMaintenance`, el interruptor de «el costo se carga a su
    cuota de mantenimiento». No se leia en ningun sitio --ni en el guardado ni
    en ninguna cuenta-- y encima le salia al huesped temporal, que no paga
    cuota. Cobrar una reserva en la cuota es trabajo nuevo, no un booleano.
  */
  acceptTerms: z
    .boolean()
    .refine(Boolean, "Debe aceptar los términos y condiciones"),
});

export type ReservaZonaFormData = z.infer<typeof reservaZonaSchema>;

import { z } from "zod";

export const participantTypes = [
  "Residente",
  "Visitante",
  "Huésped Temporal",
] as const;

/**
 * `pideNumero` es si la zona tiene más de un puesto --cuatro lavadoras-- y por
 * tanto hay que elegir cuál. Es un parámetro y no un campo fijo porque la
 * piscina es una sola y ahí no hay nada que elegir.
 *
 * Era `z.string().optional()` **siempre**, así que se podía reservar sin
 * elegir lavadora. Y el fallo era invisible: desde que la base asigna el
 * primer puesto libre a quien llega sin número, la reserva salía bien.
 */
export const construirReservaZonaSchema = (pideNumero: boolean) =>
  z.object({
  hora: z.string().min(1, "Seleccione una hora"),
  /*
    Aqui estaba `duracion`. Su valor **no se usaba al guardar** --la hora de
    fin sale de partir el texto de la franja-- y el desplegable ya se quito de
    la pantalla.
  */
  numero: pideNumero
    ? z.string().min(1, "Seleccione el número")
    : z.string().optional(),
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
    .refine(Boolean, "Debe aceptar el reglamento de la zona"),
  });

/** La forma de los datos no cambia con `pideNumero`; solo su validación. */
export const reservaZonaSchema = construirReservaZonaSchema(false);

export type ReservaZonaFormData = z.infer<typeof reservaZonaSchema>;

import { z } from 'zod';

export const visitaSchema = z.object({
  tipo: z.enum(['amigos', 'temporal', 'permanente', 'huesped-temporal']),
  nombre: z.string().min(1, 'Nombre requerido'),
  ci: z.string().optional(),
  tipoId: z.string().optional(),
  email: z.string().optional(),
  telefono: z.string().optional(),
  profesion: z.string().optional(),
  profesionOtro: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  horaInicio: z.string().optional(),
  horaFin: z.string().optional(),
  horaSalidaInicio: z.string().optional(),
  horaSalidaFin: z.string().optional(),
  tieneVehiculo: z.boolean(),
  cantidadVehiculos: z.number().optional(),
  personas: z.number().optional(),
  cantidadMenores: z.number().optional(),
  torre: z.string().optional(),
  depto: z.string().optional(),
  tipoNotificacion: z.enum(['solo-notificar', 'notificar-y-anunciar']).optional(),
  aprobadoPor: z.string().optional(),
  anotacionesGuardia: z.string().optional(),
});

export type VisitaFormData = z.infer<typeof visitaSchema>;

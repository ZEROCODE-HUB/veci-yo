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
  /*
    Aqui habia `tipoNotificacion`, con los dos valores en el vocabulario del
    cliente --guion medio-- y **sin usar en ningun sitio**: no lo llenaba ningun
    formulario ni lo leia nadie. Lo que de verdad viaja es `aviso`, que el
    repositorio inserta ya con el valor del enum (`solo_notificar`).

    Se quito el 29/09/2026 al cruzar los enums del esquema con la aplicacion. Un
    campo asi es peor que inutil: el dia que alguien lo rellene, se encontrara
    con que no llega a ninguna parte.
  */
  aprobadoPor: z.string().optional(),
  anotacionesGuardia: z.string().optional(),
});

export type VisitaFormData = z.infer<typeof visitaSchema>;

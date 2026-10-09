import { z } from 'zod';

export const visitaSchema = z.object({
  tipo: z.enum(['amigos', 'temporal', 'permanente', 'huesped-temporal']),
  /*
    Vacio se admite, y la regla de abajo decide cuando. En una estancia de
    huesped el nombre lo pone **el huesped** al abrir su preregistro --decision
    del cliente del 02/10/2026-- y muchas reservas entran por el calendario de
    Airbnb, que tampoco lo manda.

    Estaba `min(1)` sin condicion, asi que el anfitrion no podia reservar sin
    inventarse un nombre: `useVisitasNuevo` se saltaba su propia comprobacion
    para la estancia --con su comentario explicandolo-- y el esquema la
    rechazaba igual dos lineas despues. La decision vivia en dos sitios y solo
    uno estaba al dia.
  */
  nombre: z.string(),
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
}).superRefine((datos, ctx) => {
  if (datos.tipo !== 'huesped-temporal' && !datos.nombre.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nombre'],
      message: 'Nombre requerido',
    });
  }
});

export type VisitaFormData = z.infer<typeof visitaSchema>;

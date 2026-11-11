-- Las columnas de cinco tablas del 30/10/2026 no decían para qué sirven
-- (11/11/2026). Lo encontró `los-parametros-se-explican-solos.test.ts`, que no
-- había podido correr desde que se vació la base el 29/10. Solo aditiva: solo
-- descripciones.

comment on column public.abono_cuota.id is 'Identificador del abono.';
comment on column public.abono_cuota.cuota_id is 'La cuota de administración a la que se abona.';
comment on column public.abono_cuota.unidad_id is 'La vivienda que paga.';
comment on column public.abono_cuota.monto is 'Lo que se pagó en este abono, en la moneda de la cuota. Siempre mayor que cero.';
comment on column public.abono_cuota.pagado_en is 'El día en que se pagó.';
comment on column public.abono_cuota.origen is 'Cómo llegó el pago: anotado a mano, carga masiva, etc.';
comment on column public.abono_cuota.registrado_por is 'Quién anotó el abono.';
comment on column public.abono_cuota.created_at is 'Cuándo se anotó.';
comment on column public.abono_cuota.updated_at is 'Última vez que se cambió.';

comment on column public.anotacion_visita.id is 'Identificador de la anotación.';
comment on column public.anotacion_visita.visita_id is 'La visita sobre la que se anota.';
comment on column public.anotacion_visita.texto is 'Lo que se anotó. Puede ir vacío si hay archivos.';
comment on column public.anotacion_visita.archivos is 'Las fotos o archivos que acompañan la anotación (rutas en el almacenamiento).';
comment on column public.anotacion_visita.creada_por is 'Quién escribió la anotación.';
comment on column public.anotacion_visita.created_at is 'Cuándo se anotó.';
comment on column public.anotacion_visita.updated_at is 'Última vez que se cambió.';

comment on column public.importe_variable_cuota.id is 'Identificador del importe.';
comment on column public.importe_variable_cuota.cuota_id is 'La cuota de administración cuyo importe cambia para esta vivienda.';
comment on column public.importe_variable_cuota.unidad_id is 'La vivienda que paga un importe distinto del general.';
comment on column public.importe_variable_cuota.monto is 'Lo que le toca pagar a esta vivienda ese mes. Siempre mayor que cero.';
comment on column public.importe_variable_cuota.created_at is 'Cuándo se puso.';
comment on column public.importe_variable_cuota.updated_at is 'Última vez que se cambió.';

comment on column public.invitacion_espacio.id is 'Identificador del espacio invitado.';
comment on column public.invitacion_espacio.invitacion_id is 'La invitación de propietario que trae este espacio.';
comment on column public.invitacion_espacio.estacionamiento_id is 'El estacionamiento que se ofrece. Va este o el depósito, nunca los dos.';
comment on column public.invitacion_espacio.deposito_id is 'El depósito que se ofrece. Va este o el estacionamiento, nunca los dos.';
comment on column public.invitacion_espacio.estado is 'Si quien recibe la invitación aceptó o rechazó este espacio.';
comment on column public.invitacion_espacio.resuelto_en is 'Cuándo lo aceptó o lo rechazó.';
comment on column public.invitacion_espacio.created_at is 'Cuándo se ofreció.';
comment on column public.invitacion_espacio.updated_at is 'Última vez que se cambió.';

comment on column public.prorroga_turno.id is 'Identificador de la prórroga.';
comment on column public.prorroga_turno.condominio_id is 'El edificio del guardia.';
comment on column public.prorroga_turno.membresia_id is 'El guardia que pide seguir trabajando después de su turno.';
comment on column public.prorroga_turno.solicitada_por is 'Quién pidió la prórroga.';
comment on column public.prorroga_turno.hasta is 'Hasta cuándo pide quedarse.';
comment on column public.prorroga_turno.motivo is 'Por qué la pide. Obligatorio.';
comment on column public.prorroga_turno.estado is 'Pendiente, aprobada o rechazada por la administración.';
comment on column public.prorroga_turno.resuelta_por is 'Quién de la administración la aprobó o la rechazó.';
comment on column public.prorroga_turno.resuelta_en is 'Cuándo se resolvió.';
comment on column public.prorroga_turno.created_at is 'Cuándo se pidió.';
comment on column public.prorroga_turno.updated_at is 'Última vez que se cambió.';

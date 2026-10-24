-- Las columnas de la mascota y de los descuentos se explican (23/10/2026).
--
-- `los-parametros-se-explican-solos` exige que toda columna diga para qué
-- sirve. Las de `mascota_visita` y `codigo_descuento`, creadas hoy, salieron
-- sin descripción.

comment on column public.mascota_visita.id is 'Identificador de la mascota anotada en una visita.';
comment on column public.mascota_visita.visita_id is 'La visita o estancia en la que viene la mascota.';
comment on column public.mascota_visita.tipo is 'Qué animal es (perro, gato u otra mascota).';
comment on column public.mascota_visita.nombre is 'Cómo se llama, si se dijo; lo ve la portería al dejarla entrar.';
comment on column public.mascota_visita.created_at is 'Cuándo se anotó.';
comment on column public.mascota_visita.updated_at is 'Última vez que se cambió.';

comment on column public.codigo_descuento.id is 'Identificador del código de descuento.';
comment on column public.codigo_descuento.codigo is 'Lo que escribe el anfitrión al suscribirse a la renta corta, en mayúsculas.';
comment on column public.codigo_descuento.porcentaje is 'Cuánto se descuenta del precio del plan, en porcentaje.';
comment on column public.codigo_descuento.activo is 'Apagado, el código deja de aceptarse aunque no haya vencido ni agotado sus usos.';
comment on column public.codigo_descuento.creado_por is 'Quién del equipo de la plataforma lo creó.';
comment on column public.codigo_descuento.created_at is 'Cuándo se creó.';
comment on column public.codigo_descuento.updated_at is 'Última vez que se cambió.';

comment on column public.periodo_suscripcion.codigo_descuento_id is 'El código de descuento aplicado a este periodo, si hubo; el importe ya lo trae descontado.';

-- ============================================================================
-- Las columnas que faltaba describir (18/11/2026)
-- ============================================================================
-- `los-parametros-se-explican-solos` exige que cada columna diga para qué
-- sirve. Faltaban las de las tablas nuevas del 17 y el 18/11/2026. Solo
-- comentarios: no cambia nada.

comment on column public.nivel_estacionamiento.id is 'Identificador del nivel (sótano) de estacionamientos.';
comment on column public.nivel_estacionamiento.condominio_id is 'El edificio al que pertenece el nivel.';
comment on column public.nivel_estacionamiento.nombre is 'Cómo se llama el nivel: «Sótano 1».';
comment on column public.nivel_estacionamiento.nomenclatura is 'El prefijo de los códigos de sus estacionamientos: «S1».';
comment on column public.nivel_estacionamiento.orden is 'En qué orden se muestra entre los niveles del edificio.';
comment on column public.nivel_estacionamiento.created_at is 'Cuándo se creó.';
comment on column public.nivel_estacionamiento.updated_at is 'Cuándo se cambió por última vez.';

comment on column public.pago_vivienda.id is 'Identificador del pago.';
comment on column public.pago_vivienda.unidad_id is 'La vivienda que pagó.';
comment on column public.pago_vivienda.monto is 'Cuánto se pagó, en la moneda del edificio. Se reparte desde la cuota más antigua.';
comment on column public.pago_vivienda.origen is 'De dónde salió el pago: carga de la administración, carga masiva…';
comment on column public.pago_vivienda.pagado_en is 'Cuándo se pagó.';
comment on column public.pago_vivienda.registrado_por is 'Quién lo registró.';
comment on column public.pago_vivienda.created_at is 'Cuándo se anotó.';
comment on column public.pago_vivienda.updated_at is 'Cuándo se cambió por última vez.';

comment on column public.paso_descartado.id is 'Identificador.';
comment on column public.paso_descartado.usuario_id is 'Quién quitó el paso de su tarjeta de inicio.';
comment on column public.paso_descartado.paso is 'El paso que quitó («contacto», «vehiculos»…), o «tarjeta» si ocultó la tarjeta entera.';
comment on column public.paso_descartado.created_at is 'Cuándo lo quitó.';
comment on column public.paso_descartado.updated_at is 'Cuándo se cambió por última vez.';

comment on column public.reserva_zona_accion.id is 'Identificador de la línea del historial.';
comment on column public.reserva_zona_accion.reserva_id is 'La reserva de zona común.';
comment on column public.reserva_zona_accion.accion is 'Qué pasó: creada, editada, aprobada, rechazada, cancelada, adjunto, terminada.';
comment on column public.reserva_zona_accion.hecha_por is 'Quién lo hizo. Vacío: la base (la cancelación automática).';
comment on column public.reserva_zona_accion.antes is 'Cómo estaba la reserva antes (estado, fecha, horario, personas, número).';
comment on column public.reserva_zona_accion.despues is 'Cómo quedó.';
comment on column public.reserva_zona_accion.created_at is 'Cuándo pasó.';
comment on column public.reserva_zona_accion.updated_at is 'Cuándo se cambió por última vez.';

comment on column public.trabajador_de_la_vivienda.id is 'Identificador del profesional permanente en esa vivienda.';
comment on column public.trabajador_de_la_vivienda.unidad_id is 'La vivienda donde trabaja.';
comment on column public.trabajador_de_la_vivienda.nombre is 'Su nombre, como lo registró la vivienda.';
comment on column public.trabajador_de_la_vivienda.created_at is 'Cuándo se registró.';
comment on column public.trabajador_de_la_vivienda.updated_at is 'Cuándo se cambió por última vez.';
comment on column public.trabajador_de_la_vivienda.deleted_at is 'Cuándo se dio de baja; vacío mientras trabaja ahí.';

comment on column public.zona_recurso.id is 'Identificador.';
comment on column public.zona_recurso.zona_id is 'La zona común (parrillas, lavadoras…).';
comment on column public.zona_recurso.numero is 'El número de esa zona entre las iguales: el que guarda la reserva (`numero_recurso`).';
comment on column public.zona_recurso.nombre is 'El nombre que le puso la administración: «Parrilla Terraza».';
comment on column public.zona_recurso.created_at is 'Cuándo se creó.';
comment on column public.zona_recurso.updated_at is 'Cuándo se cambió por última vez.';

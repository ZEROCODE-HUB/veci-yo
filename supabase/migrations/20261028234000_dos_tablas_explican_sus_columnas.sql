-- Dos tablas del 28/10/2026 nacieron sin explicar todas sus columnas, y la
-- prueba `los-parametros-se-explican-solos` lo pide. Aditiva: solo comentarios.

comment on column public.dispositivo_voip.id is 'Identificador de la fila.';
comment on column public.dispositivo_voip.usuario_id is 'De quién es el iPhone.';
comment on column public.dispositivo_voip.created_at is 'Cuándo se apuntó el token.';
comment on column public.dispositivo_voip.updated_at is 'Cuándo se cambió por última vez.';

comment on column public.envio_reporte_mensual.id is 'Identificador de la fila.';
comment on column public.envio_reporte_mensual.condominio_id is 'El edificio al que se le mandaron los reportes.';
comment on column public.envio_reporte_mensual.periodo is 'El mes reportado: su primer día.';
comment on column public.envio_reporte_mensual.destinatarios is 'A cuántas personas se les mandó.';
comment on column public.envio_reporte_mensual.error is 'Qué falló al mandarlo, si falló. Vacío = salió bien.';
comment on column public.envio_reporte_mensual.created_at is 'Cuándo se mandó.';
comment on column public.envio_reporte_mensual.updated_at is 'Cuándo se cambió por última vez.';

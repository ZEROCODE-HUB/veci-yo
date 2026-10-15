-- Los avisos de la estancia para el anfitrion (14/10/2026). Cada uno en su
-- `add value`; van solos en su archivo porque no se pueden usar en la misma
-- transaccion en que se crean.
alter type public.motivo_notificacion add value if not exists 'huesped_salida_parcial';
alter type public.motivo_notificacion add value if not exists 'huesped_salida';
alter type public.motivo_notificacion add value if not exists 'verificacion_requiere_revision';
alter type public.motivo_notificacion add value if not exists 'menor_por_revisar';
alter type public.motivo_notificacion add value if not exists 'preregistro_incompleto';

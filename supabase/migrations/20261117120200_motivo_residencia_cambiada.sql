-- Un motivo de aviso nuevo (17/11/2026): al propietario se le marca como no
-- residente porque su vivienda tiene ahora inquilino líder (ver
-- 20261117120201_inquilino_lider_marca_al_propietario_no_residente.sql).
-- Va en su propio archivo porque un valor nuevo de un enum no se puede usar
-- en la misma transacción que lo crea. Solo aditiva.
alter type public.motivo_notificacion add value if not exists 'residencia_cambiada';

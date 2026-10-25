-- El motivo de aviso para los servicios de la vivienda.
--
-- Va en su propia migración: un valor nuevo de un enum no se puede usar en la
-- misma transacción que lo crea, y la siguiente lo usa.
alter type public.motivo_notificacion add value if not exists 'servicio_por_pagar';

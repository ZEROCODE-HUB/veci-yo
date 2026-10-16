-- Motivo de aviso: una llamada a portería que nadie contestó (15/10/2026,
-- hueco 16). En archivo aparte: un valor nuevo de enum no se puede usar en la
-- misma transacción que lo crea.
alter type public.motivo_notificacion add value if not exists 'llamada_perdida';

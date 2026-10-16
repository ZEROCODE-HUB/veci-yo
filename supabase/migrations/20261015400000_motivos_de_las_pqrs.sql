-- Motivos de aviso de las PQRS (15/10/2026, hueco 14). En archivo aparte: un
-- valor nuevo de enum no se puede usar en la misma transacción que lo crea.
alter type public.motivo_notificacion add value if not exists 'reclamo_nuevo';
alter type public.motivo_notificacion add value if not exists 'reclamo_respondido';

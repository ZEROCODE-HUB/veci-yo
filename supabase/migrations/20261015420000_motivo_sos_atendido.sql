-- Motivo de aviso: el S.O.S. que activé ya lo atendieron (15/10/2026, hueco
-- 15). En archivo aparte: un valor nuevo de enum no se puede usar en la misma
-- transacción que lo crea.
alter type public.motivo_notificacion add value if not exists 'sos_atendido';

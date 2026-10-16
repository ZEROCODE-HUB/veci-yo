-- Motivo de aviso para la portería: el anfitrión ya revisó al menor que ella
-- dejó en espera (15/10/2026, hueco 18). En archivo aparte: un valor nuevo de
-- enum no se puede usar en la misma transacción que lo crea.
alter type public.motivo_notificacion add value if not exists 'menor_revisado';

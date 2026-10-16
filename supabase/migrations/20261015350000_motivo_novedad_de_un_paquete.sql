-- Motivo de aviso para una novedad con un paquete (15/10/2026, hueco 27).
-- En archivo aparte: un valor nuevo de enum no se puede usar en la misma
-- transacción que lo crea.
alter type public.motivo_notificacion add value if not exists 'correspondencia_incidencia';

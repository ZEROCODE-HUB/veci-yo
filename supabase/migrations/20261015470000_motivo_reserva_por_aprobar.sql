-- Motivo de aviso para la administración: una reserva espera su aprobación, o
-- le llegó el comprobante (15/10/2026, hueco 10). En archivo aparte: un valor
-- nuevo de enum no se puede usar en la misma transacción que lo crea.
alter type public.motivo_notificacion add value if not exists 'reserva_por_aprobar';

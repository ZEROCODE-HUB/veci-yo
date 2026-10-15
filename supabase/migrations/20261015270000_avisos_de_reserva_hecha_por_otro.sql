-- Tres avisos nuevos de reservas (15/10/2026). Van solos en su archivo:
-- `alter type ... add value` no puede usarse en la misma transacción que lo
-- estrena.
alter type public.motivo_notificacion add value if not exists 'reserva_creada';
alter type public.motivo_notificacion add value if not exists 'reserva_cambiada';
alter type public.motivo_notificacion add value if not exists 'reserva_cancelada';

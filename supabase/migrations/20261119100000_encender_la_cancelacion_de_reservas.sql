-- ============================================================================
-- Se enciende la cancelación automática de reservas (19/11/2026)
-- ============================================================================
-- `cancelar_reservas_vencidas` (20261118200000) cada 15 minutos. Se dejó
-- apagada hasta publicar porque había dos reservas pendientes de noviembre en
-- un edificio real; el cliente pidió borrarlas, y se borraron antes.

do $$ begin
  perform cron.unschedule('reservas-vencidas');
exception when others then null; end $$;
select cron.schedule('reservas-vencidas', '*/15 * * * *', 'select public.cancelar_reservas_vencidas();');

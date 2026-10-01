-- ----------------------------------------------------------------------------
-- Un motivo de notificacion para el S.O.S.
-- ----------------------------------------------------------------------------
-- Va en su propia migracion porque un valor nuevo de enum no se puede usar en
-- la misma transaccion en que se agrega, y la migracion siguiente lo usa.
alter type public.motivo_notificacion add value if not exists 'sos_activado';

-- Como se cerro una alarma. "Llego el guardia" y "cancelar" son las dos
-- salidas que la pantalla ya ofrece; `sin_respuesta` la cierra la
-- administracion al revisar el historial.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cierre_sos') then
    create type public.cierre_sos as enum (
      'cancelada',
      'atendida',
      'sin_respuesta'
    );
  end if;
end
$$;

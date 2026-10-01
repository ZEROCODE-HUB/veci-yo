-- ----------------------------------------------------------------------------
-- Una zona que no requiere aprobación, no la requiere
-- ----------------------------------------------------------------------------
-- `zona_comun.requiere_aprobacion` es la última de las casillas decorativas.
-- En 20260922204000 se cerró la mitad peligrosa —quien pedía la reserva se la
-- aprobaba— pero la casilla en sí seguía sin leerse: **toda** reserva nace
-- `pendiente`, requiera aprobación la zona o no. Una zona marcada como que no
-- la requiere deja igualmente a la gente esperando a que alguien de la
-- administración la mire.
--
-- Marcar la casilla y no marcarla daban el mismo resultado, que es la
-- definición de decorativa.
--
-- Ahora una reserva en una zona sin aprobación nace aprobada. Eso obliga a
-- admitir una aprobación **sin actor**: no la decidió nadie, no había nada que
-- decidir. Rechazar, en cambio, es siempre decisión de alguien y sigue
-- exigiendo quién.

alter table public.reserva_zona
  drop constraint if exists reserva_zona_resuelta_con_actor;

alter table public.reserva_zona
  add constraint reserva_zona_resuelta_con_actor
    check (
      estado not in ('aprobada', 'rechazada')
      or (
        resuelta_en is not null
        -- Una aprobacion automatica no tiene quien; un rechazo, siempre.
        and (resuelta_por is not null or estado = 'aprobada')
      )
    );


create or replace function public.aprobar_reserva_sin_tramite()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requiere boolean;
begin
  -- Solo el alta, y solo si viene pendiente: si quien reserva es la
  -- administracion y ya la crea resuelta, se respeta.
  if new.estado is distinct from 'pendiente' then
    return new;
  end if;

  select z.requiere_aprobacion into v_requiere
  from public.zona_comun z where z.id = new.zona_id;

  if coalesce(v_requiere, false) then
    return new;
  end if;

  new.estado := 'aprobada';
  new.resuelta_en := coalesce(new.resuelta_en, now());
  -- `resuelta_por` se deja nulo a proposito: nadie la aprobo.
  return new;
end;
$$;

drop trigger if exists reserva_zona_sin_tramite on public.reserva_zona;

create trigger reserva_zona_sin_tramite
  before insert on public.reserva_zona
  for each row execute function public.aprobar_reserva_sin_tramite();

comment on function public.aprobar_reserva_sin_tramite() is
  'Una reserva en una zona que no requiere aprobacion nace aprobada, sin actor. Antes toda reserva nacia pendiente y la casilla no significaba nada.';

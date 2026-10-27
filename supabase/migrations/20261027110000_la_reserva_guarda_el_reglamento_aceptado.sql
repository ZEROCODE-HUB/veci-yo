-- ----------------------------------------------------------------------------
-- La reserva guarda el reglamento que se aceptó (27/10/2026)
-- ----------------------------------------------------------------------------
-- Hueco 41 del GSheet. Al reservar una zona común se marca «Acepto el
-- reglamento de la zona» y no quedaba nada: ni cuándo ni qué texto. Importa en
-- las zonas con fianza: si alguien discute un descuento, hace falta saber qué
-- reglamento estaba publicado el día que aceptó. El cliente: «guardemos igual
-- la versión del reglamento».
--
-- Se guarda el texto entero, copiado de la zona en el momento de reservar.
-- Lo copia la base, no la aplicación: quien reserva solo dice que acepta
-- (`reglamento_aceptado_en` con cualquier valor), y la base pone la hora del
-- servidor y el texto vigente. Después nadie lo cambia salvo la clave de
-- servicio. Solo aditiva.

alter table public.reserva_zona
  add column if not exists reglamento_aceptado_en timestamptz,
  add column if not exists reglamento_aceptado text;

comment on column public.reserva_zona.reglamento_aceptado_en is
  'Cuándo aceptó el reglamento de la zona quien reservó (hora del servidor). Nulo: no lo aceptó o la reserva es anterior al 27/10/2026.';
comment on column public.reserva_zona.reglamento_aceptado is
  'El texto del reglamento de la zona tal como estaba publicado al reservar. Lo copia la base; no se edita.';

create or replace function public.reserva_guarda_el_reglamento()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'UPDATE' then
    if auth.uid() is not null
       and (new.reglamento_aceptado_en is distinct from old.reglamento_aceptado_en
            or new.reglamento_aceptado is distinct from old.reglamento_aceptado) then
      raise exception 'El reglamento aceptado queda como constancia: no se cambia.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.reglamento_aceptado_en is null then
    new.reglamento_aceptado := null;
  else
    new.reglamento_aceptado_en := now();
    select nullif(trim(z.reglamento), '') into new.reglamento_aceptado
    from public.zona_comun z
    where z.id = new.zona_id;
  end if;
  return new;
end;
$function$;

comment on function public.reserva_guarda_el_reglamento() is
  'Al reservar, copia el reglamento vigente de la zona y pone la hora del servidor si quien reserva lo aceptó; después no se cambia. Hueco 41, 27/10/2026.';

drop trigger if exists reserva_zona_guarda_el_reglamento on public.reserva_zona;
create trigger reserva_zona_guarda_el_reglamento
  before insert or update of reglamento_aceptado_en, reglamento_aceptado on public.reserva_zona
  for each row execute function public.reserva_guarda_el_reglamento();

revoke execute on function public.reserva_guarda_el_reglamento() from public, anon, authenticated;

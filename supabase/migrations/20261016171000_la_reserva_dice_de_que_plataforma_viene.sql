-- ============================================================================
-- La reserva dice de qué plataforma viene
-- ============================================================================
-- La responsable de producto (16/10/2026): «logo de Airbnb o Booking si vienen
-- del calendario, o Directo si es nuestro», «que se pueda incluir una manual
-- pero de Airbnb, Booking o directo», y «fuente y método de ingreso del dato».
--
-- Son dos cosas y ya había una:
--   · el MÉTODO es `visita.origen` (`veciyo` = a mano, `calendario` = iCal);
--   · la FUENTE es la plataforma, que no existía.
--
-- Lo que llega del calendario se clasifica solo, por la dirección: la de la
-- propia reserva y, si no la trae (Booking no la manda), la del calendario de
-- la vivienda. Un disparador y no la función `sincronizar-calendario`, para
-- que valga venga por donde venga.

alter table public.visita
  add column if not exists plataforma public.plataforma_reserva;

comment on column public.visita.plataforma is
  'De donde viene la reserva (la fuente). El metodo de ingreso es `origen`. '
  'Lo elige el anfitrion al crearla a mano; lo del calendario se deduce de la '
  'direccion. Nula en lo anterior al 16/10/2026 y en lo que no es huesped.';

create or replace function public.plataforma_por_direccion(p_url text)
returns public.plataforma_reserva
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_url is null or btrim(p_url) = '' then null
    when p_url ~* 'airbnb\.' then 'airbnb'::public.plataforma_reserva
    when p_url ~* 'booking\.com' then 'booking'::public.plataforma_reserva
    else 'otra'::public.plataforma_reserva
  end;
$$;

create or replace function public.reserva_con_plataforma()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.tipo <> 'huesped_temporal' or new.plataforma is not null then
    return new;
  end if;

  if new.origen = 'calendario' then
    new.plataforma := coalesce(
      public.plataforma_por_direccion(new.calendario_url),
      public.plataforma_por_direccion(
        (select s.ical_url from public.suscripcion_renta_corta s
          where s.unidad_id = new.unidad_id)
      ),
      'otra'
    );
  else
    -- A mano y sin decir de dónde: es directa con el anfitrión.
    new.plataforma := 'directo';
  end if;
  return new;
end;
$fn$;

drop trigger if exists reserva_con_plataforma on public.visita;
create trigger reserva_con_plataforma
  before insert on public.visita
  for each row execute function public.reserva_con_plataforma();

-- Lo que ya hay: se clasifica igual. No se borra ni se cambia nada más.
update public.visita v
   set plataforma = case
     when v.origen = 'calendario' then coalesce(
       public.plataforma_por_direccion(v.calendario_url),
       public.plataforma_por_direccion(s.ical_url),
       'otra')
     else 'directo'
   end
  from public.visita v2
  left join public.suscripcion_renta_corta s on s.unidad_id = v2.unidad_id
 where v2.id = v.id
   and v.tipo = 'huesped_temporal'
   and v.plataforma is null;

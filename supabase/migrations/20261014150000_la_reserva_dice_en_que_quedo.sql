/*
  El enlace del preregistro dice en que quedo la reserva (14/10/2026).

  Lo pidio la responsable de producto: «considerar el caso en el que ya
  termino, mostrar que ya esta completa esa reservacion». Hasta hoy la web
  solo sabia decir «no vale», «vencio» o «ya esta hecho», y una reserva
  **cancelada** con el enlace todavia vigente seguia abierta: el huesped podia
  rellenar su ficha de una estancia que ya no existe.

  - `estado_de_la_reserva(token)` dice si esta cancelada, terminada, en curso
    o por llegar, y cuantos dias faltan, con el reloj del edificio. Sirve al
    enlace del titular y al de un acompanante.
  - Al cancelar una estancia, su enlace caduca en ese momento.

  Solo aditiva.
*/

create or replace function public.estado_de_la_reserva(p_token text)
returns table (
  estado           text,
  dias_para_llegar int,
  completado       boolean,
  condominio       text,
  unidad           text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with v as (
    select vi.*
    from public.visita vi
    where vi.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    union all
    select vi.*
    from public.invitado i
    join public.visita vi on vi.id = i.visita_id
    where i.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    limit 1
  ), hoy as (
    select v.*, (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date as dia
    from v
  )
  select
    case
      when h.estado = 'cancelada' then 'cancelada'
      when h.estado = 'finalizada' or h.fecha_hasta < h.dia then 'terminada'
      when h.fecha_desde <= h.dia then 'en_curso'
      else 'proxima'
    end,
    greatest(h.fecha_desde - h.dia, 0),
    h.precheckin_completado_en is not null,
    c.nombre,
    u.codigo
  from hoy h
  join public.condominio c on c.id = h.condominio_id
  join public.unidad u on u.id = h.unidad_id;
$$;

comment on function public.estado_de_la_reserva(text) is
  'En que quedo la reserva de un enlace de preregistro (titular o acompanante): cancelada, terminada, en_curso o proxima, y los dias que faltan, con el reloj del edificio.';

revoke all on function public.estado_de_la_reserva(text) from public;
grant execute on function public.estado_de_la_reserva(text) to anon, authenticated;

create or replace function public.cancelar_cierra_el_enlace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.estado = 'cancelada' and old.estado is distinct from 'cancelada'
     and new.precheckin_expira_en is not null
     and new.precheckin_expira_en > now() then
    new.precheckin_expira_en := now();
  end if;
  return new;
end;
$$;

drop trigger if exists visita_cancelar_cierra_el_enlace on public.visita;
create trigger visita_cancelar_cierra_el_enlace
  before update of estado on public.visita
  for each row execute function public.cancelar_cierra_el_enlace();

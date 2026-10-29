-- El aforo de una zona cuenta a todos los que coinciden en hora (29/10/2026).
--
-- GSheet, Para Claude 144: «si se pasa el máximo de personas, no toma en
-- conjunto las horas de reserva, sino individualmente». `capacidad_maxima`
-- solo se comparaba con cada reserva por separado, así que en una piscina de
-- 20 entraban dos reservas de 15 a la misma hora. Ahora se suman las personas
-- de las reservas vivas de la zona que se solapan con esta (quien reserva más
-- sus acompañantes). Security definer: quien reserva no ve las reservas de
-- otros por RLS, y sin eso la suma saldría corta. Solo aditiva.
create or replace function public.respetar_aforo_de_zona()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_capacidad integer;
  v_ocupado   integer;
  v_pide      integer := coalesce(new.acompanantes, 0) + 1;
begin
  if new.estado not in ('pendiente', 'aprobada', 'en_curso') then
    return new;
  end if;

  select capacidad_maxima into v_capacidad
    from public.zona_comun where id = new.zona_id;

  -- Sin capacidad declarada no hay nada que comprobar.
  if coalesce(v_capacidad, 0) <= 0 then
    return new;
  end if;

  if v_pide > v_capacidad then
    raise exception
      'La zona admite % personas contando a quien reserva, y se pidieron %',
      v_capacidad, v_pide
      using errcode = 'check_violation';
  end if;

  select coalesce(sum(coalesce(r.acompanantes, 0) + 1), 0) into v_ocupado
    from public.reserva_zona r
   where r.zona_id = new.zona_id
     and r.fecha = new.fecha
     and r.id is distinct from new.id
     and r.estado in ('pendiente', 'aprobada', 'en_curso')
     and r.hora_inicio < new.hora_fin
     and new.hora_inicio < r.hora_fin;

  if v_ocupado + v_pide > v_capacidad then
    raise exception
      'A esa hora la zona ya tiene % de % personas: caben % más',
      v_ocupado, v_capacidad, greatest(v_capacidad - v_ocupado, 0)
      using errcode = 'check_violation';
  end if;

  return new;
end
$function$;
comment on function public.respetar_aforo_de_zona() is
  'La capacidad de la zona cuenta a todas las personas de las reservas vivas que se solapan en hora (29/10/2026), no a cada reserva por separado.';

drop trigger if exists reserva_zona_aforo on public.reserva_zona;
create trigger reserva_zona_aforo
  before insert or update of acompanantes, zona_id, fecha, hora_inicio, hora_fin, estado
  on public.reserva_zona
  for each row execute function public.respetar_aforo_de_zona();

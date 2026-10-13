-- ============================================================================
-- Los dias habilitados y las fechas especiales de una zona cuentan
-- ============================================================================
-- Revision del 13/10/2026. El formulario de una zona comun pinta «Dias
-- habilitados» y «Fechas especiales» --mantenimiento, horario distinto-- y:
--
--   · **no se guardaban**: el formulario no los mandaba;
--   · y aunque se guardaran, **nadie los leia**: ni la grilla ni la base. Se
--     podia reservar la piscina un dia en que la zona no abre.
--
-- El cliente decidio el mismo dia que lo que esta en la interfaz se construye.
-- Aqui va la mitad de la base: guardar las fechas de una vez, y rechazar la
-- reserva que cae en un dia cerrado.

-- ----------------------------------------------------------------------------
-- 1. Las fechas especiales se reemplazan en una sola transaccion
-- ----------------------------------------------------------------------------
-- Como el horario de un guardia: la pantalla edita la lista entera, y borrar y
-- volver a insertar en dos llamadas deja la zona sin ninguna si la segunda
-- falla. `security invoker`: quien puede lo decide la politica de la tabla.
create or replace function public.guardar_fechas_de_zona(
  p_zona_id uuid,
  p_fechas  jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
declare
  v_condominio uuid;
  v_cuantas    integer;
begin
  select z.condominio_id into v_condominio
  from public.zona_comun z where z.id = p_zona_id;

  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración puede cambiar las fechas de una zona';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_fechas, '[]'::jsonb)) f
    where (f->>'tipo') = 'horario_especial'
      and ((f->>'hora_apertura') is null or (f->>'hora_cierre') is null
           or (f->>'hora_apertura')::time >= (f->>'hora_cierre')::time)
  ) then
    raise exception 'Un horario especial necesita su apertura y un cierre posterior';
  end if;

  delete from public.zona_fecha_especial where zona_id = p_zona_id;

  insert into public.zona_fecha_especial (zona_id, fecha, tipo, motivo, hora_apertura, hora_cierre)
  select distinct on ((f->>'fecha')::date)
         p_zona_id,
         (f->>'fecha')::date,
         (f->>'tipo')::tipo_fecha_especial,
         nullif(btrim(coalesce(f->>'motivo', '')), ''),
         case when (f->>'tipo') = 'horario_especial' then (f->>'hora_apertura')::time end,
         case when (f->>'tipo') = 'horario_especial' then (f->>'hora_cierre')::time end
  from jsonb_array_elements(coalesce(p_fechas, '[]'::jsonb)) f
  order by (f->>'fecha')::date;

  get diagnostics v_cuantas = row_count;
  return v_cuantas;
end;
$fn$;

comment on function public.guardar_fechas_de_zona(uuid, jsonb) is
  'Reemplaza las fechas especiales de una zona en una sola transaccion. Devuelve cuantas quedaron.';

revoke execute on function public.guardar_fechas_de_zona(uuid, jsonb) from public, anon;
grant execute on function public.guardar_fechas_de_zona(uuid, jsonb) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. No se reserva un dia en que la zona no abre
-- ----------------------------------------------------------------------------
-- Se mira al crear y al mover de fecha u hora. Una reserva cancelada o
-- rechazada no ocupa nada, asi que no se juzga.
--
-- `dias_habilitados` va con 0 = domingo, que es lo que devuelve
-- `extract(dow)`.
create or replace function public.respetar_dias_de_la_zona()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_dias     smallint[];
  v_especial public.zona_fecha_especial%rowtype;
begin
  if new.estado in ('cancelada', 'rechazada') then
    return new;
  end if;

  select * into v_especial
  from public.zona_fecha_especial fe
  where fe.zona_id = new.zona_id and fe.fecha = new.fecha;

  if found then
    if v_especial.tipo = 'cerrada' then
      raise exception 'La zona está cerrada el %: %',
        to_char(new.fecha, 'DD/MM/YYYY'),
        coalesce(v_especial.motivo, 'no abre ese día')
        using errcode = 'check_violation', constraint = 'reserva_zona_dia_cerrado';
    end if;

    if new.hora_inicio < v_especial.hora_apertura
       or new.hora_fin > v_especial.hora_cierre then
      raise exception 'El % la zona abre de % a %',
        to_char(new.fecha, 'DD/MM/YYYY'),
        to_char(v_especial.hora_apertura, 'HH24:MI'),
        to_char(v_especial.hora_cierre, 'HH24:MI')
        using errcode = 'check_violation', constraint = 'reserva_zona_horario_especial';
    end if;
    -- Una fecha con horario propio manda sobre el dia de la semana.
    return new;
  end if;

  select z.dias_habilitados into v_dias
  from public.zona_comun z where z.id = new.zona_id;

  if v_dias is not null
     and not (extract(dow from new.fecha)::smallint = any (v_dias)) then
    raise exception 'La zona no abre ese día de la semana'
      using errcode = 'check_violation', constraint = 'reserva_zona_dia_no_habilitado';
  end if;

  return new;
end;
$fn$;

comment on function public.respetar_dias_de_la_zona() is
  'Rechaza una reserva en un dia de la semana que la zona no abre, o en una fecha especial cerrada o fuera de su horario.';

drop trigger if exists reserva_zona_dias_de_la_zona on public.reserva_zona;
create trigger reserva_zona_dias_de_la_zona
  before insert or update of zona_id, fecha, hora_inicio, hora_fin, estado
  on public.reserva_zona
  for each row execute function public.respetar_dias_de_la_zona();

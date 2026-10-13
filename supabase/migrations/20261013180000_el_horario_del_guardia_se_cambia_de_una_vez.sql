-- ============================================================================
-- El horario del guardia se cambia de una vez
-- ============================================================================
-- La pantalla reemplaza el horario entero: borraba todos los turnos y despues
-- insertaba los nuevos, en dos llamadas. `turno_guardia` tiene
-- `unique (membresia_id, dia_semana, hora_inicio)`, asi que bastaba repetir un
-- dia y una hora para que la segunda llamada fallara **con la primera ya
-- hecha**: el guardia se quedaba sin ningun turno y la lista seguia enseñando
-- los viejos hasta recargar. Revision del 13/10/2026.
--
-- Aqui las dos cosas van en una sola transaccion, y los repetidos se quitan
-- antes de escribir. Es `security invoker`: quien puede lo decide la politica
-- de `turno_guardia`, como hasta ahora; la comprobacion de arriba solo esta
-- para decir el motivo, porque un `delete` que RLS no deja pasar afecta cero
-- filas y no se queja.

create or replace function public.guardar_turnos_guardia(
  p_membresia_id uuid,
  p_turnos       jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
declare
  v_condominio uuid;
  v_cuantos    integer;
begin
  select mc.condominio_id into v_condominio
  from public.membresia_condominio mc
  where mc.id = p_membresia_id and mc.rol = 'guardia';

  if v_condominio is null
     or not public.puede_coadmin(v_condominio, 'modificarSeguridad') then
    raise exception 'No tienes permiso para cambiar el horario de este guardia';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_turnos, '[]'::jsonb)) t
    where (t->>'hora_inicio') is null
       or (t->>'hora_fin') is null
       or (t->>'hora_inicio') = (t->>'hora_fin')
       or (t->>'dia_semana')::int not between 0 and 6
  ) then
    raise exception 'Cada turno necesita su día, su hora de entrada y una hora de salida distinta';
  end if;

  delete from public.turno_guardia where membresia_id = p_membresia_id;

  insert into public.turno_guardia (membresia_id, dia_semana, hora_inicio, hora_fin)
  select distinct on (dia, entrada)
         p_membresia_id, dia, entrada, salida
  from (
    select (t->>'dia_semana')::int   as dia,
           (t->>'hora_inicio')::time as entrada,
           (t->>'hora_fin')::time    as salida
    from jsonb_array_elements(coalesce(p_turnos, '[]'::jsonb)) t
  ) turnos
  order by dia, entrada;

  get diagnostics v_cuantos = row_count;
  return v_cuantos;
end;
$fn$;

comment on function public.guardar_turnos_guardia(uuid, jsonb) is
  'Reemplaza el horario de un guardia en una sola transaccion, sin repetidos. Devuelve cuantos turnos quedaron.';

revoke execute on function public.guardar_turnos_guardia(uuid, jsonb) from public, anon;
grant execute on function public.guardar_turnos_guardia(uuid, jsonb) to authenticated, service_role;

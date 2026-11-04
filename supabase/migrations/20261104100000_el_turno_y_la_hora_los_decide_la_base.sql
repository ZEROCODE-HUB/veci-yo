-- El turno del guardia y la hora los decide la base, no el celular
-- (04/11/2026, a raíz de Para Claude 214 y 217).
--
-- La app decidía con el reloj del teléfono si el guardia estaba de turno o
-- fuera, y cuánto le quedaba. Un celular con la hora o la zona mal lo calculaba
-- mal, y bastaba con cambiar la hora del teléfono para seguir entrando fuera de
-- turno. Ahora:
--
--   · `mi_estado_de_turno` responde, con el reloj del edificio, si quien llama
--     tiene horario, si está de turno (por horario o por prórroga aceptada) y
--     cuántos segundos le quedan. Misma regla que tenía la app: el ajuste del
--     día manda sobre el horario de la semana; un ajuste sin horas es que ese
--     día no trabaja; un turno que cruza medianoche sigue al día siguiente; sin
--     ningún horario no se bloquea nada.
--   · `reloj_del_edificio` da la hora del servidor y la de pared del edificio,
--     para que la app corrija su reloj y su zona cuando el celular los tiene mal.
--
-- Solo aditiva: dos funciones nuevas.

create or replace function public.mi_estado_de_turno(p_condominio_id uuid)
 returns table(tiene_horario boolean, en_turno boolean, por_prorroga boolean,
               segundos_restantes integer)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
declare
  v_zona       text := public.zona_horaria_del_condominio(p_condominio_id);
  v_local      timestamp := now() at time zone v_zona;
  v_hoy        date := v_local::date;
  v_hora       time := v_local::time;
  v_dow        smallint := extract(dow from v_local)::smallint;
  v_membresia  uuid;
  v_inicio     time;
  v_fin        time;
  v_fin_local  timestamp;
  v_hay_ajuste boolean := false;
  v_horario    boolean;
  v_prorroga   timestamptz;
begin
  select mc.id into v_membresia
  from public.membresia_condominio mc
  where mc.condominio_id = p_condominio_id
    and mc.usuario_id = auth.uid()
    and mc.rol = 'guardia'
    and mc.activo;

  if v_membresia is null then
    return;
  end if;

  -- El ajuste de hoy manda sobre el horario de la semana.
  select true, o.hora_inicio, o.hora_fin into v_hay_ajuste, v_inicio, v_fin
  from public.turno_override o
  where o.membresia_id = v_membresia and o.fecha = v_hoy;
  v_hay_ajuste := coalesce(v_hay_ajuste, false);

  if v_hay_ajuste then
    if v_inicio is not null and v_fin is not null
       and public.hora_dentro_de(v_hora, v_inicio, v_fin) then
      v_fin_local := v_hoy + v_fin;
      if v_fin <= v_inicio and v_hora >= v_inicio then
        v_fin_local := v_fin_local + interval '1 day';
      end if;
    end if;
  else
    -- Un turno de hoy que está corriendo.
    select t.hora_inicio, t.hora_fin into v_inicio, v_fin
    from public.turno_guardia t
    where t.membresia_id = v_membresia
      and t.dia_semana = v_dow
      and public.hora_dentro_de(v_hora, t.hora_inicio, t.hora_fin)
    order by t.hora_inicio
    limit 1;

    if found then
      v_fin_local := v_hoy + v_fin;
      if v_fin <= v_inicio and v_hora >= v_inicio then
        v_fin_local := v_fin_local + interval '1 day';
      end if;
    else
      -- La parte de después de medianoche de un turno que empezó ayer.
      select t.hora_fin into v_fin
      from public.turno_guardia t
      where t.membresia_id = v_membresia
        and t.dia_semana = (v_dow + 6) % 7
        and t.hora_fin <= t.hora_inicio
        and v_hora < t.hora_fin
      limit 1;
      if found then
        v_fin_local := v_hoy + v_fin;
      end if;
    end if;
  end if;

  v_horario := v_hay_ajuste
    or exists (select 1 from public.turno_guardia t where t.membresia_id = v_membresia);

  -- Una prórroga aceptada que sigue corriendo lo deja de turno hasta su hora.
  select pr.hasta into v_prorroga
  from public.prorroga_turno pr
  where pr.condominio_id = p_condominio_id
    and pr.solicitada_por = auth.uid()
    and pr.estado = 'aceptada'
    and pr.hasta > now()
  order by pr.hasta desc
  limit 1;

  if v_prorroga is not null then
    return query select v_horario, true, true,
      greatest(0, floor(extract(epoch from v_prorroga - now())))::integer;
    return;
  end if;

  return query select v_horario, v_fin_local is not null, false,
    case when v_fin_local is null then null
         else greatest(0, floor(extract(epoch from (v_fin_local at time zone v_zona) - now())))::integer
    end;
end;
$$;

comment on function public.mi_estado_de_turno(uuid) is
  'Si quien llama, como guardia, está de turno ahora con el reloj del edificio (por horario o por prórroga) y cuántos segundos le quedan. La app no decide esto con el reloj del teléfono.';

create or replace function public.reloj_del_edificio(p_condominio_id uuid default null)
 returns table(ahora_ms bigint, ahora_local text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  select (extract(epoch from now()) * 1000)::bigint,
         case when p_condominio_id is null then null
              else to_char(now() at time zone public.zona_horaria_del_condominio(p_condominio_id),
                           'YYYY-MM-DD"T"HH24:MI:SS')
         end;
$$;

comment on function public.reloj_del_edificio(uuid) is
  'La hora del servidor (ms desde 1970) y la de pared del edificio, para que la app corrija un celular con el reloj o la zona mal.';

grant execute on function public.mi_estado_de_turno(uuid) to authenticated;
grant execute on function public.reloj_del_edificio(uuid) to authenticated;

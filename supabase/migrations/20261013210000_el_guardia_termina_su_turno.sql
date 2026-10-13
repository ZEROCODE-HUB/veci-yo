-- ============================================================================
-- El guardia termina su turno
-- ============================================================================
-- Revision del 13/10/2026. La configuracion del guardia tiene una tarjeta
-- «Turno actual» con un boton «Terminar turno» que ponia una bandera en la
-- memoria del telefono y anunciaba «tus privilegios de seguridad se han
-- deshabilitado». No se escribia nada, no se deshabilitaba nada, y al
-- recargar volvia a decir «en turno activo». El cliente decidio el mismo dia
-- que lo que esta en la interfaz se construye.
--
-- Lo que hace de verdad: deja escrito que **hoy** el turno de esa persona
-- termino a esta hora. Es un ajuste de su horario para el dia --la misma
-- tabla que usa la administracion para un turno puntual--, asi que desde ese
-- momento la administracion la ve fuera de turno.
--
-- Lo que **no** hace: quitarle permisos. Que la porteria deje de poder
-- registrar visitas fuera de su turno es otra decision, y grande --hoy el
-- acceso no depende del horario--. Queda anotada (REVISAR-A-OJO 196).
--
-- El guardia no puede escribir en `turno_override` --es de la
-- administracion--, por eso es una funcion: comprueba que la fila es suya y
-- solo sabe hacer esto.

create or replace function public.terminar_mi_turno(p_condominio_id uuid)
returns time
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_membresia uuid;
  v_zona      text := public.zona_horaria_del_condominio(p_condominio_id);
  v_ahora     timestamp := now() at time zone v_zona;
  v_hoy       date := v_ahora::date;
  v_hora      time := date_trunc('minute', v_ahora)::time;
  v_inicio    time;
begin
  select mc.id into v_membresia
  from public.membresia_condominio mc
  where mc.condominio_id = p_condominio_id
    and mc.usuario_id = auth.uid()
    and mc.rol = 'guardia'
    and mc.activo;

  if v_membresia is null then
    raise exception 'Solo la portería termina su turno';
  end if;

  -- La entrada de hoy: la del ajuste si ya habia uno, o la del turno de la
  -- semana que esta corriendo.
  select o.hora_inicio into v_inicio
  from public.turno_override o
  where o.membresia_id = v_membresia and o.fecha = v_hoy;

  if v_inicio is null then
    select t.hora_inicio into v_inicio
    from public.turno_guardia t
    where t.membresia_id = v_membresia
      and t.dia_semana = extract(dow from v_hoy)::smallint
      and t.hora_inicio <= v_hora
    order by t.hora_inicio desc
    limit 1;
  end if;

  if v_inicio is null or v_inicio >= v_hora then
    raise exception 'No tienes un turno en curso para terminar';
  end if;

  insert into public.turno_override (membresia_id, fecha, hora_inicio, hora_fin, motivo)
  values (v_membresia, v_hoy, v_inicio, v_hora, 'Terminó el turno')
  on conflict (membresia_id, fecha) do update
    set hora_inicio = excluded.hora_inicio,
        hora_fin    = excluded.hora_fin,
        motivo      = excluded.motivo,
        updated_at  = now();

  return v_hora;
end;
$fn$;

comment on function public.terminar_mi_turno(uuid) is
  'El guardia deja escrito que su turno de hoy termino ahora: un ajuste de su horario para el dia. No le quita permisos.';

revoke execute on function public.terminar_mi_turno(uuid) from public, anon;
grant execute on function public.terminar_mi_turno(uuid) to authenticated, service_role;

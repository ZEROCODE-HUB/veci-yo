-- Las tareas automáticas y sus horas salen de parámetros (18/10/2026).
--
-- Aditiva en datos. Las horas (06:20, 07:05, 08:00 y 09:00 de Bogotá) estaban
-- escritas en cron.job en hora universal. Ahora salen de tarea_hora_*, y al
-- cambiar una se reprograma sola. Mismas horas que antes.
--
-- Arreglo de paso: los recordatorios del preregistro contaban los días que
-- faltan con la fecha del servidor (UTC), no con la del edificio. A las 09:00
-- de Bogotá coinciden, pero con otra hora de tarea o en otro país, no.

CREATE OR REPLACE FUNCTION public.precheckins_por_recordar()
 RETURNS TABLE(visita_id uuid, dias_antes smallint, destinatario text, correo text, nombre text, condominio text, nombre_huesped text, fecha_desde date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with pendientes as (
    select
      v.id,
      v.fecha_desde,
      v.condominio_id,
      v.unidad_id,
      v.registrada_por,
      (v.fecha_desde - (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date)::smallint as faltan,
      s.recordatorio_al_huesped,
      s.recordatorio_al_anfitrion,
      s.recordatorio_dias,
      t.nombre   as titular_nombre,
      t.correo   as titular_correo
    from public.visita v
    join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
    left join public.invitado t on t.visita_id = v.id and t.es_titular
    where v.tipo = 'huesped_temporal'
      -- Solo las que tienen enlace abierto y sin cerrar. Una estancia sin
      -- preregistro abierto no tiene nada que recordar.
      and v.precheckin_token_hash is not null
      and v.precheckin_completado_en is null
      and v.estado not in ('cancelada', 'finalizada')
      and v.fecha_desde >= (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
      and (v.fecha_desde - (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date)::smallint = any (s.recordatorio_dias)
  )
  -- Al huesped, si el anfitrion lo dejo encendido y hay a donde escribirle.
  select
    p.id, p.faltan, 'huesped'::text, p.titular_correo, p.titular_nombre,
    c.nombre, p.titular_nombre, p.fecha_desde
  from pendientes p
  join public.condominio c on c.id = p.condominio_id
  where p.recordatorio_al_huesped
    and coalesce(btrim(p.titular_correo), '') <> ''
    and not exists (
      select 1 from public.recordatorio_precheckin r
      where r.visita_id = p.id and r.dias_antes = p.faltan
        and r.destinatario = 'huesped'
    )

  union all

  -- Y al anfitrion, que es quien responde por la estancia. Su correo sale de su
  -- perfil, no de la membresia: el perfil es donde la persona lo mantiene.
  select
    p.id, p.faltan, 'anfitrion'::text, u.email, pf.nombre,
    c.nombre, p.titular_nombre, p.fecha_desde
  from pendientes p
  join public.condominio c on c.id = p.condominio_id
  -- Quien responde por la estancia: el anfitrion primario de la vivienda; si
  -- no hay, quien la registro; y si no, el propietario mas antiguo. Hasta el
  -- 17/10/2026 era siempre el propietario mas antiguo, asi que si la
  -- anfitriona era una inquilina lider, el aviso le llegaba a otra persona.
  join lateral (
    select m.usuario_id
    from public.membresia_unidad m
    where m.unidad_id = p.unidad_id
      and m.activo
      and m.usuario_id is not null
      and m.rol in ('propietario', 'inquilino_lider', 'coadministrador')
    order by m.es_anfitrion_primario desc,
             (m.usuario_id = p.registrada_por) desc nulls last,
             (m.rol = 'propietario') desc,
             m.created_at
    limit 1
  ) duenio on true
  join auth.users u on u.id = duenio.usuario_id
  left join public.perfil pf on pf.id = duenio.usuario_id
  where p.recordatorio_al_anfitrion
    and coalesce(btrim(u.email), '') <> ''
    and not exists (
      select 1 from public.recordatorio_precheckin r
      where r.visita_id = p.id and r.dias_antes = p.faltan
        and r.destinatario = 'anfitrion'
    );
$function$
;

-- ============================================================================
-- Las horas de las tareas automáticas
-- ============================================================================

/*
  Las tareas se programan en cron.job, que cuenta en hora universal. Los
  parámetros dicen la hora en la zona de tareas_zona_horaria (Bogotá), que es
  como la piensa quien la cambia. Esta función traduce y reprograma.
*/
create or replace function public.reprogramar_tareas()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_zona text := public.parametro('tareas_zona_horaria');
  r record;
  v_utc time;
  v_horario text;
begin
  for r in
    select * from (values
      ('cuotas-del-mes',           'tarea_hora_cuotas'),
      ('avisos-de-publicaciones',  'tarea_hora_publicaciones'),
      ('preregistros-incompletos', 'tarea_hora_preregistro_incompleto'),
      ('recordatorios-precheckin', 'tarea_hora_recordatorios')
    ) t(tarea, clave)
  loop
    v_utc := ((current_date + public.parametro(r.clave)::time) at time zone v_zona at time zone 'UTC')::time;
    v_horario := format('%s %s * * *', extract(minute from v_utc)::int, extract(hour from v_utc)::int);
    perform cron.alter_job(j.jobid, schedule := v_horario) from cron.job j where j.jobname = r.tarea;
  end loop;

  perform cron.alter_job(j.jobid, schedule := format('*/%s * * * *', public.parametro_entero('tarea_antecedentes_cada_minutos')))
    from cron.job j where j.jobname = 'verificaciones-pendientes';
end;
$$;

comment on function public.reprogramar_tareas() is
  'Vuelve a programar las tareas automáticas con las horas de sus parámetros (tarea_hora_*, '
  'tarea_antecedentes_cada_minutos), traducidas de tareas_zona_horaria a hora universal. '
  'Se llama sola al cambiar uno de esos parámetros.';

revoke execute on function public.reprogramar_tareas() from public, anon, authenticated;
grant execute on function public.reprogramar_tareas() to service_role;

create or replace function public.reprogramar_tareas_al_cambiar()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.clave like 'tarea\_%' or new.clave = 'tareas_zona_horaria' then
    perform public.reprogramar_tareas();
  end if;
  return new;
end;
$$;

comment on function public.reprogramar_tareas_al_cambiar() is
  'Disparador: al cambiar la hora de una tarea automática, la reprograma.';

revoke execute on function public.reprogramar_tareas_al_cambiar() from public, anon, authenticated;

drop trigger if exists configuracion_plataforma_reprogramar on public.configuracion_plataforma;
create trigger configuracion_plataforma_reprogramar
  after update of valor on public.configuracion_plataforma
  for each row execute function public.reprogramar_tareas_al_cambiar();

/* Una zona horaria mal escrita rompería todas las tareas: se valida al guardarla. */
create or replace function public.validar_zona_horaria_de_tareas()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.clave = 'tareas_zona_horaria'
     and not exists (select 1 from pg_timezone_names where name = new.valor) then
    raise exception '"%" no es una zona horaria válida (por ejemplo America/Bogota).', new.valor;
  end if;
  return new;
end;
$$;

comment on function public.validar_zona_horaria_de_tareas() is
  'Disparador: tareas_zona_horaria tiene que ser una zona horaria que Postgres conozca.';

drop trigger if exists configuracion_plataforma_zona_tareas on public.configuracion_plataforma;
create trigger configuracion_plataforma_zona_tareas
  before insert or update on public.configuracion_plataforma
  for each row execute function public.validar_zona_horaria_de_tareas();

-- Las mismas horas que ya tenían: 06:20, 07:05, 08:00 y 09:00 de Bogotá.
select public.reprogramar_tareas();

-- ============================================================================
-- Más valores por defecto de columnas
-- ============================================================================

alter table public.permiso_vivienda
  alter column larga_estancia_minima set default public.parametro_entero('estancia_minima_por_defecto');
alter table public.plan_suscripcion
  alter column periodicidad set default public.parametro('plan_periodicidad_por_defecto')::public.periodicidad_plan;
alter table public.visita
  alter column aviso set default public.parametro('porteria_aviso_de_visita_por_defecto')::public.aviso_de_visita;
alter table public.condominio
  alter column cuotas_visibilidad set default public.parametro('cuota_visibilidad_por_defecto')::public.visibilidad_cuotas;

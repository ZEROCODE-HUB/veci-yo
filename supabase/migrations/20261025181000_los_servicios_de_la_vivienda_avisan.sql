-- Los servicios de la vivienda avisan el día que se eligió.
--
-- Parametrización (25/10/2026): «Primer aviso» y «Segundo aviso» --el día del
-- mes en que la vivienda quiere que se le recuerde pagar la luz, el agua…,
-- decidido con el cliente el 06/10/2026-- se guardaban en
-- `servicio_de_vivienda` y **nada los mandaba**: no había función ni tarea.
-- La pantalla los pedía como si funcionaran.
--
-- Ahora una tarea diaria, a la hora de `tarea_hora_servicios`, avisa en la
-- campana a quien responde por la vivienda (propietario o inquilino líder),
-- con el día del edificio. Un aviso puesto el 29, 30 o 31 sale el último día
-- de los meses que no llegan: quien escribe 31 quiere decir «el último».

insert into public.configuracion_plataforma
  (clave, valor, tipo, ambito, categoria, riesgo, es_publico, valor_por_defecto, descripcion)
values
  ('tarea_hora_servicios', '08:30', 'hora_del_dia', 'plataforma', 'tareas', 'bajo', false, '08:30',
   'Hora del día en que salen los avisos de pago de los servicios de la vivienda (primer y segundo aviso).')
on conflict (clave) do nothing;

create or replace function public.avisar_servicios_de_vivienda()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  f record;
  n int := 0;
begin
  for f in
    select s.id, s.unidad_id, s.nombre, s.empresa, s.dia_primer_aviso, s.dia_segundo_aviso,
           public.hoy_en_el_edificio(u.condominio_id) as hoy
    from public.servicio_de_vivienda s
    join public.unidad u on u.id = s.unidad_id
  loop
    if exists (
      select 1
      from (values (f.dia_primer_aviso), (f.dia_segundo_aviso)) d(dia)
      where d.dia is not null
        and least(
              d.dia::int,
              extract(day from (date_trunc('month', f.hoy) + interval '1 month - 1 day'))::int
            ) = extract(day from f.hoy)::int
    )
    -- Una vez al día por servicio, aunque los dos avisos caigan el mismo día
    -- o la tarea corra dos veces.
    and not exists (
      select 1 from public.notificacion x
      where x.entidad_id = f.id
        and x.tipo = 'servicio_por_pagar'
        and x.created_at >= now() - interval '20 hours'
    ) then
      perform public.notificar_anfitrion(
        f.unidad_id, 'servicio_por_pagar',
        'Recuerda pagar ' || f.nombre,
        'Hoy es el día que elegiste para recordar el pago de ' || f.nombre ||
          coalesce(' (' || nullif(btrim(f.empresa), '') || ')', '') || '.',
        'servicio_de_vivienda', f.id
      );
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

comment on function public.avisar_servicios_de_vivienda() is
  'Avisa en la campana del pago de cada servicio de la vivienda el día del '
  'mes elegido (primer y segundo aviso), con el día del edificio. Un día que '
  'el mes no tiene sale el último. Una vez al día por servicio.';

revoke all on function public.avisar_servicios_de_vivienda() from public, anon, authenticated;
grant execute on function public.avisar_servicios_de_vivienda() to service_role;

-- La tarea diaria, y su hora en `reprogramar_tareas` con las demás.
select cron.schedule(
  'servicios-de-vivienda',
  '30 13 * * *',
  'select public.avisar_servicios_de_vivienda();'
)
where not exists (select 1 from cron.job where jobname = 'servicios-de-vivienda');

create or replace function public.reprogramar_tareas()
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
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
      ('recordatorios-precheckin', 'tarea_hora_recordatorios'),
      ('servicios-de-vivienda',    'tarea_hora_servicios')
    ) t(tarea, clave)
  loop
    v_utc := ((current_date + public.parametro(r.clave)::time) at time zone v_zona at time zone 'UTC')::time;
    v_horario := format('%s %s * * *', extract(minute from v_utc)::int, extract(hour from v_utc)::int);
    perform cron.alter_job(j.jobid, schedule := v_horario) from cron.job j where j.jobname = r.tarea;
  end loop;

  perform cron.alter_job(j.jobid, schedule := format('*/%s * * * *', public.parametro_entero('tarea_antecedentes_cada_minutos')))
    from cron.job j where j.jobname = 'verificaciones-pendientes';
end;
$function$;

select public.reprogramar_tareas();

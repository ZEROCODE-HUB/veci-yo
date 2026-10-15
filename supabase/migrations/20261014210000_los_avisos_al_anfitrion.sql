/*
  Los avisos de la estancia para el anfitrion (14/10/2026).

  Lo pidio la responsable de producto: «notificar salidas parciales; se
  notifica al anfitrion, en la vista del home; en notificaciones poder
  parametrizar las notificaciones sobre eventos del huesped temporal: ingreso,
  salida parcial, salida, etc.».

  - Salida parcial (sale uno y quedan otros) y salida del ultimo.
  - La verificacion que pide su aprobacion (hallazgo o consulta imposible).
  - El preregistro que sigue sin hacerse a 3 dias o menos de la llegada
    (una vez por estancia, con un cron diario).

  Todos pasan por `notificar_anfitrion`, que respeta lo que cada uno apago en
  Perfil > Avisos (los motivos nuevos salen ahi solos). El ingreso ya avisaba
  (`visita_ingreso`).

  El mensaje empieza por el nombre del huesped: asi el barrido de datos de
  prueba se lleva los avisos de los huespedes de prueba («[prueba] ...»).

  Solo aditiva.
*/

create or replace function public.avisar_salida_de_huesped()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v       public.visita%rowtype;
  dentro  int;
begin
  if new.salida_en is null or old.salida_en is not null then
    return new;
  end if;
  select * into v from public.visita where id = new.visita_id;
  if v.tipo <> 'huesped_temporal' then
    return new;
  end if;

  select count(*) into dentro
  from public.invitado i
  where i.visita_id = v.id and i.llego and i.salida_en is null;

  if dentro > 0 then
    perform public.notificar_anfitrion(
      v.unidad_id, 'huesped_salida_parcial',
      'Salió alguien de tu estancia',
      new.nombre || ' salió del edificio. Quedan ' || dentro ||
        case when dentro = 1 then ' persona dentro.' else ' personas dentro.' end,
      'visita', v.id
    );
  else
    perform public.notificar_anfitrion(
      v.unidad_id, 'huesped_salida',
      'Salieron todos: estancia completa',
      new.nombre || ' salió del edificio, el último de la estancia.',
      'visita', v.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists invitado_avisar_salida on public.invitado;
create trigger invitado_avisar_salida
  after update of salida_en on public.invitado
  for each row execute function public.avisar_salida_de_huesped();

-- ----------------------------------------------------------------------------

create or replace function public.avisar_verificacion_por_revisar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i public.invitado%rowtype;
  v public.visita%rowtype;
begin
  if new.resultado not in ('rechazada', 'error_proveedor') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.resultado is not distinct from new.resultado then
    return new;
  end if;
  -- Una simulada no es un hallazgo de verdad: no se molesta al anfitrion.
  if new.proveedor = 'simulado' then
    return new;
  end if;

  select * into i from public.invitado where id = new.invitado_id;
  select * into v from public.visita where id = i.visita_id;
  if v.id is null then
    return new;
  end if;

  perform public.notificar_anfitrion(
    v.unidad_id, 'verificacion_requiere_revision',
    'Un huésped necesita tu aprobación',
    i.nombre || ': ' ||
      case new.resultado
        when 'rechazada' then 'el informe de antecedentes trae hallazgos.'
        else 'no se pudo hacer la consulta de antecedentes.'
      end || ' Revisa su ficha y decide.',
    'visita', v.id
  );
  return new;
end;
$$;

drop trigger if exists verificacion_avisar_por_revisar on public.verificacion_antecedentes;
create trigger verificacion_avisar_por_revisar
  after insert or update of resultado on public.verificacion_antecedentes
  for each row execute function public.avisar_verificacion_por_revisar();

-- ----------------------------------------------------------------------------

create or replace function public.avisar_preregistros_incompletos()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  f record;
  n int := 0;
begin
  for f in
    select v.id, v.unidad_id, v.fecha_desde,
           (v.fecha_desde - (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date) as faltan,
           coalesce(t.nombre, 'Tu huésped') as nombre
    from public.visita v
    left join public.invitado t on t.visita_id = v.id and t.es_titular
    where v.tipo = 'huesped_temporal'
      and v.precheckin_completado_en is null
      and v.estado not in ('cancelada', 'finalizada')
      and v.fecha_desde between (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
                            and (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date + 3
      and not exists (
        select 1 from public.notificacion n
        where n.entidad_id = v.id and n.tipo = 'preregistro_incompleto'
      )
  loop
    perform public.notificar_anfitrion(
      f.unidad_id, 'preregistro_incompleto',
      'Llega pronto y sin preregistro',
      f.nombre || ' llega ' ||
        case when f.faltan <= 0 then 'hoy' when f.faltan = 1 then 'mañana'
             else 'en ' || f.faltan || ' días' end ||
        ' y no ha hecho su preregistro. Puedes recordárselo desde tu inicio.',
      'visita', f.id
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;

comment on function public.avisar_preregistros_incompletos() is
  'Avisa una vez al anfitrion de cada estancia que llega en 3 dias o menos sin preregistro. La llama pg_cron cada dia.';

revoke all on function public.avisar_preregistros_incompletos() from public, anon, authenticated;
grant execute on function public.avisar_preregistros_incompletos() to service_role;

do $$
begin
  perform cron.unschedule('preregistros-incompletos')
  where exists (select 1 from cron.job where jobname = 'preregistros-incompletos');
end $$;

select cron.schedule(
  'preregistros-incompletos',
  '0 13 * * *',
  $$select public.avisar_preregistros_incompletos()$$
);

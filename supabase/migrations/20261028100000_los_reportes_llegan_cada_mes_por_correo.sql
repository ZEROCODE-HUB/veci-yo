-- ----------------------------------------------------------------------------
-- Los reportes llegan cada mes por correo, si la administración lo enciende
-- (28/10/2026)
-- ----------------------------------------------------------------------------
-- Hueco 7 del GSheet. La maqueta tenía «Activar envío automático mensual» y
-- aquí no hacía nada. El cliente: «lo que no sepas, hazlo parametrizable, o
-- haz lo que recomiendes». Lo recomendado y hecho:
--
--   · Apagado por defecto. Lo enciende la administración del edificio en
--     Reportes, y elige el día del mes (1 a 28: el 29, 30 y 31 no existen
--     todos los meses).
--   · Ese día llega el **mes anterior entero**: un mes en curso estaría a
--     medias.
--   · Los tres reportes que ya hay (visitantes y vehículos, correspondencia y
--     zonas comunes), en Excel adjunto, con el mismo formato que la descarga.
--   · A la administración y a los coadministradores; a cada uno, solo los
--     reportes que su permiso le deja ver.
--
-- Piezas:
--   · `datos_reporte_*`: lo que devuelven los reportes, **sin** comprobar quién
--     pide. Internas: solo la clave de servicio. Las públicas `reporte_*`
--     siguen igual por fuera y las llaman tras comprobar el permiso, así que
--     la consulta vive en un solo sitio.
--   · `envio_reporte_mensual`: constancia de cada envío; con ella el mismo mes
--     no se manda dos veces.
--   · `enviar_reportes_mensuales()`: la pasada diaria. Pide a la función de
--     servidor `enviar-reportes-mensuales` que arme los Excel y mande.
-- Solo aditiva.

-- 1. Lo que elige la administración ------------------------------------------

alter table public.condominio
  add column if not exists reportes_mensuales_activo boolean not null default false,
  add column if not exists reportes_mensuales_dia smallint not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reportes_mensuales_dia_valido') then
    alter table public.condominio
      add constraint reportes_mensuales_dia_valido
      check (reportes_mensuales_dia between 1 and 28);
  end if;
end;
$$;

comment on column public.condominio.reportes_mensuales_activo is
  'Si la administración recibe cada mes por correo los reportes del mes anterior. Apagado por defecto. Hueco 7, 28/10/2026.';
comment on column public.condominio.reportes_mensuales_dia is
  'Día del mes (1-28, reloj del edificio) en que se mandan los reportes del mes anterior.';

create or replace function public.guardar_reportes_mensuales(
  p_condominio_id uuid,
  p_activo boolean,
  p_dia smallint
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración decide el envío de los reportes'
      using errcode = '42501';
  end if;
  if p_dia is null or p_dia < 1 or p_dia > 28 then
    raise exception 'El día tiene que estar entre el 1 y el 28'
      using errcode = 'check_violation';
  end if;

  update public.condominio
  set reportes_mensuales_activo = coalesce(p_activo, false),
      reportes_mensuales_dia = p_dia
  where id = p_condominio_id;
end;
$function$;

comment on function public.guardar_reportes_mensuales(uuid, boolean, smallint) is
  'La administración enciende o apaga el envío mensual de los reportes y elige el día. Hueco 7.';

revoke execute on function public.guardar_reportes_mensuales(uuid, boolean, smallint) from public, anon;
grant execute on function public.guardar_reportes_mensuales(uuid, boolean, smallint) to authenticated, service_role;

-- 2. Los datos de los reportes, sin la comprobación ---------------------------

create or replace function public.datos_reporte_visitantes(p_condominio_id uuid, p_desde date default null, p_hasta date default null)
returns table(fecha date, unidad text, tipo text, visitante text, documento text, ingreso timestamp with time zone, salida timestamp with time zone, placas text, registro text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    v.fecha_desde,
    u.codigo,
    v.tipo::text,
    i.nombre,
    i.documento_numero,
    i.ingreso_en,
    i.salida_en,
    (select string_agg(ve.placa, ', ') from public.vehiculo_visita ve where ve.visita_id = v.id),
    coalesce(p.nombre || ' ' || p.apellido, v.autorizada_por_nombre)
  from public.visita v
  join public.invitado i on i.visita_id = v.id
  left join public.unidad u on u.id = v.unidad_id
  left join public.perfil p on p.id = v.registrada_por
  where v.condominio_id = p_condominio_id
    and v.deleted_at is null
    and (p_desde is null or v.fecha_desde >= p_desde)
    and (p_hasta is null or v.fecha_desde <= p_hasta)
  order by v.fecha_desde desc, u.codigo;
$function$;

create or replace function public.datos_reporte_correspondencia(p_condominio_id uuid, p_desde date default null, p_hasta date default null)
returns table(registrada timestamp with time zone, unidad text, empresa text, categoria text, destinatario text, estado text, entregada timestamp with time zone, entregada_a text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    c.registrada_en,
    u.codigo,
    c.empresa,
    c.categoria::text,
    c.destinatario_nombre,
    c.estado::text,
    c.entregada_en,
    c.entregada_a
  from public.correspondencia c
  left join public.unidad u on u.id = c.unidad_id
  where c.condominio_id = p_condominio_id
    and c.deleted_at is null
    and (p_desde is null or c.registrada_en::date >= p_desde)
    and (p_hasta is null or c.registrada_en::date <= p_hasta)
  order by c.registrada_en desc;
$function$;

create or replace function public.datos_reporte_areas_comunes(p_condominio_id uuid, p_desde date default null, p_hasta date default null)
returns table(fecha date, zona text, unidad text, horario text, estado text, participantes bigint, resuelta_por text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    r.fecha,
    z.nombre,
    u.codigo,
    to_char(r.hora_inicio, 'HH24:MI') || ' - ' || to_char(r.hora_fin, 'HH24:MI'),
    r.estado::text,
    (select count(*) from public.participante_reserva pr where pr.reserva_id = r.id),
    coalesce(p.nombre || ' ' || p.apellido, '')
  from public.reserva_zona r
  join public.zona_comun z on z.id = r.zona_id
  left join public.unidad u on u.id = r.unidad_id
  left join public.perfil p on p.id = r.resuelta_por
  where z.condominio_id = p_condominio_id
    and (p_desde is null or r.fecha >= p_desde)
    and (p_hasta is null or r.fecha <= p_hasta)
  order by r.fecha desc;
$function$;

comment on function public.datos_reporte_visitantes(uuid, date, date) is
  'Interna: los datos del reporte de visitantes sin comprobar quién pide. La usan reporte_visitantes (tras comprobar el permiso) y el envío mensual.';
comment on function public.datos_reporte_correspondencia(uuid, date, date) is
  'Interna: los datos del reporte de correspondencia sin comprobar quién pide. La usan reporte_correspondencia y el envío mensual.';
comment on function public.datos_reporte_areas_comunes(uuid, date, date) is
  'Interna: los datos del reporte de zonas comunes sin comprobar quién pide. La usan reporte_areas_comunes y el envío mensual.';

-- `from public`: revocar solo de anon/authenticated no revoca nada (AGENTS.md).
revoke execute on function public.datos_reporte_visitantes(uuid, date, date) from public, anon, authenticated;
revoke execute on function public.datos_reporte_correspondencia(uuid, date, date) from public, anon, authenticated;
revoke execute on function public.datos_reporte_areas_comunes(uuid, date, date) from public, anon, authenticated;
grant execute on function public.datos_reporte_visitantes(uuid, date, date) to service_role;
grant execute on function public.datos_reporte_correspondencia(uuid, date, date) to service_role;
grant execute on function public.datos_reporte_areas_comunes(uuid, date, date) to service_role;

-- Las públicas, iguales por fuera: comprueban y llaman a la interna.
create or replace function public.reporte_visitantes(p_condominio_id uuid, p_desde date default null, p_hasta date default null)
returns table(fecha date, unidad text, tipo text, visitante text, documento text, ingreso timestamp with time zone, salida timestamp with time zone, placas text, registro text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select * from public.datos_reporte_visitantes(p_condominio_id, p_desde, p_hasta)
  where public.puede_coadmin(p_condominio_id, 'visualizarVisitas');
$function$;

create or replace function public.reporte_correspondencia(p_condominio_id uuid, p_desde date default null, p_hasta date default null)
returns table(registrada timestamp with time zone, unidad text, empresa text, categoria text, destinatario text, estado text, entregada timestamp with time zone, entregada_a text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select * from public.datos_reporte_correspondencia(p_condominio_id, p_desde, p_hasta)
  where public.puede_coadmin(p_condominio_id, 'visualizarCorrespondencia');
$function$;

create or replace function public.reporte_areas_comunes(p_condominio_id uuid, p_desde date default null, p_hasta date default null)
returns table(fecha date, zona text, unidad text, horario text, estado text, participantes bigint, resuelta_por text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select * from public.datos_reporte_areas_comunes(p_condominio_id, p_desde, p_hasta)
  where public.puede_coadmin(p_condominio_id, 'visualizarZonasComunes');
$function$;

-- 3. Constancia de cada envío ---------------------------------------------------

create table if not exists public.envio_reporte_mensual (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominio(id) on delete cascade,
  -- El primer día del mes que se reporta.
  periodo date not null,
  destinatarios integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominio_id, periodo)
);

comment on table public.envio_reporte_mensual is
  'Cada envío mensual de reportes: de qué edificio, de qué mes y a cuántas personas. Con ella el mismo mes no se manda dos veces. Hueco 7.';

alter table public.envio_reporte_mensual enable row level security;

drop policy if exists envio_reporte_mensual_lectura on public.envio_reporte_mensual;
create policy envio_reporte_mensual_lectura on public.envio_reporte_mensual
  for select to authenticated
  using (public.es_admin_condominio(condominio_id));

drop trigger if exists envio_reporte_mensual_updated_at on public.envio_reporte_mensual;
create trigger envio_reporte_mensual_updated_at
  before update on public.envio_reporte_mensual
  for each row execute function public.tocar_updated_at();

-- 4. A quién le toca hoy ---------------------------------------------------------

create or replace function public.reportes_mensuales_por_enviar()
returns table(condominio_id uuid, condominio text, desde date, hasta date, destinatarios jsonb)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with tocan as (
    select
      c.id,
      c.nombre,
      (date_trunc('month', public.hoy_en_el_edificio(c.id)) - interval '1 month')::date as desde,
      (date_trunc('month', public.hoy_en_el_edificio(c.id)) - interval '1 day')::date as hasta
    from public.condominio c
    where c.reportes_mensuales_activo
      and extract(day from public.hoy_en_el_edificio(c.id)) = c.reportes_mensuales_dia
  )
  select
    t.id,
    t.nombre,
    t.desde,
    t.hasta,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'correo', u.email,
        'nombre', coalesce(p.nombre, ''),
        'reportes', (
          select jsonb_agg(r.id)
          from (values
            ('visitantes', 'visualizarVisitas'),
            ('correspondencia', 'visualizarCorrespondencia'),
            ('areas-comunes', 'visualizarZonasComunes')
          ) as r(id, clave)
          where mc.rol = 'administrador'
             or coalesce((mc.permisos ->> r.clave)::boolean, true)
        )
      ))
      from public.membresia_condominio mc
      join auth.users u on u.id = mc.usuario_id
      left join public.perfil p on p.id = mc.usuario_id
      where mc.condominio_id = t.id
        and mc.activo
        and mc.rol in ('administrador', 'coadministrador')
        and u.email is not null
    ), '[]'::jsonb)
  from tocan t
  where not exists (
    select 1 from public.envio_reporte_mensual e
    where e.condominio_id = t.id and e.periodo = t.desde
  );
$function$;

comment on function public.reportes_mensuales_por_enviar() is
  'Interna: los edificios a los que hoy (su reloj) les toca recibir los reportes del mes anterior y aún no los recibieron, con a quién y qué reportes puede ver cada uno.';

revoke execute on function public.reportes_mensuales_por_enviar() from public, anon, authenticated;
grant execute on function public.reportes_mensuales_por_enviar() to service_role;

create or replace function public.enviar_reportes_mensuales()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp', 'extensions'
as $function$
declare
  v_url   text;
  v_clave text;
  v_fila  record;
  v_mandados int := 0;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave
  from vault.decrypted_secrets where name = 'veciyo_clave_servicio';

  if v_url is null or v_clave is null then
    raise exception 'Faltan los secretos veciyo_url_funciones / veciyo_clave_servicio en el Vault';
  end if;

  for v_fila in select * from public.reportes_mensuales_por_enviar() loop
    begin
      perform net.http_post(
        url     := v_url || '/functions/v1/enviar-reportes-mensuales',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_clave
        ),
        body    := jsonb_build_object(
          'condominioId',  v_fila.condominio_id,
          'condominio',    v_fila.condominio,
          'desde',         v_fila.desde,
          'hasta',         v_fila.hasta,
          'destinatarios', v_fila.destinatarios
        ),
        -- Tres consultas y tres Excel: más que los 5 s por defecto.
        timeout_milliseconds := 60000
      );

      -- Como los recordatorios: la constancia va antes de saber si llegó
      -- (`pg_net` es asíncrono). Vale más no repetir un mes que mandarlo dos veces.
      insert into public.envio_reporte_mensual (condominio_id, periodo, destinatarios)
      values (v_fila.condominio_id, v_fila.desde, jsonb_array_length(v_fila.destinatarios));

      v_mandados := v_mandados + 1;
    exception when others then
      insert into public.envio_reporte_mensual (condominio_id, periodo, destinatarios, error)
      values (v_fila.condominio_id, v_fila.desde, 0, sqlerrm)
      on conflict (condominio_id, periodo) do nothing;
    end;
  end loop;

  return v_mandados;
end;
$function$;

comment on function public.enviar_reportes_mensuales() is
  'La pasada diaria del envío mensual de reportes (cron `reportes-mensuales`). Hueco 7.';

revoke execute on function public.enviar_reportes_mensuales() from public, anon, authenticated;
grant execute on function public.enviar_reportes_mensuales() to service_role;

-- Cada día a las 12:00 UTC (las 7 de la mañana en Colombia y Perú). La función
-- mira el día de cada edificio con su reloj.
select cron.unschedule('reportes-mensuales')
where exists (select 1 from cron.job where jobname = 'reportes-mensuales');
select cron.schedule('reportes-mensuales', '0 12 * * *', $$ select public.enviar_reportes_mensuales(); $$);

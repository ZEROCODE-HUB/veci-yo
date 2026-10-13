-- Las cuotas se configuran desde el edificio (decidido con el cliente, 13/10/2026).
--
-- Hasta hoy el mes de cuota solo existia si alguien lo escribia a mano en la
-- base: la pantalla de pagos ofrecia «el mes que se esta registrando» y no
-- habia forma de crear uno, ni de decir cuanto se cobra.
--
--   · El edificio dice cuanto cobra al mes, en que moneda y que dia vence.
--   · Una vivienda puede tener un importe distinto (un local, un duplex).
--   · El mes se crea solo --si el edificio lo pide-- o a mano.
--
-- Solo se añade: columnas nuevas, funciones nuevas y una tarea diaria.

alter table public.condominio
  add column if not exists cuota_monto           numeric(12,2),
  add column if not exists cuota_moneda          char(3),
  add column if not exists cuota_dia_vencimiento smallint,
  add column if not exists cuota_automatica      boolean not null default false;

alter table public.condominio
  add constraint condominio_cuota_monto_positivo
    check (cuota_monto is null or cuota_monto > 0),
  add constraint condominio_cuota_dia_del_mes
    check (cuota_dia_vencimiento is null or cuota_dia_vencimiento between 1 and 28),
  add constraint condominio_cuota_automatica_con_monto
    check (not cuota_automatica or cuota_monto is not null);

comment on column public.condominio.cuota_monto is
  'Lo que paga al mes una vivienda que no tiene importe propio.';
comment on column public.condominio.cuota_moneda is
  'Moneda de la cuota. Vacia, vale la del edificio.';
comment on column public.condominio.cuota_dia_vencimiento is
  'Dia del mes en que vence la cuota, del 1 al 28 para que exista en febrero.';
comment on column public.condominio.cuota_automatica is
  'Si el mes de cuota se crea solo el dia 1.';

alter table public.unidad
  add column if not exists cuota_monto numeric(12,2);

alter table public.unidad
  add constraint unidad_cuota_monto_positivo
    check (cuota_monto is null or cuota_monto > 0);

comment on column public.unidad.cuota_monto is
  'Importe propio de esta vivienda. Vacio, paga el del edificio.';


-- ----------------------------------------------------------------------------
-- La configuracion
-- ----------------------------------------------------------------------------

create or replace function public.guardar_configuracion_cuotas(
  p_condominio_id   uuid,
  p_monto           numeric default null,
  p_moneda          text    default null,
  p_dia_vencimiento integer default null,
  p_automatica      boolean default false
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración configura las cuotas';
  end if;

  if p_monto is not null and p_monto <= 0 then
    raise exception 'El importe de la cuota tiene que ser mayor que cero';
  end if;

  if p_dia_vencimiento is not null and p_dia_vencimiento not between 1 and 28 then
    raise exception 'El día de vencimiento va del 1 al 28';
  end if;

  if p_moneda is not null and p_moneda !~ '^[A-Z]{3}$' then
    raise exception 'La moneda se escribe con sus tres letras, como COP o USD';
  end if;

  if coalesce(p_automatica, false) and p_monto is null then
    raise exception 'Para crear el mes automáticamente hace falta el importe';
  end if;

  update public.condominio set
    cuota_monto           = p_monto,
    cuota_moneda          = p_moneda,
    cuota_dia_vencimiento = p_dia_vencimiento,
    cuota_automatica      = coalesce(p_automatica, false)
  where id = p_condominio_id;
end;
$fn$;

revoke execute on function public.guardar_configuracion_cuotas(uuid, numeric, text, integer, boolean) from public, anon;
grant execute on function public.guardar_configuracion_cuotas(uuid, numeric, text, integer, boolean) to authenticated, service_role;


create or replace function public.guardar_cuota_de_unidad(
  p_unidad_id uuid,
  p_monto     numeric default null
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_condominio uuid := public.condominio_de_unidad(p_unidad_id);
begin
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración cambia la cuota de una vivienda';
  end if;

  if p_monto is not null and p_monto <= 0 then
    raise exception 'El importe de la cuota tiene que ser mayor que cero';
  end if;

  update public.unidad set cuota_monto = p_monto where id = p_unidad_id;
end;
$fn$;

revoke execute on function public.guardar_cuota_de_unidad(uuid, numeric) from public, anon;
grant execute on function public.guardar_cuota_de_unidad(uuid, numeric) to authenticated, service_role;


-- ----------------------------------------------------------------------------
-- El mes
-- ----------------------------------------------------------------------------

-- La que escribe. Interna: no comprueba quien llama, lo hacen las dos de abajo.
create or replace function public.abrir_mes_de_cuota(
  p_condominio_id uuid,
  p_periodo       date
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_monto  numeric(12,2);
  v_moneda char(3);
  v_dia    smallint;
  v_mes    date := date_trunc('month', p_periodo)::date;
  v_id     uuid;
begin
  select c.cuota_monto, coalesce(c.cuota_moneda, c.moneda), c.cuota_dia_vencimiento
    into v_monto, v_moneda, v_dia
  from public.condominio c
  where c.id = p_condominio_id and c.deleted_at is null;

  if v_monto is null then
    raise exception 'Primero di cuánto se cobra al mes, en la configuración de cuotas';
  end if;

  insert into public.cuota_administracion (condominio_id, periodo, monto, moneda, vence_en)
  values (
    p_condominio_id, v_mes, v_monto, v_moneda,
    case when v_dia is not null then v_mes + (v_dia - 1) end
  )
  on conflict (condominio_id, periodo) do nothing
  returning id into v_id;

  if v_id is null then
    select c.id into v_id
    from public.cuota_administracion c
    where c.condominio_id = p_condominio_id and c.periodo = v_mes;
  end if;

  return v_id;
end;
$fn$;

revoke execute on function public.abrir_mes_de_cuota(uuid, date) from public, anon, authenticated;
grant execute on function public.abrir_mes_de_cuota(uuid, date) to service_role;


-- A mano, desde la pantalla de pagos. Sin fecha, el mes que corre en el edificio.
create or replace function public.crear_cuota_del_mes(
  p_condominio_id uuid,
  p_periodo       date default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_hoy date := (now() at time zone public.zona_horaria_del_condominio(p_condominio_id))::date;
  v_mes date := date_trunc('month', coalesce(p_periodo, v_hoy))::date;
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración crea el mes de cuota';
  end if;

  -- Un mes de adelanto como mucho: mas alla es casi seguro un error de fecha.
  if v_mes > (date_trunc('month', v_hoy) + interval '1 month')::date then
    raise exception 'Solo se puede crear el mes que corre o el siguiente';
  end if;

  return public.abrir_mes_de_cuota(p_condominio_id, v_mes);
end;
$fn$;

revoke execute on function public.crear_cuota_del_mes(uuid, date) from public, anon;
grant execute on function public.crear_cuota_del_mes(uuid, date) to authenticated, service_role;


-- La tarea diaria. Corre todos los dias y no solo el 1: si un dia falla, al
-- siguiente lo crea, y crear dos veces el mismo mes no hace nada.
create or replace function public.crear_cuotas_del_mes()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_fila    record;
  v_antes   integer;
  v_cuantas integer := 0;
begin
  for v_fila in
    select c.id,
           date_trunc('month', (now() at time zone public.zona_horaria_del_condominio(c.id)))::date as mes
    from public.condominio c
    where c.cuota_automatica and c.cuota_monto is not null and c.deleted_at is null
  loop
    select count(*) into v_antes
    from public.cuota_administracion q
    where q.condominio_id = v_fila.id and q.periodo = v_fila.mes;

    if v_antes = 0 then
      perform public.abrir_mes_de_cuota(v_fila.id, v_fila.mes);
      v_cuantas := v_cuantas + 1;
    end if;
  end loop;

  return v_cuantas;
end;
$fn$;

revoke execute on function public.crear_cuotas_del_mes() from public, anon, authenticated;
grant execute on function public.crear_cuotas_del_mes() to service_role;

do $$
begin
  perform cron.unschedule('cuotas-del-mes');
exception when others then
  null;
end $$;

select cron.schedule(
  'cuotas-del-mes',
  '20 11 * * *',
  $cron$ select public.crear_cuotas_del_mes(); $cron$
);


-- ----------------------------------------------------------------------------
-- El pago anota lo que paga esa vivienda
-- ----------------------------------------------------------------------------
-- Antes anotaba siempre el importe general del mes.

create or replace function public.marcar_pago_cuota(
  p_cuota_id  uuid,
  p_unidad_id uuid,
  p_pagado    boolean,
  p_origen    text default 'manual'
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_condominio uuid;
  v_monto      numeric(12,2);
begin
  select c.condominio_id, c.monto into v_condominio, v_monto
  from public.cuota_administracion c where c.id = p_cuota_id;

  if v_condominio is null then
    raise exception 'Esa cuota no existe';
  end if;

  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion registra los pagos';
  end if;

  if public.condominio_de_unidad(p_unidad_id) is distinct from v_condominio then
    raise exception 'Esa vivienda no es de este condominio';
  end if;

  select coalesce(u.cuota_monto, v_monto) into v_monto
  from public.unidad u where u.id = p_unidad_id;

  insert into public.pago_cuota
    (cuota_id, unidad_id, pagado, pagado_en, monto, origen, registrado_por)
  values (
    p_cuota_id, p_unidad_id, p_pagado,
    case when p_pagado then current_date end,
    case when p_pagado then v_monto end,
    p_origen::public.origen_pago,
    auth.uid()
  )
  on conflict (cuota_id, unidad_id) do update set
    pagado         = excluded.pagado,
    pagado_en      = excluded.pagado_en,
    monto          = excluded.monto,
    origen         = excluded.origen,
    registrado_por = excluded.registrado_por,
    updated_at     = now();
end;
$fn$;


-- ----------------------------------------------------------------------------
-- El comite de propietarios
-- ----------------------------------------------------------------------------
-- La tabla existe desde septiembre y nadie la escribia: el boton «Marcar
-- Comité de Propietarios» guardaba en la memoria del telefono y se perdia al
-- recargar.

create or replace function public.comite_por_unidad(p_condominio_id uuid)
returns table (unidad_id uuid, tiene_cuenta boolean, en_comite boolean)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración ve el comité';
  end if;

  return query
    select u.id,
           coalesce(bool_or(m.usuario_id is not null), false),
           coalesce(bool_or(k.id is not null), false)
    from public.unidad u
    left join public.membresia_unidad m
      on m.unidad_id = u.id and m.rol = 'propietario' and m.activo
    left join public.comite_propietarios k
      on k.usuario_id = m.usuario_id
     and k.condominio_id = p_condominio_id
     and k.hasta is null
    where u.condominio_id = p_condominio_id and u.deleted_at is null
    group by u.id;
end;
$fn$;

revoke execute on function public.comite_por_unidad(uuid) from public, anon;
grant execute on function public.comite_por_unidad(uuid) to authenticated, service_role;


create or replace function public.poner_en_comite(
  p_unidad_id uuid,
  p_en_comite boolean
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_condominio uuid := public.condominio_de_unidad(p_unidad_id);
  v_usuarios   uuid[];
begin
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración cambia el comité';
  end if;

  select array_agg(distinct m.usuario_id) into v_usuarios
  from public.membresia_unidad m
  where m.unidad_id = p_unidad_id
    and m.rol = 'propietario'
    and m.activo
    and m.usuario_id is not null;

  if v_usuarios is null then
    raise exception 'El propietario de esa vivienda todavía no tiene cuenta en Veciyo';
  end if;

  if p_en_comite then
    insert into public.comite_propietarios (condominio_id, usuario_id)
    select v_condominio, u from unnest(v_usuarios) u
    on conflict (condominio_id, usuario_id) where hasta is null do nothing;
  else
    -- Quien entro hoy mismo no deja historia: `hasta` tiene que ser posterior
    -- a `desde`, asi que se quita la fila. El resto se cierra con fecha.
    delete from public.comite_propietarios k
    where k.condominio_id = v_condominio
      and k.usuario_id = any (v_usuarios)
      and k.hasta is null
      and k.desde >= current_date;

    update public.comite_propietarios k
    set hasta = current_date
    where k.condominio_id = v_condominio
      and k.usuario_id = any (v_usuarios)
      and k.hasta is null;
  end if;
end;
$fn$;

revoke execute on function public.poner_en_comite(uuid, boolean) from public, anon;
grant execute on function public.poner_en_comite(uuid, boolean) to authenticated, service_role;

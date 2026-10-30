-- Importes variables y pagos parciales de la cuota (30/10/2026).
--
-- Pedidos del cliente:
--   · Para Claude 187: «Cambiar importe» de una vivienda pide el importe
--     mensual y los importes variables que hagan falta; lo que debe pagar ese
--     mes es la suma.
--   · Para Claude 188: en vez de la casilla «Pagado / No pagado», se registra
--     cuánto pagó. Si cubre el total, «Pagado»; si no, «Pago parcial», y se
--     siguen registrando pagos hasta completarlo. Un pago nunca puede pasar de
--     lo que falta.
--   · Para Claude 189: la carga masiva lee un Excel con el monto pagado de
--     cada vivienda y lo registra con las mismas reglas.
--
-- Cómo queda:
--   · `importe_variable_cuota`: los importes variables de una vivienda en un
--     mes. El mensual sigue siendo `unidad.cuota_monto` (o el general).
--   · `abono_cuota`: cada pago, con su importe, fecha y quién lo registró.
--   · `pago_cuota` se mantiene al día solo --`pagado` cuando lo abonado cubre
--     el total-- porque el Cuadro de Honor, los reportes y la visibilidad de
--     las cuotas lo leen. Un pago marcado antes con la casilla, sin abonos,
--     cuenta como pagado entero.
--
-- Solo aditiva: dos tablas y funciones nuevas; no se toca ningún dato.

create table if not exists public.importe_variable_cuota (
  id uuid primary key default gen_random_uuid(),
  cuota_id uuid not null references public.cuota_administracion(id) on delete cascade,
  unidad_id uuid not null references public.unidad(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.importe_variable_cuota is
  'Importes que se suman al mensual de una vivienda en un mes (Para Claude 187, 30/10/2026).';
create index if not exists importe_variable_cuota_por_unidad on public.importe_variable_cuota (cuota_id, unidad_id);

create table if not exists public.abono_cuota (
  id uuid primary key default gen_random_uuid(),
  cuota_id uuid not null references public.cuota_administracion(id) on delete cascade,
  unidad_id uuid not null references public.unidad(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  pagado_en date not null,
  origen public.origen_pago not null default 'manual',
  registrado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.abono_cuota is
  'Cada pago de la cuota de una vivienda en un mes. Suman hasta el total y nunca lo pasan (Para Claude 188, 30/10/2026).';
create index if not exists abono_cuota_por_unidad on public.abono_cuota (cuota_id, unidad_id);

alter table public.importe_variable_cuota enable row level security;
alter table public.abono_cuota enable row level security;

drop policy if exists importe_variable_cuota_lectura on public.importe_variable_cuota;
create policy importe_variable_cuota_lectura on public.importe_variable_cuota
  for select using (public.es_miembro_unidad(unidad_id) or public.es_admin_condominio(public.condominio_de_unidad(unidad_id)));
drop policy if exists abono_cuota_lectura on public.abono_cuota;
create policy abono_cuota_lectura on public.abono_cuota
  for select using (public.es_miembro_unidad(unidad_id) or public.es_admin_condominio(public.condominio_de_unidad(unidad_id)));

grant select on public.importe_variable_cuota, public.abono_cuota to authenticated;

drop trigger if exists importe_variable_cuota_tocar_updated_at on public.importe_variable_cuota;
create trigger importe_variable_cuota_tocar_updated_at before update on public.importe_variable_cuota
  for each row execute function public.tocar_updated_at();
drop trigger if exists abono_cuota_tocar_updated_at on public.abono_cuota;
create trigger abono_cuota_tocar_updated_at before update on public.abono_cuota
  for each row execute function public.tocar_updated_at();

-- Lo que debe una vivienda en un mes: el mensual (propio o general) más los variables.
create or replace function public.total_de_la_cuota(p_cuota_id uuid, p_unidad_id uuid)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(u.cuota_monto, c.monto, 0)
       + coalesce((select sum(v.monto) from public.importe_variable_cuota v
                   where v.cuota_id = p_cuota_id and v.unidad_id = p_unidad_id), 0)
  from public.cuota_administracion c, public.unidad u
  where c.id = p_cuota_id and u.id = p_unidad_id;
$function$;

-- Lo que lleva pagado. Lo marcado con la casilla antes de los abonos cuenta entero.
create or replace function public.abonado_de_la_cuota(p_cuota_id uuid, p_unidad_id uuid)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select case
    when exists (select 1 from public.abono_cuota a where a.cuota_id = p_cuota_id and a.unidad_id = p_unidad_id)
      then (select sum(a.monto) from public.abono_cuota a where a.cuota_id = p_cuota_id and a.unidad_id = p_unidad_id)
    when exists (select 1 from public.pago_cuota pc where pc.cuota_id = p_cuota_id and pc.unidad_id = p_unidad_id and pc.pagado)
      then public.total_de_la_cuota(p_cuota_id, p_unidad_id)
    else 0
  end;
$function$;

-- `pago_cuota` al día con los abonos: pagado cuando cubren el total.
create or replace function public.sincronizar_pago_cuota(p_cuota_id uuid, p_unidad_id uuid, p_origen public.origen_pago)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_total numeric := public.total_de_la_cuota(p_cuota_id, p_unidad_id);
  v_abonado numeric;
  v_pagado boolean;
  v_condominio uuid := public.condominio_de_unidad(p_unidad_id);
begin
  if not exists (select 1 from public.abono_cuota where cuota_id = p_cuota_id and unidad_id = p_unidad_id) then
    return;
  end if;
  v_abonado := (select sum(monto) from public.abono_cuota where cuota_id = p_cuota_id and unidad_id = p_unidad_id);
  v_pagado := v_total > 0 and v_abonado >= v_total;
  insert into public.pago_cuota (cuota_id, unidad_id, pagado, pagado_en, monto, origen, registrado_por)
  values (p_cuota_id, p_unidad_id, v_pagado,
          case when v_pagado then public.hoy_en_el_edificio(v_condominio) end,
          v_abonado, p_origen, auth.uid())
  on conflict (cuota_id, unidad_id) do update set
    pagado = excluded.pagado, pagado_en = excluded.pagado_en, monto = excluded.monto,
    origen = excluded.origen, registrado_por = excluded.registrado_por, updated_at = now();
end;
$function$;

create or replace function public.cambiar_importe_de_cuota(
  p_cuota_id uuid, p_unidad_id uuid, p_mensual numeric, p_variables numeric[] default '{}'
)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
begin
  select c.condominio_id into v_condominio from public.cuota_administracion c where c.id = p_cuota_id;
  if v_condominio is null or not public.es_admin_condominio(v_condominio)
     or public.condominio_de_unidad(p_unidad_id) is distinct from v_condominio then
    raise exception 'Solo la administración cambia el importe de una vivienda';
  end if;
  if p_mensual is not null and p_mensual <= 0 then
    raise exception 'El importe mensual tiene que ser mayor que cero';
  end if;
  if exists (select 1 from unnest(coalesce(p_variables, '{}')) v where v is null or v <= 0) then
    raise exception 'Cada importe variable tiene que ser mayor que cero';
  end if;

  -- El mensual es el de la vivienda, de ahí en adelante; null vuelve al general.
  update public.unidad set cuota_monto = p_mensual where id = p_unidad_id;

  -- Los variables son de este mes: se reemplazan por los que se mandan.
  delete from public.importe_variable_cuota where cuota_id = p_cuota_id and unidad_id = p_unidad_id;
  insert into public.importe_variable_cuota (cuota_id, unidad_id, monto)
  select p_cuota_id, p_unidad_id, v from unnest(coalesce(p_variables, '{}')) v;

  perform public.sincronizar_pago_cuota(p_cuota_id, p_unidad_id, 'manual');
end;
$function$;

create or replace function public.registrar_abono_cuota(
  p_cuota_id uuid, p_unidad_id uuid, p_monto numeric, p_origen text default 'manual'
)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
  v_saldo numeric;
begin
  select c.condominio_id into v_condominio from public.cuota_administracion c where c.id = p_cuota_id;
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración registra los pagos';
  end if;
  if public.condominio_de_unidad(p_unidad_id) is distinct from v_condominio then
    raise exception 'Esa vivienda no es de este condominio';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El importe pagado tiene que ser mayor que cero';
  end if;

  v_saldo := public.total_de_la_cuota(p_cuota_id, p_unidad_id) - public.abonado_de_la_cuota(p_cuota_id, p_unidad_id);
  if v_saldo <= 0 then
    raise exception 'Esta vivienda ya pagó todo este mes';
  end if;
  if p_monto > v_saldo then
    raise exception 'El pago (%) supera lo que falta por pagar (%)', p_monto, v_saldo;
  end if;

  -- Si estaba marcada entera con la casilla vieja, no hay saldo y no llega aquí.
  insert into public.abono_cuota (cuota_id, unidad_id, monto, pagado_en, origen)
  values (p_cuota_id, p_unidad_id, p_monto, public.hoy_en_el_edificio(v_condominio), p_origen::public.origen_pago);

  perform public.sincronizar_pago_cuota(p_cuota_id, p_unidad_id, p_origen::public.origen_pago);
end;
$function$;

-- La carga masiva desde la plantilla: código y monto pagado de cada vivienda.
create or replace function public.registrar_abonos_masivos(p_cuota_id uuid, p_filas jsonb)
 returns table(codigo text, registrado boolean, mensaje text)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
  v_fila jsonb;
  v_codigo text;
  v_monto numeric;
  v_unidad uuid;
begin
  select c.condominio_id into v_condominio from public.cuota_administracion c where c.id = p_cuota_id;
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración registra los pagos';
  end if;

  for v_fila in select * from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) loop
    v_codigo := btrim(coalesce(v_fila ->> 'codigo', ''));
    begin
      v_monto := nullif(btrim(coalesce(v_fila ->> 'monto', '')), '')::numeric;
    exception when others then
      return query select v_codigo, false, 'El monto no es un número';
      continue;
    end;
    if v_monto is null or v_monto = 0 then
      continue;
    end if;
    select u.id into v_unidad from public.unidad u
     where u.condominio_id = v_condominio and u.deleted_at is null
       and upper(btrim(u.codigo)) = upper(v_codigo)
     limit 1;
    if v_unidad is null then
      return query select v_codigo, false, 'No existe ese departamento';
      continue;
    end if;
    begin
      perform public.registrar_abono_cuota(p_cuota_id, v_unidad, v_monto, 'carga_masiva');
      return query select v_codigo, true, null::text;
    exception when others then
      return query select v_codigo, false, sqlerrm;
    end;
  end loop;
end;
$function$;

-- Cómo va cada vivienda en un mes: mensual, variables, total, pagado y saldo.
create or replace function public.estado_de_cuotas(p_cuota_id uuid)
 returns table(unidad_id uuid, codigo text, responsable text, mensual numeric, variables numeric[],
               total numeric, abonado numeric, saldo numeric)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
begin
  select c.condominio_id into v_condominio from public.cuota_administracion c where c.id = p_cuota_id;
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    return;
  end if;
  return query
  with responsables as (
    select distinct on (m.unidad_id) m.unidad_id, m.nombre
    from public.membresia_unidad m
    where m.activo and m.rol in ('propietario', 'inquilino_lider')
    order by m.unidad_id, (m.rol = 'propietario') desc, m.created_at
  )
  select u.id, u.codigo, r.nombre,
         coalesce(u.cuota_monto, c.monto),
         coalesce((select array_agg(v.monto order by v.created_at) from public.importe_variable_cuota v
                   where v.cuota_id = p_cuota_id and v.unidad_id = u.id), '{}'),
         public.total_de_la_cuota(p_cuota_id, u.id),
         public.abonado_de_la_cuota(p_cuota_id, u.id),
         greatest(public.total_de_la_cuota(p_cuota_id, u.id) - public.abonado_de_la_cuota(p_cuota_id, u.id), 0)
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  join public.cuota_administracion c on c.id = p_cuota_id
  left join responsables r on r.unidad_id = u.id
  where u.condominio_id = v_condominio and u.deleted_at is null
  order by t.numero, u.codigo;
end;
$function$;

revoke execute on function public.total_de_la_cuota(uuid, uuid) from public, anon;
revoke execute on function public.abonado_de_la_cuota(uuid, uuid) from public, anon;
revoke execute on function public.sincronizar_pago_cuota(uuid, uuid, public.origen_pago) from public, anon, authenticated;
revoke execute on function public.cambiar_importe_de_cuota(uuid, uuid, numeric, numeric[]) from public, anon;
revoke execute on function public.registrar_abono_cuota(uuid, uuid, numeric, text) from public, anon;
revoke execute on function public.registrar_abonos_masivos(uuid, jsonb) from public, anon;
revoke execute on function public.estado_de_cuotas(uuid) from public, anon;
grant execute on function public.total_de_la_cuota(uuid, uuid) to authenticated, service_role;
grant execute on function public.abonado_de_la_cuota(uuid, uuid) to authenticated, service_role;
grant execute on function public.sincronizar_pago_cuota(uuid, uuid, public.origen_pago) to service_role;
grant execute on function public.cambiar_importe_de_cuota(uuid, uuid, numeric, numeric[]) to authenticated, service_role;
grant execute on function public.registrar_abono_cuota(uuid, uuid, numeric, text) to authenticated, service_role;
grant execute on function public.registrar_abonos_masivos(uuid, jsonb) to authenticated, service_role;
grant execute on function public.estado_de_cuotas(uuid) to authenticated, service_role;

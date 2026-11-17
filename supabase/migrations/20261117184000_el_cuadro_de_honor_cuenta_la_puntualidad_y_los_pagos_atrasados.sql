-- El Cuadro de Honor: quién ve la recaudación, la puntualidad de lo recaudado
-- y los pagos atrasados que pagan primero lo más viejo (17/11/2026).
--
-- Pedidos del cliente:
--   1. Los huéspedes temporales no ven nada del Cuadro de Honor, y la
--      recaudación solo la ven propietarios, residentes (inquilino líder y
--      anfitrión incluidos) y la administración: ni la portería ni los
--      huéspedes. Lo sujeta la base, no solo la pantalla.
--   2. De lo recaudado, cuánto se pagó a tiempo y cuánto con atraso, en
--      viviendas y en dinero.
--   3. Un pago que llega tarde paga la cuota más vieja que se debe, no la del
--      mes en curso. Lo que sobra pasa a la siguiente, y si no se debe nada
--      queda como saldo a favor para el próximo mes.
--
-- Cómo estaban los pagos: cada abono (`abono_cuota`) iba a un mes elegido por
-- la administración, y no podía pasar de lo que faltaba de ese mes. Ahora cada
-- pago de una vivienda se guarda entero en `pago_vivienda` y la base lo reparte
-- en abonos, del mes más viejo al más nuevo. Los abonos repartidos llevan el
-- pago del que salen (`abono_cuota.pago_id`), así que repartir dos veces no
-- aplica dos veces: lo que queda por repartir es siempre el pago menos lo ya
-- repartido.
--
-- Solo aditiva: una tabla, una columna con null por defecto, funciones nuevas
-- o reescritas con la misma firma, dos disparadores y una política reescrita
-- más cerrada. Los abonos que ya existen no se tocan.

-- ---------------------------------------------------------------------------
-- 1. Quién ve la recaudación
-- ---------------------------------------------------------------------------

/*
  Administración (y su coadministración) y quien vive o es dueño de una
  vivienda del edificio: propietario, inquilino líder, residente y
  corresidente. Fuera: la portería (está en `membresia_condominio` como
  guardia), el huésped temporal y el coadministrador de una vivienda, que
  gestiona por encargo y no es vecino.
*/
create or replace function public.puede_ver_recaudacion(p_condominio_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select public.es_admin_condominio(p_condominio_id)
      or exists (
        select 1
        from public.membresia_unidad mu
        join public.unidad u on u.id = mu.unidad_id
        where u.condominio_id = p_condominio_id
          and u.deleted_at is null
          and mu.usuario_id = auth.uid()
          and mu.activo
          and mu.rol in ('propietario', 'inquilino_lider', 'residente', 'corresidente')
      );
$function$;

comment on function public.puede_ver_recaudacion(uuid) is
  'Si quien pregunta puede ver la recaudación de las cuotas del edificio: administración, propietarios y residentes. Ni portería ni huéspedes (17/11/2026).';

revoke execute on function public.puede_ver_recaudacion(uuid) from public, anon;
grant execute on function public.puede_ver_recaudacion(uuid) to authenticated, service_role;

-- El importe de cada mes era legible por cualquier miembro, portería incluida.
drop policy if exists cuota_administracion_lectura on public.cuota_administracion;
create policy cuota_administracion_lectura on public.cuota_administracion
  for select using (public.puede_ver_recaudacion(condominio_id));

-- La recaudación por mes: la misma de 20261109190000, con el permiso nuevo.
create or replace function public.resumen_cuotas(p_condominio_id uuid)
 RETURNS TABLE(periodo date, moneda character, esperado numeric, recibido numeric, al_dia integer, atrasados integer, tiene_cuota boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with por_vivienda as (
    select
      c.id as cuota_id,
      c.periodo,
      c.moneda,
      public.total_de_la_cuota(c.id, u.id) as total,
      public.abonado_de_la_cuota(c.id, u.id) as abonado
    from public.cuota_administracion c
    join public.unidad u
      on u.condominio_id = c.condominio_id and u.deleted_at is null
    where c.condominio_id = p_condominio_id
  ),
  definidos as (
    select
      pv.periodo,
      pv.moneda,
      coalesce(sum(pv.total), 0)::numeric(12,2) as esperado,
      coalesce(sum(least(pv.abonado, pv.total)), 0)::numeric(12,2) as recibido,
      count(*) filter (where pv.abonado >= pv.total)::int as al_dia,
      count(*) filter (where pv.abonado < pv.total)::int as atrasados,
      true as tiene_cuota
    from por_vivienda pv
    group by pv.cuota_id, pv.periodo, pv.moneda
  ),
  en_curso as (
    select
      date_trunc('month', public.hoy_en_el_edificio(p_condominio_id))::date as periodo,
      null::char(3) as moneda,
      0::numeric(12,2) as esperado,
      0::numeric(12,2) as recibido,
      0 as al_dia,
      (select count(*)::int from public.unidad u
       where u.condominio_id = p_condominio_id and u.deleted_at is null) as atrasados,
      false as tiene_cuota
    where not exists (
      select 1 from definidos d
      where d.periodo = date_trunc('month', public.hoy_en_el_edificio(p_condominio_id))::date
    )
  )
  select * from (
    select * from definidos
    union all
    select * from en_curso
  ) todo
  -- Antes `es_miembro_condominio`, que deja pasar a la portería (17/11/2026).
  where public.puede_ver_recaudacion(p_condominio_id)
  order by periodo desc
  limit public.parametro_entero('cuotas_meses_historial', p_condominio_id);
$function$;

-- Quién pagó y quién no: igual que antes, con el permiso nuevo.
create or replace function public.detalle_cuotas(p_condominio_id uuid, p_periodo date DEFAULT NULL::date)
 RETURNS TABLE(unidad_id uuid, codigo text, torre integer, responsable text, pagado boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_visible public.visibilidad_cuotas;
  v_admin   boolean;
  v_periodo date;
begin
  -- Antes `es_miembro_condominio`: la portería también lo leía (17/11/2026).
  if not public.puede_ver_recaudacion(p_condominio_id) then
    return;
  end if;

  select cuotas_visibilidad into v_visible
  from public.condominio where id = p_condominio_id;

  v_admin := public.es_admin_condominio(p_condominio_id);

  -- La administración ve todo siempre: es quien cobra.
  if not v_admin and v_visible = 'porcentaje' then
    return;
  end if;

  -- Sin periodo pedido, el último que tenga cuota (el mes en curso casi nunca la tiene).
  select c.periodo into v_periodo
  from public.cuota_administracion c
  where c.condominio_id = p_condominio_id
  order by c.periodo desc
  limit 1;

  v_periodo := coalesce(p_periodo, v_periodo, date_trunc('month', public.hoy_en_el_edificio(p_condominio_id))::date);

  return query
  with responsables as (
    select distinct on (m.unidad_id) m.unidad_id, m.nombre
    from public.membresia_unidad m
    where m.activo and m.rol in ('propietario', 'inquilino_lider')
    order by m.unidad_id, (m.rol = 'propietario') desc, m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.nombre,
    coalesce(pc.pagado, false)
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  left join responsables r on r.unidad_id = u.id
  left join public.cuota_administracion c
    on c.condominio_id = u.condominio_id and c.periodo = v_periodo
  left join public.pago_cuota pc
    on pc.cuota_id = c.id and pc.unidad_id = u.id
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and (
      v_admin
      or v_visible = 'quien_debe'
      or (v_visible = 'quien_pago' and coalesce(pc.pagado, false))
    )
  order by t.numero, u.codigo;
end;
$function$;

/*
  El cuadro en sí lo siguen viendo los miembros (la portería ve los
  reconocimientos), pero los meses al día de cada vivienda son recaudación:
  quien no puede verla recibe la lista entera, sin contador, igual que cuando
  el edificio publica solo el porcentaje. El huésped ya no entraba por
  `es_miembro_condominio`.
*/
create or replace function public.cuadro_honor(p_condominio_id uuid)
 RETURNS TABLE(unidad_id uuid, codigo text, torre_numero integer, responsable_usuario_id uuid, responsable text, periodos_al_dia integer, periodos_totales integer, insignias integer, insignias_detalle jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with periodos as (
    select id, periodo
    from public.cuota_administracion
    where condominio_id = p_condominio_id
      and (public.cuadro_honor_cuenta_mes_en_curso(p_condominio_id)
           or coalesce(vence_en, (periodo + interval '1 month' - interval '1 day')::date)
              < public.hoy_en_el_edificio(p_condominio_id))
    order by periodo desc
    limit public.parametro_entero('cuotas_meses_historial', p_condominio_id)
  ),
  publica as (
    select (coalesce(c.cuotas_visibilidad <> 'porcentaje', false)
            or public.es_admin_condominio(p_condominio_id))
           -- Y solo a quien puede ver la recaudación (17/11/2026).
           and public.puede_ver_recaudacion(p_condominio_id) as si
    from public.condominio c
    where c.id = p_condominio_id
  ),
  responsables as (
    select distinct on (m.unidad_id)
      m.unidad_id, m.usuario_id, m.nombre
    from public.membresia_unidad m
    where m.activo
    order by m.unidad_id,
             m.es_admin_primario desc,
             (m.rol = 'propietario') desc,
             m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.usuario_id,
    coalesce(
      case when p.usa_alias_cuadro_honor
            and not public.es_admin_condominio(p_condominio_id)
            and not public.es_guardia_de_condominio(p_condominio_id)
           then nullif(p.alias, '') end,
      r.nombre
    ),
    case when pub.si then pagos.al_dia end,
    case when pub.si then (select count(*) from periodos)::int end,
    (select count(*)::int
       from public.reconocimiento rec
      where rec.usuario_id = r.usuario_id
        and rec.condominio_id = p_condominio_id),
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'clave',    d.clave,
                  'etiqueta', d.etiqueta,
                  'icono',    d.icono,
                  'cantidad', d.cantidad
                )
                order by d.etiqueta
              )
         from (
           select i.clave, i.etiqueta, coalesce(i.icono, '⭐') as icono,
                  count(*)::int as cantidad
             from public.reconocimiento rec
             join public.insignia i on i.id = rec.insignia_id
            where rec.usuario_id = r.usuario_id
              and rec.condominio_id = p_condominio_id
            group by i.clave, i.etiqueta, i.icono
         ) d),
      '[]'::jsonb
    )
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  join responsables r on r.unidad_id = u.id
  left join public.perfil p on p.id = r.usuario_id
  cross join publica pub
  cross join lateral (
    select count(*) filter (where pc.pagado)::int as al_dia
    from periodos per
    left join public.pago_cuota pc
      on pc.cuota_id = per.id and pc.unidad_id = u.id
  ) pagos
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
    and (not pub.si or pagos.al_dia = (select count(*) from periodos))
  order by t.numero, u.codigo;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Los pagos de una vivienda, repartidos del mes más viejo al más nuevo
-- ---------------------------------------------------------------------------

create table if not exists public.pago_vivienda (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references public.unidad(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  pagado_en date not null,
  origen public.origen_pago not null default 'manual',
  -- Para que un mismo pago mandado dos veces (un reintento) no entre dos veces.
  referencia text,
  registrado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.pago_vivienda is
  'Cada pago de una vivienda, entero. La base lo reparte en abonos del mes más viejo que se debe al más nuevo; lo que sobra es saldo a favor (17/11/2026).';
comment on column public.pago_vivienda.referencia is
  'Opcional. Si llega, no se puede repetir en la misma vivienda: un reintento no registra el pago dos veces.';
create unique index if not exists pago_vivienda_referencia_unica
  on public.pago_vivienda (unidad_id, referencia) where referencia is not null;
create index if not exists pago_vivienda_por_unidad on public.pago_vivienda (unidad_id, pagado_en);

alter table public.pago_vivienda enable row level security;
drop policy if exists pago_vivienda_lectura on public.pago_vivienda;
create policy pago_vivienda_lectura on public.pago_vivienda
  for select using (public.es_miembro_unidad(unidad_id) or public.es_admin_condominio(public.condominio_de_unidad(unidad_id)));
grant select on public.pago_vivienda to authenticated;

drop trigger if exists pago_vivienda_tocar_updated_at on public.pago_vivienda;
create trigger pago_vivienda_tocar_updated_at before update on public.pago_vivienda
  for each row execute function public.tocar_updated_at();

-- De qué pago sale cada abono. Los de antes quedan en null: se registraron a un mes.
alter table public.abono_cuota
  add column if not exists pago_id uuid references public.pago_vivienda(id) on delete set null;
comment on column public.abono_cuota.pago_id is
  'El pago del que sale este abono, si la base lo repartió (17/11/2026). Null en los abonos de antes, que iban a un mes elegido.';
create index if not exists abono_cuota_por_pago on public.abono_cuota (pago_id) where pago_id is not null;

-- Lo que le queda a un pago por repartir.
create or replace function public.resto_del_pago(p_pago_id uuid)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select p.monto - coalesce((select sum(a.monto) from public.abono_cuota a where a.pago_id = p.id), 0)
  from public.pago_vivienda p
  where p.id = p_pago_id;
$function$;

/*
  Reparte lo que quede de los pagos de una vivienda: cada pago, del más viejo
  al más nuevo, cubre las cuotas que se deben del mes más viejo al más nuevo.
  Un pago parcial deja la cuota en «pago parcial» y no pasa a la siguiente; uno
  mayor cubre esa y sigue con la siguiente; si ya no se debe nada, el resto se
  queda esperando (saldo a favor) hasta que se abra otro mes.

  Se puede llamar las veces que sea: lo que reparte es siempre lo que falta
  por repartir. El candado por vivienda evita que dos llamadas a la vez
  repartan el mismo resto.

  Interna: no se concede a nadie.
*/
create or replace function public.imputar_pagos_de_vivienda(p_unidad_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid := public.condominio_de_unidad(p_unidad_id);
  v_pago record;
  v_cuota record;
  v_resto numeric;
  v_saldo numeric;
  v_parte numeric;
begin
  if v_condominio is null then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('imputar_pagos_de_vivienda:' || p_unidad_id::text, 0));

  for v_pago in
    select p.id, p.pagado_en, p.origen, p.registrado_por
    from public.pago_vivienda p
    where p.unidad_id = p_unidad_id
    order by p.pagado_en, p.created_at, p.id
  loop
    v_resto := public.resto_del_pago(v_pago.id);
    continue when v_resto <= 0;

    for v_cuota in
      select c.id
      from public.cuota_administracion c
      where c.condominio_id = v_condominio
      order by c.periodo
    loop
      exit when v_resto <= 0;
      v_saldo := public.total_de_la_cuota(v_cuota.id, p_unidad_id)
               - public.abonado_de_la_cuota(v_cuota.id, p_unidad_id);
      continue when v_saldo <= 0;

      v_parte := least(v_resto, v_saldo);
      insert into public.abono_cuota (cuota_id, unidad_id, monto, pagado_en, origen, registrado_por, pago_id)
      values (v_cuota.id, p_unidad_id, v_parte, v_pago.pagado_en, v_pago.origen, v_pago.registrado_por, v_pago.id);
      perform public.sincronizar_pago_cuota(v_cuota.id, p_unidad_id, v_pago.origen);
      v_resto := v_resto - v_parte;
    end loop;
  end loop;
end;
$function$;

revoke execute on function public.resto_del_pago(uuid) from public, anon, authenticated;
revoke execute on function public.imputar_pagos_de_vivienda(uuid) from public, anon, authenticated;
grant execute on function public.resto_del_pago(uuid) to service_role;
grant execute on function public.imputar_pagos_de_vivienda(uuid) to service_role;

/*
  Registrar un pago de una vivienda. Devuelve a qué meses fue y el saldo a
  favor que queda de ese pago (0 si se repartió entero). Solo la
  administración del edificio.
*/
create or replace function public.registrar_pago_de_vivienda(
  p_unidad_id uuid,
  p_monto numeric,
  p_pagado_en date default null,
  p_origen text default 'manual',
  p_referencia text default null
)
 returns table(periodo date, aplicado numeric, saldo_a_favor numeric)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid := public.condominio_de_unidad(p_unidad_id);
  v_hoy date;
  v_fecha date;
  v_pago uuid;
  v_resto numeric;
begin
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración registra los pagos';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El importe pagado tiene que ser mayor que cero';
  end if;
  v_hoy := public.hoy_en_el_edificio(v_condominio);
  v_fecha := coalesce(p_pagado_en, v_hoy);
  if v_fecha > v_hoy then
    raise exception 'La fecha del pago no puede ser posterior a hoy';
  end if;
  if nullif(btrim(p_referencia), '') is not null and exists (
    select 1 from public.pago_vivienda p
    where p.unidad_id = p_unidad_id and p.referencia = btrim(p_referencia)
  ) then
    raise exception 'Ese pago ya está registrado';
  end if;

  insert into public.pago_vivienda (unidad_id, monto, pagado_en, origen, referencia)
  values (p_unidad_id, p_monto, v_fecha, coalesce(p_origen, 'manual')::public.origen_pago,
          nullif(btrim(p_referencia), ''))
  returning id into v_pago;

  perform public.imputar_pagos_de_vivienda(p_unidad_id);

  v_resto := public.resto_del_pago(v_pago);
  return query
    select c.periodo, a.monto, v_resto
    from public.abono_cuota a
    join public.cuota_administracion c on c.id = a.cuota_id
    where a.pago_id = v_pago
    order by c.periodo;
  if not found then
    return query select null::date, 0::numeric, v_resto;
  end if;
end;
$function$;

revoke execute on function public.registrar_pago_de_vivienda(uuid, numeric, date, text, text) from public, anon;
grant execute on function public.registrar_pago_de_vivienda(uuid, numeric, date, text, text) to authenticated, service_role;
comment on function public.registrar_pago_de_vivienda(uuid, numeric, date, text, text) is
  'Registra un pago de una vivienda y lo reparte del mes más viejo que debe al más nuevo; lo que sobra queda a favor. Solo la administración (17/11/2026).';

/*
  La misma firma de siempre, que usan la pantalla de pagos, la carga masiva y
  las versiones de la app ya instaladas. Antes el abono iba al mes elegido y
  no podía pasar de lo que faltaba de ese mes; ahora el pago entra entero y la
  base lo reparte desde lo más viejo que se debe (pedido del cliente,
  17/11/2026). Si no se debe nada, queda a favor.
*/
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

  perform 1 from public.registrar_pago_de_vivienda(p_unidad_id, p_monto, null, p_origen, null);
end;
$function$;

-- Lo que una vivienda tiene a favor: lo que sus pagos no han podido repartir.
create or replace function public.saldo_a_favor_de_vivienda(p_unidad_id uuid)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(sum(public.resto_del_pago(p.id)), 0)::numeric(12,2)
  from public.pago_vivienda p
  where p.unidad_id = p_unidad_id
    and (public.es_miembro_unidad(p_unidad_id)
         or public.es_admin_condominio(public.condominio_de_unidad(p_unidad_id)));
$function$;
revoke execute on function public.saldo_a_favor_de_vivienda(uuid) from public, anon;
grant execute on function public.saldo_a_favor_de_vivienda(uuid) to authenticated, service_role;

-- Al abrir un mes, o al subirle el importe a una vivienda, el saldo a favor lo paga.
create or replace function public.repartir_saldos_al_abrir_mes()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.imputar_pagos_de_vivienda(u.id)
  from public.unidad u
  where u.condominio_id = new.condominio_id
    and u.deleted_at is null
    and exists (select 1 from public.pago_vivienda p
                where p.unidad_id = u.id and public.resto_del_pago(p.id) > 0);
  return null;
end;
$function$;

create or replace function public.repartir_saldo_al_subir_importe()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if exists (select 1 from public.pago_vivienda p
             where p.unidad_id = new.unidad_id and public.resto_del_pago(p.id) > 0) then
    perform public.imputar_pagos_de_vivienda(new.unidad_id);
  end if;
  return null;
end;
$function$;

revoke execute on function public.repartir_saldos_al_abrir_mes() from public, anon, authenticated;
revoke execute on function public.repartir_saldo_al_subir_importe() from public, anon, authenticated;

drop trigger if exists cuota_administracion_reparte_saldos on public.cuota_administracion;
create trigger cuota_administracion_reparte_saldos after insert on public.cuota_administracion
  for each row execute function public.repartir_saldos_al_abrir_mes();
drop trigger if exists importe_variable_cuota_reparte_saldo on public.importe_variable_cuota;
create trigger importe_variable_cuota_reparte_saldo after insert on public.importe_variable_cuota
  for each row execute function public.repartir_saldo_al_subir_importe();

/*
  Deshacer un pago marcado por error (13/11/2026), ahora con pagos repartidos:
  lo que de un pago se había aplicado a este mes se le descuenta al pago, así
  no vuelve como saldo a favor y la vivienda debe el mes entero, que es lo que
  promete «Deshacer». Lo que ese pago tenía en otros meses se queda.
*/
create or replace function public.anular_pago_de_cuota(p_cuota_id uuid, p_unidad_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_condominio uuid;
  v_del record;
begin
  select c.condominio_id into v_condominio from public.cuota_administracion c where c.id = p_cuota_id;
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración anula los pagos';
  end if;
  if public.condominio_de_unidad(p_unidad_id) is distinct from v_condominio then
    raise exception 'Esa vivienda no es de este condominio';
  end if;

  for v_del in
    select a.pago_id, sum(a.monto) as monto
    from public.abono_cuota a
    where a.cuota_id = p_cuota_id and a.unidad_id = p_unidad_id and a.pago_id is not null
    group by a.pago_id
  loop
    delete from public.abono_cuota
     where cuota_id = p_cuota_id and unidad_id = p_unidad_id and pago_id = v_del.pago_id;
    update public.pago_vivienda set monto = monto - v_del.monto
     where id = v_del.pago_id and monto - v_del.monto > 0;
    if not found then
      delete from public.pago_vivienda where id = v_del.pago_id;
    end if;
  end loop;

  delete from public.abono_cuota where cuota_id = p_cuota_id and unidad_id = p_unidad_id;
  delete from public.pago_cuota where cuota_id = p_cuota_id and unidad_id = p_unidad_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. La puntualidad de lo recaudado
-- ---------------------------------------------------------------------------

/*
  Por mes con cuota: cuántas viviendas pagaron todo a tiempo (hasta el día
  de vencimiento, o el último del mes si no lo tiene), cuántas lo completaron
  con atraso y cuántas no han terminado; y lo mismo en dinero.

  A tiempo o con atraso se mira por la fecha de cada abono. Un pago marcado con
  la casilla de antes, sin abonos, cuenta entero con su fecha. Un pago atrasado
  que la base aplicó a un mes viejo cuenta en ese mes y con atraso, que es lo
  que fue.

  `ya_vencio` dice si lo que falta ya está en mora o todavía está a tiempo.
*/
create or replace function public.puntualidad_de_cuotas(p_condominio_id uuid)
 returns table(
   periodo date, moneda character, vence_en date, ya_vencio boolean,
   viviendas integer, en_fecha integer, con_atraso integer, sin_pagar integer,
   esperado numeric, pagado_en_fecha numeric, pagado_con_atraso numeric, pendiente numeric
 )
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with cuotas as (
    select c.id, c.periodo, c.moneda,
           coalesce(c.vence_en, (c.periodo + interval '1 month' - interval '1 day')::date) as vence
    from public.cuota_administracion c
    where c.condominio_id = p_condominio_id
      and public.puede_ver_recaudacion(p_condominio_id)
    order by c.periodo desc
    limit public.parametro_entero('cuotas_meses_historial', p_condominio_id)
  ),
  por_vivienda as (
    select cu.id, cu.periodo, cu.moneda, cu.vence,
           public.total_de_la_cuota(cu.id, u.id) as total,
           ab.hay, ab.a_tiempo, ab.todo,
           coalesce(pc.pagado, false) as marcado, pc.pagado_en as marcado_en
    from cuotas cu
    join public.unidad u on u.condominio_id = p_condominio_id and u.deleted_at is null
    cross join lateral (
      select count(*) > 0 as hay,
             coalesce(sum(a.monto) filter (where a.pagado_en <= cu.vence), 0) as a_tiempo,
             coalesce(sum(a.monto), 0) as todo
      from public.abono_cuota a
      where a.cuota_id = cu.id and a.unidad_id = u.id
    ) ab
    left join public.pago_cuota pc on pc.cuota_id = cu.id and pc.unidad_id = u.id
  ),
  montos as (
    select pv.id, pv.periodo, pv.moneda, pv.vence, pv.total,
           case when pv.hay then least(pv.a_tiempo, pv.total)
                when pv.marcado and pv.marcado_en <= pv.vence then pv.total
                else 0 end as m_fecha,
           case when pv.hay then least(pv.todo, pv.total)
                when pv.marcado then pv.total
                else 0 end as m_pagado
    from por_vivienda pv
  )
  select m.periodo, m.moneda, m.vence,
         m.vence < public.hoy_en_el_edificio(p_condominio_id),
         count(*)::int,
         count(*) filter (where m.m_fecha >= m.total)::int,
         count(*) filter (where m.m_fecha < m.total and m.m_pagado >= m.total)::int,
         count(*) filter (where m.m_pagado < m.total)::int,
         coalesce(sum(m.total), 0)::numeric(12,2),
         coalesce(sum(m.m_fecha), 0)::numeric(12,2),
         coalesce(sum(m.m_pagado - m.m_fecha), 0)::numeric(12,2),
         coalesce(sum(m.total - m.m_pagado), 0)::numeric(12,2)
  from montos m
  group by m.id, m.periodo, m.moneda, m.vence
  order by m.periodo desc;
$function$;

revoke execute on function public.puntualidad_de_cuotas(uuid) from public, anon;
grant execute on function public.puntualidad_de_cuotas(uuid) to authenticated, service_role;
comment on function public.puntualidad_de_cuotas(uuid) is
  'Por mes: viviendas y dinero pagados a tiempo, con atraso y pendientes. Solo quien puede ver la recaudación (17/11/2026).';

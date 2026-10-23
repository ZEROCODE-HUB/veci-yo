-- El panel del administrador de la app: ajustes, precios, textos legales y
-- usuarios (23/10/2026).
--
-- Lo pidió el cliente: «que todo lo importante que sea parametrizable esté
-- ahí, y lo esencial: gestión de usuarios… pero no algo mega elaborado». Hasta
-- hoy los ~120 parámetros, los precios y los textos legales de la app solo se
-- cambiaban desde el panel de Supabase.
--
-- Mismas reglas que el panel de `20261002130000`:
--   · ninguna política nueva sobre tablas de los edificios: todo por funciones
--     `security definer` que comprueban el rol en su primera línea;
--   · mira cualquier miembro del equipo, escribe solo el dueño;
--   · cada cambio queda en la bitácora con quién lo hizo.
-- Y el límite del 02/10/2026: de una persona solo se ve su nombre, su correo,
-- el estado de su cuenta y en qué edificios está con qué rol. Nada de chats,
-- visitas, documentos ni pagos.

-- ---------------------------------------------------------------------------
-- 1. Ajustes (configuracion_plataforma)
-- ---------------------------------------------------------------------------

create or replace function public.panel_parametros()
returns table (
  clave text, descripcion text, categoria text, tipo text, unidad text,
  minimo numeric, maximo numeric, valores_permitidos text[], riesgo text,
  valor text, valor_por_defecto text, actualizado_en timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve los ajustes';
  end if;
  return query
  select c.clave, c.descripcion, c.categoria::text, c.tipo::text, c.unidad,
         c.minimo, c.maximo, c.valores_permitidos, c.riesgo::text,
         c.valor, c.valor_por_defecto, c.updated_at
  from public.configuracion_plataforma c
  order by c.categoria, c.clave;
end;
$$;

create or replace function public.panel_cambiar_parametro(p_clave text, p_valor text)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_antes text;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma cambia los ajustes';
  end if;

  select valor into v_antes from public.configuracion_plataforma where clave = p_clave;
  if not found then
    raise exception 'No existe el ajuste %', p_clave;
  end if;

  -- Los disparadores de la tabla validan tipo, rango y valores permitidos, y
  -- anotan el cambio en `configuracion_historial`.
  update public.configuracion_plataforma set valor = p_valor where clave = p_clave;

  -- El disparador anota `current_user` (postgres, por ser definer); se pone
  -- quién fue de verdad. Sin cambio de valor no hay fila nueva que marcar.
  update public.configuracion_historial set cambiado_por = auth.uid()::text
   where id = (
     select id from public.configuracion_historial
     where clave = p_clave and condominio_id is null
     order by cambiado_en desc limit 1)
     and valor_nuevo is not distinct from p_valor
     and cambiado_en > now() - interval '5 seconds';

  perform public.anotar_en_bitacora(
    'parametro_cambiado', null,
    jsonb_build_object('clave', p_clave, 'antes', v_antes, 'despues', p_valor));
  return p_valor;
end;
$$;

create or replace function public.panel_historial_parametro(p_clave text)
returns table (valor_anterior text, valor_nuevo text, cambiado_en timestamptz, quien text)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve el historial';
  end if;
  return query
  select h.valor_anterior, h.valor_nuevo, h.cambiado_en,
         -- Lo cambiado antes del panel lo anotó Supabase como «postgres».
         coalesce(
           (select nullif(trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), '')
            from public.perfil p where p.id::text = h.cambiado_por),
           'Panel de Supabase')
  from public.configuracion_historial h
  where h.clave = p_clave and h.condominio_id is null
  order by h.cambiado_en desc
  limit 20;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Planes y precios
-- ---------------------------------------------------------------------------

create or replace function public.panel_precios()
returns table (
  plan text, plan_nombre text, periodicidad text, pais text,
  monto numeric, moneda text, vigente_desde date
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve los precios';
  end if;
  return query
  select pl.clave::text, pl.nombre, pl.periodicidad::text, pr.pais::text,
         pr.monto, pr.moneda::text, pr.vigente_desde
  from public.plan_suscripcion pl
  join public.precio_plan pr on pr.plan_id = pl.id and pr.vigente_hasta is null
  where pl.activo
  order by pl.clave, pr.pais nulls first;
end;
$$;

/*
  Un precio nuevo cierra el anterior y abre otro desde hoy: los periodos ya
  cobrados guardan su importe (`sellar_importe_del_periodo`). Si el vigente
  empezó hoy o ayer, se corrige en el sitio en vez de abrir otro.
*/
create or replace function public.panel_cambiar_precio(p_plan text, p_pais text, p_monto numeric, p_moneda text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_plan uuid;
  v_vigente public.precio_plan%rowtype;
  v_pais char(2) := nullif(upper(btrim(coalesce(p_pais, ''))), '');
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma cambia los precios';
  end if;
  if p_monto is null or p_monto < 0 then
    raise exception 'El precio tiene que ser cero o más';
  end if;
  if not exists (select 1 from public.moneda where codigo = upper(btrim(p_moneda))) then
    raise exception 'La moneda % no existe', p_moneda;
  end if;

  select id into v_plan from public.plan_suscripcion where clave::text = p_plan;
  if v_plan is null then
    raise exception 'No existe el plan %', p_plan;
  end if;

  select * into v_vigente from public.precio_plan
  where plan_id = v_plan and pais is not distinct from v_pais and vigente_hasta is null;

  -- Desde ayer también se corrige: cerrarlo ayer chocaría con
  -- `vigente_hasta > vigente_desde`. Lo ya cobrado guarda su importe igual.
  if v_vigente.id is not null and v_vigente.vigente_desde >= current_date - 1 then
    update public.precio_plan
       set monto = round(p_monto, 2), moneda = upper(btrim(p_moneda))
     where id = v_vigente.id;
  else
    if v_vigente.id is not null then
      update public.precio_plan set vigente_hasta = current_date - 1 where id = v_vigente.id;
    end if;
    insert into public.precio_plan (plan_id, pais, monto, moneda, vigente_desde)
    values (v_plan, v_pais, round(p_monto, 2), upper(btrim(p_moneda)), current_date);
  end if;

  perform public.anotar_en_bitacora(
    'precio_cambiado', null,
    jsonb_build_object('plan', p_plan, 'pais', v_pais,
                       'antes', v_vigente.monto, 'despues', round(p_monto, 2),
                       'moneda', upper(btrim(p_moneda))));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Textos legales de la app
-- ---------------------------------------------------------------------------

create or replace function public.panel_documentos_legales()
returns table (tipo text, titulo text, contenido text, version int, actualizado_en timestamptz)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve los textos legales';
  end if;
  return query
  select d.tipo::text, d.titulo, d.contenido, d.version, d.updated_at
  from public.documento_legal d
  where d.condominio_id is null and d.vigente
  order by d.tipo;
end;
$$;

create or replace function public.panel_publicar_documento_legal(p_tipo text, p_titulo text, p_contenido text)
returns int
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_version int;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma publica los textos legales';
  end if;
  if p_tipo = 'terminos_condominio' then
    raise exception 'Los términos de cada edificio los publica su administración';
  end if;
  if nullif(btrim(coalesce(p_contenido, '')), '') is null or nullif(btrim(coalesce(p_titulo, '')), '') is null then
    raise exception 'Falta el título o el texto';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.documento_legal
  where condominio_id is null and tipo::text = p_tipo;

  update public.documento_legal set vigente = false
   where condominio_id is null and tipo::text = p_tipo and vigente;

  insert into public.documento_legal (condominio_id, tipo, titulo, contenido, version, vigente)
  values (null, p_tipo::public.tipo_documento_legal, btrim(p_titulo), p_contenido, v_version, true);

  perform public.anotar_en_bitacora(
    'documento_legal_publicado', null,
    jsonb_build_object('tipo', p_tipo, 'version', v_version));
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Usuarios: buscar (las acciones van por la función `panel-usuarios`)
-- ---------------------------------------------------------------------------

create or replace function public.panel_buscar_usuarios(p_texto text)
returns table (
  usuario_id uuid, nombre text, correo text, creada_en timestamptz,
  ultimo_ingreso timestamptz, correo_confirmado boolean, bloqueada boolean,
  edificios jsonb, rol_plataforma text
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_q text := lower(btrim(coalesce(p_texto, '')));
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma busca cuentas';
  end if;
  if length(v_q) < 3 then
    raise exception 'Escribe al menos 3 letras';
  end if;

  return query
  select u.id,
         coalesce(nullif(trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), 'Sin nombre'),
         u.email::text,
         u.created_at,
         u.last_sign_in_at,
         u.email_confirmed_at is not null,
         coalesce(u.banned_until > now(), false),
         -- En qué edificios está y con qué rol. Nada más de su vida en ellos.
         coalesce((
           select jsonb_agg(distinct jsonb_build_object('edificio', x.edificio, 'rol', x.rol))
           from (
             select c.nombre as edificio, m.rol::text as rol
             from public.membresia_unidad m
             join public.unidad un on un.id = m.unidad_id
             join public.condominio c on c.id = un.condominio_id
             where m.usuario_id = u.id and m.activo
             union all
             select c.nombre, mc.rol::text
             from public.membresia_condominio mc
             join public.condominio c on c.id = mc.condominio_id
             where mc.usuario_id = u.id and mc.activo
           ) x
         ), '[]'::jsonb),
         (select sp.rol::text from public.staff_plataforma sp where sp.usuario_id = u.id and sp.activo)
  from auth.users u
  left join public.perfil p on p.id = u.id
  where lower(u.email) like '%' || v_q || '%'
     or lower(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')) like '%' || v_q || '%'
  order by u.created_at desc
  limit 20;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Los descuentos: escribe solo el dueño (antes, cualquiera del equipo)
-- ---------------------------------------------------------------------------

drop policy if exists codigo_descuento_plataforma_alta on public.codigo_descuento;
create policy codigo_descuento_plataforma_alta on public.codigo_descuento
  for insert with check (public.es_dueno_plataforma() and creado_por = auth.uid());
drop policy if exists codigo_descuento_plataforma_cambio on public.codigo_descuento;
create policy codigo_descuento_plataforma_cambio on public.codigo_descuento
  for update using (public.es_dueno_plataforma()) with check (public.es_dueno_plataforma());

-- ---------------------------------------------------------------------------
-- Permisos: las funciones comprueban el rol dentro; se exponen a quien tiene
-- sesión, y a nadie más.
-- ---------------------------------------------------------------------------

comment on function public.panel_parametros() is 'Panel: los ajustes de la plataforma (equipo).';
comment on function public.panel_cambiar_parametro(text, text) is 'Panel: cambia un ajuste (dueño); valida la tabla y anota en la bitácora.';
comment on function public.panel_historial_parametro(text) is 'Panel: los últimos cambios de un ajuste (equipo).';
comment on function public.panel_precios() is 'Panel: los precios vigentes de los planes (equipo).';
comment on function public.panel_cambiar_precio(text, text, numeric, text) is 'Panel: cambia el precio de un plan desde hoy (dueño).';
comment on function public.panel_documentos_legales() is 'Panel: los textos legales vigentes de la app (equipo).';
comment on function public.panel_publicar_documento_legal(text, text, text) is 'Panel: publica una versión nueva de un texto legal de la app (dueño).';
comment on function public.panel_buscar_usuarios(text) is 'Panel: busca cuentas por correo o nombre; ve nombre, estado y edificios con su rol (equipo).';

revoke all on function public.panel_parametros() from public, anon;
revoke all on function public.panel_cambiar_parametro(text, text) from public, anon;
revoke all on function public.panel_historial_parametro(text) from public, anon;
revoke all on function public.panel_precios() from public, anon;
revoke all on function public.panel_cambiar_precio(text, text, numeric, text) from public, anon;
revoke all on function public.panel_documentos_legales() from public, anon;
revoke all on function public.panel_publicar_documento_legal(text, text, text) from public, anon;
revoke all on function public.panel_buscar_usuarios(text) from public, anon;
grant execute on function public.panel_parametros() to authenticated, service_role;
grant execute on function public.panel_cambiar_parametro(text, text) to authenticated, service_role;
grant execute on function public.panel_historial_parametro(text) to authenticated, service_role;
grant execute on function public.panel_precios() to authenticated, service_role;
grant execute on function public.panel_cambiar_precio(text, text, numeric, text) to authenticated, service_role;
grant execute on function public.panel_documentos_legales() to authenticated, service_role;
grant execute on function public.panel_publicar_documento_legal(text, text, text) to authenticated, service_role;
grant execute on function public.panel_buscar_usuarios(text) to authenticated, service_role;

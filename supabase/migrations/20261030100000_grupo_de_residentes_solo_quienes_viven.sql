-- El grupo de Residentes es de quienes viven en el edificio (30/10/2026).
--
-- Lo definido con el cliente (sesión del 15/07, confirmado el 30/10/2026):
--   · Grupo de propietarios: solo los propietarios.
--   · Grupo de residentes: todos los que viven en el edificio --inquilino
--     líder, residentes, co-administradores-- y el propietario **solo si vive
--     ahí** (entonces está en los dos grupos).
-- Hasta hoy en «Residentes» entraba todo propietario, viviera o no, y el
-- co-administrador de la vivienda no entraba.
--
-- Se añade a cada canal la marca `solo_quienes_viven`: con ella, de los roles
-- de vivienda solo cuentan quienes viven en ella (los mismos que cuenta
-- `vive_alguien_en`). La llevan los canales «Residentes». Solo aditiva.

alter table public.conversacion
  add column if not exists solo_quienes_viven boolean not null default false;
comment on column public.conversacion.solo_quienes_viven is
  'Solo en canales: si está encendida, de los roles de vivienda solo entran quienes viven en ella (propietario residente, inquilino líder, residente, corresidente, co-administrador). La lleva el grupo de Residentes (30/10/2026).';

-- Si esta membresía cuenta como «vive en la vivienda».
create or replace function public.membresia_vive_ahi(p_rol public.rol_unidad, p_es_residente boolean)
returns boolean
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select p_rol <> 'huesped_temporal'
     and (coalesce(p_es_residente, false)
          or p_rol in ('inquilino_lider', 'residente', 'corresidente', 'coadministrador'));
$$;
comment on function public.membresia_vive_ahi(public.rol_unidad, boolean) is
  'Si una membresía de vivienda es de alguien que vive ahí: el propietario solo si se declaró residente; el huésped nunca (30/10/2026).';

create or replace function public.es_del_canal(p_conversacion_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    -- Por el rol en la vivienda.
    select 1
    from public.canal_rol cr
    join public.conversacion c on c.id = cr.conversacion_id
    join public.membresia_unidad m on m.rol = cr.rol_unidad
    join public.unidad u on u.id = m.unidad_id and u.condominio_id = c.condominio_id
    where cr.conversacion_id = p_conversacion_id
      and cr.rol_unidad is not null
      and m.usuario_id = auth.uid()
      and m.activo
      -- En «Residentes», solo quien vive ahí (30/10/2026).
      and (not c.solo_quienes_viven or public.membresia_vive_ahi(m.rol, m.es_residente))
  ) or exists (
    -- O por el rol en el edificio: la administracion, la porteria.
    select 1
    from public.canal_rol cr
    join public.conversacion c on c.id = cr.conversacion_id
    join public.membresia_condominio mc
      on mc.rol = cr.rol_condominio and mc.condominio_id = c.condominio_id
    where cr.conversacion_id = p_conversacion_id
      and cr.rol_condominio is not null
      and mc.usuario_id = auth.uid()
      and mc.activo
  );
$function$;

create or replace function public.quien_esta_en_la_conversacion(p_conversacion_id uuid)
 returns table(usuario_id uuid)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with c as (
    select * from public.conversacion where id = p_conversacion_id
  )
  -- Un hilo de area: la vivienda, y el personal del area que lo atiende.
  select m.usuario_id
  from c
  join public.membresia_unidad m on m.unidad_id = c.unidad_id and m.activo
  where c.tipo = 'area'
    -- El huesped, mientras dure su estancia.
    and (
      m.rol <> 'huesped_temporal'
      or (
        (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_el_edificio(c.condominio_id))
        and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(c.condominio_id))
      )
    )

  union

  select mc.usuario_id
  from c
  join public.membresia_condominio mc
    on mc.condominio_id = c.condominio_id and mc.activo
  where c.tipo = 'area'
    and (
      (c.area = 'seguridad' and mc.rol = 'guardia')
      -- D-13: la porteria no, en el hilo de administracion. Y al reves
      -- tampoco: cada area atiende el suyo.
      or (c.area = 'administracion' and mc.rol in ('administrador', 'coadministrador'))
    )

  union

  -- Un canal: quien tenga alguno de los roles que lo componen. Es
  -- `es_del_canal` del derecho, como conjunto en vez de como pregunta.
  select m.usuario_id
  from c
  join public.canal_rol cr on cr.conversacion_id = c.id and cr.rol_unidad is not null
  join public.unidad u on u.condominio_id = c.condominio_id and u.deleted_at is null
  join public.membresia_unidad m
    on m.unidad_id = u.id and m.rol = cr.rol_unidad and m.activo
  where c.tipo = 'grupo'
    and (not c.solo_quienes_viven or public.membresia_vive_ahi(m.rol, m.es_residente))

  union

  select mc.usuario_id
  from c
  join public.canal_rol cr on cr.conversacion_id = c.id and cr.rol_condominio is not null
  join public.membresia_condominio mc
    on mc.condominio_id = c.condominio_id and mc.rol = cr.rol_condominio and mc.activo
  where c.tipo = 'grupo';
$function$;

create or replace function public.canales_del_condominio(p_condominio_id uuid)
 returns table(id uuid, nombre text, roles_unidad public.rol_unidad[], roles_condominio public.rol_condominio[], personas integer, archivado boolean)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select
    c.id,
    c.nombre,
    coalesce(array_agg(distinct cr.rol_unidad)
             filter (where cr.rol_unidad is not null), '{}'),
    coalesce(array_agg(distinct cr.rol_condominio)
             filter (where cr.rol_condominio is not null), '{}'),
    (
      -- Cuentas distintas, no membresias: quien tiene dos viviendas es una
      -- persona en el canal, no dos.
      select count(distinct quien)::integer from (
        select m.usuario_id as quien
        from public.canal_rol c2
        join public.membresia_unidad m on m.rol = c2.rol_unidad and m.activo
        join public.unidad u on u.id = m.unidad_id
                            and u.condominio_id = c.condominio_id
        where c2.conversacion_id = c.id and c2.rol_unidad is not null
          and m.usuario_id is not null
          and (not c.solo_quienes_viven or public.membresia_vive_ahi(m.rol, m.es_residente))
        union
        select mc.usuario_id
        from public.canal_rol c3
        join public.membresia_condominio mc
          on mc.rol = c3.rol_condominio and mc.activo
             and mc.condominio_id = c.condominio_id
        where c3.conversacion_id = c.id and c3.rol_condominio is not null
      ) q
    ),
    c.archivado_en is not null
  from public.conversacion c
  left join public.canal_rol cr on cr.conversacion_id = c.id
  where c.condominio_id = p_condominio_id
    and c.tipo = 'grupo'
    and public.puede_coadmin(p_condominio_id, 'contestarChat')
  group by c.id, c.nombre, c.condominio_id, c.archivado_en, c.solo_quienes_viven
  order by c.archivado_en nulls first, lower(c.nombre);
$function$;

-- Los canales con que nace un edificio: la marca viaja en la lista.
create or replace function public.sembrar_canales_del_condominio(p_condominio_id uuid, p_creada_por uuid default null::uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_creados integer := 0;
  v_canal   uuid;
  v_fila    record;
begin
  for v_fila in
    -- Los canales con que nace un edificio salen de la lista canales_iniciales.
    select o.etiqueta as nombre,
           array(select jsonb_array_elements_text(o.extra->'roles'))::public.rol_unidad[] as roles,
           coalesce((o.extra->>'solo_quienes_viven')::boolean, false) as solo_quienes_viven
    from public.catalogo_opcion o
    where o.catalogo = 'canales_iniciales' and o.activo and o.pais is null
    order by o.orden
  loop
    select c.id into v_canal
    from public.conversacion c
    where c.condominio_id = p_condominio_id
      and c.tipo = 'grupo'
      and lower(btrim(c.nombre)) = lower(v_fila.nombre);

    if v_canal is null then
      insert into public.conversacion (condominio_id, tipo, nombre, creada_por, solo_quienes_viven)
      values (p_condominio_id, 'grupo', v_fila.nombre, p_creada_por, v_fila.solo_quienes_viven)
      returning id into v_canal;
      v_creados := v_creados + 1;
    end if;

    -- Los roles por separado: un canal que existia sin roles se queda con los
    -- suyos, y volver a sembrar no se los quita.
    insert into public.canal_rol (conversacion_id, rol_unidad)
    select v_canal, unnest(v_fila.roles)
    on conflict do nothing;
  end loop;

  return v_creados;
end;
$function$;

-- La lista de canales iniciales: Residentes con el co-administrador y la marca.
update public.catalogo_opcion
   set extra = jsonb_build_object(
         'roles', '["propietario", "inquilino_lider", "residente", "corresidente", "coadministrador"]'::jsonb,
         'solo_quienes_viven', true)
 where catalogo = 'canales_iniciales' and lower(etiqueta) = 'residentes';

-- Los edificios que ya existen.
update public.conversacion
   set solo_quienes_viven = true
 where tipo = 'grupo' and lower(btrim(nombre)) = 'residentes';
insert into public.canal_rol (conversacion_id, rol_unidad)
select c.id, 'coadministrador'::public.rol_unidad
  from public.conversacion c
 where c.tipo = 'grupo' and lower(btrim(c.nombre)) = 'residentes'
on conflict do nothing;

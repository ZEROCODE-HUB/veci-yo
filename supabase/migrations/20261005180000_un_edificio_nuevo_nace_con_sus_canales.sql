-- ----------------------------------------------------------------------------
-- Un edificio nuevo nace con sus canales
-- ----------------------------------------------------------------------------
-- La otra mitad de lo que pidio el cliente el 02/10/2026: «canales creados al
-- dar de alta el edificio». `20261005140000` hizo que los canales se pudieran
-- tener; esto hace que existan.
--
-- Hoy `panel_crear_condominio` inserta el edificio, lo apunta en la bitacora e
-- invita al primer administrador. No deja ningun canal: el unico grupo que hay
-- en la base es de la siembra de septiembre, puesto a mano. Un edificio dado de
-- alta desde el panel nace con el chat vacio.
--
-- ----------------------------------------------------------------------------
-- Cuales, y por que solo dos
-- ----------------------------------------------------------------------------
-- Los dos que el proyecto ya tenia, con los mismos roles que la funcion vieja
-- les daba:
--
--   · **Residentes** --propietario, inquilino lider, residente, corresidente--:
--     quien vive ahi. El huesped temporal no, porque esta de paso; eso estaba
--     en la funcion como `m.rol <> 'huesped_temporal'` y ahora es, sencillamente,
--     un rol que no esta en la lista. Y como ahora es una lista, el
--     administrador puede añadirlo si su edificio lo quiere.
--   · **Propietarios** --propietario--: la asamblea.
--
-- Mas canales serian producto inventado: no hay nada en el KT que diga cuales.
-- Se crean con la pantalla, que es lo que se pidio.
--
-- ----------------------------------------------------------------------------
-- Idempotente, y por eso vale tambien para los edificios que ya existen
-- ----------------------------------------------------------------------------
-- La funcion no duplica: si el canal ya esta --por nombre-- no lo vuelve a
-- crear. Asi se puede llamar sobre los dos edificios que ya hay sin romper lo
-- que tienen, que es justo lo que hace el bloque del final.
--
-- Aditiva.

create or replace function public.sembrar_canales_del_condominio(
  p_condominio_id uuid,
  p_creada_por    uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_creados integer := 0;
  v_canal   uuid;
  v_fila    record;
begin
  for v_fila in
    select *
    from (values
      ('Residentes',
       array['propietario','inquilino_lider','residente','corresidente']::public.rol_unidad[]),
      ('Propietarios',
       array['propietario']::public.rol_unidad[])
    ) as t(nombre, roles)
  loop
    -- Por nombre, que es lo unico unico de un canal --`conversacion_canal_nombre_unico`--.
    select c.id into v_canal
    from public.conversacion c
    where c.condominio_id = p_condominio_id
      and c.tipo = 'grupo'
      and lower(btrim(c.nombre)) = lower(v_fila.nombre);

    if v_canal is null then
      insert into public.conversacion (condominio_id, tipo, nombre, creada_por)
      values (p_condominio_id, 'grupo', v_fila.nombre, p_creada_por)
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
$fn$;

comment on function public.sembrar_canales_del_condominio is
  'Deja en un edificio los dos canales de siempre --Residentes y Propietarios-- con sus roles. Idempotente: se puede llamar sobre un edificio en marcha sin duplicar nada ni quitarle roles.';

-- No se concede a nadie: la llama `panel_crear_condominio`, que es `definer`.
revoke execute on function public.sembrar_canales_del_condominio(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.sembrar_canales_del_condominio(uuid, uuid)
  to service_role;

-- ----------------------------------------------------------------------------
-- El alta del edificio los deja puestos
-- ----------------------------------------------------------------------------
-- Se copia tal cual de `20261002130000` y se le añade una linea. La
-- comprobacion de quien llama, los tres `raise` de los campos obligatorios y
-- la invitacion al primer administrador se quedan como estaban.
--
-- `creada_por` queda en null a proposito: no los creo una persona del
-- edificio, los creo el alta. La plataforma no es miembro del condominio y
-- ponerla ahi diria que participa en el chat, que es lo que no hace.

create or replace function public.panel_crear_condominio(
  p_nombre       text,
  p_direccion    text,
  p_pais         char(2),
  p_ciudad       text default null,
  p_moneda       char(3) default 'COP',
  p_correo_admin text default null,
  p_nombre_admin text default null
)
returns table (condominio_id uuid, invitacion_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_condominio uuid;
  v_invitacion uuid;
  v_token      text;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma da de alta un edificio';
  end if;

  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'El edificio necesita un nombre';
  end if;
  if coalesce(trim(p_direccion), '') = '' then
    raise exception 'El edificio necesita una direccion';
  end if;
  if p_pais is null then
    raise exception 'El edificio necesita un pais';
  end if;

  insert into public.condominio (nombre, direccion, pais, ciudad, moneda)
  values (trim(p_nombre), trim(p_direccion), upper(p_pais),
          nullif(trim(p_ciudad), ''), upper(coalesce(p_moneda, 'COP')))
  returning id into v_condominio;

  -- Los canales, antes de que entre nadie: asi el primer administrador se los
  -- encuentra hechos y los edita, en vez de tener que adivinar que hacen falta.
  perform public.sembrar_canales_del_condominio(v_condominio, null);

  perform public.anotar_en_bitacora(
    'condominio_creado', v_condominio,
    jsonb_build_object('nombre', trim(p_nombre))
  );

  if coalesce(trim(p_correo_admin), '') <> '' then
    select i.invitacion_id, i.token
      into v_invitacion, v_token
      from public.invitar_primer_administrador(
        v_condominio, p_correo_admin, coalesce(nullif(trim(p_nombre_admin), ''), 'Administración')
      ) i;
  end if;

  return query select v_condominio, v_invitacion, v_token;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- Crear y guardar un canal desde la pantalla
-- ----------------------------------------------------------------------------
-- El nombre y los roles en una sola llamada. Por separado --crear la
-- conversacion y luego insertar los roles-- un fallo a mitad dejaria un canal
-- sin nadie dentro, que es un canal que no se puede ni ver para arreglarlo.

create or replace function public.guardar_canal(
  p_condominio_id   uuid,
  p_nombre          text,
  p_roles_unidad    public.rol_unidad[] default '{}',
  p_roles_condominio public.rol_condominio[] default '{}',
  p_conversacion_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
declare
  v_id uuid := p_conversacion_id;
begin
  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'El canal necesita un nombre';
  end if;

  if array_length(p_roles_unidad, 1) is null
     and array_length(p_roles_condominio, 1) is null then
    -- Un canal sin roles no lo ve nadie mas que la administracion. Eso no es
    -- un canal, es un sitio donde hablar solo.
    raise exception 'El canal necesita al menos un rol';
  end if;

  if v_id is null then
    -- `security invoker`: lo rechaza `conversacion_alta` si quien llama no
    -- administra el edificio.
    insert into public.conversacion (condominio_id, tipo, nombre, creada_por)
    values (p_condominio_id, 'grupo', btrim(p_nombre), auth.uid())
    returning id into v_id;
  else
    update public.conversacion
    set nombre = btrim(p_nombre)
    where id = v_id and tipo = 'grupo';

    if not found then
      raise exception 'Ese canal no existe o no puedes cambiarlo'
        using errcode = 'insufficient_privilege';
    end if;

    -- Los roles se reemplazan, no se acumulan: la pantalla manda la lista
    -- entera, que es lo que se ve marcado.
    delete from public.canal_rol where conversacion_id = v_id;
  end if;

  insert into public.canal_rol (conversacion_id, rol_unidad)
  select v_id, unnest(p_roles_unidad)
  where array_length(p_roles_unidad, 1) is not null
  on conflict do nothing;

  insert into public.canal_rol (conversacion_id, rol_condominio)
  select v_id, unnest(p_roles_condominio)
  where array_length(p_roles_condominio, 1) is not null
  on conflict do nothing;

  return v_id;
end;
$fn$;

comment on function public.guardar_canal is
  'Crea o renombra un canal y deja sus roles en lo que diga la lista. Los roles se reemplazan: la pantalla manda lo que se ve marcado. `security invoker` para que las politicas sigan decidiendo.';

revoke all on function public.guardar_canal(
  uuid, text, public.rol_unidad[], public.rol_condominio[], uuid) from public;
grant execute on function public.guardar_canal(
  uuid, text, public.rol_unidad[], public.rol_condominio[], uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Los canales de un edificio, con sus roles y cuanta gente entra
-- ----------------------------------------------------------------------------
-- «Cuanta gente entra» es lo que hace que la pantalla de configuracion sirva:
-- marcar roles sin ver a cuantos afecta es marcar a ciegas.

create or replace function public.canales_del_condominio(p_condominio_id uuid)
returns table (
  id               uuid,
  nombre           text,
  roles_unidad     public.rol_unidad[],
  roles_condominio public.rol_condominio[],
  personas         integer,
  archivado        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
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
  group by c.id, c.nombre, c.condominio_id, c.archivado_en
  order by c.archivado_en nulls first, lower(c.nombre);
$fn$;

comment on function public.canales_del_condominio is
  'Los canales de un edificio para la pantalla de configuracion, con sus roles y a cuantas personas alcanzan. Devuelve vacio para quien no administra: la decision la toma la base.';

revoke all on function public.canales_del_condominio(uuid) from public;
grant execute on function public.canales_del_condominio(uuid) to authenticated;

create or replace function public.archivar_canal(
  p_conversacion_id uuid,
  p_archivar        boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  update public.conversacion
  set archivado_en = case when p_archivar then now() else null end
  where id = p_conversacion_id and tipo = 'grupo';

  if not found then
    raise exception 'Ese canal no existe o no puedes archivarlo'
      using errcode = 'insufficient_privilege';
  end if;

  return p_archivar;
end;
$fn$;

comment on function public.archivar_canal is
  'Retira un canal de la lista sin borrar lo que se dijo en el. Borrarlo se llevaria los mensajes por el cascade.';

revoke all on function public.archivar_canal(uuid, boolean) from public;
grant execute on function public.archivar_canal(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- Y los edificios que ya existen
-- ----------------------------------------------------------------------------
-- Los dos que hay en la base. El segundo no tenia ninguno.
--
-- El primero tenia su canal de residentes de la siembra de septiembre, llamado
-- «Residentes Chic Homes» --un nombre que ni siquiera es el del edificio-- y
-- eso destapa el limite de sembrar por nombre: la funcion no sabe que un canal
-- llamado de otra forma hace el mismo trabajo, asi que le creo un gemelo
-- vacio. En el edificio de demostracion se resolvio a mano --el gemelo recien
-- creado, sin un solo mensaje, se retiro, y el historico se quedo con el
-- nombre «Residentes»--.
--
-- No se intenta adivinar por los roles: dos canales con los mismos roles
-- pueden ser dos canales de verdad --«Residentes» y «Obras»-- y fusionarlos
-- seria peor. Si vuelve a pasar, lo arregla el administrador archivando uno,
-- que para eso esta.

do $$
declare c record;
begin
  for c in select id from public.condominio loop
    perform public.sembrar_canales_del_condominio(c.id, null);
  end loop;
end $$;

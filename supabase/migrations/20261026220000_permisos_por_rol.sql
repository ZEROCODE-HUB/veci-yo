-- Qué puede hacer cada rol, configurable desde el panel de la app, en general
-- y por edificio (huecos 9 y 14).
--
-- Hueco 9 (21/10/2026), sobre el residente, el corresidente y el
-- coadministrador de vivienda, que veían lo mismo que el inquilino líder: «no
-- tiene sentido que todos vean lo mismo; lo más sano es que en la
-- administración de la app podamos elegir qué puede y qué no cada rol, y
-- poder editarlo para un edificio o en general».
-- Hueco 14 (21/10/2026), sobre el coadministrador del edificio (crear zonas,
-- anuncios y registrar visitas sin ningún permiso): «hagámoslo parametrizable
-- desde nuestro super admin, general y que se pueda editar para un condominio».
--
-- Cómo funciona:
--   · `permiso_de_rol` guarda, por rol y acción, si se permite. Una fila sin
--     edificio es la regla general; una con edificio, la excepción de ese
--     edificio. Lo que no tiene fila se permite (así estaba todo hasta hoy).
--   · La base lo aplica con un disparador en cada acción: da igual si se
--     intenta desde la app o por la API. El mensaje dice qué no se permite.
--   · Lo escribe solo el dueño de la plataforma, desde el panel, y queda en la
--     bitácora.
--
-- El propietario y el administrador del edificio no se configuran: siempre
-- pueden. La portería tampoco.
--
-- Solo aditiva: dos tipos, una tabla, funciones y disparadores.

create type public.rol_con_permisos as enum (
  'inquilino_lider', 'residente', 'corresidente', 'coadministrador_vivienda', 'coadministrador_edificio'
);
comment on type public.rol_con_permisos is
  'Los roles cuyo alcance se configura desde el panel (huecos 9 y 14). El propietario, el administrador y la portería siempre pueden.';

create type public.accion_de_rol as enum (
  'registrar_visitas', 'reservar_zonas', 'invitar_a_la_vivienda', 'crear_zonas', 'crear_anuncios'
);
comment on type public.accion_de_rol is
  'Las acciones que se permiten o no por rol: las tres de una vivienda (registrar visitas, reservar zonas, invitar a la vivienda) y las dos del coadministrador del edificio (crear zonas, crear anuncios), que también puede registrar visitas.';

create table public.permiso_de_rol (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid references public.condominio(id) on delete cascade,
  rol public.rol_con_permisos not null,
  accion public.accion_de_rol not null,
  permitido boolean not null,
  cambiado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Las acciones de vivienda son de los roles de vivienda, y las de zonas y
  -- anuncios, del coadministrador del edificio.
  constraint permiso_de_rol_accion_del_rol check (
    case rol
      when 'coadministrador_edificio' then accion in ('crear_zonas', 'crear_anuncios', 'registrar_visitas')
      else accion in ('registrar_visitas', 'reservar_zonas', 'invitar_a_la_vivienda')
    end
  )
);
create unique index permiso_de_rol_general_unico on public.permiso_de_rol (rol, accion) where condominio_id is null;
create unique index permiso_de_rol_edificio_unico on public.permiso_de_rol (condominio_id, rol, accion) where condominio_id is not null;

comment on table public.permiso_de_rol is
  'Qué puede hacer cada rol (huecos 9 y 14). condominio_id nulo = regla general; con edificio = excepción de ese edificio. Sin fila, se permite. Lo escribe solo el dueño de la plataforma (panel_cambiar_permiso_de_rol).';
comment on column public.permiso_de_rol.condominio_id is 'Nulo = la regla general de la plataforma; con valor, la excepción de ese edificio.';
comment on column public.permiso_de_rol.permitido is 'Si ese rol puede hacer esa acción.';
comment on column public.permiso_de_rol.cambiado_por is 'Quién lo cambió por última vez (el dueño de la plataforma).';

create trigger permiso_de_rol_tocar_updated_at before update on public.permiso_de_rol
  for each row execute function public.tocar_updated_at();

alter table public.permiso_de_rol enable row level security;
-- La lee cualquiera con sesión: la app la necesita para no ofrecer lo que no
-- se puede. Nadie la escribe por la API: solo la función del panel.
create policy permiso_de_rol_lectura on public.permiso_de_rol for select to authenticated using (true);

-- Lo que había hasta hoy, salvo invitar: residente y corresidente ya no
-- invitan a la vivienda, que es de quien la gestiona (hueco 9).
insert into public.permiso_de_rol (condominio_id, rol, accion, permitido) values
  (null, 'inquilino_lider', 'registrar_visitas', true),
  (null, 'inquilino_lider', 'reservar_zonas', true),
  (null, 'inquilino_lider', 'invitar_a_la_vivienda', true),
  (null, 'residente', 'registrar_visitas', true),
  (null, 'residente', 'reservar_zonas', true),
  (null, 'residente', 'invitar_a_la_vivienda', false),
  (null, 'corresidente', 'registrar_visitas', true),
  (null, 'corresidente', 'reservar_zonas', true),
  (null, 'corresidente', 'invitar_a_la_vivienda', false),
  (null, 'coadministrador_vivienda', 'registrar_visitas', true),
  (null, 'coadministrador_vivienda', 'reservar_zonas', true),
  (null, 'coadministrador_vivienda', 'invitar_a_la_vivienda', true),
  (null, 'coadministrador_edificio', 'crear_zonas', true),
  (null, 'coadministrador_edificio', 'crear_anuncios', true),
  (null, 'coadministrador_edificio', 'registrar_visitas', true);

-- ---------------------------------------------------------------------------
-- Preguntas
-- ---------------------------------------------------------------------------

create or replace function public.rol_puede(p_condominio_id uuid, p_rol public.rol_con_permisos, p_accion public.accion_de_rol)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(
    (select permitido from public.permiso_de_rol
      where condominio_id = p_condominio_id and rol = p_rol and accion = p_accion),
    (select permitido from public.permiso_de_rol
      where condominio_id is null and rol = p_rol and accion = p_accion),
    true);
$$;
comment on function public.rol_puede(uuid, public.rol_con_permisos, public.accion_de_rol) is
  'Si ese rol puede hacer esa acción en ese edificio: la excepción del edificio, si la hay; si no, la regla general; si no, sí.';

-- El rol de vivienda que se configura, a partir del de la membresía.
create or replace function public.rol_configurable_de_vivienda(p_rol public.rol_unidad)
returns public.rol_con_permisos
language sql
immutable
as $$
  select case p_rol
    when 'inquilino_lider' then 'inquilino_lider'::public.rol_con_permisos
    when 'residente' then 'residente'::public.rol_con_permisos
    when 'corresidente' then 'corresidente'::public.rol_con_permisos
    when 'coadministrador' then 'coadministrador_vivienda'::public.rol_con_permisos
  end;
$$;

create or replace function public.puedo_en_la_vivienda(p_unidad_id uuid, p_accion public.accion_de_rol)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  /*
    Si quien pregunta puede hacer esa acción en esa vivienda: con que una de
    sus membresías lo permita basta. El propietario siempre puede.
  */
  select exists (
    select 1
    from public.membresia_unidad m
    join public.unidad u on u.id = m.unidad_id
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol <> 'huesped_temporal'
      and (m.rol = 'propietario'
           or public.rol_puede(u.condominio_id, public.rol_configurable_de_vivienda(m.rol), p_accion))
  );
$$;
comment on function public.puedo_en_la_vivienda(uuid, public.accion_de_rol) is
  'Si quien llama puede hacer esa acción en esa vivienda según su rol (permiso_de_rol). El propietario siempre puede.';

create or replace function public.es_administrador_principal(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id and mc.usuario_id = auth.uid()
      and mc.activo and mc.rol = 'administrador');
$$;

create or replace function public.es_guardia_activo(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id and mc.usuario_id = auth.uid()
      and mc.activo and mc.rol = 'guardia');
$$;

create or replace function public.es_coadministrador_de_edificio(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id and mc.usuario_id = auth.uid()
      and mc.activo and mc.rol = 'coadministrador');
$$;

create or replace function public.mis_permisos_en_la_vivienda(p_unidad_id uuid)
returns table (accion public.accion_de_rol, permitido boolean)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select a, public.puedo_en_la_vivienda(p_unidad_id, a)
  from unnest(array['registrar_visitas', 'reservar_zonas', 'invitar_a_la_vivienda']::public.accion_de_rol[]) a;
$$;
comment on function public.mis_permisos_en_la_vivienda(uuid) is
  'Las tres acciones de vivienda y si quien llama puede hacerlas: la app no ofrece lo que no se puede.';

create or replace function public.mis_permisos_de_coadministrador(p_condominio_id uuid)
returns table (accion public.accion_de_rol, permitido boolean)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select a,
         public.es_administrador_principal(p_condominio_id)
         or (public.es_coadministrador_de_edificio(p_condominio_id)
             and public.rol_puede(p_condominio_id, 'coadministrador_edificio', a))
  from unnest(array['crear_zonas', 'crear_anuncios', 'registrar_visitas']::public.accion_de_rol[]) a;
$$;

revoke execute on function public.rol_puede(uuid, public.rol_con_permisos, public.accion_de_rol) from public, anon;
grant execute on function public.rol_puede(uuid, public.rol_con_permisos, public.accion_de_rol) to authenticated, service_role;
revoke execute on function public.puedo_en_la_vivienda(uuid, public.accion_de_rol) from public, anon;
grant execute on function public.puedo_en_la_vivienda(uuid, public.accion_de_rol) to authenticated, service_role;
revoke execute on function public.mis_permisos_en_la_vivienda(uuid) from public, anon;
grant execute on function public.mis_permisos_en_la_vivienda(uuid) to authenticated, service_role;
revoke execute on function public.mis_permisos_de_coadministrador(uuid) from public, anon;
grant execute on function public.mis_permisos_de_coadministrador(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- La base lo aplica
-- ---------------------------------------------------------------------------

-- Visitas: por la vivienda, su rol; por el edificio, el coadministrador.
create or replace function public.visita_segun_el_rol()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Sin sesión (la clave de servicio, el calendario) o una estancia de
  -- huésped: no es esta regla.
  if auth.uid() is null or new.tipo = 'huesped_temporal' or new.unidad_id is null then
    return new;
  end if;
  if public.es_administrador_principal(new.condominio_id) or public.es_guardia_activo(new.condominio_id) then
    return new;
  end if;

  if exists (select 1 from public.membresia_unidad m
              where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                and m.activo and m.rol <> 'huesped_temporal') then
    if not public.puedo_en_la_vivienda(new.unidad_id, 'registrar_visitas') then
      raise exception 'Tu rol en esta vivienda no puede registrar visitas. Lo decide el administrador de la app.';
    end if;
  elsif public.es_coadministrador_de_edificio(new.condominio_id)
        and not public.rol_puede(new.condominio_id, 'coadministrador_edificio', 'registrar_visitas') then
    raise exception 'Como coadministrador del edificio no puedes registrar visitas. Lo decide el administrador de la app.';
  end if;
  return new;
end;
$$;
create trigger visita_segun_el_rol before insert on public.visita
  for each row execute function public.visita_segun_el_rol();

-- Reservas de zonas: el rol en la vivienda.
create or replace function public.reserva_segun_el_rol()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
begin
  if auth.uid() is null or new.unidad_id is null then
    return new;
  end if;
  select z.condominio_id into v_condominio from public.zona_comun z where z.id = new.zona_id;
  if public.es_admin_condominio(v_condominio) or public.es_guardia_activo(v_condominio) then
    return new;
  end if;
  if exists (select 1 from public.membresia_unidad m
              where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                and m.activo and m.rol <> 'huesped_temporal')
     and not public.puedo_en_la_vivienda(new.unidad_id, 'reservar_zonas') then
    raise exception 'Tu rol en esta vivienda no puede reservar zonas comunes. Lo decide el administrador de la app.';
  end if;
  return new;
end;
$$;
create trigger reserva_zona_segun_el_rol before insert on public.reserva_zona
  for each row execute function public.reserva_segun_el_rol();

-- Invitar a la vivienda: el rol en la vivienda.
create or replace function public.invitacion_segun_el_rol()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null or new.unidad_id is null then
    return new;
  end if;
  if public.es_admin_condominio(new.condominio_id) then
    return new;
  end if;
  if exists (select 1 from public.membresia_unidad m
              where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                and m.activo and m.rol <> 'huesped_temporal')
     and not public.puedo_en_la_vivienda(new.unidad_id, 'invitar_a_la_vivienda') then
    raise exception 'Tu rol en esta vivienda no puede invitar a nadie. Lo decide el administrador de la app.';
  end if;
  return new;
end;
$$;
create trigger invitacion_segun_el_rol before insert on public.invitacion
  for each row execute function public.invitacion_segun_el_rol();

-- Zonas comunes: el coadministrador del edificio.
create or replace function public.zona_segun_el_rol()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null or public.es_administrador_principal(new.condominio_id) then
    return new;
  end if;
  if public.es_coadministrador_de_edificio(new.condominio_id)
     and not public.rol_puede(new.condominio_id, 'coadministrador_edificio', 'crear_zonas') then
    raise exception 'Como coadministrador del edificio no puedes crear ni editar zonas comunes. Lo decide el administrador de la app.';
  end if;
  return new;
end;
$$;
create trigger zona_comun_segun_el_rol before insert or update on public.zona_comun
  for each row execute function public.zona_segun_el_rol();

-- Anuncios y encuestas: el coadministrador del edificio.
create or replace function public.anuncio_segun_el_rol()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null or public.es_administrador_principal(new.condominio_id) then
    return new;
  end if;
  if public.es_coadministrador_de_edificio(new.condominio_id)
     and not public.rol_puede(new.condominio_id, 'coadministrador_edificio', 'crear_anuncios') then
    raise exception 'Como coadministrador del edificio no puedes publicar anuncios ni encuestas. Lo decide el administrador de la app.';
  end if;
  return new;
end;
$$;
create trigger publicacion_segun_el_rol before insert on public.publicacion
  for each row execute function public.anuncio_segun_el_rol();

-- ---------------------------------------------------------------------------
-- El panel
-- ---------------------------------------------------------------------------

create or replace function public.panel_permisos_de_rol(p_condominio_id uuid default null)
returns table (rol public.rol_con_permisos, accion public.accion_de_rol, permitido boolean, general boolean, es_excepcion boolean)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve los permisos por rol' using errcode = '42501';
  end if;
  return query
  select g.rol, g.accion,
         coalesce(e.permitido, g.permitido),
         g.permitido,
         e.id is not null
  from public.permiso_de_rol g
  left join public.permiso_de_rol e
         on p_condominio_id is not null and e.condominio_id = p_condominio_id
        and e.rol = g.rol and e.accion = g.accion
  where g.condominio_id is null
  order by g.rol, g.accion;
end;
$$;
comment on function public.panel_permisos_de_rol(uuid) is
  'Los permisos por rol: la regla general y, si se pide un edificio, lo que vale en él y si es una excepción. Solo el equipo de la plataforma.';

create or replace function public.panel_cambiar_permiso_de_rol(
  p_condominio_id uuid,
  p_rol public.rol_con_permisos,
  p_accion public.accion_de_rol,
  p_permitido boolean
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma cambia los permisos por rol' using errcode = '42501';
  end if;

  if p_condominio_id is null then
    if p_permitido is null then
      raise exception 'La regla general tiene que decir sí o no';
    end if;
    update public.permiso_de_rol set permitido = p_permitido, cambiado_por = auth.uid()
     where condominio_id is null and rol = p_rol and accion = p_accion;
    if not found then
      insert into public.permiso_de_rol (condominio_id, rol, accion, permitido, cambiado_por)
      values (null, p_rol, p_accion, p_permitido, auth.uid());
    end if;
  elsif p_permitido is null then
    -- Sin valor en un edificio: vuelve a la regla general.
    delete from public.permiso_de_rol
     where condominio_id = p_condominio_id and rol = p_rol and accion = p_accion;
  else
    insert into public.permiso_de_rol (condominio_id, rol, accion, permitido, cambiado_por)
    values (p_condominio_id, p_rol, p_accion, p_permitido, auth.uid())
    on conflict (condominio_id, rol, accion) where condominio_id is not null
    do update set permitido = excluded.permitido, cambiado_por = excluded.cambiado_por;
  end if;

  perform public.anotar_en_bitacora(
    'permiso_de_rol_cambiado', p_condominio_id,
    jsonb_build_object('rol', p_rol, 'accion', p_accion, 'permitido', p_permitido));
end;
$$;
comment on function public.panel_cambiar_permiso_de_rol(uuid, public.rol_con_permisos, public.accion_de_rol, boolean) is
  'Cambia un permiso por rol. Sin edificio, la regla general; con edificio y un valor, la excepción de ese edificio; con edificio y sin valor, vuelve a la general. Solo el dueño de la plataforma; queda en la bitácora.';

revoke execute on function public.panel_permisos_de_rol(uuid) from public, anon;
grant execute on function public.panel_permisos_de_rol(uuid) to authenticated, service_role;
revoke execute on function public.panel_cambiar_permiso_de_rol(uuid, public.rol_con_permisos, public.accion_de_rol, boolean) from public, anon;
grant execute on function public.panel_cambiar_permiso_de_rol(uuid, public.rol_con_permisos, public.accion_de_rol, boolean) to authenticated, service_role;

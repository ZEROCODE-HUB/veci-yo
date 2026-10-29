-- Pedidos del cliente del 29/10/2026 (GSheet «Para Claude», filas 130–140).
-- Solo aditiva: no se borra ninguna tabla ni ningún dato.

-- 1. La app se entera sola de los edificios y viviendas que le asignan
--    (fila 133). Las membresías pasan a avisar por Realtime; cada quien solo
--    recibe las filas que su RLS le deja leer.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'membresia_condominio') then
    alter publication supabase_realtime add table public.membresia_condominio;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'membresia_unidad') then
    alter publication supabase_realtime add table public.membresia_unidad;
  end if;
end $$;

-- 2. El anfitrión primario no vive en la vivienda (fila 135): alguien que
--    alquila su vivienda por noches no puede ser también residente.
create or replace function public.anfitrion_no_es_residente()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if coalesce(new.es_anfitrion_primario, false) then
    if tg_op = 'UPDATE' and new.es_residente and not old.es_residente
       and old.es_anfitrion_primario then
      raise exception 'El anfitrión primario no vive en la vivienda: no puede ser residente';
    end if;
    new.es_residente := false;
  end if;
  return new;
end;
$$;
comment on function public.anfitrion_no_es_residente() is
  'Quien es anfitrión primario de una vivienda no es residente de ella (pedido del cliente, 29/10/2026). Al nombrarlo anfitrión deja de ser residente; declararse residente siéndolo se rechaza.';
drop trigger if exists membresia_unidad_anfitrion_no_reside on public.membresia_unidad;
create trigger membresia_unidad_anfitrion_no_reside
  before insert or update of es_anfitrion_primario, es_residente on public.membresia_unidad
  for each row execute function public.anfitrion_no_es_residente();

update public.membresia_unidad set es_residente = false
 where es_anfitrion_primario and es_residente;

-- 3. El propietario se asigna sin aceptar (fila 134), igual que la
--    administración de un edificio desde el 29/10/2026.
insert into public.configuracion_plataforma (clave, valor, descripcion, tipo, categoria, valor_por_defecto)
values
  ('url_app_android', '',
   'Enlace a la app de Veciyo en Google Play. Va en el correo que avisa a un propietario de que se le asignó una vivienda. Vacío: el correo dice que la descargue de la tienda, sin enlace.',
   'texto', 'integraciones', ''),
  ('url_app_ios', '',
   'Enlace a la app de Veciyo en la App Store. Va en el correo que avisa a un propietario de que se le asignó una vivienda. Vacío: el correo dice que la descargue de la tienda, sin enlace.',
   'texto', 'integraciones', '')
on conflict (clave) do nothing;

/*
  La administración asigna el propietario de una vivienda:
    · si ya hay una cuenta con ese correo (confirmado), queda propietario en el
      acto;
    · si no, queda una asignación pendiente (una invitación de propietario) que
      se convierte sola cuando esa persona crea su cuenta con ese correo
      (`reclamar_asignaciones`). No hay enlace que aceptar.
  Devuelve si quedó asignado ya.
*/
create or replace function public.asignar_propietario(p_unidad_id uuid, p_correo text, p_nombre text)
returns table(asignado boolean, unidad text, edificio text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp', 'auth'
as $$
declare
  v_condominio uuid;
  v_codigo     text;
  v_edificio   text;
  v_correo     text := lower(btrim(p_correo));
  v_nombre     text := btrim(coalesce(p_nombre, ''));
  v_usuario    uuid;
begin
  select u.condominio_id, u.codigo, c.nombre into v_condominio, v_codigo, v_edificio
    from public.unidad u join public.condominio c on c.id = u.condominio_id
   where u.id = p_unidad_id and u.deleted_at is null;
  if v_condominio is null then
    raise exception 'Esa vivienda no existe';
  end if;
  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
  end if;
  if v_correo = '' or v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no sirve';
  end if;
  if v_nombre = '' then
    raise exception 'Falta el nombre del propietario';
  end if;

  select id into v_usuario from auth.users
   where lower(email) = v_correo and email_confirmed_at is not null
   limit 1;

  -- Lo pendiente para esa vivienda y ese correo deja de valer: o se cumple
  -- ahora, o se reemplaza por la nueva.
  update public.invitacion
     set estado = 'revocada', updated_at = now()
   where unidad_id = p_unidad_id and ambito = 'unidad' and rol_unidad = 'propietario'
     and lower(correo) = v_correo and estado = 'pendiente';

  if v_usuario is not null then
    if not exists (select 1 from public.membresia_unidad
                   where unidad_id = p_unidad_id and usuario_id = v_usuario
                     and rol = 'propietario' and activo) then
      insert into public.membresia_unidad (unidad_id, usuario_id, nombre, rol)
      values (p_unidad_id, v_usuario, v_nombre, 'propietario');
    end if;
    update public.unidad set estado = 'aceptado', updated_at = now()
     where id = p_unidad_id and estado in ('disponible', 'invitado');
    return query select true, v_codigo, v_edificio;
    return;
  end if;

  -- Sin cuenta todavía: la asignación espera un año a que la cree.
  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, correo, nombre,
    token_hash, invitada_por, expira_en
  ) values (
    v_condominio, 'unidad', p_unidad_id, 'propietario', v_correo, v_nombre,
    encode(extensions.digest(encode(extensions.gen_random_bytes(32), 'hex'), 'sha256'), 'hex'),
    auth.uid(), now() + interval '1 year'
  );
  update public.unidad set estado = 'invitado', updated_at = now()
   where id = p_unidad_id and estado = 'disponible';
  return query select false, v_codigo, v_edificio;
end;
$$;
comment on function public.asignar_propietario(uuid, text, text) is
  'La administración asigna el propietario de una vivienda sin invitación que aceptar (29/10/2026). Con cuenta: membresía en el acto. Sin cuenta: queda pendiente y se cumple sola al crearla (reclamar_asignaciones).';
revoke execute on function public.asignar_propietario(uuid, text, text) from public, anon;
grant execute on function public.asignar_propietario(uuid, text, text) to authenticated, service_role;

/*
  Quien entra con su correo confirmado recibe las viviendas que se le
  asignaron como propietario mientras no tenía cuenta. Solo las suyas: lo
  decide el correo de su propia cuenta, no un parámetro.
*/
create or replace function public.reclamar_asignaciones()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp', 'auth'
as $$
declare
  v_correo text;
  v_inv    record;
  v_n      integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if v_correo is null then
    return 0;
  end if;

  for v_inv in
    select i.* from public.invitacion i
     where lower(i.correo) = v_correo and i.estado = 'pendiente'
       and i.ambito = 'unidad' and i.rol_unidad = 'propietario'
       and i.expira_en > now()
     for update
  loop
    perform set_config('veciyo.alta_por_invitacion', 'on', true);
    if not exists (select 1 from public.membresia_unidad
                   where unidad_id = v_inv.unidad_id and usuario_id = auth.uid()
                     and rol = 'propietario' and activo) then
      insert into public.membresia_unidad (unidad_id, usuario_id, nombre, rol)
      values (v_inv.unidad_id, auth.uid(), v_inv.nombre, 'propietario');
    end if;
    perform set_config('veciyo.alta_por_invitacion', 'off', true);
    update public.unidad set estado = 'aceptado', updated_at = now()
     where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
    update public.invitacion
       set estado = 'aceptada', aceptada_por = auth.uid(), aceptada_en = now(), updated_at = now()
     where id = v_inv.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
comment on function public.reclamar_asignaciones() is
  'Convierte en membresía las viviendas asignadas como propietario a su correo (confirmado) mientras no tenía cuenta. La llama la app al cargar la sesión.';
revoke execute on function public.reclamar_asignaciones() from public, anon;
grant execute on function public.reclamar_asignaciones() to authenticated, service_role;

-- 4. Torre: dos datos que solo se muestran en su tarjeta (fila 138).
alter table public.torre add column if not exists departamentos_declarados integer
  check (departamentos_declarados is null or departamentos_declarados >= 0);
alter table public.torre add column if not exists penthouses integer
  check (penthouses is null or penthouses >= 0);
comment on column public.torre.departamentos_declarados is
  'Cuántos departamentos dice tener la torre. Solo se muestra en su tarjeta; las viviendas reales son las filas de unidad.';
comment on column public.torre.penthouses is
  'Cuántos penthouse tiene la torre. Solo se muestra en su tarjeta.';

-- 5. El directorio llama por la app a quien lo tenga encendido (fila 140):
--    la función de contactos dice también la cuenta y si recibe llamadas por
--    la app. Misma regla de quién puede llamarla.
drop function if exists public.contactos_de_la_vivienda(uuid);
create function public.contactos_de_la_vivienda(p_unidad_id uuid)
 returns table(membresia_id uuid, nombre text, rol text, es_anfitrion_primario boolean, es_admin_primario boolean, es_residente boolean, codigo_pais text, telefono text, whatsapp boolean, chat boolean, emergencia_nombre text, emergencia_codigo text, emergencia_telefono text, alterno_codigo text, alterno_telefono text, alterno_correo text, usuario_id uuid, recibe_llamadas_app boolean)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
begin
  select u.condominio_id into v_condominio
    from public.unidad u
   where u.id = p_unidad_id and u.deleted_at is null;
  if v_condominio is null then
    raise exception 'Esa vivienda no existe';
  end if;

  -- Quien trabaja en el edificio: la administración y la portería.
  if not (public.es_admin_condominio(v_condominio) or public.es_personal_condominio(v_condominio)) then
    raise exception 'Solo la administración y la portería ven los contactos de una vivienda';
  end if;

  return query
  select
    mu.id,
    coalesce(nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), mu.nombre),
    mu.rol::text,
    coalesce(mu.es_anfitrion_primario, false),
    coalesce(mu.es_admin_primario, false),
    coalesce(mu.es_residente, false),
    mu.codigo_pais,
    nullif(btrim(mu.telefono), ''),
    coalesce(mu.contactable_whatsapp, false) and nullif(btrim(mu.telefono), '') is not null,
    coalesce(mu.contactable_chat, false),
    nullif(btrim(mu.contacto_emergencia_nombre), ''),
    mu.contacto_emergencia_codigo,
    nullif(btrim(mu.contacto_emergencia_telefono), ''),
    -- El alternativo solo si la persona eligió usarlo (Perfil › Configuración).
    case when coalesce(p.usar_contacto_alt, false) then p.codigo_pais_alt end,
    case when coalesce(p.usar_contacto_alt, false) then nullif(btrim(p.telefono_alt), '') end,
    case when coalesce(p.usar_contacto_alt, false) then nullif(btrim(p.correo_alt), '') end,
    mu.usuario_id,
    mu.usuario_id is not null and coalesce(p.recibe_llamadas_app, true)
  from public.membresia_unidad mu
  left join public.perfil p on p.id = mu.usuario_id
  where mu.unidad_id = p_unidad_id
    and mu.activo
    and mu.rol <> 'huesped_temporal'
  -- Primero a quien se llama primero: anfitrión, administrador, propietario.
  order by mu.es_anfitrion_primario desc, mu.es_admin_primario desc,
           (mu.rol = 'propietario') desc, mu.nombre;
end;
$function$;
comment on function public.contactos_de_la_vivienda(uuid) is
  'A quién llamar en una vivienda (directorio de propiedades): nombre, teléfono, emergencia, alternativo, y desde el 29/10/2026 su cuenta y si recibe llamadas por la app. Solo la administración y la portería.';
revoke execute on function public.contactos_de_la_vivienda(uuid) from public, anon;
grant execute on function public.contactos_de_la_vivienda(uuid) to authenticated, service_role;

-- A quién llamar en una vivienda: los contactos para la portería y la
-- administración (huecos 11 y 20).
--
-- Hueco 11 (21/10/2026): «Contactable por chat / WhatsApp» de cada persona se
-- guardaba y no hacía nada. El cliente: «eso es para el administrador; hay que
-- agregarlo, que salga el WhatsApp y el botón para llevarle al chat».
-- Hueco 20 (26/10/2026): el contacto alternativo de Perfil no lo usaba nadie.
-- El cliente: «cuando el guardia ve los contactos desde el directorio de
-- propiedades, ahí debe salir a quién contactar, a qué rol o contacto de
-- emergencia».
--
-- `membresia_unidad` no da el contacto de emergencia ni el perfil alternativo
-- de nadie: esto los junta para quien trabaja en el edificio, y solo para él.
--
-- Solo aditiva: una función nueva y comentarios.

create or replace function public.contactos_de_la_vivienda(p_unidad_id uuid)
returns table (
  membresia_id uuid,
  nombre text,
  rol text,
  es_anfitrion_primario boolean,
  es_admin_primario boolean,
  es_residente boolean,
  codigo_pais text,
  telefono text,
  whatsapp boolean,
  chat boolean,
  emergencia_nombre text,
  emergencia_codigo text,
  emergencia_telefono text,
  alterno_codigo text,
  alterno_telefono text,
  alterno_correo text
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
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
    case when coalesce(p.usar_contacto_alt, false) then nullif(btrim(p.correo_alt), '') end
  from public.membresia_unidad mu
  left join public.perfil p on p.id = mu.usuario_id
  where mu.unidad_id = p_unidad_id
    and mu.activo
    and mu.rol <> 'huesped_temporal'
  -- Primero a quien se llama primero: anfitrión, administrador, propietario.
  order by mu.es_anfitrion_primario desc, mu.es_admin_primario desc,
           (mu.rol = 'propietario') desc, mu.nombre;
end;
$$;

comment on function public.contactos_de_la_vivienda(uuid) is
  'Las personas de una vivienda con su teléfono, si aceptan WhatsApp y chat, su contacto de emergencia y su contacto alternativo (si lo usan). Solo la administración y la portería del edificio: es lo que enseña el directorio de propiedades (huecos 11 y 20).';

revoke execute on function public.contactos_de_la_vivienda(uuid) from public, anon;
grant execute on function public.contactos_de_la_vivienda(uuid) to authenticated, service_role;

comment on column public.membresia_unidad.contactable_chat is
  'Sí = esta persona acepta que la administración y la portería le escriban por el chat desde el directorio de propiedades (hueco 11). Solo la cambia ella misma.';
comment on column public.membresia_unidad.contactable_whatsapp is
  'Sí = esta persona acepta que la administración y la portería la contacten por WhatsApp desde el directorio de propiedades (hueco 11). Solo la cambia ella misma.';
comment on column public.perfil.usar_contacto_alt is
  'Si la persona quiere que su teléfono y correo alternativos salgan a la portería y la administración en el directorio de propiedades, como otro contacto (hueco 20, 26/10/2026).';

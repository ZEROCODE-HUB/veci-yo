-- «A quién contactar» de una vivienda: todas las personas (30/10/2026).
--
-- Pedido del cliente (Para Claude 176): en el Directorio de Propiedades, el
-- detalle de una vivienda enseña a todos los relacionados --propietarios,
-- copropietarios, residentes, huéspedes temporales--, cada uno con sus
-- opciones de llamada. Faltaban los huéspedes; se añaden los que están
-- alojados hoy (no los de reservas pasadas ni futuras). Y el teléfono es el
-- de su perfil, que es el que la persona mantiene al día; si no puso, el de
-- la invitación.
--
-- Misma forma de la respuesta, así que se reemplaza sin tocar a quien la
-- llama. Solo aditiva.

create or replace function public.contactos_de_la_vivienda(p_unidad_id uuid)
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
    case when nullif(btrim(p.telefono), '') is not null then p.codigo_pais else mu.codigo_pais end,
    coalesce(nullif(btrim(p.telefono), ''), nullif(btrim(mu.telefono), '')),
    coalesce(mu.contactable_whatsapp, false)
      and coalesce(nullif(btrim(p.telefono), ''), nullif(btrim(mu.telefono), '')) is not null,
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
    -- El huésped, solo mientras está alojado (30/10/2026).
    and (mu.rol <> 'huesped_temporal'
         or ((mu.vigente_desde is null or mu.vigente_desde <= public.hoy_en_la_unidad(p_unidad_id))
             and (mu.vigente_hasta is null or mu.vigente_hasta >= public.hoy_en_la_unidad(p_unidad_id))))
  -- Primero a quien se llama primero: anfitrión, administrador, propietario.
  order by mu.es_anfitrion_primario desc, mu.es_admin_primario desc,
           (mu.rol = 'propietario') desc, (mu.rol = 'huesped_temporal'), mu.nombre;
end;
$function$;

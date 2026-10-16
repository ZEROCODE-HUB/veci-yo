-- ============================================================================
-- La lista de viviendas de renta corta es de la portería y la administración
-- ============================================================================
-- La responsable de producto (16/10/2026): «Departamentos habilitados para
-- renta corta es solo para seguridad y administración». Hasta hoy cualquier
-- vecino veía la lista entera (con el número oculto si el anfitrión lo pedía).
--
-- Ahora un vecino solo recibe sus propias viviendas, y el ámbito sigue
-- declarándolo la consulta (regla 8): la administradora que entra como
-- propietaria tampoco ve las de los demás. Misma firma y misma salida, así
-- que basta con reemplazarla.

create or replace function public.unidades_renta_corta(
  p_condominio_id uuid,
  p_como_personal boolean default true
)
returns table (
  unidad_id uuid,
  codigo text,
  torre_numero integer,
  piso integer,
  estado text,
  anfitrion text,
  anfitrion_tel text,
  propietario text,
  propietario_tel text,
  administrador text,
  administrador_tel text,
  permite_mascotas boolean,
  tiene_antirruido boolean,
  tiene_no_fumar boolean,
  tiene_sensor boolean,
  verificada_en timestamptz,
  verificada_por_nombre text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with quien as (
    select
      m.unidad_id,
      max(m.nombre)   filter (where m.es_anfitrion_primario) as anfitrion,
      max(m.telefono) filter (where m.es_anfitrion_primario) as anfitrion_tel,
      max(m.nombre)   filter (where m.rol = 'propietario')   as propietario,
      max(m.telefono) filter (where m.rol = 'propietario')   as propietario_tel,
      max(m.nombre)   filter (where m.es_admin_primario)     as administrador,
      max(m.telefono) filter (where m.es_admin_primario)     as administrador_tel
    from public.membresia_unidad m
    where m.activo
    group by m.unidad_id
  )
  select
    u.id,
    case when visible.ok then u.codigo end,
    t.numero,
    case when visible.ok then u.piso end,
    case s.estado
      when 'activa'    then 'Inscripto'
      when 'vencida'   then 'Pendiente'
      when 'cancelada' then 'No inscripto'
    end,
    q.anfitrion,
    case when contacto.ok then q.anfitrion_tel end,
    q.propietario,
    case when contacto.ok then q.propietario_tel end,
    q.administrador,
    q.administrador_tel,
    coalesce(pv.corta_permite_mascotas, false),
    s.tiene_antirruido,
    s.tiene_no_fumar,
    s.tiene_sensor,
    s.verificada_en,
    -- Sin fecha no hay verificación vigente, así que el nombre tampoco se
    -- enseña: lo que queda en la columna es constancia de la anterior.
    case when s.verificada_en is not null then
      nullif(trim(coalesce(pr.nombre, '') || ' ' || coalesce(pr.apellido, '')), '')
    end
  from public.suscripcion_renta_corta s
  join public.unidad u on u.id = s.unidad_id
  join public.torre t on t.id = u.torre_id
  left join quien q on q.unidad_id = u.id
  left join public.permiso_vivienda pv on pv.unidad_id = u.id
  left join public.perfil pr on pr.id = s.verificada_por
  cross join lateral (
    select
      public.es_miembro_unidad(u.id)
      or (p_como_personal and public.es_personal_condominio(p_condominio_id))
      as privilegiado
  ) rol
  cross join lateral (
    select (not s.ocultar_numero) or rol.privilegiado as ok
  ) visible
  cross join lateral (
    select (not s.ocultar_contacto) or rol.privilegiado as ok
  ) contacto
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
    -- Desde el 16/10/2026: la lista es de la portería y la administración.
    -- Un vecino solo ve las suyas.
    and rol.privilegiado
  order by t.numero, u.codigo;
$$;

comment on function public.unidades_renta_corta(uuid, boolean) is
  'Las viviendas de renta corta del edificio, para la porteria y la '
  'administracion (p_como_personal). Un vecino solo recibe las suyas (16/10/2026).';

-- ----------------------------------------------------------------------------
-- Ocultar el numero de la unidad en el listado de renta corta
-- ----------------------------------------------------------------------------
-- `ocultarNumero` existia en los datos falsos y la tarjeta la respetaba
-- ("Departamento (oculto)"), pero no tenia donde guardarse. Es distinta de
-- `ocultar_contacto`: una esconde el telefono y la otra que unidad es.
--
-- Tiene sentido para quien alquila: el listado es visible para todo el
-- edificio, y ver "Dpto 302 alquila por dias" identifica la vivienda. La
-- administracion y la porteria la ven igual, porque son quienes responden si
-- hay un problema.

alter table public.suscripcion_renta_corta
  add column ocultar_numero boolean not null default false;

comment on column public.suscripcion_renta_corta.ocultar_numero is
  'Oculta el codigo de la unidad a los demas residentes. La administracion y la porteria lo ven siempre.';

create or replace function public.unidades_renta_corta(p_condominio_id uuid)
returns table (
  unidad_id         uuid,
  codigo            text,
  torre_numero      int,
  piso              int,
  estado            text,
  anfitrion         text,
  anfitrion_tel     text,
  propietario       text,
  propietario_tel   text,
  administrador     text,
  administrador_tel text,
  permite_mascotas  boolean,
  tiene_antirruido  boolean,
  tiene_no_fumar    boolean,
  tiene_sensor      boolean,
  verificada_en     timestamptz
)
language sql
stable
security definer
set search_path = public
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
    -- El de la administracion no se oculta: es el canal de la comunidad.
    q.administrador_tel,
    coalesce(pv.corta_permite_mascotas, false),
    s.tiene_antirruido,
    s.tiene_no_fumar,
    s.tiene_sensor,
    s.verificada_en
  from public.suscripcion_renta_corta s
  join public.unidad u on u.id = s.unidad_id
  join public.torre t on t.id = u.torre_id
  left join quien q on q.unidad_id = u.id
  left join public.permiso_vivienda pv on pv.unidad_id = u.id
  cross join lateral (
    select public.es_personal_condominio(p_condominio_id)
        or public.puede_operar_unidad(u.id) as privilegiado
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
  order by t.numero, u.codigo;
$$;

comment on function public.unidades_renta_corta(uuid) is
  'Unidades habilitadas para renta corta, con su equipamiento verificado. El codigo y los telefonos se omiten si la unidad pidio ocultarlos, salvo para el personal del condominio y para quien opera esa unidad.';

-- ----------------------------------------------------------------------------
-- El ambito tambien lo declara quien llama a la funcion
-- ----------------------------------------------------------------------------
-- Misma situacion que en PQRS (R-24, regla 8 de AGENTS.md): la funcion decide
-- si muestra el numero de unidad y los telefonos mirando `es_personal_condominio`,
-- que responde por la identidad de quien consulta y no por el rol con el que
-- entro. Quien administra el condominio y ademas vive en el veia los datos de
-- contacto de sus vecinos aunque hubiera entrado como propietario.
--
-- `p_como_personal` lo pasa el cliente segun el rol activo. Pedirlo en `true`
-- no da privilegios: la funcion sigue comprobando que la persona realmente sea
-- personal del condominio. Solo permite pedir menos de lo que se tiene.

create or replace function public.unidades_renta_corta(
  p_condominio_id  uuid,
  p_como_personal  boolean default true
)
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
    select
      -- Sobre la propia unidad se ve todo, se entre con el rol que se entre:
      -- son los datos de quien consulta.
      public.puede_operar_unidad(u.id)
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
  order by t.numero, u.codigo;
$$;

comment on function public.unidades_renta_corta(uuid, boolean) is
  'Unidades en renta corta. `p_como_personal` declara si se consulta con rol de administracion o porteria; pedirlo en true no da privilegios que no se tengan.';

revoke all on function public.unidades_renta_corta(uuid, boolean) from public;
grant execute on function public.unidades_renta_corta(uuid, boolean) to authenticated;

-- La firma de un solo argumento queda obsoleta: con el valor por omision se
-- resolveria la llamada de forma ambigua.
drop function if exists public.unidades_renta_corta(uuid);

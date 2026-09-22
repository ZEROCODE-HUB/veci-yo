-- ----------------------------------------------------------------------------
-- Equipamiento de seguridad y contacto de las unidades en renta corta
-- ----------------------------------------------------------------------------
-- La pantalla de Reglas lista los departamentos habilitados para renta corta
-- con tres indicadores de cumplimiento —dispositivo antirruido, señalética de
-- no fumar y sensor de incendio/gas/CO2— que no existían en ninguna tabla: los
-- traía un array de tres departamentos inventados, todos con la misma
-- responsable ("Maria Perez") y los mismos tres teléfonos peruanos.
--
-- No son un detalle cosmético: es lo que la administración revisa para admitir
-- una unidad en renta corta, y lo que un huésped mira antes de reservar.

alter table public.suscripcion_renta_corta
  add column tiene_antirruido  boolean not null default false,
  add column tiene_no_fumar    boolean not null default false,
  add column tiene_sensor      boolean not null default false,
  add column verificada_en     timestamptz,
  add column verificada_por    uuid references auth.users(id) on delete set null;

comment on column public.suscripcion_renta_corta.tiene_antirruido is
  'Dispositivo antirruido instalado. Lo confirma la administración al verificar, no el anfitrión.';
comment on column public.suscripcion_renta_corta.verificada_en is
  'Cuándo se comprobó el equipamiento. Sin fecha, los tres booleanos son una declaración sin respaldo.';

-- Quien alquila su casa no siempre quiere que su teléfono quede a la vista de
-- los huéspedes. La bandera existía en los datos falsos y no la miraba nadie:
-- la pantalla ofrecía el botón de llamar igual.
alter table public.suscripcion_renta_corta
  add column ocultar_contacto boolean not null default false;

comment on column public.suscripcion_renta_corta.ocultar_contacto is
  'Oculta los teléfonos del anfitrión y del propietario a quien no sea la administración o la portería.';


-- El teléfono de contacto solo estaba en `membresia_condominio`, que es la del
-- personal. Quien responde por una vivienda se registra en `membresia_unidad`,
-- y esta pantalla necesita poder llamarlo. Va en la membresía y no en `perfil`
-- por el mismo motivo que el nombre: `perfil` es privado.
alter table public.membresia_unidad
  add column telefono text;


-- ----------------------------------------------------------------------------
-- Listado de unidades en renta corta
-- ----------------------------------------------------------------------------
-- Junta la suscripción con quién responde por la unidad. Es `security definer`
-- por lo mismo que `cuadro_honor`: un residente no puede leer las membresías
-- de otras unidades, y aquí necesita ver quién es el anfitrión de la de al
-- lado para poder reportarla.
--
-- Los teléfonos salen solo si `ocultar_contacto` está apagado, o si quien
-- consulta es personal del condominio. El filtro va aquí y no en la pantalla:
-- si el número saliera de la base para esconderse después, bastaría con mirar
-- la respuesta de la API.

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
    u.codigo,
    t.numero,
    u.piso,
    case s.estado
      when 'activa'    then 'Inscripto'
      when 'vencida'   then 'Pendiente'
      when 'cancelada' then 'No inscripto'
    end,
    q.anfitrion,
    case when visible.ok then q.anfitrion_tel end,
    q.propietario,
    case when visible.ok then q.propietario_tel end,
    q.administrador,
    -- El de la administración no se oculta: es el canal de la comunidad.
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
    select (not s.ocultar_contacto)
        or public.es_personal_condominio(p_condominio_id)
        or public.puede_operar_unidad(u.id) as ok
  ) visible
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
  order by t.numero, u.codigo;
$$;

comment on function public.unidades_renta_corta(uuid) is
  'Unidades habilitadas para renta corta, con su equipamiento verificado. Los telefonos se omiten si la unidad pidio ocultarlos, salvo para el personal del condominio.';

revoke all on function public.unidades_renta_corta(uuid) from public;
grant execute on function public.unidades_renta_corta(uuid) to authenticated;

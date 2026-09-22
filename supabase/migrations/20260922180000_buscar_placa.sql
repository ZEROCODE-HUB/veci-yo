-- ----------------------------------------------------------------------------
-- Buscar una placa en el condominio
-- ----------------------------------------------------------------------------
-- Los vehiculos viven en dos tablas porque sus reglas son incompatibles: la
-- placa de un residente es unica en el condominio y la de una visita no puede
-- serlo -- el mismo coche vuelve manana y cada visita es una fila --, una
-- sobrevive a su padre y la otra muere con el.
--
-- Pero la pregunta que hace la porteria al ver un coche en la entrada es una
-- sola: "?de quien es esta placa?". Sin esto habria que consultar dos sitios y
-- juntarlos a mano en la pantalla.

create or replace function public.buscar_placa(
  p_condominio_id uuid,
  p_placa         text
)
returns table (
  procedencia   text,     -- 'residente' | 'visita'
  placa         text,
  tipo          text,
  unidad_codigo text,
  torre_numero  int,
  detalle       text,     -- a quien pertenece o a quien visita
  vigente       boolean   -- la visita esta en curso o programada para hoy
)
language sql
stable
security definer
set search_path = public
as $$
  with buscada as (
    -- Sin ser personal del condominio no se devuelve nada: saber que coche
    -- tiene cada vecino no es asunto del resto del edificio.
    select upper(btrim(p_placa)) as placa
    where public.es_personal_condominio(p_condominio_id)
  )
  select
    'residente',
    v.placa,
    v.tipo::text,
    u.codigo,
    t.numero,
    coalesce(
      (select m.nombre from public.membresia_unidad m
        where m.unidad_id = u.id and m.rol = 'propietario' and m.activo
        limit 1),
      'Sin propietario'),
    true
  from public.vehiculo_residente v
  join public.unidad u on u.id = v.unidad_id
  join public.torre t on t.id = u.torre_id
  cross join buscada b
  where v.deleted_at is null
    and u.condominio_id = p_condominio_id
    and upper(btrim(v.placa)) = b.placa

  union all

  select
    'visita',
    vv.placa,
    vv.tipo::text,
    u.codigo,
    t.numero,
    coalesce(
      (select i.nombre from public.invitado i
        where i.visita_id = vi.id order by i.orden limit 1),
      'Visita sin invitados'),
    vi.estado in ('programada', 'ingresada')
      and (vi.fecha_desde is null or vi.fecha_desde <= current_date)
      and (vi.fecha_hasta is null or vi.fecha_hasta >= current_date)
  from public.vehiculo_visita vv
  join public.visita vi on vi.id = vv.visita_id
  left join public.unidad u on u.id = vi.unidad_id
  left join public.torre t on t.id = u.torre_id
  cross join buscada b
  where vi.condominio_id = p_condominio_id
    and vi.deleted_at is null
    and upper(btrim(vv.placa)) = b.placa
  order by 1, 7 desc;
$$;

comment on function public.buscar_placa(uuid, text) is
  'De quien es una placa: de un residente o de una visita. Une las dos tablas de vehiculos, que existen por separado porque sus reglas de unicidad y su ciclo de vida son opuestos.';

revoke all on function public.buscar_placa(uuid, text) from public;
-- Solo la porteria y la administracion: saber que coche tiene cada vecino no
-- es asunto del resto del edificio.
grant execute on function public.buscar_placa(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Normalizar las placas antes de compararlas
-- ----------------------------------------------------------------------------
-- El indice unico de `vehiculo_residente` comparaba con `upper(btrim(placa))`,
-- que solo quita los espacios de los extremos. Las placas se escriben de
-- muchas maneras -- "ABC123", "ABC-123", "abc 123" -- asi que dos viviendas
-- podian registrar el mismo coche sin que la restriccion lo notara, y la
-- busqueda de la porteria no encontraba un vehiculo escrito de otra forma.
--
-- Se compara solo por los caracteres alfanumericos.

create or replace function public.placa_normalizada(p_placa text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_placa, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

comment on function public.placa_normalizada(text) is
  'Placa sin espacios, guiones ni puntos y en mayusculas. Es la forma en la que se comparan las placas entre si.';

drop index if exists public.vehiculo_residente_placa_unica;

create unique index vehiculo_residente_placa_unica
  on public.vehiculo_residente (public.placa_normalizada(placa))
  where deleted_at is null;


-- La busqueda tambien compara normalizando, en las dos tablas.
create or replace function public.buscar_placa(
  p_condominio_id uuid,
  p_placa         text
)
returns table (
  procedencia   text,
  placa         text,
  tipo          text,
  unidad_codigo text,
  torre_numero  int,
  detalle       text,
  vigente       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with buscada as (
    -- Sin ser personal del condominio no se devuelve nada: saber que coche
    -- tiene cada vecino no es asunto del resto del edificio.
    select public.placa_normalizada(p_placa) as placa
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
    and public.placa_normalizada(v.placa) = b.placa

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
    and public.placa_normalizada(vv.placa) = b.placa
  order by 1, 7 desc;
$$;

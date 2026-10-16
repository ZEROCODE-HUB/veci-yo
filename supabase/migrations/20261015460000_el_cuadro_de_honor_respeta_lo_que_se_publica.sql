-- ----------------------------------------------------------------------------
-- El Cuadro de Honor respeta lo que se publica de las cuotas (15/10/2026,
-- hueco 13)
-- ----------------------------------------------------------------------------
-- La administración elige qué se publica del estado de las cuotas: solo el
-- porcentaje, quién está al día, o también quién debe. `detalle_cuotas` lo
-- cumplía, pero el Cuadro de Honor no lo miraba: listaba **solo las viviendas
-- al día**, con «Al día» y «Cuotas 6/6», con cualquier opción. Con «solo el
-- porcentaje» --«sin nombres, lo más discreto»-- el cuadro seguía diciendo
-- quién pagó y, por omisión, quién no.
--
-- Ahora:
--   · con «solo el porcentaje», el cuadro lista **todas** las viviendas --sigue
--     sirviendo para los reconocimientos-- y no dice nada de sus cuotas;
--   · con las otras dos, como hasta hoy y como dice el KT: los que pagan a
--     tiempo aparecen en el Cuadro de Honor;
--   · la administración lo ve todo siempre: es quien cobra.

create or replace function public.cuadro_honor(p_condominio_id uuid)
returns table (
  unidad_id uuid, codigo text, torre_numero integer, responsable_usuario_id uuid,
  responsable text, periodos_al_dia integer, periodos_totales integer,
  insignias integer, insignias_detalle jsonb
)
language sql
stable
security definer
set search_path = public
as $function$
  with periodos as (
    select id, periodo
    from public.cuota_administracion
    where condominio_id = p_condominio_id
    order by periodo desc
    limit 12
  ),
  -- Si el estado de las cuotas se publica a quien pregunta (hueco 13).
  publica as (
    select coalesce(c.cuotas_visibilidad <> 'porcentaje', false)
           or public.es_admin_condominio(p_condominio_id) as si
    from public.condominio c
    where c.id = p_condominio_id
  ),
  responsables as (
    select distinct on (m.unidad_id)
      m.unidad_id, m.usuario_id, m.nombre
    from public.membresia_unidad m
    where m.activo
    order by m.unidad_id,
             m.es_admin_primario desc,
             (m.rol = 'propietario') desc,
             m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.usuario_id,
    -- Si esa persona pidió aparecer con alias aquí, el nombre real no sale.
    coalesce(
      case when p.usa_alias_cuadro_honor then nullif(p.alias, '') end,
      r.nombre
    ),
    case when pub.si then pagos.al_dia end,
    case when pub.si then (select count(*) from periodos)::int end,
    (select count(*)::int
       from public.reconocimiento rec
      where rec.usuario_id = r.usuario_id
        and rec.condominio_id = p_condominio_id),
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'clave',    d.clave,
                  'etiqueta', d.etiqueta,
                  'icono',    d.icono,
                  'cantidad', d.cantidad
                )
                order by d.etiqueta
              )
         from (
           select i.clave, i.etiqueta, coalesce(i.icono, '⭐') as icono,
                  count(*)::int as cantidad
             from public.reconocimiento rec
             join public.insignia i on i.id = rec.insignia_id
            where rec.usuario_id = r.usuario_id
              and rec.condominio_id = p_condominio_id
            group by i.clave, i.etiqueta, i.icono
         ) d),
      '[]'::jsonb
    )
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  join responsables r on r.unidad_id = u.id
  left join public.perfil p on p.id = r.usuario_id
  cross join publica pub
  cross join lateral (
    select count(*) filter (where pc.pagado)::int as al_dia
    from periodos per
    left join public.pago_cuota pc
      on pc.cuota_id = per.id and pc.unidad_id = u.id
  ) pagos
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
    -- Solo los que pagan a tiempo, cuando eso se publica. Si no, todas: que
    -- falte una vivienda también diría que debe.
    and (not pub.si or pagos.al_dia = (select count(*) from periodos))
  order by t.numero, u.codigo;
$function$;

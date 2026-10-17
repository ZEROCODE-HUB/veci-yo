-- El alias no se le esconde a quien siempre ve el nombre real (17/10/2026).
--
-- La pantalla del alias promete: «Seguridad y Administracion siempre ven tu
-- nombre real, sin importar el alias». `solicitantes_de_reservas` y
-- `cuadro_honor` ponian el alias para todo el que mirara, y en las reservas
-- de zonas los unicos que ven quien pidio una reserva ajena son justamente la
-- administracion y la porteria: el alias les escondia el nombre a ellos y a
-- nadie mas.

CREATE OR REPLACE FUNCTION public.solicitantes_de_reservas(p_reservas uuid[])
 RETURNS TABLE(reserva_id uuid, solicitante text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    r.id,
    coalesce(
      -- Si pidio figurar con alias en las zonas, el nombre real no sale...
      -- salvo a la administracion y a la porteria, que siempre ven el real
      -- (es lo que promete la pantalla del alias; 17/10/2026).
      case when p.usa_alias_zonas
            and not exists (
              select 1 from public.zona_comun z
              where z.id = r.zona_id
                and (public.es_admin_condominio(z.condominio_id)
                     or public.es_guardia_de_condominio(z.condominio_id))
            )
           then nullif(p.alias, '') end,
      nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
      m.nombre
    )
  from public.reserva_zona r
  left join public.perfil p on p.id = r.solicitada_por
  left join public.membresia_unidad m
         on m.unidad_id = r.unidad_id
        and m.usuario_id = r.solicitada_por
        and m.activo
  where r.id = any(p_reservas)
    -- La misma visibilidad que la politica de la tabla: quien opera la
    -- vivienda, la administracion del condominio, y el huesped sobre la suya.
    and (
      public.puede_operar_unidad(r.unidad_id)
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')
      )
      or (r.solicitada_por = auth.uid())
      -- Y la portería de ese edificio (15/10/2026).
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.es_guardia_de_condominio(z.condominio_id)
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.cuadro_honor(p_condominio_id uuid)
 RETURNS TABLE(unidad_id uuid, codigo text, torre_numero integer, responsable_usuario_id uuid, responsable text, periodos_al_dia integer, periodos_totales integer, insignias integer, insignias_detalle jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      case when p.usa_alias_cuadro_honor
            and not public.es_admin_condominio(p_condominio_id)
            and not public.es_guardia_de_condominio(p_condominio_id)
           then nullif(p.alias, '') end,
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

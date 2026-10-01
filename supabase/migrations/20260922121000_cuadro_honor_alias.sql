-- ----------------------------------------------------------------------------
-- El alias, aplicado en el cuadro de honor
-- ----------------------------------------------------------------------------
-- El interruptor "Usar alias en Cuadro de Honor" ya se guarda, pero el cuadro
-- seguía mostrando el nombre de la membresía: la promesa de la pantalla no se
-- cumplía en ninguna consulta.
--
-- Se resuelve aquí y no en el cliente porque el nombre real no debe salir de
-- la base para luego reemplazarse en pantalla: quien mire la respuesta de la
-- API lo vería igual.

create or replace function public.cuadro_honor(p_condominio_id uuid)
returns table (
  unidad_id              uuid,
  codigo                 text,
  torre_numero           int,
  responsable_usuario_id uuid,
  responsable            text,
  periodos_al_dia        int,
  periodos_totales       int,
  insignias              int
)
language sql
stable
security definer
set search_path = public
as $$
  with periodos as (
    select id, periodo
    from public.cuota_administracion
    where condominio_id = p_condominio_id
    order by periodo desc
    limit 12
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
    pagos.al_dia,
    (select count(*) from periodos)::int,
    (select count(*)::int
       from public.reconocimiento rec
      where rec.usuario_id = r.usuario_id
        and rec.condominio_id = p_condominio_id)
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  join responsables r on r.unidad_id = u.id
  left join public.perfil p on p.id = r.usuario_id
  cross join lateral (
    select count(*) filter (where pc.pagado)::int as al_dia
    from periodos per
    left join public.pago_cuota pc
      on pc.cuota_id = per.id and pc.unidad_id = u.id
  ) pagos
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
    and pagos.al_dia = (select count(*) from periodos)
  order by t.numero, u.codigo;
$$;

comment on function public.cuadro_honor(uuid) is
  'Cuadro de honor: unidades sin cuotas pendientes en los ultimos 12 periodos. Respeta el alias de quien pidio usarlo aqui. No expone montos ni morosidad.';

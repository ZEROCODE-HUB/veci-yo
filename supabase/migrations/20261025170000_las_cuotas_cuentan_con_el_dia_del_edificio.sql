-- Las cuotas cuentan el mes con el día del edificio, no con el de Londres.
--
-- Parametrización (25/10/2026): `resumen_cuotas` y `detalle_cuotas` tomaban
-- el mes en curso de `current_date`, que es la fecha UTC. El último día del
-- mes, de 19:00 a 24:00 en Bogotá, enseñaban ya el mes siguiente.

CREATE OR REPLACE FUNCTION public.resumen_cuotas(p_condominio_id uuid)
 RETURNS TABLE(periodo date, moneda character, esperado numeric, recibido numeric, al_dia integer, atrasados integer, tiene_cuota boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with definidos as (
    select
      c.periodo,
      c.moneda,
      (c.monto * count(u.id))::numeric(12,2) as esperado,
      (c.monto * count(*) filter (where p.pagado))::numeric(12,2) as recibido,
      count(*) filter (where p.pagado)::int as al_dia,
      count(*) filter (where p.pagado is not true)::int as atrasados,
      true as tiene_cuota
    from public.cuota_administracion c
    join public.unidad u
      on u.condominio_id = c.condominio_id and u.deleted_at is null
    left join public.pago_cuota p
      on p.cuota_id = c.id and p.unidad_id = u.id
    where c.condominio_id = p_condominio_id
    group by c.id, c.periodo, c.moneda, c.monto
  ),
  /*
    El mes en curso, si nadie le puso cuota, con el día del edificio.
    Decía que la fecha del servidor era «inmune al huso» y no lo es: es el
    día de Londres, y entre las 19:00 y las 24:00 de Bogotá del último día
    del mes ya daba el mes siguiente (Parametrización, 25/10/2026).
  */
  en_curso as (
    select
      date_trunc('month', public.hoy_en_el_edificio(p_condominio_id))::date as periodo,
      null::char(3) as moneda,
      0::numeric(12,2) as esperado,
      0::numeric(12,2) as recibido,
      0 as al_dia,
      (select count(*)::int from public.unidad u
       where u.condominio_id = p_condominio_id and u.deleted_at is null) as atrasados,
      false as tiene_cuota
    where not exists (
      select 1 from definidos d
      where d.periodo = date_trunc('month', public.hoy_en_el_edificio(p_condominio_id))::date
    )
  )
  select * from (
    select * from definidos
    union all
    select * from en_curso
  ) todo
  where public.es_miembro_condominio(p_condominio_id)
  order by periodo desc
  limit public.parametro_entero('cuotas_meses_historial', p_condominio_id);
$function$;

CREATE OR REPLACE FUNCTION public.detalle_cuotas(p_condominio_id uuid, p_periodo date DEFAULT NULL::date)
 RETURNS TABLE(unidad_id uuid, codigo text, torre integer, responsable text, pagado boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_visible public.visibilidad_cuotas;
  v_admin   boolean;
  v_periodo date;
begin
  if not public.es_miembro_condominio(p_condominio_id) then
    return;
  end if;

  select cuotas_visibilidad into v_visible
  from public.condominio where id = p_condominio_id;

  v_admin := public.es_admin_condominio(p_condominio_id);

  /*
    La administracion ve todo siempre: es quien cobra, y ocultarselo seria
    quitarle la herramienta en vez de proteger a nadie. Lo que se decide con
    `cuotas_visibilidad` es que ven **los demas**.
  */
  if not v_admin and v_visible = 'porcentaje' then
    return;
  end if;

  /*
    Sin periodo pedido, **el ultimo que tenga cuota** --y no el mes en curso--.

    El mes corriente casi nunca la tiene todavia: la administracion la define a
    mitad de mes. Con el mes en curso por defecto, esta funcion devolvia una
    lista vacia que se lee como «nadie ha pagado» o como «la opcion no
    funciona», cuando lo que pasa es que no hay nada que cobrar aun. Salio en
    el recorrido, en el caso de «quien pago».
  */
  select c.periodo into v_periodo
  from public.cuota_administracion c
  where c.condominio_id = p_condominio_id
  order by c.periodo desc
  limit 1;

  v_periodo := coalesce(p_periodo, v_periodo, date_trunc('month', public.hoy_en_el_edificio(p_condominio_id))::date);

  return query
  with responsables as (
    select distinct on (m.unidad_id) m.unidad_id, m.nombre
    from public.membresia_unidad m
    where m.activo and m.rol in ('propietario', 'inquilino_lider')
    order by m.unidad_id, (m.rol = 'propietario') desc, m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.nombre,
    coalesce(pc.pagado, false)
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  left join responsables r on r.unidad_id = u.id
  left join public.cuota_administracion c
    on c.condominio_id = u.condominio_id and c.periodo = v_periodo
  left join public.pago_cuota pc
    on pc.cuota_id = c.id and pc.unidad_id = u.id
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    -- Y aqui se aplica lo elegido: con `quien_pago` solo salen los que estan
    -- al dia; los morosos no aparecen ni en blanco, que tambien los señalaria.
    and (
      v_admin
      or v_visible = 'quien_debe'
      or (v_visible = 'quien_pago' and coalesce(pc.pagado, false))
    )
  order by t.numero, u.codigo;
end;
$function$;

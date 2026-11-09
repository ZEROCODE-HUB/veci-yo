-- El resumen de cuotas cuenta lo que se debe y lo que se pagó de verdad
-- (09/11/2026, revisión de pagos pedida por el cliente).
--
-- `resumen_cuotas` (la recaudación por mes del Cuadro de Honor) multiplicaba
-- la cuota general por el número de viviendas: no veía el importe propio de
-- una vivienda, ni los importes variables, ni los abonos parciales. En octubre
-- de Green Tower 2 decía 400.000 esperados y 400.000 recibidos; vivienda a
-- vivienda eran 710.120 y 710.120. Ahora suma `total_de_la_cuota` y
-- `abonado_de_la_cuota`, las mismas que usa la pantalla de pagos, y una
-- vivienda está al día cuando abonó todo lo suyo. Solo aditiva.

create or replace function public.resumen_cuotas(p_condominio_id uuid)
 RETURNS TABLE(periodo date, moneda character, esperado numeric, recibido numeric, al_dia integer, atrasados integer, tiene_cuota boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Vivienda a vivienda, con lo que debe de verdad (importe propio y
  -- variables) y lo que abonó, aunque sea en parte (09/11/2026). Antes era la
  -- cuota general por el número de viviendas: octubre decía 400.000 esperados
  -- y recibidos cuando eran 710.120.
  with por_vivienda as (
    select
      c.id as cuota_id,
      c.periodo,
      c.moneda,
      public.total_de_la_cuota(c.id, u.id) as total,
      public.abonado_de_la_cuota(c.id, u.id) as abonado
    from public.cuota_administracion c
    join public.unidad u
      on u.condominio_id = c.condominio_id and u.deleted_at is null
    where c.condominio_id = p_condominio_id
  ),
  definidos as (
    select
      pv.periodo,
      pv.moneda,
      coalesce(sum(pv.total), 0)::numeric(12,2) as esperado,
      coalesce(sum(least(pv.abonado, pv.total)), 0)::numeric(12,2) as recibido,
      count(*) filter (where pv.abonado >= pv.total)::int as al_dia,
      count(*) filter (where pv.abonado < pv.total)::int as atrasados,
      true as tiene_cuota
    from por_vivienda pv
    group by pv.cuota_id, pv.periodo, pv.moneda
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

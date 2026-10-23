-- El calendario se sigue leyendo hasta el último día pagado (23/10/2026).
--
-- Al dar de baja la renta corta con mes pagado, la suscripción sigue activa
-- hasta `cancelada_en` inclusive (`suscripcion_vigente`), y el anfitrión puede
-- seguir recibiendo reservas esos días. Pero `calendarios_por_sincronizar`
-- pedía `cancelada_en is null`: el calendario de Airbnb dejaba de leerse el
-- mismo día de la baja, y las reservas que entraran hasta el final del mes
-- pagado no llegaban a Veciyo.
--
-- Salió al poner al día el recorrido `el-calendario-se-lee-solo`: la 205 tiene
-- una baja con fecha 21/11/2026 y la pregunta del cron ya no la incluía.
--
-- Se usa la misma regla que el resto: `suscripcion_vigente`, con el día del
-- edificio. Solo cambia esa condición.

create or replace function public.calendarios_por_sincronizar()
returns table (unidad_id uuid, ultima_vez timestamptz)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with ajustes as (
    select
      public.parametro_entero('calendario_intervalo_minutos') as minutos,
      public.parametro_entero('calendario_max_por_pasada') as tope
  ),
  candidatas as (
    select
      s.unidad_id,
      nullif(greatest(
        coalesce(s.ical_sincronizado_en, '-infinity'::timestamptz),
        coalesce(s.ical_pedido_en, '-infinity'::timestamptz)
      ), '-infinity'::timestamptz) as ultima_vez
    from public.suscripcion_renta_corta s
    where public.suscripcion_vigente(s.unidad_id)
      and exists (select 1 from public.calendario_vivienda c where c.unidad_id = s.unidad_id)
  )
  select c.unidad_id, c.ultima_vez
  from candidatas c, ajustes a
  where c.ultima_vez is null
     or c.ultima_vez < now() - make_interval(mins => a.minutos)
  order by c.ultima_vez asc nulls first
  limit (select tope from ajustes);
$$;

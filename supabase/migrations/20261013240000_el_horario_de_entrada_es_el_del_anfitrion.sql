-- El horario de entrada es el del anfitrion, dentro del limite del edificio
-- (decidido con el cliente, 13/10/2026).
--
-- Habia dos horarios y solo se veia uno. El anfitrion fija el suyo en
-- `suscripcion_renta_corta.checkin_desde/hasta` --pantalla «Huespedes
-- Temporales»-- y el edificio pone un limite en `permiso_vivienda`. El
-- huesped, en «Mi alojamiento», y la porteria, al marcar una llegada, leian
-- **solo el del edificio**: lo que el anfitrion configuraba no llegaba a
-- nadie.
--
-- La regla, una sola vez y para los dos:
--
--   · manda el del anfitrion;
--   · recortado al del edificio, si el edificio puso uno;
--   · si el anfitrion no puso ninguno --o dijo «a cualquier hora»--, el del
--     edificio;
--   · y si lo del anfitrion cae entero fuera del limite, el del edificio.

create or replace function public.horario_de_entrada(p_unidad_id uuid)
returns table (checkin_desde time, checkin_hasta time)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
  with edificio as (
    select r.checkin_desde as d, r.checkin_hasta as h
    from public.reglas_de_estancia(p_unidad_id) r
  ),
  anfitrion as (
    select
      case when coalesce(s.checkin_24h, false) then null else s.checkin_desde end as d,
      case when coalesce(s.checkin_24h, false) then null else s.checkin_hasta end as h
    from public.suscripcion_renta_corta s
    where s.unidad_id = p_unidad_id
  ),
  juntos as (
    select e.d as ed, e.h as eh, a.d as ad, a.h as ah
    from (select 1) uno
    left join edificio e on true
    left join anfitrion a on true
  ),
  recortado as (
    select
      ed, eh,
      case when ad is null then ed when ed is null then ad else greatest(ad, ed) end as d,
      case when ah is null then eh when eh is null then ah else least(ah, eh)    end as h
    from juntos
  )
  select
    case when d is not null and h is not null and d >= h then ed else d end,
    case when d is not null and h is not null and d >= h then eh else h end
  from recortado
  where public.puede_operar_unidad(p_unidad_id)
     or public.es_huesped_con_reserva(p_unidad_id);
$fn$;

comment on function public.horario_de_entrada(uuid) is
  'El horario de entrada que rige en una vivienda: el del anfitrion, recortado al limite del edificio. Lo leen el huesped y la porteria.';

revoke execute on function public.horario_de_entrada(uuid) from public, anon;
grant execute on function public.horario_de_entrada(uuid) to authenticated, service_role;


-- La ficha del huesped lee el mismo.

CREATE OR REPLACE FUNCTION public.ficha_alojamiento(p_unidad_id uuid)
 RETURNS TABLE(descripcion text, num_habitaciones integer, max_huespedes integer, estacionamientos integer, permite_mascotas boolean, apto_ninos boolean, checkin_desde time without time zone, checkin_hasta time without time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    coalesce(s.descripcion, ''),
    coalesce(s.num_habitaciones, t.habitaciones, 0),
    coalesce(s.max_huespedes, 0),
    s.estacionamientos_huesped,
    coalesce(s.permite_mascotas, true) and coalesce(r.permite_mascotas, true),
    coalesce(s.apto_ninos, true)       and coalesce(r.permite_ninos, true),
    -- El del anfitrion, dentro del limite del edificio. Sin decidir es nulo, y
    -- entonces la pantalla no promete una franja que nadie puso.
    h.checkin_desde,
    h.checkin_hasta
  from public.unidad u
  join public.suscripcion_renta_corta s on s.unidad_id = u.id
  left join public.tipologia t on t.id = u.tipologia_id
  cross join lateral public.reglas_de_estancia(u.id) r
  left join lateral public.horario_de_entrada(u.id) h on true
  where u.id = p_unidad_id
    and (
      public.puede_operar_unidad(p_unidad_id)
      or public.es_huesped_con_reserva(p_unidad_id)
    );
$function$;

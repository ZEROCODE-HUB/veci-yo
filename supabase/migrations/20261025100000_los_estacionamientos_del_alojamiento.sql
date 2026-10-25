-- Cuántos estacionamientos ofrece el alojamiento, para el preregistro.
--
-- Hueco 17 (decidido el 25/10/2026): `suscripcion_renta_corta.
-- estacionamientos_huesped` lo pone el anfitrión en «Huéspedes temporales» y
-- solo se enseñaba en la ficha. Ahora, si una reserva trae más vehículos que
-- esos estacionamientos, se avisa --al anfitrión al crear o editar la reserva
-- y al huésped al registrar sus vehículos-- **sin bloquear**: es una regla del
-- alojamiento, y las de ese tipo son advertencia (KT, flujo 4.1 paso 5).
--
-- Función aparte y no una columna más de `consultar_precheckin`: cambiar lo
-- que devuelve aquella obliga a borrarla y recrearla, y la usan la web y las
-- pruebas. Esta es aditiva.
--
-- Mismo acceso que `consultar_precheckin`: quien tiene el enlace vigente.

create or replace function public.estacionamientos_del_precheckin(p_token text)
returns integer
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select s.estacionamientos_huesped
  from public.visita v
  join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now()
  limit 1;
$$;

comment on function public.estacionamientos_del_precheckin(text) is
  'Los estacionamientos que el anfitrión ofrece a sus huéspedes, para la '
  'estancia del enlace de preregistro (vigente). Sirve para avisar si traen '
  'más vehículos; no bloquea. Nulo si el enlace no vale.';

grant execute on function public.estacionamientos_del_precheckin(text) to anon, authenticated;

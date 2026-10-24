-- El anfitrión fija también el máximo de noches (24/10/2026).
--
-- Pedido del cliente: el calendario de las reservas de huéspedes «no está
-- considerando el tiempo mínimo o máximo configurado». El mínimo existía
-- (`estancia_minima_noches`, «Mínimo de días» en Huéspedes temporales) y el
-- calendario no lo miraba; el máximo existía como columna y no lo pedía nadie.
--
-- `guardar_alojamiento` no sirve para el máximo: ahí `null` significa «no
-- toques esta columna», así que un máximo puesto no se podría quitar. Esta
-- función solo guarda ese número, y vacío o cero lo quita. Comprueba el mismo
-- permiso. Que no quede por debajo del mínimo lo dice la restricción de la
-- tabla, con su mensaje.
--
-- Es una regla del anfitrión para lo que él mismo registra: las reservas que
-- llegan del calendario de Airbnb o Booking traen las reglas de esa plataforma
-- y no se rechazan por esto.

create or replace function public.guardar_estancia_maxima(p_unidad_id uuid, p_noches integer)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No podes configurar el alojamiento de esta vivienda';
  end if;
  update public.suscripcion_renta_corta
     set estancia_maxima_noches = nullif(p_noches, 0)
   where unidad_id = p_unidad_id;
exception
  when check_violation then
    raise exception 'El máximo de noches no puede ser menor que el mínimo';
end;
$$;

comment on function public.guardar_estancia_maxima(uuid, integer) is
  'El máximo de noches por estancia que acepta el anfitrión; vacío o cero lo quita. Quien configura el alojamiento.';
revoke all on function public.guardar_estancia_maxima(uuid, integer) from public, anon;
grant execute on function public.guardar_estancia_maxima(uuid, integer) to authenticated, service_role;

comment on column public.suscripcion_renta_corta.estancia_maxima_noches is
  'Máximo de noches por estancia que acepta el anfitrión (vacío = sin máximo). El calendario de la nueva reserva no deja elegir una salida más lejos. Lo fija en Huéspedes temporales (24/10/2026).';
comment on column public.suscripcion_renta_corta.estancia_minima_noches is
  'Mínimo de noches por estancia que pide el anfitrión. El calendario de la nueva reserva no deja elegir una salida más cerca. Si choca con el mínimo del edificio, la app lo advierte pero no lo bloquea.';

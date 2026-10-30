-- El coadministrador aprueba o rechaza reservas solo con su permiso (30/10/2026).
--
-- Pedido del cliente (Para Claude 175): un permiso nuevo del coadministrador,
-- «Aceptar reservas de zonas comunes» (`aceptarReservasZonas`), debajo de
-- «Consultar zonas comunes». Hasta hoy cualquier coadministrador resolvía
-- reservas, porque la regla preguntaba `es_admin_condominio`, que incluye a
-- todos.
--
-- `puede_coadmin` da por permitida una clave ausente, así que los
-- coadministradores que ya existen lo conservan hasta que se les apague. Los
-- nuevos nacen sin permisos, como todos. Solo aditiva: se reemplaza la
-- función del disparador, no se toca ningún dato.

create or replace function public.proteger_resolucion_reserva()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
  v_anterior public.estado_reserva := null;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_anterior := old.estado;
  end if;

  if new.estado is not distinct from v_anterior then
    return new;
  end if;

  if new.estado not in ('aprobada', 'rechazada') then
    return new;
  end if;

  select z.condominio_id into v_condominio
  from public.zona_comun z where z.id = new.zona_id;

  -- El administrador siempre; el coadministrador, con su permiso.
  if public.puede_coadmin(v_condominio, 'aceptarReservasZonas') then
    return new;
  end if;

  -- El guardia con el permiso (29/10/2026). En una zona de pago, solo con el
  -- comprobante adjunto: es lo que la administración revisaría.
  if public.guardia_aprueba_reservas(v_condominio) then
    if new.estado = 'aprobada' and public.zona_es_de_pago(new.zona_id)
       and nullif(btrim(coalesce(new.comprobante_path, '')), '') is null then
      raise exception 'Es una zona de pago: adjunta el comprobante antes de aprobar';
    end if;
    return new;
  end if;

  raise exception 'No tienes permiso para aprobar o rechazar reservas de zonas comunes';
end;
$function$;

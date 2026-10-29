-- La portería y las reservas de zonas comunes (29/10/2026).
--
-- Pedido del cliente:
--   1. el guardia ve las reservas del edificio (ya podía leerlas; faltaba la
--      pantalla) y sus comprobantes;
--   2. aprobar o rechazar, solo el guardia al que la administración se lo
--      permita: `permisos.reservas` en su membresía, apagado por defecto, como
--      `chat` y `llamadas`. El KT (4.4) dejaba «en discusión» delegarlo a
--      Seguridad los fines de semana; esto lo resuelve sin quitárselo a la
--      administración;
--   3. si la zona es de pago, el guardia no aprueba sin comprobante.
-- Solo aditiva.

-- Si este guardia puede aprobar reservas en ese edificio.
create or replace function public.guardia_aprueba_reservas(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.membresia_condominio mc
     where mc.condominio_id = p_condominio_id
       and mc.usuario_id = auth.uid()
       and mc.rol = 'guardia'
       and mc.activo
       and coalesce((mc.permisos->>'reservas')::boolean, false)
  );
$$;
comment on function public.guardia_aprueba_reservas(uuid) is
  'Si quien llama es guardia del edificio con el permiso «Puede aprobar reservas» (membresia_condominio.permisos.reservas), que da la administración en Seguridad › guardia › Editar.';
revoke execute on function public.guardia_aprueba_reservas(uuid) from public, anon;
grant execute on function public.guardia_aprueba_reservas(uuid) to authenticated, service_role;

-- La zona cobra algo: reserva, limpieza o garantía.
create or replace function public.zona_es_de_pago(p_zona_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(z.costo_reserva, 0) + coalesce(z.costo_limpieza, 0) + coalesce(z.monto_garantia, 0) > 0
    from public.zona_comun z where z.id = p_zona_id;
$$;
revoke execute on function public.zona_es_de_pago(uuid) from public, anon;
grant execute on function public.zona_es_de_pago(uuid) to authenticated, service_role;

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

  if public.es_admin_condominio(v_condominio) then
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

  raise exception 'Solo la administracion (o un guardia con permiso) aprueba o rechaza una reserva';
end;
$function$;

-- El guardia ve los comprobantes de las reservas de su edificio, y los sube
-- cuando reserva por un vecino.
create or replace function public.puede_ver_reserva(p_reserva_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = p_reserva_id
      and (
        public.es_miembro_unidad(r.unidad_id)
        or public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')
        -- El huesped reserva a su nombre y tiene que poder adjuntar el suyo.
        or r.solicitada_por = auth.uid()
        -- La portería de ese edificio (29/10/2026).
        or public.es_guardia_de_condominio(z.condominio_id)
      )
  );
$function$;

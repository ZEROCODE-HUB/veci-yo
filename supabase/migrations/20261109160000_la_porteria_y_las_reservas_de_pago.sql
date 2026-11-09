-- La portería y las reservas de zonas comunes (09/11/2026, Correcciones
-- fila 12: «el guardia no debe adjuntar comprobante de pago; si es una zona
-- que requiere pago, el guardia no debe poder registrarlo; al huésped o
-- propietario le sale notificación de que se ha reservado la zona común a X
-- hrs, y que fue hecha por el guardia de seguridad»).
--
-- 1. `la_porteria_no_reserva_lo_que_se_paga`: el guardia no reserva una zona
--    de pago para una vivienda que no es la suya. La pantalla ya no lo ofrece;
--    esto es por si llega por otro camino. La administración sí puede.
-- 2. `notificar_reserva`: el aviso a la vivienda dice quién la hizo («La hizo
--    el guardia de seguridad» o «la administración»). La fecha y la hora ya
--    iban en el texto. Desde `20261109150000` también le llega al propietario
--    que no reside.
--
-- Solo aditiva.

create or replace function public.la_porteria_no_reserva_lo_que_se_paga()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
begin
  if auth.uid() is null then
    return new;
  end if;
  select u.condominio_id into v_condominio from public.unidad u where u.id = new.unidad_id;
  if public.es_guardia_de_condominio(v_condominio)
     and not public.es_admin_condominio(v_condominio)
     and not exists (
       select 1 from public.membresia_unidad m
       where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid() and m.activo)
     and public.zona_es_de_pago(new.zona_id) then
    raise exception 'Esta zona es de pago: la reserva la hace la vivienda o la administración.'
      using errcode = 'check_violation',
            constraint = 'reserva_zona_de_pago_por_la_porteria';
  end if;
  return new;
end;
$$;

comment on function public.la_porteria_no_reserva_lo_que_se_paga() is
  'La portería no reserva zonas de pago a nombre de una vivienda (Correcciones fila 12, 09/11/2026).';

revoke execute on function public.la_porteria_no_reserva_lo_que_se_paga() from public, anon, authenticated;

drop trigger if exists reserva_zona_de_pago_por_la_porteria on public.reserva_zona;
create trigger reserva_zona_de_pago_por_la_porteria
  before insert on public.reserva_zona
  for each row execute function public.la_porteria_no_reserva_lo_que_se_paga();

create or replace function public.notificar_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_zona text;
  v_que text;
  v_anterior public.estado_reserva := null;
  v_quien uuid := auth.uid();
  v_solo_residentes boolean;
  v_condominio uuid;
  v_hecha_por text := '';
begin
  v_solo_residentes := not exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = new.unidad_id and m.usuario_id = new.solicitada_por
      and m.rol = 'huesped_temporal');
  select z.nombre into v_zona
  from public.zona_comun z where z.id = new.zona_id;
  v_que := coalesce(v_zona, 'la zona común') || ' del ' || to_char(new.fecha, 'DD/MM/YYYY') ||
           ' (' || to_char(new.hora_inicio, 'HH24:MI') || ' a ' || to_char(new.hora_fin, 'HH24:MI') || ')';

  if tg_op = 'INSERT' then
    -- Quien reserva para su propia vivienda no necesita que se lo digan.
    if v_quien is not null
       and not exists (
         select 1 from public.membresia_unidad m
         where m.unidad_id = new.unidad_id and m.usuario_id = v_quien and m.activo) then
      -- Quién la hizo (09/11/2026, Correcciones fila 12).
      select u.condominio_id into v_condominio from public.unidad u where u.id = new.unidad_id;
      v_hecha_por := case
        when public.es_admin_condominio(v_condominio) then ' La hizo la administración.'
        when public.es_guardia_de_condominio(v_condominio) then ' La hizo el guardia de seguridad.'
        else ''
      end;
      perform public.notificar_unidad(
        new.unidad_id, 'reserva_creada',
        'Te hicieron una reserva',
        'Se reservó ' || v_que || ' a nombre de tu vivienda.' || v_hecha_por,
        'reserva_zona', new.id, v_quien, v_solo_residentes);
    end if;
  else
    v_anterior := old.estado;
    if new.estado = 'cancelada' and old.estado <> 'cancelada' then
      perform public.notificar_unidad(
        new.unidad_id, 'reserva_cancelada',
        'Reserva cancelada',
        'Se canceló tu reserva de ' || v_que || '.',
        'reserva_zona', new.id, v_quien, v_solo_residentes);
      return new;
    end if;
    if new.estado <> 'cancelada'
       and (new.fecha, new.hora_inicio, new.hora_fin, new.zona_id)
           is distinct from (old.fecha, old.hora_inicio, old.hora_fin, old.zona_id) then
      perform public.notificar_unidad(
        new.unidad_id, 'reserva_cambiada',
        'Reserva cambiada',
        'Tu reserva ahora es ' || v_que || '.',
        'reserva_zona', new.id, v_quien, v_solo_residentes);
    end if;
  end if;

  if new.estado is not distinct from v_anterior then
    return new;
  end if;

  if new.estado = 'aprobada' then
    perform public.notificar_unidad(
      new.unidad_id, 'reserva_aprobada',
      'Reserva confirmada',
      'Tu reserva de ' || coalesce(v_zona, 'la zona comun') ||
        ' para el ' || to_char(new.fecha, 'DD/MM/YYYY') || ' fue aprobada.',
      'reserva_zona', new.id,
      coalesce(new.resuelta_por, new.solicitada_por), v_solo_residentes);

  elsif new.estado = 'rechazada' then
    perform public.notificar_unidad(
      new.unidad_id, 'reserva_rechazada',
      'Reserva rechazada',
      'Tu reserva de ' || coalesce(v_zona, 'la zona comun') ||
        ' para el ' || to_char(new.fecha, 'DD/MM/YYYY') || ' fue rechazada.' ||
        coalesce(' Motivo: ' || new.motivo_rechazo, ''),
      'reserva_zona', new.id, new.resuelta_por, v_solo_residentes);
  end if;
  return new;
end;
$function$;

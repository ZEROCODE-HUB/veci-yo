-- El preregistro no se cierra con más vehículos que estacionamientos.
--
-- Para Claude 117 (27/10/2026): el huésped apunta su vehículo, el anfitrión
-- baja después los estacionamientos a 0, y el huésped recarga y **envía**: el
-- preregistro se cerraba con el vehículo dentro. La regla del hueco 17 (en el
-- preregistro no caben más vehículos que estacionamientos) solo se miraba al
-- apuntar uno, no al cerrar.
--
-- Va en un disparador y no en `cerrar_precheckin`: esa función tiene 22
-- versiones y reescribirla entera para una comprobación es donde se cuela un
-- cambio sin querer. Solo ella pone `precheckin_completado_en`.
--
-- Cuentan todos los vehículos de la reserva, también los que apuntó el
-- anfitrión: el huésped los puede quitar desde el mismo paso. Vacío no limita.

create or replace function public.vehiculos_caben_al_cerrar_precheckin()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tope   int;
  v_tienen int;
begin
  select s.estacionamientos_huesped into v_tope
  from public.suscripcion_renta_corta s
  where s.unidad_id = new.unidad_id;

  if v_tope is null then
    return new;
  end if;

  select count(*) into v_tienen
  from public.vehiculo_visita x
  where x.visita_id = new.id;

  if v_tienen > v_tope then
    if v_tope = 0 then
      raise exception 'Este alojamiento ya no tiene estacionamiento para huéspedes. Quita el vehículo de la lista para poder enviar tus datos.'
        using errcode = 'check_violation';
    end if;
    raise exception 'Este alojamiento tiene % para huéspedes y en la lista hay %. Quita los que sobran para poder enviar tus datos.',
      case when v_tope = 1 then '1 estacionamiento' else v_tope || ' estacionamientos' end,
      case when v_tienen = 1 then '1 vehículo' else v_tienen || ' vehículos' end
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.vehiculos_caben_al_cerrar_precheckin() is
  'Disparador: el preregistro no se cierra si la reserva tiene más vehículos '
  'que los estacionamientos que ofrece el alojamiento (vacío no limita). '
  'Para Claude 117, 27/10/2026.';

revoke execute on function public.vehiculos_caben_al_cerrar_precheckin() from public, anon, authenticated;

create trigger vehiculos_caben_al_cerrar_precheckin
  before update of precheckin_completado_en on public.visita
  for each row
  when (old.precheckin_completado_en is null and new.precheckin_completado_en is not null)
  execute function public.vehiculos_caben_al_cerrar_precheckin();

-- Marca y color, obligatorios al apuntar un vehículo en el preregistro (Para
-- Claude 116). Solo al apuntar uno nuevo: el que trajo el anfitrión puede no
-- tenerlos, y al huésped solo se le pide decir quién responde por él.
create or replace function public.guardar_vehiculo_precheckin(p_token text, p_placa text, p_responsable_invitado_id uuid, p_tipo tipo_vehiculo DEFAULT NULL::tipo_vehiculo, p_marca text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_vehiculo_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_visita uuid;
  v_placa  text := upper(regexp_replace(coalesce(p_placa, ''), '[^A-Za-z0-9]', '', 'g'));
  v_id     uuid;
  v_tope   int;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if exists (select 1 from public.visita v
             where v.id = v_visita and v.precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  -- La placa es lo que mira la porteria: sin ella no hay vehiculo que apuntar.
  if v_placa = '' then
    raise exception 'Hace falta la placa del vehiculo';
  end if;

  -- Aqui si es obligatorio: es justo lo que este formulario viene a preguntar.
  if p_responsable_invitado_id is null then
    raise exception 'Falta decir quien responde por el vehiculo';
  end if;

  if p_vehiculo_id is not null then
    update public.vehiculo_visita set
      placa = v_placa,
      tipo  = p_tipo,
      marca = nullif(btrim(coalesce(p_marca, '')), ''),
      color = nullif(btrim(coalesce(p_color, '')), ''),
      responsable_invitado_id = p_responsable_invitado_id
    where id = p_vehiculo_id and visita_id = v_visita;

    if not found then
      raise exception 'Ese vehiculo no es de esta reserva';
    end if;
    return p_vehiculo_id;
  end if;

  -- Para Claude 116: la porteria reconoce el carro por la marca y el color.
  if btrim(coalesce(p_marca, '')) = '' or btrim(coalesce(p_color, '')) = '' then
    raise exception 'Faltan la marca y el color del vehículo'
      using errcode = 'check_violation';
  end if;

  -- Hueco 17: no más vehículos que estacionamientos. Vacío no limita.
  select s.estacionamientos_huesped into v_tope
  from public.visita v
  join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  where v.id = v_visita;

  if v_tope is not null
     and (select count(*) from public.vehiculo_visita x where x.visita_id = v_visita) >= v_tope then
    if v_tope = 0 then
      raise exception 'Este alojamiento no tiene estacionamiento para huéspedes: no se pueden registrar vehículos. Si llegan en uno, tendrá que quedarse fuera del edificio.'
        using errcode = 'check_violation';
    end if;
    raise exception 'Este alojamiento tiene % para huéspedes y ya están ocupados: no caben más vehículos.',
      case when v_tope = 1 then '1 estacionamiento' else v_tope || ' estacionamientos' end
      using errcode = 'check_violation';
  end if;

  insert into public.vehiculo_visita
    (visita_id, placa, tipo, marca, color, responsable_invitado_id)
  values (
    v_visita, v_placa, p_tipo,
    nullif(btrim(coalesce(p_marca, '')), ''),
    nullif(btrim(coalesce(p_color, '')), ''),
    p_responsable_invitado_id
  )
  returning id into v_id;

  return v_id;
end;
$function$;

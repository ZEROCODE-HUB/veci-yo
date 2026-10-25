-- Los estacionamientos del alojamiento: vacío no limita, un número sí.
--
-- Hueco 17, ajustado por el cliente el 25/10/2026, el mismo día de la primera
-- versión (20261025100000, que solo avisaba):
--   · en el preregistro **bloquea**: el huésped no registra más vehículos que
--     estacionamientos ofrece el anfitrión;
--   · con 0 no se registra ninguno;
--   · vacío (el anfitrión no lo indicó) no limita.
--
-- Hasta hoy la columna era NOT NULL con 0 por defecto, así que «0» y «no lo
-- indiqué» eran lo mismo. Ahora son distintos y la columna admite vacío.
--
-- El único 0 que había (la 205) era el valor por defecto: con la regla nueva
-- habría dejado sin vehículos a un alojamiento que nunca configuró el campo.
-- Pasa a vacío, que es como se comportaba hasta hoy.

alter table public.suscripcion_renta_corta
  alter column estacionamientos_huesped drop not null,
  alter column estacionamientos_huesped drop default;

update public.suscripcion_renta_corta
   set estacionamientos_huesped = null
 where estacionamientos_huesped = 0;

comment on column public.suscripcion_renta_corta.estacionamientos_huesped is
  'Estacionamientos que el anfitrión ofrece a sus huéspedes. Vacío = no lo '
  'indicó y no limita. 0 = ninguno. En el preregistro no se registran más '
  'vehículos que este número (guardar_vehiculo_precheckin); al anfitrión se '
  'le avisa al crear o editar la reserva. Hueco 17, 25/10/2026.';

-- El parámetro con que nacía el número ya no se usa: la renta corta nace sin
-- estacionamientos indicados. No se borra la fila; se dice.
update public.configuracion_plataforma
   set descripcion = 'Sin uso desde el 25/10/2026: la renta corta nace sin estacionamientos indicados (vacío = sin límite) y el anfitrión los pone en Huéspedes temporales.'
 where clave = 'renta_corta_estacionamientos_por_defecto';

-- Guardar el número; vacío lo quita. `guardar_alojamiento` no puede: hace
-- `coalesce(p_estacionamientos, lo_que_habia)`, así que un vacío no borra.
-- Es el mismo arreglo que `guardar_estancia_maxima`.
create or replace function public.guardar_estacionamientos_huesped(
  p_unidad_id uuid,
  p_cantidad integer
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No podes configurar el alojamiento de esta vivienda';
  end if;
  if p_cantidad is not null and p_cantidad < 0 then
    raise exception 'Los estacionamientos no pueden ser negativos';
  end if;
  update public.suscripcion_renta_corta
     set estacionamientos_huesped = p_cantidad
   where unidad_id = p_unidad_id;
end;
$$;

comment on function public.guardar_estacionamientos_huesped(uuid, integer) is
  'Fija los estacionamientos que el anfitrión ofrece a sus huéspedes; vacío los '
  'quita (sin límite). Quien puede configurar el alojamiento.';

grant execute on function public.guardar_estacionamientos_huesped(uuid, integer) to authenticated;

-- El preregistro no registra más vehículos que estacionamientos. Solo al
-- añadir: corregir uno que ya está no ocupa sitio nuevo. La portería y el
-- anfitrión no pasan por aquí: la portería tiene que poder apuntar el
-- vehículo con el que alguien llega, aunque se quede fuera.
create or replace function public.guardar_vehiculo_precheckin(
  p_token text,
  p_placa text,
  p_responsable_invitado_id uuid,
  p_tipo tipo_vehiculo default null::tipo_vehiculo,
  p_marca text default null::text,
  p_color text default null::text,
  p_vehiculo_id uuid default null::uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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

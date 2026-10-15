-- La portería cambia y cancela reservas, y la vivienda se entera (15/10/2026).
--
-- El cliente: «si el guardia no puede mover o cancelar reservas, quién sí
-- puede? creo que lo mejor es que sí pueda… y obvio de todas las acciones debe
-- llegarle notificación al usuario afectado».
--
-- Hasta aquí cambiaban y cancelaban la vivienda y la administración. Ahora
-- también la portería del mismo edificio. No borra: cancelar es pasar a
-- `cancelada`, que deja constancia.
--
-- Avisos: cuando alguien que no es de la vivienda le crea una reserva, y
-- cuando cualquiera le cambia la fecha, la hora o la zona, o la cancela, le
-- llega a la vivienda --menos a quien lo hizo--. Antes solo avisaban aprobar y
-- rechazar, así que una reserva aprobada que la administración cancelaba no le
-- decía nada a nadie (hueco 28).
--
-- Y de paso el hueco 30: el huésped recibía los avisos de las reservas del
-- dueño. Si quien pidió la reserva no es huésped de la vivienda, el aviso va
-- solo a los residentes.

drop policy if exists reserva_zona_cambio on public.reserva_zona;
create policy reserva_zona_cambio on public.reserva_zona
  for update to authenticated
  using (
    (public.es_miembro_unidad(unidad_id) and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and (public.es_admin_condominio(z.condominio_id)
             or (public.es_guardia_de_condominio(z.condominio_id)
                 and public.condominio_de_unidad(reserva_zona.unidad_id) = z.condominio_id)))
  )
  with check (
    (public.es_miembro_unidad(unidad_id) and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and (public.es_admin_condominio(z.condominio_id)
             or (public.es_guardia_de_condominio(z.condominio_id)
                 and public.condominio_de_unidad(reserva_zona.unidad_id) = z.condominio_id)))
  );

create or replace function public.notificar_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_zona text;
  v_que text;
  v_anterior public.estado_reserva := null;
  v_quien uuid := auth.uid();
  v_solo_residentes boolean;
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
      perform public.notificar_unidad(
        new.unidad_id, 'reserva_creada',
        'Te hicieron una reserva',
        'Se reservó ' || v_que || ' a nombre de tu vivienda.',
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
$$;

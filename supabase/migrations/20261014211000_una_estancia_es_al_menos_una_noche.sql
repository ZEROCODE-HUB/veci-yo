/*
  `cambiar_fechas_de_estancia` dejaba poner la salida el mismo dia de la
  llegada, y la base exige al menos una noche (`visita_estancia_al_menos_una_
  noche`): el anfitrion habria recibido el error en ingles de la restriccion.
  Ahora lo dice la funcion. (14/10/2026)
*/

create or replace function public.cambiar_fechas_de_estancia(
  p_visita_id uuid,
  p_desde     date,
  p_hasta     date
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v   public.visita%rowtype;
  hoy date;
begin
  select * into v from public.visita where id = p_visita_id for update;
  if v.id is null or v.tipo <> 'huesped_temporal' then
    raise exception 'Esa estancia no existe';
  end if;

  if not public.puede_configurar_alojamiento(v.unidad_id) then
    raise exception 'Solo el anfitrion puede cambiar las fechas de la estancia';
  end if;

  if v.estado in ('cancelada', 'finalizada') then
    raise exception 'Esa estancia ya termino o se cancelo';
  end if;

  if p_desde is null or p_hasta is null or p_hasta <= p_desde then
    raise exception 'La salida tiene que ser al menos un dia despues de la llegada';
  end if;

  hoy := (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date;

  if exists (select 1 from public.invitado i where i.visita_id = v.id and i.llego) then
    if p_desde is distinct from v.fecha_desde then
      raise exception 'Ya entraron: solo se puede cambiar el dia de salida';
    end if;
    if p_hasta < hoy then
      raise exception 'La salida no puede quedar en el pasado';
    end if;
  elsif p_desde < hoy then
    raise exception 'La llegada no puede quedar en el pasado';
  end if;

  update public.visita
     set fecha_desde = p_desde,
         fecha_hasta = p_hasta,
         precheckin_expira_en = case
           when precheckin_expira_en is not null then (p_hasta + 1)::timestamptz
         end
   where id = v.id;

  -- La invitacion que todavia no se acepto lleva las fechas nuevas.
  update public.invitacion
     set vigente_desde = p_desde,
         vigente_hasta = p_hasta,
         expira_en     = (p_hasta + 1)::timestamptz
   where estado = 'pendiente'
     and invitado_id in (select id from public.invitado where visita_id = v.id);

  -- Y la membresia de quien ya tiene cuenta: de ella salen sus privilegios.
  update public.membresia_unidad m
     set vigente_desde = p_desde,
         vigente_hasta = p_hasta
    from public.invitado i
   where i.visita_id = v.id
     and i.usuario_id = m.usuario_id
     and m.unidad_id = v.unidad_id
     and m.rol = 'huesped_temporal'
     and m.vigente_desde is not distinct from v.fecha_desde;
end;
$$;


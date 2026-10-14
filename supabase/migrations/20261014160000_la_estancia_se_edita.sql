/*
  El anfitrion edita la estancia, y los privilegios la siguen (14/10/2026).

  Lo pidio la responsable de producto: «editar los tiempos de reserva
  (anfitrion); mostrar que puede hacer el huesped y el anfitrion: agregar y
  quitar personas, extender fechas, agregar vehiculos», y «si se le acorta o
  extiende, se le cambian los privilegios por corta o larga estancia».

  - `cambiar_fechas_de_estancia`: extiende o acorta. Con alguien dentro solo
    se mueve la salida. Mueve tambien las fechas de la invitacion pendiente y
    de la membresia del huesped: `reglas_de_estancia` cuenta las noches de la
    membresia, asi que los privilegios cambian solos.
  - `quitar_persona_de_estancia`: alguien que todavia no entro y no es el
    titular.
  - `agregar_vehiculo_de_estancia`: una placa mas, con su responsable.
  - Zonas: un huesped de **larga** estancia reserva las zonas abiertas a larga
    estancia (el gimnasio «solo para estadia prolongada»). Hasta hoy se le
    trataba siempre como corta.

  Solo aditiva: funciones y el reemplazo de una politica.
*/

-- ----------------------------------------------------------------------------
-- Corta o larga, para quien pregunta
-- ----------------------------------------------------------------------------

create or replace function public.mi_estancia_es_corta(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with m as (
    select greatest(m.vigente_hasta - coalesce(m.vigente_desde, current_date), 1) as noches
    from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.rol = 'huesped_temporal'
      and m.activo
      and (m.vigente_desde is null or m.vigente_desde <= current_date)
      and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
    order by m.vigente_hasta desc nulls first
    limit 1
  )
  select case
    -- Si el edificio no distingue corta de larga, todo huesped es «corta»,
    -- que es como funcionaba hasta hoy.
    when not coalesce((select p.diferencia_estancia from public.permisos_de_unidad(p_unidad_id) p), false)
      then true
    when not exists (select 1 from m) then true
    else public.es_estancia_corta(p_unidad_id, (select noches from m))
  end;
$$;

comment on function public.mi_estancia_es_corta(uuid) is
  'Si la estancia de quien pregunta en esa vivienda es corta, segun el umbral de noches del edificio. Si el edificio no distingue, siempre corta.';

grant execute on function public.mi_estancia_es_corta(uuid) to authenticated;

drop policy if exists reserva_zona_huesped_alta on public.reserva_zona;
create policy reserva_zona_huesped_alta on public.reserva_zona
  for insert to authenticated
  with check (
    solicitada_por = auth.uid()
    and public.es_huesped_con_reserva(unidad_id)
    and public.estancia_cubre_fecha(unidad_id, fecha)
    and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and case
              when public.mi_estancia_es_corta(reserva_zona.unidad_id)
                then z.permite_estancia_corta
              else z.permite_estancia_larga
            end
    )
  );

-- ----------------------------------------------------------------------------
-- Cambiar las fechas
-- ----------------------------------------------------------------------------

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

  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    raise exception 'La salida tiene que ser el mismo dia de la llegada o despues';
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

comment on function public.cambiar_fechas_de_estancia(uuid, date, date) is
  'El anfitrion extiende o acorta una estancia. Mueve tambien la invitacion pendiente y la membresia del huesped, de las que salen sus privilegios de corta o larga estancia.';

grant execute on function public.cambiar_fechas_de_estancia(uuid, date, date) to authenticated;

-- ----------------------------------------------------------------------------
-- Quitar a alguien que no ha llegado
-- ----------------------------------------------------------------------------

create or replace function public.quitar_persona_de_estancia(p_invitado_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i public.invitado%rowtype;
  v public.visita%rowtype;
begin
  select * into i from public.invitado where id = p_invitado_id;
  select * into v from public.visita where id = i.visita_id;

  if i.id is null or v.tipo <> 'huesped_temporal' then
    raise exception 'Esa persona no es de una estancia';
  end if;
  if not public.puede_configurar_alojamiento(v.unidad_id) then
    raise exception 'Solo el anfitrion puede quitar a alguien de la estancia';
  end if;
  if i.es_titular then
    raise exception 'El titular no se quita: si no viene, cancela la estancia';
  end if;
  if i.llego then
    raise exception 'Ya entro al edificio: marca su salida en vez de quitarlo';
  end if;
  if exists (select 1 from public.verificacion_antecedentes va where va.invitado_id = i.id) then
    raise exception 'Ya tiene una consulta de antecedentes: queda como constancia y no se puede quitar';
  end if;

  -- Quien responde por un menor no se va dejando al menor solo.
  if exists (select 1 from public.invitado m where m.responsable_id = i.id) then
    raise exception 'Responde por un menor de la estancia: cambia antes quien responde por el';
  end if;

  update public.vehiculo_visita set responsable_invitado_id = null
   where responsable_invitado_id = i.id;
  delete from public.autorizacion_menor where invitado_id = i.id;
  delete from public.verificacion_documento where invitado_id = i.id;
  delete from public.invitado where id = i.id;

  -- Una persona menos en la reserva.
  update public.visita
     set huespedes_previstos = greatest(huespedes_previstos - 1, 1)
   where id = v.id and huespedes_previstos is not null;
end;
$$;

comment on function public.quitar_persona_de_estancia(uuid) is
  'El anfitrion quita de la estancia a alguien que no es el titular, no ha entrado y no tiene consulta de antecedentes.';

grant execute on function public.quitar_persona_de_estancia(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Agregar un vehiculo
-- ----------------------------------------------------------------------------

create or replace function public.agregar_vehiculo_de_estancia(
  p_visita_id      uuid,
  p_placa          text,
  p_tipo           text default null,
  p_responsable_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v  public.visita%rowtype;
  id uuid;
begin
  select * into v from public.visita where visita.id = p_visita_id;
  if v.id is null or v.tipo <> 'huesped_temporal' then
    raise exception 'Esa estancia no existe';
  end if;
  if not public.puede_configurar_alojamiento(v.unidad_id) then
    raise exception 'Solo el anfitrion puede agregar vehiculos a la estancia';
  end if;
  if v.estado in ('cancelada', 'finalizada') then
    raise exception 'Esa estancia ya termino o se cancelo';
  end if;
  if coalesce(btrim(p_placa), '') = '' then
    raise exception 'Falta la placa';
  end if;

  insert into public.vehiculo_visita (visita_id, placa, tipo, responsable_invitado_id)
  values (v.id, upper(regexp_replace(btrim(p_placa), '[\s-]', '', 'g')),
          nullif(btrim(coalesce(p_tipo, '')), ''), p_responsable_id)
  returning vehiculo_visita.id into id;
  return id;
end;
$$;

comment on function public.agregar_vehiculo_de_estancia(uuid, text, text, uuid) is
  'El anfitrion agrega una placa a la estancia. Los disparadores de siempre comprueban que el edificio admita cocheras y que el responsable viaje en ella.';

grant execute on function public.agregar_vehiculo_de_estancia(uuid, text, text, uuid) to authenticated;

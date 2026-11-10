-- El historial de la estancia dice qué es cada visita y quién la anunció
-- (10/11/2026, pedido del cliente).
--
-- `historial_de_la_estancia` incluye las visitas a la vivienda mientras dura
-- la estancia (así se pidió el 16/10/2026: «si entró visitas, si entró un
-- rappi…»). Pero las pintaba como «Leonador Angulo · temporal», con el tipo
-- crudo del enum y sin decir que era una visita a la vivienda ni quién la
-- anunció, y el cliente las leyó como gente de la reserva. Ahora el título dice
-- «Visita a la vivienda: …» y el detalle el tipo, si entró y quién la anunció.
-- Solo aditiva: misma firma.

create or replace function public.historial_de_la_estancia(p_visita_id uuid)
 RETURNS TABLE(momento timestamp with time zone, tipo text, titulo text, detalle text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- Las columnas que devuelve (`tipo`, `titulo`…) se llaman igual que columnas
-- de las tablas: sin esto, plpgsql no sabe cuál es cuál.
#variable_conflict use_column
declare
  v public.visita%rowtype;
  v_hasta date;
  v_usuarios uuid[];
begin
  select * into v from public.visita
   where id = p_visita_id and deleted_at is null and tipo = 'huesped_temporal';
  if v.id is null then
    return;
  end if;

  -- El anfitrión y quien gestiona la vivienda; la administración y la portería
  -- del edificio. El huésped no.
  if not (
    public.puede_configurar_alojamiento(v.unidad_id)
    or exists (
      select 1 from public.membresia_unidad mu
      where mu.unidad_id = v.unidad_id and mu.usuario_id = auth.uid()
        and mu.activo and mu.rol <> 'huesped_temporal'
    )
    or public.es_admin_condominio(v.condominio_id)
    or public.es_personal_condominio(v.condominio_id)
  ) then
    raise exception 'No puedes ver el historial de esta estancia' using errcode = '42501';
  end if;

  v_hasta := coalesce(v.fecha_hasta, v.fecha_desde);
  select coalesce(array_agg(i.usuario_id) filter (where i.usuario_id is not null), '{}')
    into v_usuarios
  from public.invitado i where i.visita_id = v.id;

  return query
  -- Entradas y salidas de los propios huéspedes.
  select i.ingreso_en, 'entrada'::text, i.nombre || ' entró', null::text
    from public.invitado i where i.visita_id = v.id and i.ingreso_en is not null
  union all
  select i.salida_en, 'salida', i.nombre || ' salió', null
    from public.invitado i where i.visita_id = v.id and i.salida_en is not null
  -- Visitas a la vivienda mientras duró la estancia (amigos, domicilios…).
  union all
  -- Dicho para quien lo lee (10/11/2026): «Leonador Angulo · temporal» no
  -- decía que era una visita a la vivienda ni quién la anunció, y parecía
  -- alguien de la reserva.
  select coalesce(iv.ingreso_en, ov.created_at), 'visita',
         'Visita a la vivienda: ' || coalesce(iv.nombre, 'sin nombre'),
         concat_ws(' · ',
           case ov.tipo::text
             when 'amigos' then 'Amigos o familia'
             when 'temporal' then 'Visita temporal'
             when 'permanente' then 'Visita permanente'
             else ov.tipo::text end,
           case when iv.ingreso_en is not null then 'Entró' else 'Anunciada, sin entrar' end,
           case
             when ov.registrada_por = any (v_usuarios) then 'La anunció el huésped'
             when ov.registrada_por is not null then 'La anunció ' || coalesce(
               nullif(btrim(coalesce(pf.nombre, '') || ' ' || coalesce(pf.apellido, '')), ''),
               'alguien sin nombre')
           end)
    from public.visita ov
    join public.invitado iv on iv.visita_id = ov.id
    left join public.perfil pf on pf.id = ov.registrada_por
   where ov.unidad_id = v.unidad_id
     and ov.id <> v.id
     and ov.deleted_at is null
     and ov.tipo <> 'huesped_temporal'
     and coalesce(ov.fecha_desde, ov.created_at::date) between v.fecha_desde and v_hasta
  -- Correspondencia y domicilios que llegaron a la vivienda.
  union all
  select c.registrada_en, 'correspondencia',
         coalesce(nullif(c.empresa, ''), nullif(c.logistica, ''), 'Paquete'),
         c.descripcion
    from public.correspondencia c
   where c.unidad_id = v.unidad_id
     and c.deleted_at is null
     and (c.registrada_en at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
         between v.fecha_desde and v_hasta
  -- Zonas comunes que reservaron los huéspedes.
  union all
  select (r.fecha + r.hora_inicio)::timestamp at time zone public.zona_horaria_del_condominio(v.condominio_id),
         'zona', z.nombre,
         to_char(r.hora_inicio, 'HH24:MI') || '–' || to_char(r.hora_fin, 'HH24:MI') || ' · ' || r.estado::text
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
   where r.unidad_id = v.unidad_id
     and r.solicitada_por = any (v_usuarios)
     and r.fecha between v.fecha_desde and v_hasta
  -- PQRS de la estancia, o contra la vivienda en esas fechas.
  union all
  select q.created_at, 'pqrs', q.numero || ' · ' || q.titulo, q.estado::text
    from public.reclamo q
   where q.visita_id = v.id
      or (q.unidad_denunciada = v.unidad_id
          and (q.created_at at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
              between v.fecha_desde and v_hasta)
  order by 1;
end;
$function$;

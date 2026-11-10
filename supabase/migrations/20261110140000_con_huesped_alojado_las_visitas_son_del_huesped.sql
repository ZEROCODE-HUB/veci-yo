-- Con un huésped alojado, las visitas de amigos son del huésped (10/11/2026,
-- decidido con el cliente: «no tiene sentido que tengas visitas de Amigos si
-- tienes un huésped temporal ahí»).
--
-- Mientras dura una estancia en una vivienda:
--   1. quien es de la vivienda y no es el huésped (propietario, anfitrión…) no
--      puede anunciar una visita de «Amigos o familia» para esos días;
--   2. sí puede anunciar una «Visita temporal» (un técnico, la limpieza), y en
--      el historial sale «La anunció el anfitrión»;
--   3. cuando entra una visita que no anunció la vivienda (la anotó la
--      portería, o el propio huésped), el aviso le llega al huésped y no al
--      dueño.
--
-- La portería y la administración pueden seguir anotando cualquier visita: es
-- quien la registra cuando el amigo del huésped llega a la puerta. Una persona
-- que es administradora y además propietaria pasa por aquí como personal del
-- edificio (el rol activo no viaja a la base, regla 8): la pantalla del
-- propietario lo comprueba por su lado con `huesped_alojado_hasta`.
-- Solo aditiva.

-- Hasta qué día hay un huésped alojado en esa vivienda en esa fecha; nulo si
-- no hay ninguno. Responde a quien es de la vivienda o trabaja en el edificio.
create or replace function public.huesped_alojado_hasta(p_unidad_id uuid, p_fecha date)
returns date
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select max(v.fecha_hasta)
    from public.visita v
   where v.unidad_id = p_unidad_id
     and v.tipo = 'huesped_temporal'
     and v.deleted_at is null
     and v.estado in ('programada', 'ingresada')
     and p_fecha between v.fecha_desde and coalesce(v.fecha_hasta, v.fecha_desde)
     and (
       auth.uid() is null
       or exists (select 1 from public.membresia_unidad m
                   where m.unidad_id = p_unidad_id and m.usuario_id = auth.uid() and m.activo)
       or public.es_admin_condominio(v.condominio_id)
       or public.es_personal_condominio(v.condominio_id)
     );
$$;

revoke execute on function public.huesped_alojado_hasta(uuid, date) from public, anon;
grant execute on function public.huesped_alojado_hasta(uuid, date) to authenticated, service_role;
comment on function public.huesped_alojado_hasta(uuid, date) is
  'Último día de la estancia de huésped que cubre esa fecha en esa vivienda, o nulo (10/11/2026).';

-- 1. El propietario o anfitrión no anuncia amigos con un huésped dentro.
create or replace function public.amigos_no_con_huesped_alojado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hasta date;
begin
  if auth.uid() is null or new.tipo <> 'amigos' or new.unidad_id is null or new.para_administracion then
    return new;
  end if;
  -- La portería y la administración anotan a quien llega a la puerta.
  if public.es_administrador_principal(new.condominio_id)
     or public.es_guardia_activo(new.condominio_id)
     or public.es_coadministrador_de_edificio(new.condominio_id) then
    return new;
  end if;
  -- Solo quien es de la vivienda y no es su huésped.
  if not exists (select 1 from public.membresia_unidad m
                  where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                    and m.activo and m.rol <> 'huesped_temporal') then
    return new;
  end if;
  if exists (select 1 from public.membresia_unidad m
              where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                and m.activo and m.rol = 'huesped_temporal') then
    return new;
  end if;

  v_hasta := public.huesped_alojado_hasta(
    new.unidad_id, coalesce(new.fecha_desde, public.hoy_en_el_edificio(new.condominio_id)));
  if v_hasta is not null then
    raise exception 'La vivienda tiene un huésped alojado hasta el %: las visitas de amigos o familia las anuncia el huésped. Si es un técnico o la limpieza, anúnciala como «Visita temporal».',
      to_char(v_hasta, 'DD/MM/YYYY')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists visita_amigos_no_con_huesped on public.visita;
create trigger visita_amigos_no_con_huesped
  before insert on public.visita
  for each row execute function public.amigos_no_con_huesped_alojado();

-- 3. El aviso de la entrada, al huésped cuando la visita es suya.
create or replace function public.notificar_ingreso_invitado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad uuid;
  v_condominio uuid;
  v_registro uuid;
  v_fecha date;
  v_tipo text;
  v_ingreso_anterior timestamptz := null;
  v_de_la_vivienda boolean;
  v_huesped uuid;
begin
  if tg_op = 'UPDATE' then
    v_ingreso_anterior := old.ingreso_en;
  end if;

  if new.ingreso_en is null or v_ingreso_anterior is not null then
    return new;
  end if;

  select v.unidad_id, v.condominio_id, v.registrada_por, v.fecha_desde, v.tipo::text
    into v_unidad, v_condominio, v_registro, v_fecha, v_tipo
  from public.visita v where v.id = new.visita_id;

  -- Las visitas a la administración no tienen unidad a la que avisar.
  if v_unidad is null then
    return new;
  end if;

  -- ¿La anunció alguien de la vivienda que no es su huésped (el anfitrión que
  -- manda al técnico)? Entonces es del dueño, como siempre.
  v_de_la_vivienda := v_registro is not null and exists (
    select 1 from public.membresia_unidad m
     where m.unidad_id = v_unidad and m.usuario_id = v_registro
       and m.activo and m.rol <> 'huesped_temporal');

  -- Con un huésped alojado ese día, y la visita no la anunció el dueño: es
  -- del huésped. Se le avisa a él, no a la vivienda (10/11/2026).
  if v_tipo <> 'huesped_temporal' and not v_de_la_vivienda
     and public.huesped_alojado_hasta(v_unidad, coalesce(v_fecha, public.hoy_en_el_edificio(v_condominio))) is not null then
    for v_huesped in
      select distinct m.usuario_id
        from public.membresia_unidad m
       where m.unidad_id = v_unidad and m.rol = 'huesped_temporal' and m.activo
         and m.usuario_id is not null
         and (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_el_edificio(v_condominio))
         and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(v_condominio))
    loop
      if public.quiere_aviso(v_huesped, 'visita_ingreso', 'app') then
        insert into public.notificacion
          (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
        values
          (v_huesped, v_condominio, 'visita_ingreso', 'Tu visita ingresó',
           new.nombre || ' ingresó al condominio.', 'visita', new.visita_id);
      end if;
    end loop;
    return new;
  end if;

  -- Los residentes de la vivienda, no sus huéspedes (15/10/2026).
  perform public.notificar_unidad(
    v_unidad, 'visita_ingreso',
    'Tu visita ingresó',
    new.nombre || ' ingresó al condominio.',
    'visita', new.visita_id, null, true);

  -- Y quien registró la visita si es un huésped de la vivienda: su invitado sí
  -- es suyo.
  if v_registro is not null and exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = v_unidad
      and m.usuario_id = v_registro
      and m.rol = 'huesped_temporal'
      and m.activo
      and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(v_condominio))
  ) and public.quiere_aviso(v_registro, 'visita_ingreso', 'app') then
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    values
      (v_registro, v_condominio, 'visita_ingreso', 'Tu visita ingresó',
       new.nombre || ' ingresó al condominio.', 'visita', new.visita_id);
  end if;
  return new;
end;
$$;

-- 2. En el historial, lo que anunció el anfitrión lo dice así.
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
             -- El anfitrión que manda al técnico o a la limpieza (10/11/2026).
             when exists (select 1 from public.membresia_unidad ma
                           where ma.unidad_id = v.unidad_id and ma.usuario_id = ov.registrada_por
                             and ma.activo and ma.es_anfitrion_primario)
               then 'La anunció el anfitrión'
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

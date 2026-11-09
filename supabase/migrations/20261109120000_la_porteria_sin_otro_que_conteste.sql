-- La llamada a la portería no se queda sin nadie por culpa de quien llama
-- (09/11/2026, Correcciones fila 9: «al llamar desde el 102 no sale guardia»).
--
-- `le_suena_la_llamada` manda la llamada a la portería a los guardias de turno
-- y, si no hay ninguno que conteste, a la administración
-- (`porteria_sin_quien_conteste`). Pero esa comprobación contaba también a
-- **quien llama**: si el único guardia de turno es la misma persona que llama
-- desde su vivienda --en las pruebas, Juan Carlos es propietario del 102,
-- administrador y guardia--, «hay alguien en portería», la administración no
-- entra, y como a uno mismo no le suena su llamada, no le sonaba a nadie:
-- «Nadie recibe llamadas por la app ahí».
--
-- Ahora la regla sabe quién llama y no lo cuenta. Va como una versión de seis
-- argumentos; la de cinco se queda y llama a la nueva sin quien llama (lo de
-- siempre), para no romper a nadie que la use. Cada sitio que sabe quién llama
-- pasa a la nueva.

create or replace function public.porteria_sin_otro_que_conteste(
  p_condominio_id uuid,
  p_quien_llama uuid
) returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.rol = 'guardia'
      and mc.activo
      and (mc.permisos ->> 'llamadas') = 'true'
      and mc.usuario_id is distinct from p_quien_llama
      and public.quiere_llamadas_app(mc.usuario_id)
      and public.guardia_atiende_ahora(p_condominio_id, mc.usuario_id)
  );
$$;

comment on function public.porteria_sin_otro_que_conteste(uuid, uuid) is
  'Si en la portería no hay ningún guardia de turno, con llamadas, que la reciba por la app, sin contar a quien llama. Entonces la llamada a la portería suena en la administración.';

revoke execute on function public.porteria_sin_otro_que_conteste(uuid, uuid) from public, anon, authenticated;
grant execute on function public.porteria_sin_otro_que_conteste(uuid, uuid) to service_role;

create or replace function public.le_suena_la_llamada(
  p_usuario_id uuid,
  p_destino public.destino_intercom,
  p_origen public.origen_intercom,
  p_condominio_id uuid,
  p_a_unidad_id uuid,
  p_quien_llama uuid
) returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.quiere_llamadas_app(p_usuario_id) and (
    case p_destino
      when 'porteria' then
        (exists (
          select 1 from public.membresia_condominio mc
          where mc.condominio_id = p_condominio_id and mc.usuario_id = p_usuario_id
            and mc.rol = 'guardia' and mc.activo and (mc.permisos ->> 'llamadas') = 'true'
        )
        -- Solo de turno (30/10/2026).
        and public.guardia_atiende_ahora(p_condominio_id, p_usuario_id))
        -- Sin otro en portería que conteste, la administración. Salvo que
        -- quien llame sea la propia administración.
        or (p_origen is distinct from 'administracion'
            and public.porteria_sin_otro_que_conteste(p_condominio_id, p_quien_llama)
            and exists (
              select 1 from public.membresia_condominio mc
              where mc.condominio_id = p_condominio_id and mc.usuario_id = p_usuario_id
                and mc.rol in ('administrador', 'coadministrador') and mc.activo
            ))
      when 'administracion' then
        exists (
          select 1 from public.membresia_condominio mc
          where mc.condominio_id = p_condominio_id and mc.usuario_id = p_usuario_id
            and mc.rol in ('administrador', 'coadministrador') and mc.activo
        )
      when 'vivienda' then
        exists (
          select 1 from public.membresia_unidad m
          where m.unidad_id = p_a_unidad_id and m.usuario_id = p_usuario_id and m.activo
            and (m.rol <> 'huesped_temporal'
                 or ((m.vigente_desde is null or m.vigente_desde <= public.hoy_en_la_unidad(p_a_unidad_id))
                     and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_la_unidad(p_a_unidad_id))))
        )
      else false
    end
  );
$$;

comment on function public.le_suena_la_llamada(uuid, public.destino_intercom, public.origen_intercom, uuid, uuid, uuid) is
  'Si una llamada por la app le suena a esta persona. p_quien_llama no cuenta como portería que contesta (09/11/2026).';

revoke execute on function public.le_suena_la_llamada(uuid, public.destino_intercom, public.origen_intercom, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.le_suena_la_llamada(uuid, public.destino_intercom, public.origen_intercom, uuid, uuid, uuid) to service_role;

-- La de cinco: la misma regla, sin saber quién llama.
create or replace function public.le_suena_la_llamada(
  p_usuario_id uuid,
  p_destino public.destino_intercom,
  p_origen public.origen_intercom,
  p_condominio_id uuid,
  p_a_unidad_id uuid
) returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.le_suena_la_llamada(p_usuario_id, p_destino, p_origen, p_condominio_id, p_a_unidad_id, null::uuid);
$$;

-- ¿Se puede llamar por la app? Quien pregunta es quien llamaría.
create or replace function public.se_puede_llamar_por_la_app(
  p_destino public.destino_intercom,
  p_condominio_id uuid,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null
) returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  with yo as (
    select case
             when p_desde_unidad_id is not null
                  and (public.es_miembro_unidad(p_desde_unidad_id)
                       or public.es_huesped_alojado(p_desde_unidad_id))
               then 'vivienda'::public.origen_intercom
             when p_desde_unidad_id is null and p_destino <> 'administracion'
                  and public.es_admin_condominio(p_condominio_id)
               then 'administracion'::public.origen_intercom
             when p_desde_unidad_id is null and p_destino <> 'porteria'
                  and public.porteria_puede_llamar(p_condominio_id)
               then 'porteria'::public.origen_intercom
           end as origen
  )
  select coalesce((select origen from yo) is not null, false)
    and exists (
      select 1 from (
        select mc.usuario_id from public.membresia_condominio mc
        where mc.condominio_id = p_condominio_id and mc.activo and mc.usuario_id is not null
        union
        select m.usuario_id from public.membresia_unidad m
        where p_destino = 'vivienda' and m.unidad_id = p_a_unidad_id and m.activo
      ) gente
      where gente.usuario_id is distinct from auth.uid()
        and public.le_suena_la_llamada(gente.usuario_id, p_destino, (select origen from yo),
                                       p_condominio_id,
                                       case when p_destino = 'vivienda' then p_a_unidad_id end,
                                       auth.uid())
    );
$$;

create or replace function public.llamar_por_internet(
  p_destino public.destino_intercom,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null,
  p_condominio_id uuid default null
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_origen     public.origen_intercom;
  v_id         uuid;
begin
  if p_desde_unidad_id is not null then
    -- Desde una vivienda: quien vive ahí o el huésped que está dentro hoy.
    if not (public.es_miembro_unidad(p_desde_unidad_id)
            or public.es_huesped_alojado(p_desde_unidad_id)) then
      raise exception 'Solo se llama desde una vivienda tuya';
    end if;
    if p_destino = 'vivienda' then
      raise exception 'Desde una vivienda se llama a la portería o a la administración';
    end if;
    v_condominio := public.condominio_de_unidad(p_desde_unidad_id);
    v_origen := 'vivienda';
  else
    v_condominio := coalesce(p_condominio_id, public.condominio_de_unidad(p_a_unidad_id));
    if v_condominio is null then
      raise exception 'Falta a quién llamas';
    end if;
    if p_destino <> 'administracion' and public.es_admin_condominio(v_condominio) then
      v_origen := 'administracion';
    elsif p_destino <> 'porteria' and public.porteria_puede_llamar(v_condominio) then
      v_origen := 'porteria';
    elsif public.es_personal_condominio(v_condominio) then
      raise exception 'La administracion no te habilito las llamadas';
    else
      raise exception 'No puedes llamar a ese destino desde aquí';
    end if;
  end if;

  if p_destino = 'vivienda' then
    if p_a_unidad_id is null then
      raise exception 'Falta la vivienda a la que llamas';
    end if;
    if public.condominio_de_unidad(p_a_unidad_id) is distinct from v_condominio then
      raise exception 'Esa vivienda no es de tu edificio';
    end if;
  end if;

  if not exists (
    select 1 from (
      select mc.usuario_id from public.membresia_condominio mc
      where mc.condominio_id = v_condominio and mc.activo and mc.usuario_id is not null
      union
      select m.usuario_id from public.membresia_unidad m
      where p_destino = 'vivienda' and m.unidad_id = p_a_unidad_id and m.activo
    ) gente
    where gente.usuario_id is distinct from auth.uid()
      and public.le_suena_la_llamada(gente.usuario_id, p_destino, v_origen, v_condominio,
                                     case when p_destino = 'vivienda' then p_a_unidad_id end,
                                     auth.uid())
  ) then
    raise exception 'Nadie recibe llamadas por la app ahí: llama por teléfono'
      using errcode = 'P0001';
  end if;

  insert into public.llamada_internet
    (condominio_id, de_usuario_id, de_unidad_id, destino, a_unidad_id, origen)
  values (v_condominio, auth.uid(), p_desde_unidad_id, p_destino,
          case when p_destino = 'vivienda' then p_a_unidad_id end, v_origen)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.quienes_reciben_la_llamada(p_llamada_id uuid)
returns table(usuario_id uuid)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select distinct gente.usuario_id
  from public.llamada_internet l
  cross join lateral (
    select mc.usuario_id from public.membresia_condominio mc
    where mc.condominio_id = l.condominio_id and mc.activo and mc.usuario_id is not null
    union
    select m.usuario_id from public.membresia_unidad m
    where l.destino = 'vivienda' and m.unidad_id = l.a_unidad_id and m.activo
  ) gente
  where l.id = p_llamada_id
    and gente.usuario_id is distinct from l.de_usuario_id
    and public.le_suena_la_llamada(gente.usuario_id, l.destino, l.origen, l.condominio_id,
                                   l.a_unidad_id, l.de_usuario_id);
$$;

create or replace function public.esta_en_la_llamada(p_llamada_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.llamada_internet l
    where l.id = p_llamada_id
      and (
        l.de_usuario_id = auth.uid()
        or l.contestada_por = auth.uid()
        or public.le_suena_la_llamada(auth.uid(), l.destino, l.origen, l.condominio_id,
                                      l.a_unidad_id, l.de_usuario_id)
      )
  );
$$;

create or replace function public.rechazar_llamada_de(p_llamada_id uuid, p_usuario_id uuid)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  l public.llamada_internet%rowtype;
begin
  select * into l from public.llamada_internet where id = p_llamada_id for update;
  if l.id is null
     or l.de_usuario_id = p_usuario_id
     or not public.le_suena_la_llamada(p_usuario_id, l.destino, l.origen, l.condominio_id,
                                       l.a_unidad_id, l.de_usuario_id) then
    raise exception 'Esa llamada no es para ti';
  end if;
  if l.estado <> 'sonando' then
    return false;
  end if;
  update public.llamada_internet
     set estado = 'rechazada', terminada_en = now()
   where id = l.id;
  return true;
end;
$$;

create or replace function public.avisar_llamada_perdida()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_vivienda text;
  v_destino  text;
begin
  if new.destino not in ('porteria', 'administracion') then
    return new;
  end if;

  select u.codigo into v_vivienda from public.unidad u where u.id = new.de_unidad_id;
  v_destino := case when new.destino = 'porteria' then 'portería' else 'la administración' end;

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct mc.usuario_id, new.condominio_id, 'llamada_perdida'::public.motivo_notificacion,
         'Llamada perdida',
         'Llamaron a ' || v_destino
           || coalesce(' desde la vivienda ' || v_vivienda,
                       case new.origen when 'porteria' then ' desde la portería'
                                       when 'administracion' then ' desde la administración'
                                       else '' end)
           || ' y nadie contestó.',
         'llamada_internet', new.id
  from public.membresia_condominio mc
  where mc.condominio_id = new.condominio_id
    and mc.activo
    and mc.usuario_id is not null
    and mc.usuario_id <> new.de_usuario_id
    and public.le_suena_la_llamada(mc.usuario_id, new.destino, new.origen, new.condominio_id,
                                   null, new.de_usuario_id)
    and public.quiere_aviso(mc.usuario_id, 'llamada_perdida', 'app');

  return new;
end;
$$;

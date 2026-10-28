-- ----------------------------------------------------------------------------
-- La administración llama y recibe llamadas por la app, y cada persona elige
-- si las quiere (28/10/2026)
-- ----------------------------------------------------------------------------
-- Pedido del usuario: «las llamadas de administración deben ser por internet
-- dentro de la app, y de paso mostrar los números para poder llamar por
-- teléfono», y que cada uno pueda elegir si recibe llamadas por la app; si
-- dice que no, «que solo se pueda por teléfono».
--
-- Hasta hoy había dos caminos (14/10 y 23/10): vivienda → portería y
-- portería → vivienda. La administración solo recibía, como respaldo, las de
-- portería cuando no había ningún guardia con permiso de llamadas.
--
-- Ahora:
--   · vivienda → portería o administración;
--   · portería → vivienda o administración;
--   · administración → vivienda o portería.
-- Y `perfil.recibe_llamadas_app` (encendido por defecto): a quien lo apaga no
-- le suena ninguna llamada por la app. Si en el destino nadie las recibe, la
-- llamada por la app no se puede hacer y la pantalla ofrece el teléfono.
-- Solo aditiva: un valor de enum, un enum y dos columnas nuevas, funciones
-- reescritas.

alter type public.destino_intercom add value if not exists 'administracion';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'origen_intercom') then
    create type public.origen_intercom as enum ('vivienda', 'porteria', 'administracion');
  end if;
end $$;

alter table public.llamada_internet
  add column if not exists origen public.origen_intercom;

comment on column public.llamada_internet.origen is
  'Desde dónde se llama: una vivienda, la portería o la administración. Es lo que la llamada entrante enseña como «quién llama». Nulo en las llamadas anteriores al 28/10/2026 (se deduce de de_unidad_id).';

-- Las de antes: con vivienda de origen, de una vivienda; sin ella, de la portería.
update public.llamada_internet
   set origen = case when de_unidad_id is not null then 'vivienda'::public.origen_intercom
                     else 'porteria'::public.origen_intercom end
 where origen is null;

alter table public.perfil
  add column if not exists recibe_llamadas_app boolean not null default true;

comment on column public.perfil.recibe_llamadas_app is
  'Si a esta persona le suenan las llamadas por internet dentro de la app. Apagado, nadie la puede llamar por la app: solo por teléfono. Lo elige cada uno en Perfil › Configuración (28/10/2026).';

-- ¿Quiere esta persona llamadas por la app?
create or replace function public.quiere_llamadas_app(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce((select p.recibe_llamadas_app from public.perfil p where p.id = p_usuario_id), true);
$function$;

comment on function public.quiere_llamadas_app(uuid) is
  'Si a esa persona le pueden sonar llamadas por la app (perfil.recibe_llamadas_app). Sin perfil, sí.';

revoke execute on function public.quiere_llamadas_app(uuid) from public, anon, authenticated;
grant execute on function public.quiere_llamadas_app(uuid) to service_role;

-- La portería «no tiene quién conteste» si ningún guardia con permiso de
-- llamadas las quiere recibir. Entonces le suena a la administración.
create or replace function public.porteria_sin_quien_conteste(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select not exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.rol = 'guardia'
      and mc.activo
      and (mc.permisos ->> 'llamadas') = 'true'
      and public.quiere_llamadas_app(mc.usuario_id)
  );
$function$;

/*
  A quién le suena una llamada: la regla, una sola vez, para cualquier
  persona. La usan `esta_en_la_llamada` (con quien pregunta) y
  `se_puede_llamar_por_la_app` (con todos los del destino).
*/
create or replace function public.le_suena_la_llamada(
  p_usuario_id uuid,
  p_destino public.destino_intercom,
  p_origen public.origen_intercom,
  p_condominio_id uuid,
  p_a_unidad_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select public.quiere_llamadas_app(p_usuario_id) and (
    case p_destino
      when 'porteria' then
        exists (
          select 1 from public.membresia_condominio mc
          where mc.condominio_id = p_condominio_id and mc.usuario_id = p_usuario_id
            and mc.rol = 'guardia' and mc.activo and (mc.permisos ->> 'llamadas') = 'true'
        )
        -- Sin nadie en portería que conteste, la administración. Salvo que
        -- quien llame sea la propia administración.
        or (p_origen is distinct from 'administracion'
            and public.porteria_sin_quien_conteste(p_condominio_id)
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
$function$;

comment on function public.le_suena_la_llamada(uuid, public.destino_intercom, public.origen_intercom, uuid, uuid) is
  'Si a esa persona le suena una llamada por la app con ese destino: la portería (guardias con permiso de llamadas; si no hay, la administración), la administración, o quien vive o se aloja hoy en la vivienda. Nunca a quien apagó las llamadas por la app.';

revoke execute on function public.le_suena_la_llamada(uuid, public.destino_intercom, public.origen_intercom, uuid, uuid) from public, anon, authenticated;
grant execute on function public.le_suena_la_llamada(uuid, public.destino_intercom, public.origen_intercom, uuid, uuid) to service_role;

create or replace function public.esta_en_la_llamada(p_llamada_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1 from public.llamada_internet l
    where l.id = p_llamada_id
      and (
        l.de_usuario_id = auth.uid()
        or l.contestada_por = auth.uid()
        or public.le_suena_la_llamada(auth.uid(), l.destino, l.origen, l.condominio_id, l.a_unidad_id)
      )
  );
$function$;

/*
  ¿Hay alguien al otro lado que reciba llamadas por la app? La pantalla lo
  pregunta antes de ofrecer «Llamar por la app»: si nadie, solo el teléfono.
  Responde a quien llama sin decirle quién ni cuántos.
*/
create or replace function public.se_puede_llamar_por_la_app(
  p_destino public.destino_intercom,
  p_condominio_id uuid,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  -- Quién llama, con el mismo criterio que `llamar_por_internet`.
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
                                       case when p_destino = 'vivienda' then p_a_unidad_id end)
    );
$function$;

comment on function public.se_puede_llamar_por_la_app(public.destino_intercom, uuid, uuid, uuid) is
  'Si en ese destino hay alguien que reciba llamadas por la app (además de quien pregunta). Si no, la app solo ofrece el teléfono.';

revoke execute on function public.se_puede_llamar_por_la_app(public.destino_intercom, uuid, uuid, uuid) from public, anon;
grant execute on function public.se_puede_llamar_por_la_app(public.destino_intercom, uuid, uuid, uuid) to authenticated, service_role;

-- La llamada. La firma gana `p_condominio_id` (para llamar a la portería o a
-- la administración sin hacerlo desde una vivienda), así que la vieja se
-- quita: con `create or replace` quedarían las dos.
drop function if exists public.llamar_por_internet(public.destino_intercom, uuid, uuid);

create or replace function public.llamar_por_internet(
  p_destino public.destino_intercom,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null,
  p_condominio_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
                                     case when p_destino = 'vivienda' then p_a_unidad_id end)
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
$function$;

comment on function public.llamar_por_internet(public.destino_intercom, uuid, uuid, uuid) is
  'Empieza una llamada por la app: una vivienda a la portería o a la administración, la portería (con permiso) a una vivienda o a la administración, y la administración a una vivienda o a la portería. Falla si al otro lado nadie recibe llamadas por la app.';

revoke execute on function public.llamar_por_internet(public.destino_intercom, uuid, uuid, uuid) from public, anon;
grant execute on function public.llamar_por_internet(public.destino_intercom, uuid, uuid, uuid) to authenticated, service_role;

-- La llamada perdida avisa también cuando era para la administración.
create or replace function public.avisar_llamada_perdida()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
    and public.le_suena_la_llamada(mc.usuario_id, new.destino, new.origen, new.condominio_id, null)
    and public.quiere_aviso(mc.usuario_id, 'llamada_perdida', 'app');

  return new;
end;
$function$;

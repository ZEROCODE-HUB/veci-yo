-- Fuera de turno, al guardia no le llegan llamadas ni S.O.S. (30/10/2026).
--
-- Pedido del cliente (Para Claude 179 y su respuesta): si un guardia está
-- fuera de su turno no le tiene que sonar una llamada, y el S.O.S. tampoco.
-- Hasta hoy la llamada a portería le sonaba a todo guardia con el permiso,
-- estuviera o no trabajando.
--
-- La misma regla que la app (actualización 81): está de turno si su horario
-- de hoy lo cubre, y un guardia **sin ningún horario puesto** cuenta como de
-- turno, porque nadie le ha dicho cuándo trabaja. Eso cambia también el S.O.S.:
-- antes un guardia sin horario no lo recibía nunca.
--
-- Sin nadie de turno que conteste, la llamada a portería y el S.O.S. van a la
-- administración, como ya pasaba cuando no había guardias.
--
-- Solo aditiva: una función nueva y cuatro reemplazadas; no se toca ningún
-- dato.

create or replace function public.guardia_atiende_ahora(p_condominio_id uuid, p_usuario_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1 from public.guardias_de_turno(p_condominio_id) g
    where g.usuario_id = p_usuario_id
  )
  or exists (
    select 1 from public.membresia_condominio m
    where m.condominio_id = p_condominio_id
      and m.usuario_id = p_usuario_id
      and m.rol = 'guardia'
      and m.activo
      and not exists (select 1 from public.turno_guardia t where t.membresia_id = m.id)
      and not exists (select 1 from public.turno_override o where o.membresia_id = m.id)
  );
$function$;

comment on function public.guardia_atiende_ahora(uuid, uuid) is
  'Si ese guardia está trabajando ahora: su horario de hoy lo cubre, o no tiene ningún horario puesto. Decide si le suena una llamada a portería y si le llega un S.O.S. (30/10/2026).';

revoke execute on function public.guardia_atiende_ahora(uuid, uuid) from public, anon;
grant execute on function public.guardia_atiende_ahora(uuid, uuid) to authenticated, service_role;

create or replace function public.porteria_sin_quien_conteste(p_condominio_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select not exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.rol = 'guardia'
      and mc.activo
      and (mc.permisos ->> 'llamadas') = 'true'
      and public.quiere_llamadas_app(mc.usuario_id)
      -- Fuera de turno no contesta nadie (30/10/2026).
      and public.guardia_atiende_ahora(p_condominio_id, mc.usuario_id)
  );
$function$;

create or replace function public.le_suena_la_llamada(p_usuario_id uuid, p_destino destino_intercom, p_origen origen_intercom, p_condominio_id uuid, p_a_unidad_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
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

create or replace function public.avisar_sos()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_nombre    text;
  v_vivienda  text;
  v_mensaje   text;
  v_avisados  integer;
  v_es_huesped boolean;
begin
  select trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, ''))
    into v_nombre
  from public.perfil p where p.id = new.usuario_id;

  select 'Torre ' || t.numero || ' · ' || u.codigo
    into v_vivienda
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  where u.id = new.unidad_id;

  v_es_huesped := new.unidad_id is not null and exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = new.unidad_id
      and m.usuario_id = new.usuario_id
      and m.rol = 'huesped_temporal'
      and m.activo
  );

  -- El texto lo lee gente: va con tildes, aunque los comentarios de este
  -- archivo no las lleven.
  v_mensaje := coalesce(nullif(v_nombre, ''), 'Una persona')
    || case when v_es_huesped then ' (huésped)' else '' end
    || ' activó el S.O.S.'
    || coalesce(' desde ' || v_vivienda, '')
    || '. Atender de inmediato.';

  -- Los guardias que estan trabajando ahora (30/10/2026: fuera de turno no les
  -- llega). Si no hay ninguno, la administracion: no avisar a nadie no es una
  -- opcion en una alarma. Y si quien la activa es un huesped, tambien los
  -- residentes de la vivienda que lo recibe (15/10/2026).
  with de_turno as (
    select m.usuario_id
    from public.membresia_condominio m
    where m.condominio_id = new.condominio_id
      and m.rol = 'guardia'
      and m.activo
      and m.usuario_id is not null
      and public.guardia_atiende_ahora(new.condominio_id, m.usuario_id)
  ),
  destinatarios as (
    select d.usuario_id from de_turno d
    union
    select m.usuario_id
    from public.membresia_condominio m
    where m.condominio_id = new.condominio_id
      and m.rol in ('administrador', 'coadministrador')
      and m.activo
      and not exists (select 1 from de_turno)
    union
    select mu.usuario_id
    from public.membresia_unidad mu
    where v_es_huesped
      and mu.unidad_id = new.unidad_id
      and mu.activo
      and mu.puede_acceder
      and mu.usuario_id is not null
      and mu.rol <> 'huesped_temporal'
  ),
  insertadas as (
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    select d.usuario_id, new.condominio_id, 'sos_activado',
           'S.O.S. activado', v_mensaje, 'alarma_sos', new.id
    from destinatarios d
    where d.usuario_id <> new.usuario_id
    returning 1
  )
  select count(*) into v_avisados from insertadas;

  update public.alarma_sos set avisados = v_avisados where id = new.id;
  return null;
end;
$function$;

-- La alarma en pantalla tampoco le salta a un guardia fuera de turno.
create or replace function public.sos_activas()
 returns table(id uuid, activada_en timestamp with time zone, unidad text, torre integer, quien text, telefono text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select a.id, a.activada_en, u.codigo, t.numero::int,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
         p.telefono
  from public.alarma_sos a
  left join public.unidad u on u.id = a.unidad_id
  left join public.torre t on t.id = u.torre_id
  left join public.perfil p on p.id = a.usuario_id
  where a.cerrada_en is null
    and public.es_personal_condominio(a.condominio_id)
    -- La administración siempre; un guardia, solo de turno.
    and (exists (
           select 1 from public.membresia_condominio mc
           where mc.condominio_id = a.condominio_id and mc.usuario_id = auth.uid()
             and mc.activo and mc.rol <> 'guardia'
         )
         or public.guardia_atiende_ahora(a.condominio_id, auth.uid()))
  order by a.activada_en desc;
$function$;

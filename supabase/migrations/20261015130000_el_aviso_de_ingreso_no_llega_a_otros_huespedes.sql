-- El aviso de ingreso no les llega a otros huéspedes (15/10/2026).
--
-- Recorriendo la portería como guardia, la entrada de Valentina a la 102 avisó
-- «Tu visita ingresó» a seis personas: la anfitriona y cinco huéspedes de la
-- 102, entre ellos uno de agosto y otro de 2030. Dos fallos:
--
--   · `notificar_unidad` no miraba las fechas de la membresía: un huésped de
--     una estancia pasada o futura seguía recibiendo los avisos de la vivienda
--     (también los de paquetes y reservas). Ahora solo quien está vigente hoy.
--   · el aviso de ingreso se mandaba a todos, también a los huéspedes, aunque
--     la visita no fuera suya. Un huésped no tiene por qué enterarse de quién
--     llega a la casa. Ahora va a los residentes y a quien registró la visita.
--
-- Solo cambian dos funciones; ningún dato.

create or replace function public.notificar_unidad(
  p_unidad_id uuid,
  p_tipo motivo_notificacion,
  p_titulo text,
  p_mensaje text,
  p_entidad_tipo text default null::text,
  p_entidad_id uuid default null::uuid,
  p_excepto uuid default null::uuid,
  p_solo_residentes boolean default false
)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct m.usuario_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         p_entidad_tipo, p_entidad_id
  from public.membresia_unidad m
  join public.unidad u on u.id = m.unidad_id
  where m.unidad_id = p_unidad_id
    and m.activo
    and m.puede_acceder
    and m.usuario_id is not null
    -- Solo quien está en la vivienda hoy: no el huésped que ya se fue ni el que
    -- todavía no llegó (15/10/2026).
    and (m.vigente_desde is null or m.vigente_desde <= current_date)
    and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
    and (p_excepto is null or m.usuario_id <> p_excepto)
    and (not p_solo_residentes or m.rol <> 'huesped_temporal')
    -- Quien apago este motivo en la campana no recibe la fila. No se inserta
    -- y se marca leida: no se inserta.
    and public.quiere_aviso(m.usuario_id, p_tipo, 'app');
$function$;

create or replace function public.notificar_ingreso_invitado()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_unidad uuid;
  v_condominio uuid;
  v_registro uuid;
  v_ingreso_anterior timestamptz := null;
begin
  if tg_op = 'UPDATE' then
    v_ingreso_anterior := old.ingreso_en;
  end if;

  if new.ingreso_en is null or v_ingreso_anterior is not null then
    return new;
  end if;

  select v.unidad_id, v.condominio_id, v.registrada_por
    into v_unidad, v_condominio, v_registro
  from public.visita v where v.id = new.visita_id;

  -- Las visitas a la administración no tienen unidad a la que avisar.
  if v_unidad is null then
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
      and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
  ) and public.quiere_aviso(v_registro, 'visita_ingreso', 'app') then
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    values
      (v_registro, v_condominio, 'visita_ingreso', 'Tu visita ingresó',
       new.nombre || ' ingresó al condominio.', 'visita', new.visita_id);
  end if;
  return new;
end;
$function$;

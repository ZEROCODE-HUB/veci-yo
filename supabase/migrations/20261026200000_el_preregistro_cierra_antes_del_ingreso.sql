-- El enlace del preregistro se cierra unas horas antes del ingreso (hueco 23).
--
-- El cliente respondió el 21/10/2026: «debe ser ciertas horas antes del
-- ingreso. Pongámoslo parametrizable eso, y hagamos que, a pesar de la zona
-- horaria, funcione bien». Hasta hoy el enlace valía hasta la medianoche del
-- día siguiente a la salida.
--
-- Ahora:
--   · se cierra `preregistro_cierra_horas_antes_del_ingreso` horas antes de la
--     hora de entrada del alojamiento el día de llegada, con la hora del
--     edificio. Sin hora de entrada fijada, se cuenta desde las 00:00 de ese día;
--   · si la reserva se crea cuando eso ya pasó (una reserva de última hora),
--     vale hasta la medianoche del día de llegada, para que se pueda llenar;
--   · terminado el preregistro, vale hasta la medianoche del día siguiente a la
--     salida, como antes: es como el huésped vuelve a ver su QR.
--
-- Todas las funciones del preregistro ya comparan contra
-- `visita.precheckin_expira_en`, así que cambia el valor y no ellas.
--
-- Solo aditiva: un parámetro, dos funciones, un disparador y el cuerpo de las
-- tres que fijan el vencimiento.

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, descripcion, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico)
values
  ('preregistro_cierra_horas_antes_del_ingreso', '2', '2',
   'Cuántas horas antes de la hora de entrada del día de llegada se cierra el enlace del preregistro. Se cuenta con la hora del edificio. Una reserva creada después de ese momento vale hasta la medianoche del día de llegada. Terminado el preregistro, el enlace sigue sirviendo para ver el QR hasta el día siguiente a la salida.',
   'horas', 'h', 0, 168, 'edificio', 'preregistro', 'medio', false)
on conflict (clave) do nothing;

-- 1. Cuándo vence el enlace de una estancia.
create or replace function public.vencimiento_del_preregistro(p_visita_id uuid)
returns timestamptz
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v public.visita%rowtype;
  v_zona text;
  v_hora time;
  v_cierre timestamptz;
begin
  select * into v from public.visita where id = p_visita_id;
  if v.id is null then
    return null;
  end if;

  -- Terminado: para volver a ver el QR, hasta el día siguiente a la salida.
  if v.precheckin_completado_en is not null or v.fecha_desde is null then
    return public.medianoche_en_el_edificio(
      v.condominio_id,
      coalesce(v.fecha_hasta + 1,
               public.hoy_en_el_edificio(v.condominio_id)
                 + public.parametro_entero('preregistro_enlace_dias_sin_salida', v.condominio_id)));
  end if;

  v_zona := public.zona_horaria_del_condominio(v.condominio_id);
  select case when coalesce(s.checkin_24h, false) then null else s.checkin_desde end
    into v_hora
    from public.suscripcion_renta_corta s where s.unidad_id = v.unidad_id;

  -- La hora de entrada del día de llegada, en la hora del edificio, menos el margen.
  v_cierre := ((v.fecha_desde + coalesce(v_hora, time '00:00')) at time zone v_zona)
              - make_interval(hours => public.parametro_entero('preregistro_cierra_horas_antes_del_ingreso', v.condominio_id));

  -- Una reserva de última hora: hasta la medianoche del día de llegada.
  if v_cierre <= now() + interval '1 hour' then
    return public.medianoche_en_el_edificio(v.condominio_id, v.fecha_desde + 1);
  end if;
  return v_cierre;
end;
$$;

comment on function public.vencimiento_del_preregistro(uuid) is
  'Hasta cuándo vale el enlace del preregistro de una estancia (hueco 23): unas horas antes de la entrada del día de llegada (parámetro preregistro_cierra_horas_antes_del_ingreso, hora del edificio); si la reserva llega tarde, hasta la medianoche de ese día; terminado el preregistro, hasta el día siguiente a la salida.';

revoke execute on function public.vencimiento_del_preregistro(uuid) from public, anon, authenticated;
grant execute on function public.vencimiento_del_preregistro(uuid) to service_role;

-- 2. Al terminar el preregistro, el enlace sigue para ver el QR.
create or replace function public.al_terminar_el_preregistro_sigue_el_qr()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.precheckin_completado_en is not null
     and old.precheckin_completado_en is null
     and new.precheckin_expira_en is not null then
    new.precheckin_expira_en := public.medianoche_en_el_edificio(
      new.condominio_id,
      coalesce(new.fecha_hasta + 1,
               public.hoy_en_el_edificio(new.condominio_id)
                 + public.parametro_entero('preregistro_enlace_dias_sin_salida', new.condominio_id)));
  end if;
  return new;
end;
$$;

drop trigger if exists visita_al_terminar_el_preregistro on public.visita;
create trigger visita_al_terminar_el_preregistro
  before update of precheckin_completado_en on public.visita
  for each row execute function public.al_terminar_el_preregistro_sigue_el_qr();

-- 3. Los tres sitios que fijan el vencimiento, ahora con la función.

CREATE OR REPLACE FUNCTION public.abrir_precheckin(p_visita_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_token   text := encode(extensions.gen_random_bytes(32), 'hex');
  v_unidad  uuid;
  v_tipo    tipo_visita;
  v_hasta   date;
begin
  select unidad_id, tipo, fecha_hasta into v_unidad, v_tipo, v_hasta
  from public.visita where id = p_visita_id;

  if v_unidad is null then
    raise exception 'Esa estancia no existe';
  end if;

  -- El mismo permiso que invitar a la vivienda: quien la gestiona recibe a su
  -- gente. No se exige ser administracion --el KT dice que el huesped "va por
  -- otro flujo", y este es ese flujo--.
  if not public.puede_invitar_a_unidad(v_unidad) then
    raise exception 'No tenes permiso para abrir el precheckin de esta estancia';
  end if;

  if v_tipo <> 'huesped_temporal' then
    raise exception 'El precheckin es solo de las estancias de huesped';
  end if;

  update public.visita
  set precheckin_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      -- Caduca con la estancia, no a los siete dias como una invitacion: un
      -- enlace de precheckin que sobrevive a la salida del huesped es una
      -- puerta abierta a los datos de una reserva terminada.
      precheckin_expira_en = public.vencimiento_del_preregistro(p_visita_id)
  where id = p_visita_id;

  return v_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.abrir_precheckin_por_reserva(p_codigo text, p_ultimos4 text)
 RETURNS TABLE(estado text, token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_codigo  text := upper(btrim(coalesce(p_codigo, '')));
  v_dados   text := regexp_replace(coalesce(p_ultimos4, ''), '[^0-9]', '', 'g');
  v_visita  public.visita%rowtype;
  v_token   text;
begin
  if v_codigo = '' then
    return query select 'preparando'::text, null::text;
    return;
  end if;

  select v.* into v_visita
  from public.visita v
  where upper(v.codigo_reserva) = v_codigo
    and v.deleted_at is null
    and v.tipo = 'huesped_temporal'
    and v.estado <> 'cancelada'
  for update;

  /*
    «Preparando» y no «no existe»: el calendario se lee cada cierto tiempo, asi
    que una reserva recien hecha todavia no esta. Es tambien lo que se responde
    a un codigo inventado, para que esto no sirva para saber cuales existen.
  */
  if not found then
    return query select 'preparando'::text, null::text;
    return;
  end if;

  if v_visita.apertura_bloqueada_hasta is not null
     and v_visita.apertura_bloqueada_hasta > now() then
    return query select 'bloqueado'::text, null::text;
    return;
  end if;

  if v_visita.precheckin_completado_en is not null then
    return query select 'cerrado'::text, null::text;
    return;
  end if;

  /*
    Sin los cuatro digitos guardados no hay con que comprobar a nadie, y el
    codigo solo no basta. Esa reserva se abre con el enlace que manda el
    anfitrion, como hasta ahora.
  */
  if v_visita.telefono_ultimos4 is null then
    return query select 'sin_telefono'::text, null::text;
    return;
  end if;

  if v_dados <> v_visita.telefono_ultimos4 then
    if v_visita.intentos_apertura + 1 >= public.parametro_entero('preregistro_codigo_intentos') then
      update public.visita
      set intentos_apertura = 0,
          apertura_bloqueada_hasta = now() + make_interval(mins => public.parametro_entero('preregistro_codigo_bloqueo_minutos'))
      where id = v_visita.id;
      return query select 'bloqueado'::text, null::text;
    else
      update public.visita
      set intentos_apertura = intentos_apertura + 1
      where id = v_visita.id;
      return query select 'ultimos4_incorrectos'::text, null::text;
    end if;
    return;
  end if;

  /*
    Acerto. Se emite un enlace igual que el que genera el anfitrion: el token
    vive en claro solo en esta respuesta, en la base queda su sha256, y caduca
    con la estancia. El que hubiera antes deja de valer; lo ya rellenado no se
    pierde, porque esta en la estancia y no en el enlace.
  */
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.visita
  set precheckin_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      precheckin_expira_en = public.vencimiento_del_preregistro(v_visita.id),
      intentos_apertura = 0,
      apertura_bloqueada_hasta = null
  where id = v_visita.id;

  return query select 'listo'::text, v_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cambiar_fechas_de_estancia(p_visita_id uuid, p_desde date, p_hasta date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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

         precheckin_expira_en = precheckin_expira_en

   where id = v.id;



  -- El vencimiento del enlace, con las fechas nuevas y la hora del edificio
  -- (hueco 23). Antes era `(p_hasta + 1)::timestamptz`: la medianoche de
  -- Londres, no la del edificio.
  update public.visita
     set precheckin_expira_en = public.vencimiento_del_preregistro(v.id)
   where id = v.id and precheckin_expira_en is not null;

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

$function$;

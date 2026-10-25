-- «Hoy» es el día del edificio, no el de Londres.
--
-- Parametrización (25/10/2026), y decidido con el cliente: «arréglalo todo».
-- `current_date` es el día de la sesión de la base, que en Supabase va en UTC.
-- En Colombia, de 7 de la noche a medianoche ya es «mañana». Treinta y cuatro
-- funciones contaban así, y algunas son reglas de acceso:
--   * `es_huesped_alojado` y compañía: el día de salida, desde las 7 de la
--     noche, el huésped dejaba de estar «alojado» unas horas antes de irse
--     (zonas, wifi, chat, paquetes);
--   * el enlace del preregistro caducaba a la medianoche de Londres --las 7
--     de la tarde en Colombia-- del día de salida;
--   * una invitación «terminaba antes de hoy» el último día, por la noche;
--   * la fecha de pago de una cuota, el comité, el RNT, las verificaciones…
--
-- Ahora cada una cuenta con el día de lo que tiene a mano: el edificio, la
-- vivienda, el país (los precios) o, si no hay ninguno, el de la plataforma
-- (`tareas_zona_horaria`). `reprogramar_tareas` se queda: convierte una hora
-- de la plataforma a UTC, no pregunta qué día es.
--
-- Lo vigila `npm run dias` (en `pretest`): ninguna función de las migraciones
-- vuelve a usar `current_date`.

-- --- Los relojes -------------------------------------------------------------

create or replace function public.hoy_en_la_plataforma()
returns date
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select (now() at time zone public.parametro('tareas_zona_horaria'))::date;
$$;

comment on function public.hoy_en_la_plataforma() is
  'El día de hoy con la zona de la plataforma (`tareas_zona_horaria`). Para lo '
  'que no es de ningún edificio: códigos de descuento, precios para todos.';

create or replace function public.hoy_en_la_unidad(p_unidad_id uuid)
returns date
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.hoy_en_el_edificio(u.condominio_id)
  from public.unidad u where u.id = p_unidad_id;
$$;

comment on function public.hoy_en_la_unidad(uuid) is
  'El día de hoy en el edificio de esa vivienda.';

create or replace function public.hoy_en_el_pais(p_pais text)
returns date
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select (now() at time zone coalesce(
    (select nullif(btrim(p.zona_horaria), '') from public.pais p
      where p.codigo = upper(btrim(coalesce(p_pais, '')))),
    public.parametro('tareas_zona_horaria')
  ))::date;
$$;

comment on function public.hoy_en_el_pais(text) is
  'El día de hoy en ese país; sin país, o sin zona, el de la plataforma.';

create or replace function public.medianoche_en_el_edificio(p_condominio_id uuid, p_dia date)
returns timestamptz
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select p_dia::timestamp at time zone public.zona_horaria_del_condominio(p_condominio_id);
$$;

comment on function public.medianoche_en_el_edificio(uuid, date) is
  'El instante en que empieza ese día en el edificio. `fecha::timestamptz` a '
  'secas es la medianoche de Londres.';

grant execute on function public.hoy_en_la_plataforma() to anon, authenticated;
grant execute on function public.hoy_en_la_unidad(uuid) to authenticated;
grant execute on function public.hoy_en_el_pais(text) to anon, authenticated;
grant execute on function public.medianoche_en_el_edificio(uuid, date) to authenticated;

-- Lo que la base rellena sola cuando nadie dice la fecha.
alter table public.precio_plan alter column vigente_desde set default public.hoy_en_la_plataforma();
alter table public.suscripcion_renta_corta alter column iniciada_en set default public.hoy_en_la_plataforma();
alter table public.comite_propietarios alter column desde set default public.hoy_en_la_plataforma();

-- --- Las funciones -----------------------------------------------------------

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
      precheckin_expira_en = public.medianoche_en_el_edificio(v_visita.condominio_id, coalesce(v_visita.fecha_hasta + 1, public.hoy_en_el_edificio(v_visita.condominio_id) + public.parametro_entero('preregistro_enlace_dias_sin_salida'))),
      intentos_apertura = 0,
      apertura_bloqueada_hasta = null
  where id = v_visita.id;

  return query select 'listo'::text, v_token;
end;
$function$;

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
      precheckin_expira_en = public.medianoche_en_el_edificio(public.condominio_de_unidad(v_unidad), coalesce(v_hasta + 1, public.hoy_en_la_unidad(v_unidad) + public.parametro_entero('preregistro_enlace_dias_sin_salida')))
  where id = p_visita_id;

  return v_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.aceptar_invitacion(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'auth'
AS $function$
declare
  v_inv public.invitacion%rowtype;
  v_correo_usuario text;
  v_membresia_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada para aceptar la invitacion';
  end if;

  select * into v_inv
  from public.invitacion
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'La invitacion no existe';
  end if;

  if v_inv.estado <> 'pendiente' then
    raise exception 'Esta invitacion ya no esta disponible';
  end if;

  if v_inv.expira_en <= now() then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La invitacion vencio';
  end if;

  select lower(email) into v_correo_usuario from auth.users where id = auth.uid();
  if v_correo_usuario is distinct from lower(v_inv.correo) then
    raise exception 'Esta invitacion fue emitida para otro correo';
  end if;

  if v_inv.vigente_hasta is not null and v_inv.vigente_hasta < public.hoy_en_el_edificio(v_inv.condominio_id) then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La estancia de esta invitacion ya termino';
  end if;

  if v_inv.ambito = 'unidad' then
    -- Local a la transaccion: se apaga sola al terminar.
    perform set_config('veciyo.alta_por_invitacion', 'on', true);

    insert into public.membresia_unidad (
      unidad_id, usuario_id, nombre, rol, vigente_desde, vigente_hasta,
      telefono, codigo_pais
    )
    values (
      v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad,
      v_inv.vigente_desde, v_inv.vigente_hasta,
      v_inv.telefono, v_inv.codigo_pais
    )
    returning id into v_membresia_id;

    perform set_config('veciyo.alta_por_invitacion', 'off', true);

    update public.unidad
       set estado = 'aceptado', updated_at = now()
     where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
  else
    /*
      El `nombre` es lo que faltaba. Sin el, la administracion escribia «Rosa
      Delgado» al invitar y la lista de coadministradores enseñaba «Sin
      nombre» en cuanto Rosa aceptaba.

      En el `do update` va tambien, pero **sin pisar lo que haya**: ese camino
      es para quien ya fue miembro y vuelve, y lo que tenga puesto la
      administracion vale mas que lo que decia una invitacion vieja.
    */
    insert into public.membresia_condominio (
      condominio_id, usuario_id, rol, nombre, telefono, codigo_pais,
      permisos, porteria_id, documento
    )
    values (
      v_inv.condominio_id, auth.uid(), v_inv.rol_condominio,
      v_inv.nombre, v_inv.telefono, v_inv.codigo_pais,
      coalesce(v_inv.permisos, '{}'::jsonb), v_inv.porteria_id, v_inv.documento
    )
    on conflict (condominio_id, usuario_id, rol) do update set
      activo = true,
      nombre = coalesce(public.membresia_condominio.nombre, excluded.nombre),
      telefono = coalesce(public.membresia_condominio.telefono, excluded.telefono),
      codigo_pais = coalesce(public.membresia_condominio.codigo_pais, excluded.codigo_pais),
      -- Quien vuelve entra con lo que dice **esta** invitacion: los permisos
      -- de una membresia dada de baja no resucitan solos.
      permisos = excluded.permisos,
      porteria_id = coalesce(excluded.porteria_id, public.membresia_condominio.porteria_id),
      documento = coalesce(excluded.documento, public.membresia_condominio.documento)
    returning id into v_membresia_id;
  end if;

  update public.invitacion
     set estado = 'aceptada',
         aceptada_por = auth.uid(),
         aceptada_en = now(),
         updated_at = now()
   where id = v_inv.id;

  return v_membresia_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.anotar_verificacion(p_invitado_id uuid, p_proveedor text DEFAULT NULL::text, p_referencia text DEFAULT NULL::text, p_resultado resultado_verificacion DEFAULT 'aprobada'::resultado_verificacion, p_respuesta jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_unidad   uuid;
  v_base     int;
  v_usadas_b int;
  v_paq      int;
  v_usadas_p int;
  v_origen   public.origen_verificacion;
  v_paquete  uuid;
  v_periodo  uuid;
  v_id       uuid;
begin
  select v.unidad_id into v_unidad
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  if v_unidad is null then
    raise exception 'Ese huesped no existe';
  end if;

  if exists (select 1 from public.verificacion_antecedentes va
             where va.invitado_id = p_invitado_id
               and va.resultado <> 'error_proveedor') then
    raise exception 'Ese huesped ya tiene una verificacion'
      using errcode = 'unique_violation';
  end if;

  -- La interna: esta funcion la llama tambien el precheckin, donde no hay
  -- sesion. Con la publica el saldo salia vacio y se leia como "sin
  -- suscripcion", que es un mensaje falso sobre la vivienda de otro.
  select incluidas, suscritas_usadas, suplementarias, suplementarias_usadas
    into v_base, v_usadas_b, v_paq, v_usadas_p
  from public.consumo_verificaciones_de(v_unidad);

  if v_base is null then
    raise exception 'Esta vivienda no tiene suscripcion de renta corta';
  end if;

  if coalesce(v_usadas_b, 0) < coalesce(v_base, 0) then
    v_origen := 'paquete_base';
    select ps.id into v_periodo
    from public.periodo_suscripcion ps
    join public.suscripcion_renta_corta s on s.id = ps.suscripcion_id
    where s.unidad_id = v_unidad
    order by ps.desde desc limit 1;

    if v_periodo is null then
      raise exception 'Esta suscripcion no tiene ningun periodo abierto: no hay de donde descontar la verificacion'
        using errcode = 'check_violation';
    end if;
  elsif coalesce(v_usadas_p, 0) < coalesce(v_paq, 0) then
    v_origen := 'paquete_complementario';
    select p.id into v_paquete
    from public.paquete_verificaciones p
    where p.unidad_id = v_unidad
      and (p.vence_en is null or p.vence_en >= public.hoy_en_la_unidad(v_unidad))
    order by p.vence_en nulls last limit 1;
  else
    raise exception 'No quedan verificaciones disponibles. Compra un paquete.'
      using errcode = 'check_violation';
  end if;

  insert into public.verificacion_antecedentes (
    invitado_id, unidad_id, origen, periodo_id, paquete_id,
    proveedor, resultado, referencia_externa, respuesta, ejecutada_en
  )
  values (
    p_invitado_id, v_unidad, v_origen, v_periodo, v_paquete,
    coalesce(nullif(btrim(coalesce(p_proveedor, '')), ''), 'simulado'),
    p_resultado, p_referencia, p_respuesta, now()
  )
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.avisar_al_huesped_del_paquete(p_huesped_id uuid, p_unidad_id uuid, p_tipo motivo_notificacion, p_titulo text, p_mensaje text, p_paquete_id uuid, p_excepto uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select p_huesped_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         'correspondencia', p_paquete_id
  from public.unidad u
  where u.id = p_unidad_id
    and p_huesped_id is not null
    and (p_excepto is null or p_huesped_id <> p_excepto)
    and public.quiere_aviso(p_huesped_id, p_tipo, 'app')
    and exists (
      select 1 from public.membresia_unidad m
      where m.usuario_id = p_huesped_id
        and m.unidad_id = p_unidad_id
        and m.rol = 'huesped_temporal'
        and m.activo
        and (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_el_edificio(u.condominio_id))
        and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(u.condominio_id))
    );
$function$;

CREATE OR REPLACE FUNCTION public.buscar_placa(p_condominio_id uuid, p_placa text)
 RETURNS TABLE(procedencia text, placa text, tipo text, unidad_codigo text, torre_numero integer, detalle text, vigente boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with buscada as (
    -- Sin ser personal del condominio no se devuelve nada: saber que coche
    -- tiene cada vecino no es asunto del resto del edificio.
    select public.placa_normalizada(p_placa) as placa
    where public.es_personal_condominio(p_condominio_id)
  )
  select
    'residente',
    v.placa,
    v.tipo::text,
    u.codigo,
    t.numero,
    coalesce(
      (select m.nombre from public.membresia_unidad m
        where m.unidad_id = u.id and m.rol = 'propietario' and m.activo
        limit 1),
      'Sin propietario'),
    true
  from public.vehiculo_residente v
  join public.unidad u on u.id = v.unidad_id
  join public.torre t on t.id = u.torre_id
  cross join buscada b
  where v.deleted_at is null
    and u.condominio_id = p_condominio_id
    and public.placa_normalizada(v.placa) = b.placa

  union all

  select
    'visita',
    vv.placa,
    vv.tipo::text,
    u.codigo,
    t.numero,
    coalesce(
      (select i.nombre from public.invitado i
        where i.visita_id = vi.id order by i.orden limit 1),
      'Visita sin invitados'),
    vi.estado in ('programada', 'ingresada')
      and (vi.fecha_desde is null or vi.fecha_desde <= public.hoy_en_el_edificio(p_condominio_id))
      and (vi.fecha_hasta is null or vi.fecha_hasta >= public.hoy_en_el_edificio(p_condominio_id))
  from public.vehiculo_visita vv
  join public.visita vi on vi.id = vv.visita_id
  left join public.unidad u on u.id = vi.unidad_id
  left join public.torre t on t.id = u.torre_id
  cross join buscada b
  where vi.condominio_id = p_condominio_id
    and vi.deleted_at is null
    and public.placa_normalizada(vv.placa) = b.placa
  order by 1, 7 desc;
$function$;

CREATE OR REPLACE FUNCTION public.cerrar_precheckin(p_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'auth'
AS $function$
declare
  v_cuantos int;
  v_visita    public.visita%rowtype;
  v_titular   public.invitado%rowtype;
  v_anfitrion uuid;
  v_faltan    text;
  v_token     text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now()
  for update;

  if v_visita.id is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if v_visita.precheckin_completado_en is not null then
    raise exception 'Este preregistro ya estaba cerrado';
  end if;

  select * into v_titular
  from public.invitado where visita_id = v_visita.id and es_titular;

  if v_titular.id is null
     or coalesce(btrim(v_titular.documento_numero), '') = ''
     or coalesce(btrim(v_titular.correo), '') = '' then
    raise exception 'Faltan tus datos: el documento y el correo son obligatorios';
  end if;

  /*
    Y que el titular sea mayor de edad. Es quien responde por la estancia y
    quien recibe el acceso a la aplicacion: si la fecha que escribio lo hace
    menor, o se equivoco al teclearla o esta reserva necesita otro titular.

    Solo se comprueba cuando dio su fecha: sin ella no hay nada que mirar, y
    suponerlo seria inventarse el dato.
  */
  if v_titular.es_menor then
    raise exception
      'Quien reserva tiene que ser mayor de edad. Si la fecha de nacimiento esta mal, corrigela; si no, la reserva la tiene que cerrar un adulto.';
  end if;

  if not v_titular.terminos_aceptados then
    raise exception 'Hace falta aceptar los terminos y condiciones';
  end if;

  /*
    Y que estén **todas las personas de la reserva**.

    El 09/10/2026 el cliente reservo para cuatro, no lleno a nadie mas, y el
    preregistro cerro igual. No era un descuido de las comprobaciones de abajo:
    todas miran las fichas que existen, y solo existia la suya. Los
    acompañantes sin nombre no se crean --los rellena el huesped-- asi que no
    habia nada de lo que quejarse.

    `huespedes_previstos` es de hoy mismo y esta funcion es de antes: nadie
    comparaba las dos cosas. Se compara ahora, y **solo por defecto**: una
    reserva vieja o una del calendario de Airbnb no trae el numero, y entonces
    esto no dice nada, como hasta ahora.

    Si al final viene menos gente, **el anfitrion cambia el numero de la
    reserva** y este enlace se actualiza solo. Lo decidio asi el cliente: el
    huesped no deberia poder cambiar lo que el anfitrion reservo.
  */
  if v_visita.huespedes_previstos is not null then
    select count(*) into v_cuantos
    from public.invitado where visita_id = v_visita.id;

    if v_cuantos < v_visita.huespedes_previstos then
      raise exception
        'Esta reserva es para % personas y hay % registrada(s). Añade a quien falte, o pídele al anfitrión que cambie el número.',
        v_visita.huespedes_previstos, v_cuantos;
    end if;
  end if;

  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select nombre, orden
    from public.invitado
    where visita_id = v_visita.id
      and not es_titular
      and not es_menor
      and not terminos_aceptados
    order by orden
    limit 3
  ) pendientes;

  if v_faltan is not null then
    raise exception
      'Falta que acepten los terminos: %. A cada uno le llega su propio enlace; nadie puede aceptarlos por el.',
      v_faltan;
  end if;

  /*
    Y las reglas del edificio para huespedes, que son otra cosa que los
    terminos: los terminos son el contrato; las reglas, como se convive aqui
    --ruido, visitas, piscina--. El cliente lo pidio el 09/10/2026: que el
    huesped las tenga que recorrer y aceptar en su preregistro.

    **Solo si el edificio tiene unas vigentes.** Uno que no las ha escrito no
    puede exigir que se acepten, y bloquear ahi dejaria a todos sus huespedes
    sin poder terminar por algo que no depende de ellos.

    Todos los adultos, el titular incluido. Quien entro por excepcion --no pudo
    aceptar por si mismo y alguien respondio por el-- queda cubierto por esa
    misma excepcion.
  */
  if exists (
    select 1 from public.reglamento r
    where r.condominio_id = v_visita.condominio_id
      and r.tipo = 'huesped_temporal'
      and r.vigente
  ) then
    select string_agg(nombre, ', ' order by orden) into v_faltan
    from (
      select nombre, orden
      from public.invitado
      where visita_id = v_visita.id
        and not es_menor
        and reglamento_aceptado_en is null
        and not terminos_excepcion
      order by orden
      limit 3
    ) sinReglas;

    if v_faltan is not null then
      raise exception
        'Falta que acepten las reglas del edificio: %. Cada adulto las acepta desde su enlace.',
        v_faltan;
    end if;
  end if;

  /*
    Cada vehiculo dice quien responde por el.

    El anfitrion puede apuntar una placa al reservar, y entonces todavia no
    sabe quien viene: ese vehiculo nace sin responsable. El cliente lo aclaro
    el 09/10/2026: quien lo completa es el huesped, en su preregistro. Asi que
    aqui se exige, igual que el documento de un adulto que se apunto sin datos.
  */
  select string_agg(placa, ', ' order by placa) into v_faltan
  from (
    select placa
    from public.vehiculo_visita
    where visita_id = v_visita.id
      and responsable_invitado_id is null
    order by placa
    limit 3
  ) sinResponsable;

  if v_faltan is not null then
    raise exception
      'Falta decir quien responde por el vehiculo: %. Elige a un adulto de la reserva.',
      v_faltan;
  end if;

  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select nombre, orden
    from public.invitado
    where visita_id = v_visita.id
      and not es_titular
      and not es_menor
      and coalesce(btrim(documento_numero), '') = ''
    order by orden
    limit 3
  ) sinDocumento;

  if v_faltan is not null then
    raise exception 'Falta el documento de: %.', v_faltan;
  end if;

  /*
    La fecha de expedicion, para cedula de extranjeria y PPT (14/10/2026).
    Sin ella Tus Datos no los consulta, y entonces esa persona entraria sin la
    consulta que el KT pide para todo huesped.
  */
  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select nombre, orden
    from public.invitado
    where visita_id = v_visita.id
      and not es_menor
      and tipo_documento in ('cedula_extranjeria', 'ppt')
      and documento_fecha_expedicion is null
    order by orden
    limit 3
  ) sinExpedicion;

  if v_faltan is not null then
    raise exception 'Falta la fecha de expedicion del documento de: %.', v_faltan;
  end if;

  -- Los menores: quien responde por cada uno ----------------------------------

  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select nombre, orden
    from public.invitado
    where visita_id = v_visita.id
      and es_menor
      and responsable_id is null
    order by orden
    limit 3
  ) sinResponsable;

  if v_faltan is not null then
    raise exception
      'Falta decir quien responde por: %. Tiene que ser un adulto de esta misma reserva.',
      v_faltan;
  end if;

  /*
    Y el papel, cuando no es su padre ni su madre.

    Se mira contra `autorizacion_menor.responsable_id` y no solo contra la
    existencia de la fila: si el titular sube el permiso de un tio y despues
    cambia el responsable a otra persona, el papel que hay esta a nombre de
    quien ya no viene. Esa comprobacion es la razon de que esa columna exista.
  */
  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select i.nombre, i.orden
    from public.invitado i
    where i.visita_id = v_visita.id
      and i.es_menor
      and i.parentesco in ('tutor_legal', 'otro')
      and not exists (
        select 1 from public.autorizacion_menor a
        where a.invitado_id = i.id
          and a.responsable_id is not distinct from i.responsable_id
      )
    order by i.orden
    limit 3
  ) sinPapel;

  if v_faltan is not null then
    raise exception
      'Falta la autorizacion firmada para: %. Hace falta cuando quien lo trae no es su padre ni su madre.',
      v_faltan;
  end if;

  select m.usuario_id into v_anfitrion
  from public.membresia_unidad m
  where m.unidad_id = v_visita.unidad_id
    and m.rol = 'propietario' and m.activo
  order by m.created_at limit 1;

  if v_anfitrion is null then
    raise exception 'Esta vivienda no tiene un propietario registrado';
  end if;

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad,
    correo, nombre, token_hash, invitada_por, expira_en,
    vigente_desde, vigente_hasta, invitado_id
  ) values (
    v_visita.condominio_id, 'unidad', v_visita.unidad_id, 'huesped_temporal',
    lower(btrim(v_titular.correo)),
    btrim(v_titular.nombre || ' ' || coalesce(v_titular.apellidos, '')),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_anfitrion,
    public.medianoche_en_el_edificio(v_visita.condominio_id, coalesce(v_visita.fecha_hasta + 1, public.hoy_en_el_edificio(v_visita.condominio_id) + public.parametro_entero('preregistro_enlace_dias_sin_salida'))),
    v_visita.fecha_desde, v_visita.fecha_hasta, v_titular.id
  );

  update public.visita
  set precheckin_completado_en = now()
  where id = v_visita.id;

  update public.invitado
  set precheckin_completado_en = now()
  where id = v_titular.id;

  /*
    La consulta de antecedentes de **cada adulto**, de verdad (14/10/2026).

    Antes se anotaba una `simulado` y solo del titular. Ahora se encola una
    llamada a `verificar-antecedentes` por persona: sale al cerrar la
    transaccion y la funcion reserva el cupo, consulta y guarda. Si Tus Datos
    esta apagado, la funcion sigue anotando `simulado` como antes.

    Si encolar falla no se tumba el cierre --el huesped ya hizo su parte-- pero
    **se dice**: queda en `precheckin_aviso`, que es lo que ve el anfitrion. La
    version anterior se tragaba el error.
  */
  begin
    perform public.encolar_verificaciones_de_visita(v_visita.id);
  exception when others then
    update public.visita
       set precheckin_aviso = 'No se pudo lanzar la consulta de antecedentes: ' || sqlerrm
     where id = v_visita.id;
  end;

  return v_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.comprar_paquete_verificaciones(p_unidad_id uuid, p_cantidad integer, p_referencia text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_condominio uuid;
  v_monto  numeric(12,2);
  v_moneda char(3);
  v_id     uuid;
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No podes comprar verificaciones para esta vivienda';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'El paquete necesita una cantidad';
  end if;

  v_condominio := public.condominio_de_unidad(p_unidad_id);

  select p.monto, p.moneda into v_monto, v_moneda
  from public.precio_del_plan('paquete_verificaciones', v_condominio) p;

  insert into public.paquete_verificaciones
    (unidad_id, cantidad, vence_en, comprado_por, monto, moneda, referencia)
  values
    (p_unidad_id, p_cantidad, public.hoy_en_el_edificio(v_condominio) + public.parametro_entero('verificaciones_paquete_dias'), auth.uid(),
     case when v_monto is null then null else v_monto * p_cantidad end,
     v_moneda,
     nullif(btrim(coalesce(p_referencia, '')), ''))
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consumo_verificaciones_de(p_unidad_id uuid)
 RETURNS TABLE(incluidas integer, suscritas_usadas integer, suplementarias integer, suplementarias_usadas integer, vencimiento_suplementarias date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    coalesce(s.verificaciones_base, 0),
    (select count(*)::int
       from public.verificacion_antecedentes v
      where v.unidad_id = p_unidad_id
        and v.origen = 'paquete_base'),
    -- Solo los paquetes vigentes: uno vencido no suma saldo.
    coalesce((select sum(p.cantidad)::int
       from public.paquete_verificaciones p
      where p.unidad_id = p_unidad_id
        and (p.vence_en is null or p.vence_en >= public.hoy_en_la_unidad(p_unidad_id))), 0),
    (select count(*)::int
       from public.verificacion_antecedentes v
      where v.unidad_id = p_unidad_id
        and v.origen = 'paquete_complementario'),
    (select max(p.vence_en)
       from public.paquete_verificaciones p
      where p.unidad_id = p_unidad_id
        and (p.vence_en is null or p.vence_en >= public.hoy_en_la_unidad(p_unidad_id)))
  from public.suscripcion_renta_corta s
  where s.unidad_id = p_unidad_id;
$function$;

CREATE OR REPLACE FUNCTION public.crear_invitacion(p_condominio_id uuid, p_ambito ambito_invitacion, p_correo text, p_nombre text, p_unidad_id uuid DEFAULT NULL::uuid, p_rol_unidad rol_unidad DEFAULT NULL::rol_unidad, p_rol_condominio rol_condominio DEFAULT NULL::rol_condominio, p_vigente_desde date DEFAULT NULL::date, p_vigente_hasta date DEFAULT NULL::date, p_contacto_nombre text DEFAULT NULL::text, p_contacto_codigo text DEFAULT NULL::text, p_contacto_telefono text DEFAULT NULL::text, p_telefono text DEFAULT NULL::text, p_codigo_pais text DEFAULT NULL::text, p_permisos jsonb DEFAULT NULL::jsonb, p_porteria_id uuid DEFAULT NULL::uuid, p_documento text DEFAULT NULL::text)
 RETURNS TABLE(invitacion_id uuid, token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
  v_correo text := lower(trim(p_correo));
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;

  if p_ambito = 'unidad' then
    if not public.puede_invitar_a_unidad(p_unidad_id) then
      raise exception 'No tenes permiso para invitar a esta unidad';
    end if;

    -- La propiedad de una vivienda es un hecho legal que registra la
    -- administracion: quien gestiona la vivienda da de alta a los suyos, no a
    -- su dueño.
    --
    -- El huesped temporal NO entra aqui, aunque la misma frase del KT lo
    -- nombre. Lo que dice es que "va por otro flujo" --el precheckin--, no que
    -- solo la administracion pueda darlo de alta; y ese flujo todavia no
    -- existe (R-90). Restringirlo dejaria al anfitrion sin ninguna forma de
    -- recibir a su huesped, que es el producto entero.
    if p_rol_unidad = 'propietario'
       and not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
    end if;
  else
    if not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion del condominio puede invitar a estos roles';
    end if;

    -- Un coadministrador no nombra administradores ni otros coadministradores:
    -- eso es del administrador (decision del cliente, 15/10/2026). Y a la
    -- porteria la invita quien tiene el permiso de seguridad, no cualquiera.
    if p_rol_condominio in ('administrador', 'coadministrador')
       and not public.es_administrador_de(p_condominio_id) then
      raise exception 'Solo el administrador puede invitar a administradores y coadministradores';
    end if;
    if p_rol_condominio = 'guardia'
       and not public.puede_coadmin(p_condominio_id, 'modificarSeguridad') then
      raise exception 'No tienes permiso para invitar personal de portería';
    end if;
  end if;

  -- Un correo que no se puede escribir en un sobre no recibe invitaciones.
  -- La pantalla solo miraba que llevara una arroba: «ana@» emitia una
  -- invitacion que nadie iba a poder aceptar.
  if v_correo !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]{2,}$' then
    raise exception 'Ese correo no parece válido'
      using errcode = 'check_violation', constraint = 'invitacion_correo_valido';
  end if;

  -- La porteria y el documento son de un guardia; los permisos, de un guardia
  -- o de un coadministrador. La porteria tiene que ser de este edificio.
  if p_porteria_id is not null and not exists (
    select 1 from public.porteria po
    where po.id = p_porteria_id and po.condominio_id = p_condominio_id
  ) then
    raise exception 'Esa portería no es de este edificio';
  end if;

  if p_rol_unidad = 'huesped_temporal' and p_vigente_hasta is null then
    raise exception 'Una invitacion de huesped temporal necesita la fecha de fin de la estancia';
  end if;

  if p_vigente_hasta is not null and p_vigente_hasta < public.hoy_en_el_edificio(p_condominio_id) then
    raise exception 'La estancia termina antes de hoy';
  end if;

  if p_vigente_desde is not null and p_vigente_hasta is not null
     and p_vigente_desde > p_vigente_hasta then
    raise exception 'La estancia termina antes de empezar';
  end if;

  -- Una sola pendiente por persona y destino: la anterior deja de valer. Si
  -- no, invitar dos veces al mismo correo dejaba dos enlaces vivos. Esta
  -- regla existia (20260921230000) y se perdio al reescribir la funcion.
  update public.invitacion i
     set estado = 'revocada', updated_at = now()
   where i.estado = 'pendiente'
     and i.condominio_id = p_condominio_id
     and i.ambito = p_ambito
     and lower(i.correo) = v_correo
     and i.unidad_id is not distinct from p_unidad_id
     and i.rol_unidad is not distinct from p_rol_unidad
     and i.rol_condominio is not distinct from p_rol_condominio;

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, rol_condominio,
    correo, nombre, token_hash, invitada_por, expira_en,
    vigente_desde, vigente_hasta,
    contacto_emergencia_nombre, contacto_emergencia_codigo,
    contacto_emergencia_telefono,
    telefono, codigo_pais,
    permisos, porteria_id, documento
  ) values (
    p_condominio_id, p_ambito, p_unidad_id, p_rol_unidad, p_rol_condominio,
    v_correo, p_nombre,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(), now() + make_interval(days => public.parametro_entero('invitacion_dias_validez')),
    p_vigente_desde, p_vigente_hasta,
    nullif(btrim(coalesce(p_contacto_nombre, '')), ''),
    nullif(btrim(coalesce(p_contacto_codigo, '')), ''),
    nullif(btrim(coalesce(p_contacto_telefono, '')), ''),
    -- Solo digitos, igual que lo que manda el campo: el prefijo sale del
    -- codigo del pais y un numero no se guarda ya formateado.
    nullif(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), ''),
    nullif(upper(btrim(coalesce(p_codigo_pais, ''))), ''),
    case when p_ambito = 'condominio' then p_permisos end,
    case when p_ambito = 'condominio' then p_porteria_id end,
    case when p_ambito = 'condominio'
         then nullif(btrim(coalesce(p_documento, '')), '') end
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.edad_al_llegar(p_invitado invitado)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
    when p_invitado.fecha_nacimiento is null then null
    else extract(year from age(
      coalesce(
        (select v.fecha_desde from public.visita v where v.id = p_invitado.visita_id),
        public.hoy_en_el_edificio((select v.condominio_id from public.visita v where v.id = p_invitado.visita_id))
      ),
      p_invitado.fecha_nacimiento
    ))::int
  end;
$function$;

CREATE OR REPLACE FUNCTION public.eliminar_mi_cuenta(p_motivo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'auth'
AS $function$
declare
  v_yo uuid := auth.uid();
  v_edificio text;
begin
  if v_yo is null then
    raise exception 'Se requiere una sesión iniciada';
  end if;

  -- No se va la unica administracion de un edificio.
  select c.nombre into v_edificio
  from public.membresia_condominio mc
  join public.condominio c on c.id = mc.condominio_id
  where mc.usuario_id = v_yo
    and mc.activo
    and mc.rol = 'administrador'
    and not exists (
      select 1 from public.membresia_condominio otra
      where otra.condominio_id = mc.condominio_id
        and otra.activo
        and otra.rol = 'administrador'
        and otra.usuario_id <> v_yo
    )
  limit 1;

  if v_edificio is not null then
    raise exception 'Eres la única administración de %. Nombra a otra persona antes de eliminar tu cuenta.', v_edificio;
  end if;

  -- Ni quien tiene huespedes dentro, o por llegar, en una vivienda que
  -- gestiona.
  if exists (
    select 1
    from public.visita v
    join public.membresia_unidad mu on mu.unidad_id = v.unidad_id
    where mu.usuario_id = v_yo
      and mu.activo
      and mu.rol in ('propietario', 'inquilino_lider')
      and v.tipo = 'huesped_temporal'
      and v.estado in ('programada', 'ingresada')
      and coalesce(v.fecha_hasta, public.hoy_en_el_edificio(v.condominio_id)) >= public.hoy_en_el_edificio(v.condominio_id)
  ) then
    raise exception 'Tienes estancias de huéspedes abiertas. Ciérralas o cancélalas antes de eliminar tu cuenta.';
  end if;

  insert into public.cuenta_eliminada (usuario_id, motivo)
  values (v_yo, nullif(btrim(coalesce(p_motivo, '')), ''));

  -- Las membresias se dan de baja, no se borran. Local a la transaccion.
  perform set_config('veciyo.eliminando_cuenta', 'on', true);

  -- `puede_acceder` tambien: la tabla no admite una membresia con acceso y
  -- sin cuenta, que es justo como queda al borrar la cuenta de abajo.
  update public.membresia_unidad
     set activo = false, puede_acceder = false, updated_at = now()
   where usuario_id = v_yo;

  update public.membresia_condominio
     set activo = false, updated_at = now()
   where usuario_id = v_yo and activo;

  -- Y la cuenta. Lo que cuelga de ella se va o se queda sin nombre, segun
  -- diga su clave foranea.
  delete from auth.users where id = v_yo;

  perform set_config('veciyo.eliminando_cuenta', 'off', true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.es_huesped_alojado_en_condominio(p_condominio_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad u on u.id = mu.unidad_id
    where u.condominio_id = p_condominio_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol = 'huesped_temporal'
      and (mu.vigente_desde is null or mu.vigente_desde <= public.hoy_en_el_edificio(p_condominio_id))
      and (mu.vigente_hasta is null or mu.vigente_hasta >= public.hoy_en_el_edificio(p_condominio_id))
  );
$function$;

CREATE OR REPLACE FUNCTION public.es_huesped_alojado(p_unidad_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol = 'huesped_temporal'
      and (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_la_unidad(p_unidad_id))
      and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_la_unidad(p_unidad_id))
  );
$function$;

CREATE OR REPLACE FUNCTION public.es_huesped_con_reserva(p_unidad_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol = 'huesped_temporal'
      -- Sin mirar `vigente_desde`: la estancia futura tambien cuenta.
      and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_la_unidad(p_unidad_id))
  );
$function$;

CREATE OR REPLACE FUNCTION public.es_huesped_del_condominio(p_condominio_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad u on u.id = mu.unidad_id
    where u.condominio_id = p_condominio_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol = 'huesped_temporal'
      and (mu.vigente_hasta is null or mu.vigente_hasta >= public.hoy_en_el_edificio(p_condominio_id))
  );
$function$;

CREATE OR REPLACE FUNCTION public.estado_del_codigo_descuento(p_codigo text)
 RETURNS TABLE(id uuid, porcentaje integer, motivo text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  c     public.codigo_descuento%rowtype;
  usos  int;
begin
  select * into c from public.codigo_descuento where codigo = upper(btrim(coalesce(p_codigo, '')));
  if c.id is null or not c.activo then
    return query select null::uuid, null::int, 'Ese código no existe o ya no está activo.';
    return;
  end if;
  if c.vence_en is not null and c.vence_en < public.hoy_en_la_plataforma() then
    return query select null::uuid, null::int, format('Ese código venció el %s.', to_char(c.vence_en, 'DD/MM/YYYY'));
    return;
  end if;
  select count(*) into usos from public.periodo_suscripcion where codigo_descuento_id = c.id;
  if c.usos_maximos is not null and usos >= c.usos_maximos then
    return query select null::uuid, null::int, 'Ese código ya se usó todas las veces que permitía.';
    return;
  end if;
  return query select c.id, c.porcentaje, null::text;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guardar_acompanante(p_token text, p_nombre text, p_apellidos text DEFAULT NULL::text, p_tipo_documento tipo_documento DEFAULT NULL::tipo_documento, p_documento text DEFAULT NULL::text, p_correo text DEFAULT NULL::text, p_telefono text DEFAULT NULL::text, p_es_menor boolean DEFAULT false, p_acompanante_id uuid DEFAULT NULL::uuid, p_codigo_pais text DEFAULT NULL::text, p_fecha_nacimiento date DEFAULT NULL::date, p_responsable_id uuid DEFAULT NULL::uuid, p_parentesco parentesco DEFAULT NULL::parentesco)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_visita   uuid;
  v_desde    date;
  v_tope     int;
  v_cuantos  int;
  v_orden    int;
  v_id       uuid;
  v_es_menor boolean;
  v_nombre   text;
  v_de_la_reserva boolean;
begin
  select v.id, v.fecha_desde into v_visita, v_desde
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if exists (select 1 from public.visita v
             where v.id = v_visita and v.precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  /*
    El nombre deja de hacer falta: sin el, «Acompañante N».

    Para mandarle a alguien su enlace habia que crearlo antes, y para crearlo
    hacian falta su nombre y su documento --que es justo lo que el enlace
    sirve para conseguir--. El cliente se quedo sin nada que compartir el
    09/10/2026: «no habia como compartir a alguien mas para que llene los
    suyos».

    El numero sale de `orden`, que se calcula mas abajo, asi que el nombre se
    resuelve alli y aqui solo se admite vacio.
  */
  v_nombre := nullif(btrim(coalesce(p_nombre, '')), '');

  /*
    Quien da su fecha de nacimiento **no elige ademas si es menor**.

    Hasta hoy la casilla era la puerta de atras: un menor no necesita documento
    --eso esta bien, no tiene-- asi que marcarse como menor era la forma de
    entrar al edificio sin identificarse. El disparador lo vuelve a calcular en
    la fila; aqui hace falta antes, porque de ello depende si se exige el
    documento.
  */
  if p_fecha_nacimiento is not null then
    if p_fecha_nacimiento > coalesce(v_desde, public.hoy_en_el_edificio((select v.condominio_id from public.visita v where v.id = v_visita))) then
      raise exception 'Esa fecha de nacimiento es posterior a la llegada';
    end if;
    v_es_menor := extract(year from age(
      coalesce(v_desde, public.hoy_en_el_edificio((select v.condominio_id from public.visita v where v.id = v_visita))), p_fecha_nacimiento))::int
      < public.mayoria_de_edad((select v.condominio_id from public.visita v where v.id = v_visita));
  else
    v_es_menor := coalesce(p_es_menor, false);
  end if;

  /*
    El documento **ya no se exige aqui**.

    Se exige donde importa, que es al cerrar: `cerrar_precheckin` responde
    «Falta el documento de: X» y no deja terminar. Pedirlo tambien al crear no
    protegia nada --la fila no vale de nada hasta que el preregistro cierre--
    y hacia imposible el caso normal: invitar a alguien para que ponga sus
    propios datos.

    Era circular: para mandarle el enlace habia que crearlo, y para crearlo
    hacia falta el dato que el enlace sirve para conseguir.
  */

  -- Un adulto no tiene quien responda por el. Decirlo en voz alta y no
  -- ignorarlo en silencio: si alguien manda un responsable para un adulto, o
  -- se equivoco de persona o se equivoco de casilla, y las dos cosas hay que
  -- verlas.
  if not v_es_menor and (p_responsable_id is not null or p_parentesco is not null) then
    raise exception 'Solo un menor lleva responsable: % figura como adulto', btrim(p_nombre);
  end if;

  if v_es_menor and p_responsable_id is not null and p_parentesco is null then
    raise exception 'Falta decir que es de el: padre, madre, tutor legal u otro';
  end if;

  /*
    El tope es el mas estricto de los dos: lo que el anfitrion dijo al reservar
    y el aforo del alojamiento. Hasta el 09/10/2026 solo existia el segundo
    --`huespedes_previstos` no tenia columna, el numero del formulario se
    tiraba-- asi que en una reserva para una persona cabian tres mas.
  */
  select t.tope, t.es_de_la_reserva into v_tope, v_de_la_reserva
  from public.tope_de_personas(v_visita) t;

  if p_acompanante_id is null and v_tope is not null then
    select count(*) into v_cuantos
    from public.invitado where visita_id = v_visita;

    if v_cuantos >= v_tope then
      /*
        Se dice **cual** de los dos topes es, porque se arreglan en sitios
        distintos: uno lo cambia el anfitrion en la reserva y el otro en la
        configuracion del alojamiento. Un «no caben mas» a secas deja al
        huesped escribiendo a alguien sin saber que pedirle.
      */
      if v_de_la_reserva then
        raise exception
          'Esta reserva es para % personas. Si vienen mas, pediselo al anfitrion.',
          v_tope;
      else
        raise exception 'Este alojamiento admite % personas como maximo', v_tope;
      end if;
    end if;
  end if;

  if p_acompanante_id is not null then
    update public.invitado set
      nombre           = coalesce(v_nombre, nombre),
      apellidos        = nullif(btrim(coalesce(p_apellidos, '')), ''),
      tipo_documento   = p_tipo_documento,
      documento_numero = nullif(btrim(coalesce(p_documento, '')), ''),
      correo           = lower(nullif(btrim(coalesce(p_correo, '')), '')),
      telefono         = nullif(btrim(coalesce(p_telefono, '')), ''),
      codigo_pais      = coalesce(upper(nullif(btrim(coalesce(p_codigo_pais, '')), '')), codigo_pais),
      fecha_nacimiento = coalesce(p_fecha_nacimiento, fecha_nacimiento),
      es_menor         = v_es_menor,
      responsable_id   = case when v_es_menor then p_responsable_id end,
      parentesco       = case when v_es_menor then p_parentesco end
    where id = p_acompanante_id
      and visita_id = v_visita
      and not es_titular
    returning id into v_id;

    if v_id is null then
      raise exception 'Ese acompanante no es de esta reserva';
    end if;

    return v_id;
  end if;

  select coalesce(max(orden), 0) + 1 into v_orden
  from public.invitado where visita_id = v_visita;

  insert into public.invitado (
    visita_id, orden, nombre, apellidos, tipo_documento, documento_numero,
    correo, telefono, codigo_pais, fecha_nacimiento,
    es_menor, es_titular, responsable_id, parentesco
  ) values (
    v_visita, v_orden, coalesce(v_nombre, 'Acompañante ' || v_orden::text),
    nullif(btrim(coalesce(p_apellidos, '')), ''),
    p_tipo_documento,
    nullif(btrim(coalesce(p_documento, '')), ''),
    lower(nullif(btrim(coalesce(p_correo, '')), '')),
    nullif(btrim(coalesce(p_telefono, '')), ''),
    upper(nullif(btrim(coalesce(p_codigo_pais, '')), '')),
    p_fecha_nacimiento,
    v_es_menor, false,
    case when v_es_menor then p_responsable_id end,
    case when v_es_menor then p_parentesco end
  )
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guardar_fecha_expedicion(p_token text, p_fecha date, p_invitado_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_hash    text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_visita  uuid;
  v_id      uuid;
  v_cerrado boolean;
  v_nace    date;
begin
  -- Enlace del titular.
  select v.id, (v.precheckin_completado_en is not null)
    into v_visita, v_cerrado
  from public.visita v
  where v.precheckin_token_hash = v_hash
    and v.precheckin_expira_en > now();

  if v_visita is not null then
    if p_invitado_id is null then
      select i.id into v_id
      from public.invitado i
      where i.visita_id = v_visita and i.es_titular;
    else
      select i.id into v_id
      from public.invitado i
      where i.id = p_invitado_id and i.visita_id = v_visita;
    end if;
  else
    -- Enlace de un acompanante: solo la suya.
    select i.id, i.visita_id, (v.precheckin_completado_en is not null)
      into v_id, v_visita, v_cerrado
    from public.invitado i
    join public.visita v on v.id = i.visita_id
    where i.precheckin_token_hash = v_hash
      and v.precheckin_expira_en > now();

    if v_id is not null and p_invitado_id is not null and p_invitado_id <> v_id then
      raise exception 'Con tu enlace solo puedes poner tu propia fecha';
    end if;
  end if;

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if v_id is null then
    raise exception 'Esa persona no es de esta reserva';
  end if;

  if v_cerrado then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  if p_fecha is not null then
    if p_fecha > public.hoy_en_el_edificio((select v.condominio_id from public.visita v where v.id = v_visita)) then
      raise exception 'La fecha de expedicion no puede ser futura';
    end if;

    select fecha_nacimiento into v_nace from public.invitado where id = v_id;
    if v_nace is not null and p_fecha < v_nace then
      raise exception 'La fecha de expedicion es anterior al nacimiento';
    end if;
  end if;

  update public.invitado
     set documento_fecha_expedicion = p_fecha
   where id = v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guardar_menor_acompanante(p_token text, p_nombre text, p_fecha_nacimiento date, p_responsable_id uuid, p_parentesco parentesco, p_apellidos text DEFAULT NULL::text, p_tipo_documento tipo_documento DEFAULT NULL::tipo_documento, p_documento text DEFAULT NULL::text, p_menor_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_visita  uuid;
  v_yo      uuid;
  v_desde   date;
  v_tope    int;
  v_de_la_reserva boolean;
  v_cuantos int;
  v_edad    int;
  v_orden   int;
  v_id      uuid;
begin
  select q.visita_id, q.invitado_id into v_visita, v_yo
  from public.quien_trae_este_enlace(p_token) q;

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  select v.fecha_desde into v_desde from public.visita v where v.id = v_visita;

  if exists (select 1 from public.visita v
             where v.id = v_visita and v.precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'Hace falta el nombre del menor';
  end if;

  /*
    Que sea menor **lo dice su fecha**, igual que en `guardar_acompanante`. Un
    adulto no entra por aqui: tiene su propio enlace, acepta sus terminos y
    sube su documento, y nada de eso puede hacerlo otro por el.
  */
  if p_fecha_nacimiento is null then
    raise exception 'Hace falta la fecha de nacimiento del menor';
  end if;
  if p_fecha_nacimiento > coalesce(v_desde, public.hoy_en_el_edificio((select v.condominio_id from public.visita v where v.id = v_visita))) then
    raise exception 'Esa fecha de nacimiento es posterior a la llegada';
  end if;
  v_edad := extract(year from age(
    coalesce(v_desde, public.hoy_en_el_edificio((select v.condominio_id from public.visita v where v.id = v_visita))), p_fecha_nacimiento))::int;
  if v_edad >= public.mayoria_de_edad((select v.condominio_id from public.visita v where v.id = v_visita)) then
    raise exception
      'Esa fecha es de un adulto. Un adulto se añade aparte y llena sus propios datos.';
  end if;

  /*
    **El responsable lo elige quien añade al menor** --decision del cliente del
    09/10/2026-- pero tiene que ser un adulto de esta misma estancia: si no, un
    niño quedaria a cargo de alguien que no viene.
  */
  if p_responsable_id is null or p_parentesco is null then
    raise exception 'Falta decir quien responde por el y que es suyo';
  end if;
  if not exists (
    select 1 from public.invitado i
    where i.id = p_responsable_id and i.visita_id = v_visita and not i.es_menor
  ) then
    raise exception 'Quien responde por el tiene que ser un adulto de esta reserva';
  end if;

  -- El tope, igual que para el titular: el mas estricto de los dos. Solo al
  -- añadir, no al corregir.
  if p_menor_id is null then
    select t.tope, t.es_de_la_reserva into v_tope, v_de_la_reserva
    from public.tope_de_personas(v_visita) t;

    if v_tope is not null then
      select count(*) into v_cuantos
      from public.invitado where visita_id = v_visita;

      if v_cuantos >= v_tope then
        if v_de_la_reserva then
          raise exception
            'Esta reserva es para % personas. Si vienen mas, pediselo al anfitrion.',
            v_tope;
        else
          raise exception 'Este alojamiento admite % personas como maximo', v_tope;
        end if;
      end if;
    end if;
  end if;

  if p_menor_id is not null then
    -- Solo los suyos: corregir la ficha de un menor de otro adulto no.
    update public.invitado set
      nombre           = btrim(p_nombre),
      apellidos        = nullif(btrim(coalesce(p_apellidos, '')), ''),
      tipo_documento   = p_tipo_documento,
      documento_numero = nullif(btrim(coalesce(p_documento, '')), ''),
      fecha_nacimiento = p_fecha_nacimiento,
      responsable_id   = p_responsable_id,
      parentesco       = p_parentesco,
      updated_at       = now()
    where id = p_menor_id
      and visita_id = v_visita
      and es_menor
      and responsable_id = v_yo;

    if not found then
      raise exception 'Ese menor no esta a tu cargo en esta reserva';
    end if;
    return p_menor_id;
  end if;

  select coalesce(max(orden), 0) + 1 into v_orden
  from public.invitado where visita_id = v_visita;

  insert into public.invitado (
    visita_id, nombre, apellidos, tipo_documento, documento_numero,
    fecha_nacimiento, es_menor, es_titular, orden, responsable_id, parentesco
  ) values (
    v_visita, btrim(p_nombre), nullif(btrim(coalesce(p_apellidos, '')), ''),
    p_tipo_documento, nullif(btrim(coalesce(p_documento, '')), ''),
    p_fecha_nacimiento, true, false, v_orden, p_responsable_id, p_parentesco
  )
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.huesped_destinatario(p_unidad_id uuid, p_nombre text, p_documento text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with alojados as (
    select distinct on (i.usuario_id)
      i.usuario_id, i.documento_numero, i.nombre, i.apellidos, v.fecha_desde
    from public.invitado i
    join public.visita v on v.id = i.visita_id
    join public.membresia_unidad mu
      on mu.usuario_id = i.usuario_id and mu.unidad_id = v.unidad_id
    where v.unidad_id = p_unidad_id
      and i.usuario_id is not null
      and mu.rol = 'huesped_temporal'
      and mu.activo
      and (mu.vigente_desde is null or mu.vigente_desde <= public.hoy_en_la_unidad(p_unidad_id))
      and (mu.vigente_hasta is null or mu.vigente_hasta >= public.hoy_en_la_unidad(p_unidad_id))
    order by i.usuario_id, v.fecha_desde desc nulls last
  ),
  por_documento as (
    -- El documento, comparando solo los dígitos: «1.098.765» y «1098765».
    select a.usuario_id
    from alojados a
    where nullif(regexp_replace(coalesce(p_documento, ''), '\D', '', 'g'), '') is not null
      and regexp_replace(coalesce(a.documento_numero, ''), '\D', '', 'g')
          = regexp_replace(p_documento, '\D', '', 'g')
    order by a.fecha_desde desc nulls last
    limit 1
  ),
  por_nombre as (
    -- Cada palabra escrita está en su nombre. `<@`: contenido en.
    select a.usuario_id
    from alojados a
    where public.palabras_sin_tildes(p_nombre) is not null
      and public.palabras_sin_tildes(p_nombre)
          <@ public.palabras_sin_tildes(a.nombre || ' ' || coalesce(a.apellidos, ''))
  )
  select coalesce(
    (select usuario_id from por_documento),
    -- Por nombre, solo si no hay duda de quién es.
    (select min(usuario_id::text)::uuid from por_nombre
     having count(*) = 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.marcar_pago_cuota(p_cuota_id uuid, p_unidad_id uuid, p_pagado boolean, p_origen text DEFAULT 'manual'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_condominio uuid;
  v_monto      numeric(12,2);
begin
  select c.condominio_id, c.monto into v_condominio, v_monto
  from public.cuota_administracion c where c.id = p_cuota_id;

  if v_condominio is null then
    raise exception 'Esa cuota no existe';
  end if;

  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion registra los pagos';
  end if;

  if public.condominio_de_unidad(p_unidad_id) is distinct from v_condominio then
    raise exception 'Esa vivienda no es de este condominio';
  end if;

  select coalesce(u.cuota_monto, v_monto) into v_monto
  from public.unidad u where u.id = p_unidad_id;

  insert into public.pago_cuota
    (cuota_id, unidad_id, pagado, pagado_en, monto, origen, registrado_por)
  values (
    p_cuota_id, p_unidad_id, p_pagado,
    case when p_pagado then public.hoy_en_el_edificio(v_condominio) end,
    case when p_pagado then v_monto end,
    p_origen::public.origen_pago,
    auth.uid()
  )
  on conflict (cuota_id, unidad_id) do update set
    pagado         = excluded.pagado,
    pagado_en      = excluded.pagado_en,
    monto          = excluded.monto,
    origen         = excluded.origen,
    registrado_por = excluded.registrado_por,
    updated_at     = now();
end;
$function$;

CREATE OR REPLACE FUNCTION public.mi_estancia_es_corta(p_unidad_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with m as (
    select greatest(m.vigente_hasta - coalesce(m.vigente_desde, public.hoy_en_la_unidad(p_unidad_id)), 1) as noches
    from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.rol = 'huesped_temporal'
      and m.activo
      and (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_la_unidad(p_unidad_id))
      and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_la_unidad(p_unidad_id))
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
$function$;

CREATE OR REPLACE FUNCTION public.notificar_ingreso_invitado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.notificar_unidad(p_unidad_id uuid, p_tipo motivo_notificacion, p_titulo text, p_mensaje text, p_entidad_tipo text DEFAULT NULL::text, p_entidad_id uuid DEFAULT NULL::uuid, p_excepto uuid DEFAULT NULL::uuid, p_solo_residentes boolean DEFAULT false)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    and (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_el_edificio(u.condominio_id))
    and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(u.condominio_id))
    and (p_excepto is null or m.usuario_id <> p_excepto)
    -- Solo quien vive allí: ni el huésped ni el dueño que no reside (hueco 29).
    and (not p_solo_residentes or (m.rol <> 'huesped_temporal' and m.es_residente))
    -- Quien apagó este motivo en la campana no recibe la fila.
    and public.quiere_aviso(m.usuario_id, p_tipo, 'app');
$function$;

CREATE OR REPLACE FUNCTION public.panel_cambiar_precio(p_plan text, p_pais text, p_monto numeric, p_moneda text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_plan uuid;
  v_vigente public.precio_plan%rowtype;
  v_pais char(2) := nullif(upper(btrim(coalesce(p_pais, ''))), '');
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma cambia los precios';
  end if;
  if p_monto is null or p_monto < 0 then
    raise exception 'El precio tiene que ser cero o más';
  end if;
  if not exists (select 1 from public.moneda where codigo = upper(btrim(p_moneda))) then
    raise exception 'La moneda % no existe', p_moneda;
  end if;

  select id into v_plan from public.plan_suscripcion where clave::text = p_plan;
  if v_plan is null then
    raise exception 'No existe el plan %', p_plan;
  end if;

  select * into v_vigente from public.precio_plan
  where plan_id = v_plan and pais is not distinct from v_pais and vigente_hasta is null;

  -- Desde ayer también se corrige: cerrarlo ayer chocaría con
  -- `vigente_hasta > vigente_desde`. Lo ya cobrado guarda su importe igual.
  if v_vigente.id is not null and v_vigente.vigente_desde >= public.hoy_en_el_pais(v_pais) - 1 then
    update public.precio_plan
       set monto = round(p_monto, 2), moneda = upper(btrim(p_moneda))
     where id = v_vigente.id;
  else
    if v_vigente.id is not null then
      update public.precio_plan set vigente_hasta = public.hoy_en_el_pais(v_pais) - 1 where id = v_vigente.id;
    end if;
    insert into public.precio_plan (plan_id, pais, monto, moneda, vigente_desde)
    values (v_plan, v_pais, round(p_monto, 2), upper(btrim(p_moneda)), public.hoy_en_el_pais(v_pais));
  end if;

  perform public.anotar_en_bitacora(
    'precio_cambiado', null,
    jsonb_build_object('plan', p_plan, 'pais', v_pais,
                       'antes', v_vigente.monto, 'despues', round(p_monto, 2),
                       'moneda', upper(btrim(p_moneda))));
end;
$function$;

CREATE OR REPLACE FUNCTION public.poner_en_comite(p_unidad_id uuid, p_en_comite boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_condominio uuid := public.condominio_de_unidad(p_unidad_id);
  v_usuarios   uuid[];
begin
  if v_condominio is null or not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración cambia el comité';
  end if;

  select array_agg(distinct m.usuario_id) into v_usuarios
  from public.membresia_unidad m
  where m.unidad_id = p_unidad_id
    and m.rol = 'propietario'
    and m.activo
    and m.usuario_id is not null;

  if v_usuarios is null then
    raise exception 'El propietario de esa vivienda todavía no tiene cuenta en Veciyo';
  end if;

  if p_en_comite then
    insert into public.comite_propietarios (condominio_id, usuario_id, desde)
    select v_condominio, u, public.hoy_en_el_edificio(v_condominio) from unnest(v_usuarios) u
    on conflict (condominio_id, usuario_id) where hasta is null do nothing;
  else
    -- Quien entro hoy mismo no deja historia: `hasta` tiene que ser posterior
    -- a `desde`, asi que se quita la fila. El resto se cierra con fecha.
    delete from public.comite_propietarios k
    where k.condominio_id = v_condominio
      and k.usuario_id = any (v_usuarios)
      and k.hasta is null
      and k.desde >= public.hoy_en_el_edificio(v_condominio);

    update public.comite_propietarios k
    set hasta = public.hoy_en_el_edificio(v_condominio)
    where k.condominio_id = v_condominio
      and k.usuario_id = any (v_usuarios)
      and k.hasta is null;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.precio_del_plan(p_clave clave_plan, p_condominio_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(monto numeric, moneda character, periodicidad periodicidad_plan)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select pr.monto, pr.moneda, pl.periodicidad
  from public.precio_plan pr
  join public.plan_suscripcion pl on pl.id = pr.plan_id
  where pl.clave = p_clave
    and pl.activo
    and pr.vigente_hasta is null
    and pr.vigente_desde <= coalesce(public.hoy_en_el_edificio(p_condominio_id), public.hoy_en_la_plataforma())
    and (
      pr.pais is null
      or pr.pais = (select c.pais from public.condominio c where c.id = p_condominio_id)
    )
  -- El precio del pais gana al de por defecto.
  order by pr.pais nulls last
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.puede_reportar_tra()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_inv     record;
  v_unidad  uuid;
  v_rnt     text;
  v_vence   date;
begin
  select i.llego, i.ingreso_en, i.salida_en, v.unidad_id
    into v_inv
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = new.invitado_id;

  if not found then
    raise exception 'Ese huesped no existe';
  end if;

  v_unidad := v_inv.unidad_id;

  -- "Nunca antes": un reporte de entrada sin ingreso confirmado por Seguridad
  -- es un dato falso enviado a una autoridad.
  if new.movimiento = 'entrada' and not coalesce(v_inv.llego, false) then
    raise exception 'El reporte de entrada necesita que la porteria haya confirmado el ingreso'
      using errcode = 'check_violation';
  end if;

  if new.movimiento = 'salida' and v_inv.salida_en is null then
    raise exception 'El reporte de salida necesita que la salida este registrada'
      using errcode = 'check_violation';
  end if;

  -- El registro con vigencia manda.
  select rt.numero, rt.vence_en into v_rnt, v_vence
  from public.registro_turismo rt
  where rt.unidad_id = v_unidad
  order by rt.emitido_en desc nulls last
  limit 1;

  -- Y si no lo hay, el numero suelto que la suscripcion guarda. Sin fecha no
  -- se puede comprobar la caducidad: se reporta, pero no se finge que se
  -- comprobo algo que no se sabe.
  if v_rnt is null then
    select s.rnt into v_rnt
    from public.suscripcion_renta_corta s
    where s.unidad_id = v_unidad
      and nullif(btrim(coalesce(s.rnt, '')), '') is not null;
  end if;

  if v_rnt is null then
    raise exception 'Esta vivienda no tiene RNT cargado, y sin RNT no se puede referenciar el reporte'
      using errcode = 'check_violation';
  end if;

  if v_vence is not null and v_vence < public.hoy_en_la_unidad(v_unidad) then
    raise exception 'El RNT de esta vivienda esta vencido'
      using errcode = 'check_violation';
  end if;

  new.rnt := v_rnt;
  new.reportado_por := coalesce(new.reportado_por, auth.uid());

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.quien_alcanza_la_publicacion(p_publicacion_id uuid)
 RETURNS TABLE(usuario_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select mu.usuario_id
  from public.publicacion p
  join public.unidad u on u.condominio_id = p.condominio_id
  join public.membresia_unidad mu on mu.unidad_id = u.id
  where p.id = p_publicacion_id
    and mu.usuario_id is not null
    and mu.activo
    -- Sin cuenta no hay bandeja. Es el menor de edad que el propietario
    -- registra, que a propósito no entra a la plataforma.
    and mu.puede_acceder
    and (
      (p.para_propietarios and mu.rol = 'propietario')
      or (p.para_residentes and mu.es_residente and mu.rol <> 'huesped_temporal')
      or (p.para_huespedes and mu.rol = 'huesped_temporal'
          and (mu.vigente_hasta is null or mu.vigente_hasta >= public.hoy_en_el_edificio(p.condominio_id)))
    )
  union
  select mc.usuario_id
  from public.publicacion p
  join public.membresia_condominio mc on mc.condominio_id = p.condominio_id
  where p.id = p_publicacion_id
    and p.para_porteria
    and mc.rol = 'guardia'
    and mc.activo
    and mc.usuario_id is not null;
$function$;

CREATE OR REPLACE FUNCTION public.quien_esta_en_la_conversacion(p_conversacion_id uuid)
 RETURNS TABLE(usuario_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with c as (
    select * from public.conversacion where id = p_conversacion_id
  )
  -- Un hilo de area: la vivienda, y el personal del area que lo atiende.
  select m.usuario_id
  from c
  join public.membresia_unidad m on m.unidad_id = c.unidad_id and m.activo
  where c.tipo = 'area'
    -- El huesped, mientras dure su estancia. La membresia sigue activa
    -- despues, que es lo que distingue a Ramiro de Tomas en las pruebas.
    and (
      m.rol <> 'huesped_temporal'
      or (
        (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_el_edificio(c.condominio_id))
        and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(c.condominio_id))
      )
    )

  union

  select mc.usuario_id
  from c
  join public.membresia_condominio mc
    on mc.condominio_id = c.condominio_id and mc.activo
  where c.tipo = 'area'
    and (
      (c.area = 'seguridad' and mc.rol = 'guardia')
      -- D-13: la porteria no, en el hilo de administracion. Y al reves
      -- tampoco: cada area atiende el suyo.
      or (c.area = 'administracion' and mc.rol in ('administrador', 'coadministrador'))
    )

  union

  -- Un canal: quien tenga alguno de los roles que lo componen. Es
  -- `es_del_canal` del derecho, como conjunto en vez de como pregunta.
  select m.usuario_id
  from c
  join public.canal_rol cr on cr.conversacion_id = c.id and cr.rol_unidad is not null
  join public.unidad u on u.condominio_id = c.condominio_id and u.deleted_at is null
  join public.membresia_unidad m
    on m.unidad_id = u.id and m.rol = cr.rol_unidad and m.activo
  where c.tipo = 'grupo'

  union

  select mc.usuario_id
  from c
  join public.canal_rol cr on cr.conversacion_id = c.id and cr.rol_condominio is not null
  join public.membresia_condominio mc
    on mc.condominio_id = c.condominio_id and mc.rol = cr.rol_condominio and mc.activo
  where c.tipo = 'grupo';
$function$;

CREATE OR REPLACE FUNCTION public.reglas_de_estancia(p_unidad_id uuid)
 RETURNS TABLE(permite_visitas boolean, permite_ninos boolean, permite_mascotas boolean, permite_cocheras boolean, estancia_minima integer, estancia_maxima integer, checkin_desde time without time zone, checkin_hasta time without time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with p as (select * from public.permisos_de_unidad(p_unidad_id)),
  /*
    La estancia que hay hoy en esa vivienda, y cuanto dura. Si hay varias manda
    la mas larga: si alguien se queda tres meses, la vivienda no esta en
    regimen de estancia corta aunque ademas haya alguien de dos noches.
  */
  estancia as (
    select max(
      case
        when m.vigente_hasta is null then 1000000
        else greatest(m.vigente_hasta - coalesce(m.vigente_desde, public.hoy_en_la_unidad(p_unidad_id)), 1)
      end
    ) as noches
    from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.rol = 'huesped_temporal'
      and m.activo
      and (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_la_unidad(p_unidad_id))
      and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_la_unidad(p_unidad_id))
  )
  select
    case when u.corto then p.corta_permite_visitas  else p.larga_permite_visitas  end,
    case when u.corto then p.corta_permite_ninos    else p.larga_permite_ninos    end,
    case when u.corto then p.corta_permite_mascotas else p.larga_permite_mascotas end,
    case when u.corto then p.corta_permite_cocheras else p.larga_permite_cocheras end,
    case when u.corto then p.corta_estancia_minima  else p.larga_estancia_minima  end,
    case when u.corto then p.corta_estancia_maxima  else p.larga_estancia_maxima  end,
    case when u.corto then p.corta_checkin_desde    else p.larga_checkin_desde    end,
    case when u.corto then p.corta_checkin_hasta    else p.larga_checkin_hasta    end
  from p
  cross join estancia e
  cross join lateral (
    select
      case
        when not coalesce(p.diferencia_estancia, false) then true
        when e.noches is null then false
        else public.es_estancia_corta(p_unidad_id, e.noches)
      end as corto
  ) u;
$function$;

CREATE OR REPLACE FUNCTION public.rnt_vigente(p_unidad_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.registro_turismo rt
    where rt.unidad_id = p_unidad_id
      and (rt.vence_en is null or rt.vence_en >= public.hoy_en_la_unidad(p_unidad_id))
  );
$function$;

CREATE OR REPLACE FUNCTION public.sincronizar_rnt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if nullif(btrim(coalesce(new.rnt, '')), '') is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.rnt is not distinct from old.rnt
     and new.rnt_vence_en is not distinct from old.rnt_vence_en then
    return new;
  end if;

  -- Un RNT por vivienda: si cambia el numero, se actualiza la fila, no se
  -- acumulan. El historial de registros de turismo no es lo que esto modela.
  if exists (select 1 from public.registro_turismo rt
             where rt.unidad_id = new.unidad_id) then
    update public.registro_turismo
       set numero    = btrim(new.rnt),
           vence_en  = new.rnt_vence_en,
           updated_at = now()
     where unidad_id = new.unidad_id;
  else
    insert into public.registro_turismo
      (unidad_id, numero, emitido_en, vence_en, cargado_por)
    values
      (new.unidad_id, btrim(new.rnt), public.hoy_en_la_unidad(new.unidad_id), new.rnt_vence_en, auth.uid());
  end if;

  return new;
end;
$function$;

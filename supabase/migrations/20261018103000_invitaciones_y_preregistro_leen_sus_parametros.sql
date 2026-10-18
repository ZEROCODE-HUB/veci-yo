-- Las invitaciones y el preregistro leen sus parámetros (18/10/2026).
--
-- Antes: 7 días escritos en crear_invitacion (y 14 en la columna, que no se
-- usaba), 14 en la del primer administrador, 30 días del enlace sin salida en
-- tres funciones, 5 intentos y 1 hora de bloqueo del código de reserva.
-- Ahora cada número sale de configuracion_plataforma. Mismos valores: no cambia
-- el comportamiento, solo dónde vive el dato.

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

  if p_vigente_hasta is not null and p_vigente_hasta < current_date then
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
$function$
;

CREATE OR REPLACE FUNCTION public.invitar_primer_administrador(p_condominio_id uuid, p_correo text, p_nombre text)
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
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma hace esto';
  end if;

  if not exists (select 1 from public.condominio where id = p_condominio_id) then
    raise exception 'Ese edificio no existe';
  end if;

  if exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.activo
      and mc.rol in ('administrador', 'coadministrador')
  ) then
    raise exception 'Ese edificio ya tiene administracion: pidesela a ella';
  end if;

  if v_correo = '' or v_correo not like '%_@_%._%' then
    raise exception 'Ese correo no sirve';
  end if;

  -- Una sola invitación de administrador viva por edificio. Sin esto, cada
  -- intento deja otro token válido en circulación.
  update public.invitacion
     set estado = 'revocada', updated_at = now()
   where condominio_id = p_condominio_id
     and ambito = 'condominio'
     and rol_condominio = 'administrador'
     and estado = 'pendiente';

  insert into public.invitacion (
    condominio_id, ambito, rol_condominio, correo, nombre,
    token_hash, invitada_por, expira_en
  ) values (
    p_condominio_id, 'condominio', 'administrador', v_correo, trim(p_nombre),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(), now() + make_interval(days => public.parametro_entero('invitacion_admin_dias_validez'))
  )
  returning id into v_id;

  perform public.anotar_en_bitacora(
    'primer_administrador_invitado', p_condominio_id,
    jsonb_build_object('correo', v_correo)
  );

  return query select v_id, v_token;
end;
$function$
;

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
      precheckin_expira_en = coalesce(v_hasta + 1, current_date + public.parametro_entero('preregistro_enlace_dias_sin_salida'))::timestamptz
  where id = p_visita_id;

  return v_token;
end;
$function$
;

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
      precheckin_expira_en = coalesce(v_visita.fecha_hasta + 1, current_date + public.parametro_entero('preregistro_enlace_dias_sin_salida'))::timestamptz,
      intentos_apertura = 0,
      apertura_bloqueada_hasta = null
  where id = v_visita.id;

  return query select 'listo'::text, v_token;
end;
$function$
;

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
    coalesce(v_visita.fecha_hasta + 1, current_date + public.parametro_entero('preregistro_enlace_dias_sin_salida'))::timestamptz,
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
$function$
;

alter table public.invitacion
  alter column expira_en set default (now() + make_interval(days => public.parametro_entero('invitacion_dias_validez')));

/*
  Este parámetro se sembró en la migración anterior y no se puede cambiar de
  verdad: los cuatro dígitos están en el modelo de datos (visita.telefono_ultimos4).
  Un parámetro que no cambia nada es peor que ninguno, así que se retira. Es la
  fila recién creada, no un dato del cliente.
*/
delete from public.configuracion_plataforma where clave = 'preregistro_codigo_digitos_telefono';
delete from public.configuracion_historial where clave = 'preregistro_codigo_digitos_telefono';

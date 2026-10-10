-- Invitar sin tener sus datos, y no cerrar con menos gente de la que viene
--
-- Dos cosas que el cliente encontro el 09/10/2026 recorriendo su propio
-- enlace, y que resultaron ser la misma historia contada por los dos extremos.
--
-- Reservo para cuatro personas --dos adultos y dos menores-- y en la base
-- quedo **una**: la suya. Los acompañantes a los que el anfitrion no les pone
-- nombre no se crean, porque los rellena el huesped desde su enlace. Y
-- entonces:
--
--   · no tenia **a quien mandarle nada**, porque para emitir el enlace de
--     alguien hay que crearlo antes, y para crearlo hacian falta su nombre y
--     su documento, que es justo lo que ese enlace sirve para conseguir;
--   · y el preregistro **cerro igual**, porque todas las comprobaciones miran
--     las fichas que existen y solo existia la suya.
--
-- Aditiva: reemplaza dos funciones, con la misma firma las dos.

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
    if p_fecha_nacimiento > coalesce(v_desde, current_date) then
      raise exception 'Esa fecha de nacimiento es posterior a la llegada';
    end if;
    v_es_menor := extract(year from age(
      coalesce(v_desde, current_date), p_fecha_nacimiento))::int < 18;
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
        'Esta reserva es para % personas y hay % registrada(s). Añadí a quien falte, o pedile al anfitrión que cambie el número.',
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
    coalesce(v_visita.fecha_hasta + 1, current_date + 30)::timestamptz,
    v_visita.fecha_desde, v_visita.fecha_hasta, v_titular.id
  );

  update public.visita
  set precheckin_completado_en = now()
  where id = v_visita.id;

  update public.invitado
  set precheckin_completado_en = now()
  where id = v_titular.id;

  begin
    perform public.anotar_verificacion(v_titular.id);
  exception when others then
    null;
  end;

  return v_token;
end;
$function$


;

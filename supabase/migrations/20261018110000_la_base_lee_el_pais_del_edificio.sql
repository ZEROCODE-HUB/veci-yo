-- La base lee el país del edificio (18/10/2026).
--
-- Aditiva en datos. La mayoría de edad (18, en tres funciones), la moneda
-- (COP, en tres sitios) y la zona horaria (Bogotá de respaldo, en tres sitios)
-- salen ahora de la tabla pais. Los canales con que nace un edificio, de la
-- lista canales_iniciales. Mismos valores para los edificios de hoy (Colombia).
--
-- Arreglos de paso: un costo de estancia sin moneda toma la del edificio y no
-- COP; un edificio nuevo toma la moneda y la zona de su país (antes nacía en
-- COP y hora de Bogotá aunque fuera de Perú).

-- ============================================================================
-- Respaldo de plataforma para un edificio sin país conocido
-- ============================================================================

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, descripcion)
values
  ('mayoria_de_edad_por_defecto', '18', '18', 'entero', 'años', 14, 25, 'plataforma', 'preregistro', 'alto', true,
   'Mayoría de edad cuando el país del edificio no está en la tabla pais. Lo normal es que mande la columna pais.mayoria_de_edad.'),
  ('moneda_por_defecto', 'COP', 'COP', 'texto', null, null, null, 'plataforma', 'edificio', 'medio', true,
   'Moneda cuando el país del edificio no sugiere ninguna (tabla pais). Código de la tabla moneda.')
on conflict (clave) do nothing;

create or replace function public.mayoria_de_edad(p_condominio_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(
    (select p.mayoria_de_edad from public.condominio c join public.pais p on p.codigo = c.pais
      where c.id = p_condominio_id),
    public.parametro_entero('mayoria_de_edad_por_defecto')
  );
$$;

comment on function public.mayoria_de_edad(uuid) is
  'Edad desde la que alguien es adulto en ese edificio: la de su país (tabla pais) o, si no se sabe, '
  'el parámetro mayoria_de_edad_por_defecto.';

grant execute on function public.mayoria_de_edad(uuid) to anon, authenticated, service_role;

create or replace function public.moneda_del_condominio(p_condominio_id uuid)
returns char(3)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(
    (select c.moneda from public.condominio c where c.id = p_condominio_id),
    public.parametro('moneda_por_defecto')
  )::char(3);
$$;

comment on function public.moneda_del_condominio(uuid) is
  'La moneda del edificio, o la de moneda_por_defecto si no tiene. Para costos que llegan sin moneda.';

grant execute on function public.moneda_del_condominio(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.menor_segun_su_fecha()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_edad int;
begin
  if new.fecha_nacimiento is null then
    -- Sin fecha no hay nada que calcular: se respeta lo que venga marcado. Es
    -- el caso de todo lo que ya existe y de quien no la quiere dar.
    return new;
  end if;

  v_edad := public.edad_al_llegar(new);

  if v_edad < 0 then
    raise exception 'Esa fecha de nacimiento es posterior a la llegada';
  end if;

  new.es_menor := v_edad < public.mayoria_de_edad((select v.condominio_id from public.visita v where v.id = new.visita_id));

  -- Un adulto no tiene responsable. Si deja de ser menor al corregir su fecha,
  -- lo que colgaba de eso se cae solo, porque si no la restriccion de arriba
  -- rechazaria la fila entera y el mensaje no explicaria nada.
  if not new.es_menor then
    new.responsable_id := null;
    new.parentesco := null;
  end if;

  return new;
end;
$function$
;

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
      coalesce(v_desde, current_date), p_fecha_nacimiento))::int
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
$function$
;

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
  if p_fecha_nacimiento > coalesce(v_desde, current_date) then
    raise exception 'Esa fecha de nacimiento es posterior a la llegada';
  end if;
  v_edad := extract(year from age(
    coalesce(v_desde, current_date), p_fecha_nacimiento))::int;
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
$function$
;

CREATE OR REPLACE FUNCTION public.guardar_precheckin(p_token text, p_nombre text, p_apellidos text DEFAULT NULL::text, p_tipo_documento tipo_documento DEFAULT NULL::tipo_documento, p_documento text DEFAULT NULL::text, p_correo text DEFAULT NULL::text, p_telefono text DEFAULT NULL::text, p_direccion text DEFAULT NULL::text, p_motivo motivo_estancia DEFAULT NULL::motivo_estancia, p_fecha_nacimiento date DEFAULT NULL::date, p_ciudad_residencia text DEFAULT NULL::text, p_ciudad_procedencia text DEFAULT NULL::text, p_nacionalidad text DEFAULT NULL::text, p_costo numeric DEFAULT NULL::numeric, p_moneda text DEFAULT NULL::text, p_codigo_pais text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_visita uuid;
  v_id     uuid;
begin
  select id into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if coalesce(btrim(p_nombre), '') = '' or coalesce(btrim(p_documento), '') = '' then
    raise exception 'Hace falta el nombre y el numero de documento';
  end if;

  if position('@' in coalesce(p_correo, '')) = 0 then
    raise exception 'El correo no parece valido';
  end if;

  if p_costo is not null and p_costo < 0 then
    raise exception 'El costo no puede ser negativo';
  end if;

  select id into v_id
  from public.invitado
  where visita_id = v_visita and es_titular;

  /*
    Si no hay titular marcado se adopta al primero que puso el anfitrion. Sin
    esta linea, el 02/10/2026 el preregistro fallaba con un 409 en toda reserva:
    se insertaba otro invitado con `orden = 0` contra un indice unico.
  */
  if v_id is null then
    select id into v_id
    from public.invitado
    where visita_id = v_visita
    order by orden
    limit 1;

    if v_id is not null then
      update public.invitado set es_titular = true where id = v_id;
    end if;
  end if;

  if v_id is null then
    insert into public.invitado (visita_id, orden, nombre, es_titular)
    values (
      v_visita,
      coalesce(
        (select max(orden) + 1 from public.invitado where visita_id = v_visita),
        0
      ),
      btrim(p_nombre),
      true
    )
    returning id into v_id;
  end if;

  update public.invitado set
    nombre             = btrim(p_nombre),
    apellidos          = nullif(btrim(coalesce(p_apellidos, '')), ''),
    tipo_documento     = p_tipo_documento,
    documento_numero   = btrim(p_documento),
    correo             = lower(btrim(p_correo)),
    telefono           = nullif(btrim(coalesce(p_telefono, '')), ''),
    /*
      El pais solo tiene sentido con un numero al lado: guardarlo suelto deja
      una fila que dice «este telefono es de Colombia» sin telefono.
    */
    codigo_pais        = case
                           when coalesce(btrim(p_telefono), '') = '' then null
                           else upper(nullif(btrim(coalesce(p_codigo_pais, '')), ''))
                         end,
    direccion          = nullif(btrim(coalesce(p_direccion, '')), ''),
    motivo             = coalesce(p_motivo, motivo),
    fecha_nacimiento   = coalesce(p_fecha_nacimiento, fecha_nacimiento),
    ciudad_residencia  = nullif(btrim(coalesce(p_ciudad_residencia, '')), ''),
    ciudad_procedencia = nullif(btrim(coalesce(p_ciudad_procedencia, '')), ''),
    nacionalidad       = upper(nullif(btrim(coalesce(p_nacionalidad, '')), ''))
  where id = v_id;

  if p_costo is not null then
    update public.visita
       set costo_estancia = p_costo,
           moneda_costo   = upper(coalesce(nullif(btrim(coalesce(p_moneda, '')), ''),
                              public.moneda_del_condominio(condominio_id)))
     where id = v_visita;
  end if;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.panel_crear_condominio(p_nombre text, p_direccion text, p_pais character, p_ciudad text DEFAULT NULL::text, p_moneda character DEFAULT NULL::bpchar, p_correo_admin text DEFAULT NULL::text, p_nombre_admin text DEFAULT NULL::text)
 RETURNS TABLE(condominio_id uuid, invitacion_id uuid, token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_condominio uuid;
  v_invitacion uuid;
  v_token      text;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma da de alta un edificio';
  end if;

  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'El edificio necesita un nombre';
  end if;
  if coalesce(trim(p_direccion), '') = '' then
    raise exception 'El edificio necesita una direccion';
  end if;
  if p_pais is null then
    raise exception 'El edificio necesita un pais';
  end if;

  insert into public.condominio (nombre, direccion, pais, ciudad, moneda)
  values (trim(p_nombre), trim(p_direccion), upper(p_pais),
          nullif(trim(p_ciudad), ''), upper(coalesce(p_moneda, (select pa.moneda from public.pais pa where pa.codigo = upper(p_pais)), public.parametro('moneda_por_defecto'))))
  returning id into v_condominio;

  -- Los canales, antes de que entre nadie: asi el primer administrador se los
  -- encuentra hechos y los edita, en vez de tener que adivinar que hacen falta.
  perform public.sembrar_canales_del_condominio(v_condominio, null);

  perform public.anotar_en_bitacora(
    'condominio_creado', v_condominio,
    jsonb_build_object('nombre', trim(p_nombre))
  );

  if coalesce(trim(p_correo_admin), '') <> '' then
    select i.invitacion_id, i.token
      into v_invitacion, v_token
      from public.invitar_primer_administrador(
        v_condominio, p_correo_admin, coalesce(nullif(trim(p_nombre_admin), ''), 'Administración')
      ) i;
  end if;

  return query select v_condominio, v_invitacion, v_token;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.zona_horaria_del_condominio(p_condominio_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce(
    nullif(btrim(c.zona_horaria), ''),
    (select nullif(btrim(p.zona_horaria), '') from public.pais p where p.codigo = c.pais),
    public.parametro('tareas_zona_horaria')
  )
  from public.condominio c
  where c.id = p_condominio_id;
$function$
;

CREATE OR REPLACE FUNCTION public.hoy_en_el_condominio(p_condominio_id uuid)
 RETURNS date
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select (now() at time zone coalesce(
    public.zona_horaria_del_condominio(p_condominio_id), public.parametro('tareas_zona_horaria')
  ))::date;
$function$
;

CREATE OR REPLACE FUNCTION public.sembrar_canales_del_condominio(p_condominio_id uuid, p_creada_por uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_creados integer := 0;
  v_canal   uuid;
  v_fila    record;
begin
  for v_fila in
    -- Los canales con que nace un edificio salen de la lista canales_iniciales.
    select o.etiqueta as nombre,
           array(select jsonb_array_elements_text(o.extra->'roles'))::public.rol_unidad[] as roles
    from public.catalogo_opcion o
    where o.catalogo = 'canales_iniciales' and o.activo and o.pais is null
    order by o.orden
  loop
    -- Por nombre, que es lo unico unico de un canal --`conversacion_canal_nombre_unico`--.
    select c.id into v_canal
    from public.conversacion c
    where c.condominio_id = p_condominio_id
      and c.tipo = 'grupo'
      and lower(btrim(c.nombre)) = lower(v_fila.nombre);

    if v_canal is null then
      insert into public.conversacion (condominio_id, tipo, nombre, creada_por)
      values (p_condominio_id, 'grupo', v_fila.nombre, p_creada_por)
      returning id into v_canal;
      v_creados := v_creados + 1;
    end if;

    -- Los roles por separado: un canal que existia sin roles se queda con los
    -- suyos, y volver a sembrar no se los quita.
    insert into public.canal_rol (conversacion_id, rol_unidad)
    select v_canal, unnest(v_fila.roles)
    on conflict do nothing;
  end loop;

  return v_creados;
end;
$function$
;

-- ============================================================================
-- Un edificio nuevo toma la moneda y la zona horaria de su país
-- ============================================================================

/*
  La columna zona_horaria traía 'America/Bogota' por defecto, así que un
  edificio nuevo en Perú quedaba con hora de Bogotá y la deducción por país no
  se usaba nunca. Lo mismo la moneda con 'COP'. Ahora, si llegan vacías, se
  llenan con las del país; si el país no sugiere, con los parámetros.
*/
create or replace function public.completar_condominio_segun_su_pais()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.moneda is null then
    new.moneda := coalesce((select p.moneda from public.pais p where p.codigo = new.pais),
                           public.parametro('moneda_por_defecto'));
  end if;
  if new.zona_horaria is null or btrim(new.zona_horaria) = '' then
    new.zona_horaria := coalesce((select nullif(btrim(p.zona_horaria), '') from public.pais p where p.codigo = new.pais),
                                 public.parametro('tareas_zona_horaria'));
  end if;
  return new;
end;
$$;

comment on function public.completar_condominio_segun_su_pais() is
  'Disparador: un edificio que llega sin moneda o sin zona horaria toma las de su país (tabla pais) o las de los parámetros.';

revoke execute on function public.completar_condominio_segun_su_pais() from public, anon, authenticated;

drop trigger if exists condominio_completar_segun_su_pais on public.condominio;
create trigger condominio_completar_segun_su_pais
  before insert on public.condominio
  for each row execute function public.completar_condominio_segun_su_pais();

alter table public.condominio alter column moneda drop default;
alter table public.condominio alter column zona_horaria drop default;

-- El tope de acompanantes mira tambien lo que dijo el anfitrion
--
-- Continuacion de `20261009160000`: alli se crea la columna y
-- `tope_de_personas`, aqui se usan. Mismo cuerpo que la version viva salvo el
-- bloque del tope, que se saco de `pg_get_functiondef` y no del disco: esta
-- funcion se ha reemplazado varias veces.
--
-- Aditiva: reemplaza una funcion por otra con la misma firma.

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

  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'Hace falta el nombre de la persona';
  end if;

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

  if not v_es_menor and coalesce(btrim(coalesce(p_documento, '')), '') = '' then
    raise exception 'Hace falta el numero de documento de cada acompanante adulto';
  end if;

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
      nombre           = btrim(p_nombre),
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
    v_visita, v_orden, btrim(p_nombre),
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

-- ----------------------------------------------------------------------------
-- El huesped dice quien responde por el niño
-- ----------------------------------------------------------------------------
-- `guardar_acompanante` no recibe la fecha de nacimiento --asi que `es_menor`
-- era la palabra de quien teclea-- ni tiene donde decir quien se hace cargo.
--
-- Se borra antes de crear: añadir parametros no reemplaza una funcion, crea una
-- **sobrecarga**, y entonces conviven las dos y PostgREST elige por los nombres
-- que le manden. Dos versiones de la misma regla es peor que ninguna.
--
-- Aditiva en datos: ninguna fila se toca.

drop function if exists public.guardar_acompanante(
  text, text, text, tipo_documento, text, text, text, boolean, uuid);

-- Y la nueva tambien, para que este archivo se pueda volver a aplicar. Sin
-- esto, la segunda pasada muere con «already exists with same argument types»
-- a mitad y deja lo de abajo sin crear.
drop function if exists public.guardar_acompanante(
  text, text, text, tipo_documento, text, text, text, boolean, uuid, text, date, uuid, parentesco);

create function public.guardar_acompanante(
  p_token            text,
  p_nombre           text,
  p_apellidos        text default null,
  p_tipo_documento   tipo_documento default null,
  p_documento        text default null,
  p_correo           text default null,
  p_telefono         text default null,
  p_es_menor         boolean default false,
  p_acompanante_id   uuid default null,
  p_codigo_pais      text default null,
  p_fecha_nacimiento date default null,
  p_responsable_id   uuid default null,
  p_parentesco       parentesco default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_visita   uuid;
  v_desde    date;
  v_tope     int;
  v_cuantos  int;
  v_orden    int;
  v_id       uuid;
  v_es_menor boolean;
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

  select s.max_huespedes into v_tope
  from public.suscripcion_renta_corta s
  join public.visita v on v.unidad_id = s.unidad_id
  where v.id = v_visita;

  if p_acompanante_id is null and v_tope is not null then
    select count(*) into v_cuantos
    from public.invitado where visita_id = v_visita;

    if v_cuantos >= v_tope then
      raise exception 'Este alojamiento admite % personas como maximo', v_tope;
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
$fn$;

comment on function public.guardar_acompanante is
  'Anade o corrige a quien se aloja con el titular. Si dice su fecha de nacimiento, `es_menor` lo calcula la base: la casilla era la puerta para entrar sin documento.';

grant execute on function public.guardar_acompanante(
  text, text, text, tipo_documento, text, text, text, boolean, uuid, text, date, uuid, parentesco)
  to anon, authenticated;

-- Y la lista que ve el titular, con lo que le falta a cada niño ---------------

drop function if exists public.acompanantes_del_precheckin(text);

create function public.acompanantes_del_precheckin(p_token text)
returns table (
  id                 uuid,
  nombre             text,
  apellidos          text,
  tipo_documento     text,
  documento_numero   text,
  correo             text,
  telefono           text,
  es_menor           boolean,
  terminos_aceptados boolean,
  tiene_enlace       boolean,
  fecha_nacimiento   date,
  responsable_id     uuid,
  parentesco         text,
  /*
    Si ya se subio su permiso. No la ruta del archivo: el bucket es privado y
    quien mira esta lista no tiene sesion, asi que una ruta ahi seria un dato
    inservible y filtrado a la vez.
  */
  tiene_autorizacion boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select
    i.id, i.nombre, i.apellidos, i.tipo_documento::text, i.documento_numero,
    i.correo, i.telefono, i.es_menor, i.terminos_aceptados,
    (i.precheckin_token_hash is not null),
    i.fecha_nacimiento, i.responsable_id, i.parentesco::text,
    exists (select 1 from public.autorizacion_menor a where a.invitado_id = i.id)
  from public.invitado i
  where i.visita_id = v_visita
    and not i.es_titular
  order by i.orden;
end;
$$;

comment on function public.acompanantes_del_precheckin is
  'Quien viene con el titular y que le falta a cada uno: aceptar, su enlace, y --si es menor-- quien responde por el y si trae su permiso.';

grant execute on function public.acompanantes_del_precheckin(text) to anon, authenticated;

-- Quienes pueden hacerse cargo de un menor en esta reserva --------------------

/*
  Hace falta una lista aparte y no vale la de arriba: el **titular** tambien
  puede ser el responsable --es el caso normal, una madre que viaja con su
  hijo-- y el titular no sale en `acompanantes_del_precheckin`, que
  deliberadamente devuelve `not es_titular`.
*/
create or replace function public.adultos_de_la_estancia(p_token text)
returns table (id uuid, nombre text, apellidos text, es_titular boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select i.id, i.nombre, i.apellidos, i.es_titular
  from public.invitado i
  where i.visita_id = v_visita and not i.es_menor
  order by i.orden;
end;
$$;

comment on function public.adultos_de_la_estancia is
  'Quien puede hacerse cargo de un menor de esta reserva. Incluye al titular, que es el caso normal y no sale en la lista de acompañantes.';

grant execute on function public.adultos_de_la_estancia(text) to anon, authenticated;

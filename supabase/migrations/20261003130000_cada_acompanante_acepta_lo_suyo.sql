-- ----------------------------------------------------------------------------
-- Cada acompañante llena lo suyo y acepta sus propios terminos
-- ----------------------------------------------------------------------------
-- Decidido con el cliente el 02/10/2026, y son **las dos vias**: el titular
-- puede teclear los datos de todos --como hasta ahora-- pero **cada adulto
-- acepta sus propios terminos**; y quien quiera, llena lo suyo.
--
-- Lo primero no es un capricho: aceptar unas condiciones en nombre de otro
-- adulto no vale. Hoy `aceptar_terminos_precheckin` hace
--
--     update invitado set terminos_aceptados = true
--      where visita_id = v_visita and es_titular;
--
-- o sea que **solo marca al titular**, y `cerrar_precheckin` solo comprueba al
-- titular. Un preregistro se cierra con cuatro acompañantes que no aceptaron
-- nada.
--
-- Lo segundo --que cada uno llene lo suyo-- estaba **a medio construir desde el
-- principio**: `invitado.auto_registro` e `invitado.precheckin_token_hash`
-- existen desde el 25/09 con comentarios que describen exactamente este flujo,
-- y no hay una sola funcion que los escriba. La ruta
-- `/access/acompanante/:id` existe en la web y lleva a una maqueta que ignora
-- el `id`, espera un segundo y navega con datos inventados.
--
-- Solo aditiva.

-- ----------------------------------------------------------------------------
-- Cuando se acepto, y que se acepto
-- ----------------------------------------------------------------------------
-- Un «acepto» con valor legal sin sello temporal no sirve de constancia. Y si
-- el edificio cambia sus condiciones, hoy no hay forma de saber que acepto
-- quien ya paso.

alter table public.invitado
  add column if not exists terminos_aceptados_en timestamptz,
  add column if not exists terminos_documento_id uuid
    references public.documento_legal(id) on delete set null;

comment on column public.invitado.terminos_aceptados_en is
  'Cuando acepto. Sin fecha, un «acepto» no es constancia de nada.';
comment on column public.invitado.terminos_documento_id is
  'Que version del reglamento acepto. Si el edificio lo cambia, lo aceptado sigue siendo identificable.';


-- ----------------------------------------------------------------------------
-- El enlace propio de un acompañante
-- ----------------------------------------------------------------------------

/**
 * Emite el enlace de un acompañante y lo devuelve **una sola vez**.
 *
 * Solo lo puede pedir quien tiene el token de la reserva: el titular. Devuelve
 * el token en claro porque en la base solo vive su sha256 —igual que el del
 * titular— asi que no se puede recuperar despues.
 *
 * La ruta es `/access/acompanante/:token` y **no** `/:id`, que es lo que habia
 * escrito en la web. Un uuid de invitado no es una credencial: quien lo
 * adivinara o lo viera en una respuesta podria editar la ficha de otra persona.
 */
create or replace function public.abrir_precheckin_acompanante(
  p_token          text,
  p_acompanante_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select id into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  /*
    Que el acompañante sea **de esta reserva**. Sin esto, quien tenga un enlace
    valido podria emitir credenciales sobre invitados de otra estancia pasando
    cualquier uuid.
  */
  if not exists (
    select 1 from public.invitado
    where id = p_acompanante_id and visita_id = v_visita and not es_titular
  ) then
    raise exception 'Esa persona no esta en esta reserva';
  end if;

  update public.invitado
     set precheckin_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
         auto_registro = true
   where id = p_acompanante_id;

  return v_token;
end;
$$;

grant execute on function public.abrir_precheckin_acompanante(text, uuid) to anon, authenticated;


/** Lo que un acompañante ve al abrir su enlace: quien es y a donde va. */
create or replace function public.consultar_precheckin_acompanante(p_token text)
returns table (
  invitado_id        uuid,
  nombre             text,
  apellidos          text,
  tipo_documento     text,
  documento          text,
  correo             text,
  telefono           text,
  codigo_pais        text,
  fecha_nacimiento   date,
  nacionalidad       text,
  ciudad_residencia  text,
  ciudad_procedencia text,
  es_menor           boolean,
  terminos_aceptados boolean,
  condominio         text,
  unidad             text,
  titular            text,
  fecha_desde        date,
  fecha_hasta        date,
  cerrado            boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    i.id, i.nombre, i.apellidos, i.tipo_documento::text, i.documento_numero,
    i.correo, i.telefono, i.codigo_pais, i.fecha_nacimiento,
    i.nacionalidad::text, i.ciudad_residencia, i.ciudad_procedencia,
    i.es_menor, i.terminos_aceptados,
    c.nombre, u.codigo,
    coalesce(t.nombre, ''),
    v.fecha_desde, v.fecha_hasta,
    (v.precheckin_completado_en is not null)
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  join public.unidad u on u.id = v.unidad_id
  join public.condominio c on c.id = v.condominio_id
  left join public.invitado t on t.visita_id = v.id and t.es_titular
  where i.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();
end;
$$;

grant execute on function public.consultar_precheckin_acompanante(text) to anon, authenticated;


/** Un acompañante escribe **sus** datos, con su propio enlace. */
create or replace function public.guardar_mi_ficha_acompanante(
  p_token              text,
  p_nombre             text,
  p_apellidos          text default null,
  p_tipo_documento     public.tipo_documento default null,
  p_documento          text default null,
  p_correo             text default null,
  p_telefono           text default null,
  p_codigo_pais        text default null,
  p_fecha_nacimiento   date default null,
  p_nacionalidad       text default null,
  p_ciudad_residencia  text default null,
  p_ciudad_procedencia text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      uuid;
  v_menor   boolean;
  v_cerrado boolean;
begin
  select i.id, i.es_menor, (v.precheckin_completado_en is not null)
    into v_id, v_menor, v_cerrado
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_id is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if v_cerrado then
    raise exception 'Este preregistro ya se cerro: pideselo a quien reservo';
  end if;

  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'Hace falta tu nombre';
  end if;

  -- A un menor no se le pide documento propio; a un adulto si.
  if not v_menor and coalesce(btrim(p_documento), '') = '' then
    raise exception 'Hace falta tu numero de documento';
  end if;

  update public.invitado set
    nombre             = btrim(p_nombre),
    apellidos          = nullif(btrim(coalesce(p_apellidos, '')), ''),
    tipo_documento     = coalesce(p_tipo_documento, tipo_documento),
    documento_numero   = nullif(btrim(coalesce(p_documento, '')), ''),
    correo             = lower(nullif(btrim(coalesce(p_correo, '')), '')),
    telefono           = nullif(btrim(coalesce(p_telefono, '')), ''),
    codigo_pais        = case
                           when coalesce(btrim(p_telefono), '') = '' then null
                           else upper(nullif(btrim(coalesce(p_codigo_pais, '')), ''))
                         end,
    fecha_nacimiento   = coalesce(p_fecha_nacimiento, fecha_nacimiento),
    nacionalidad       = upper(nullif(btrim(coalesce(p_nacionalidad, '')), '')),
    ciudad_residencia  = nullif(btrim(coalesce(p_ciudad_residencia, '')), ''),
    ciudad_procedencia = nullif(btrim(coalesce(p_ciudad_procedencia, '')), '')
  where id = v_id;

  return v_id;
end;
$$;

grant execute on function public.guardar_mi_ficha_acompanante(
  text, text, text, tipo_documento, text, text, text, text, date, text, text, text
) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- Los terminos, uno por persona
-- ----------------------------------------------------------------------------

/**
 * Un acompañante acepta **sus** terminos, con su propio enlace.
 *
 * Que lo haga el mismo y no el titular es el punto: aceptar unas condiciones en
 * nombre de otro adulto no vale. El titular puede teclearle los datos; esto no.
 */
create or replace function public.aceptar_terminos_acompanante(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id          uuid;
  v_condominio  uuid;
  v_documento   uuid;
begin
  select i.id, v.condominio_id into v_id, v_condominio
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_id is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  -- Que version del reglamento se acepto, para que siga siendo identificable
  -- el dia que el edificio lo cambie.
  select id into v_documento
  from public.documento_legal
  where condominio_id = v_condominio and vigente
  order by created_at desc limit 1;

  update public.invitado
     set terminos_aceptados = true,
         terminos_aceptados_en = now(),
         terminos_documento_id = coalesce(v_documento, terminos_documento_id)
   where id = v_id;
end;
$$;

grant execute on function public.aceptar_terminos_acompanante(text) to anon, authenticated;


/*
  Y el titular tambien deja fecha y version. Antes solo ponia el booleano.
*/
create or replace function public.aceptar_terminos_precheckin(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita     uuid;
  v_condominio uuid;
  v_documento  uuid;
begin
  select id, condominio_id into v_visita, v_condominio
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  select id into v_documento
  from public.documento_legal
  where condominio_id = v_condominio and vigente
  order by created_at desc limit 1;

  /*
    `terminos_aprobado_por` se queda en null a proposito: los acepto el propio
    huesped. Se rellena solo cuando el anfitrion los aprueba por excepcion, y es
    lo que distingue «acepto» de «se los aprobaron».
  */
  update public.invitado
     set terminos_aceptados = true,
         terminos_aceptados_en = now(),
         terminos_documento_id = coalesce(v_documento, terminos_documento_id)
   where visita_id = v_visita and es_titular;
end;
$$;

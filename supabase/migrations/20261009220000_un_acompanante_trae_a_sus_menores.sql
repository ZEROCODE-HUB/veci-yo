-- Un acompañante puede traer a sus menores
--
-- Hasta hoy el enlace de un acompañante solo le dejaba llenar **lo suyo**. Un
-- menor no tiene enlace propio --no puede aceptar términos, así que no se le
-- emite-- de modo que alguien tiene que llenarlo por él, y ese alguien solo
-- podía ser el titular.
--
-- El cliente lo planteó el 09/10/2026 con un ejemplo: «yo no soy el tutor del
-- menor, estoy rellenando el formulario, y mi amigo sí lo es, y quiero que él
-- llene el suyo y el de su hijo». Tenía razón en lo que molesta: el titular
-- acababa tecleando el documento de un hijo ajeno que no tiene y no debería
-- pedir por chat, y declarando él un parentesco que no le consta.
--
-- Y una decisión suya, explícita: **el responsable lo elige quien añade al
-- menor**, no se fuerza a que sea él. Puede venir con el hijo de otro.
--
-- Aditiva: un ayudante y cuatro funciones nuevas. No toca ninguna existente.

-- ============================================================================
-- 1. De quién es este enlace
-- ============================================================================
-- Hay dos clases de token --el de la estancia, en `visita`, y el de cada
-- acompañante, en `invitado`-- y las funciones de abajo necesitan las dos
-- cosas: de qué estancia se trata y quién la está mirando.
--
-- **No se amplían las funciones del titular para que acepten los dos.** Eso
-- convertiría el enlace de un acompañante en un enlace de titular: podría
-- listar a todo el mundo y quitar a quien quisiera. Las de aquí son suyas y
-- hacen menos.

create or replace function public.quien_trae_este_enlace(p_token text)
returns table (visita_id uuid, invitado_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select i.visita_id, i.id
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.precheckin_token_hash
        = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now()
  limit 1;
$$;

comment on function public.quien_trae_este_enlace(text) is
  'La estancia y la persona detras del enlace **de un acompañante**. El del '
  'titular vive en `visita`, no aqui: son dos credenciales distintas y a '
  'proposito dan permisos distintos.';

revoke all on function public.quien_trae_este_enlace(text) from public, anon;
grant execute on function public.quien_trae_este_enlace(text) to service_role;

-- ============================================================================
-- 2. A quién puede poner de responsable
-- ============================================================================

create or replace function public.adultos_para_acompanante(p_token text)
returns table (id uuid, nombre text, apellidos text, es_titular boolean, soy_yo boolean)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
  v_yo     uuid;
begin
  select q.visita_id, q.invitado_id into v_visita, v_yo
  from public.quien_trae_este_enlace(p_token) q;

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select i.id, i.nombre, i.apellidos, i.es_titular, (i.id = v_yo)
  from public.invitado i
  where i.visita_id = v_visita and not i.es_menor
  order by i.orden;
end;
$$;

comment on function public.adultos_para_acompanante(text) is
  'Los adultos de la estancia, para que un acompañante elija quien responde '
  'por el menor que trae. Dice cual es el --`soy_yo`-- porque el caso normal '
  'es que sea el mismo y conviene que salga marcado.';

grant execute on function public.adultos_para_acompanante(text) to anon, authenticated;

-- ============================================================================
-- 3. Los menores que ya están a su cargo
-- ============================================================================
-- Solo los suyos, y eso es deliberado: si pone de responsable a otro adulto,
-- ese menor pasa a la lista de ese adulto y a la del titular, que ve a todos.
-- Quien responde por un niño es quien tiene que verlo.

create or replace function public.menores_a_mi_cargo(p_token text)
returns table (
  id uuid,
  nombre text,
  apellidos text,
  tipo_documento text,
  documento_numero text,
  fecha_nacimiento date,
  parentesco text,
  tiene_documento boolean,
  tiene_autorizacion boolean
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
  v_yo     uuid;
begin
  select q.visita_id, q.invitado_id into v_visita, v_yo
  from public.quien_trae_este_enlace(p_token) q;

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select
    i.id, i.nombre, i.apellidos, i.tipo_documento::text, i.documento_numero,
    i.fecha_nacimiento, i.parentesco::text,
    -- Solo si existe, nunca la ruta: el bucket es privado y quien mira esto
    -- no tiene sesion.
    (vd.documento_original_path is not null),
    exists (select 1 from public.autorizacion_menor a where a.invitado_id = i.id)
  from public.invitado i
  left join public.verificacion_documento vd on vd.invitado_id = i.id
  where i.visita_id = v_visita
    and i.es_menor
    and i.responsable_id = v_yo
  order by i.orden;
end;
$$;

comment on function public.menores_a_mi_cargo(text) is
  'Los menores de los que responde quien trae este enlace de acompañante.';

grant execute on function public.menores_a_mi_cargo(text) to anon, authenticated;

-- ============================================================================
-- 4. Añadir un menor
-- ============================================================================

create or replace function public.guardar_menor_acompanante(
  p_token            text,
  p_nombre           text,
  p_fecha_nacimiento date,
  p_responsable_id   uuid,
  p_parentesco       parentesco,
  p_apellidos        text default null,
  p_tipo_documento   tipo_documento default null,
  p_documento        text default null,
  p_menor_id         uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
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
  if v_edad >= 18 then
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
$$;

comment on function public.guardar_menor_acompanante(
  text, text, date, uuid, parentesco, text, tipo_documento, text, uuid) is
  'Un acompañante añade o corrige un menor desde **su** enlace. Elige quien '
  'responde por el, que tiene que ser un adulto de la estancia. Corregir, '
  'solo los que estan a su cargo.';

grant execute on function public.guardar_menor_acompanante(
  text, text, date, uuid, parentesco, text, tipo_documento, text, uuid)
  to anon, authenticated;

-- ============================================================================
-- 5. Quitarlo
-- ============================================================================
-- Quien lo añadió se puede equivocar, y sin esto tendría que escribirle al
-- titular para que lo borre. Solo los que están a su cargo.

create or replace function public.quitar_menor_acompanante(
  p_token    text,
  p_menor_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
  v_yo     uuid;
begin
  select q.visita_id, q.invitado_id into v_visita, v_yo
  from public.quien_trae_este_enlace(p_token) q;

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if exists (select 1 from public.visita v
             where v.id = v_visita and v.precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  delete from public.invitado i
  where i.id = p_menor_id
    and i.visita_id = v_visita
    and i.es_menor
    and i.responsable_id = v_yo;

  if not found then
    raise exception 'Ese menor no esta a tu cargo en esta reserva';
  end if;
end;
$$;

comment on function public.quitar_menor_acompanante(text, uuid) is
  'Quita un menor que este acompañante añadio y tiene a su cargo.';

grant execute on function public.quitar_menor_acompanante(text, uuid)
  to anon, authenticated;

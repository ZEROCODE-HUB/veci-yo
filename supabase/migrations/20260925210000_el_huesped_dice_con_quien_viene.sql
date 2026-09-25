-- El huesped dice con quien viene.
--
-- Cierra R-25: los acompanantes de una reserva no entraban al edificio por
-- ningun sitio. El cliente lo encontro reservando la piscina como Tomas:
-- podia apuntar a personas que nunca habian pasado por porteria, porque la
-- unica lista que habia era la de las membresias de la vivienda --gente con
-- cuenta y sin documento-- y no la de quien se aloja con el.
--
-- Ahora los pone el propio titular en su precheckin, con su documento, y son
-- `invitado` de la misma estancia: pasan por lo mismo que el, y la porteria
-- los ve venir.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

-- 1. Anadir a alguien a la estancia -------------------------------------------

create or replace function public.guardar_acompanante(
  p_token            text,
  p_nombre           text,
  p_apellidos        text default null,
  p_tipo_documento   tipo_documento default null,
  p_documento        text default null,
  p_correo           text default null,
  p_telefono         text default null,
  p_es_menor         boolean default false,
  p_acompanante_id   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_visita uuid;
  v_tope   int;
  v_cuantos int;
  v_orden  int;
  v_id     uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  -- Cerrado el preregistro, la lista de quien viene deja de ser editable
  -- desde el enlace: a partir de ahi la cambia el anfitrion, que es quien
  -- responde por ella.
  if exists (select 1 from public.visita v
             where v.id = v_visita and v.precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'Hace falta el nombre de la persona';
  end if;

  -- Un menor no lleva documento propio ni acepta terminos; el resto si. Sin
  -- esto se colaban acompanantes sin documento, que es justo lo que la
  -- autoridad pide y lo que distinguia esta via de la otra.
  if not p_es_menor and coalesce(btrim(coalesce(p_documento, '')), '') = '' then
    raise exception 'Hace falta el numero de documento de cada acompanante adulto';
  end if;

  -- El tope sale de la ficha del alojamiento: es lo que el anfitrion declaro
  -- que cabe. Contar incluye al titular, porque el tambien duerme ahi.
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
    -- Corregir a alguien que ya se puso, sin crear un duplicado. Y solo de
    -- esta estancia: el id llega de fuera y no se puede confiar en el.
    update public.invitado set
      nombre           = btrim(p_nombre),
      apellidos        = nullif(btrim(coalesce(p_apellidos, '')), ''),
      tipo_documento   = p_tipo_documento,
      documento_numero = nullif(btrim(coalesce(p_documento, '')), ''),
      correo           = lower(nullif(btrim(coalesce(p_correo, '')), '')),
      telefono         = nullif(btrim(coalesce(p_telefono, '')), ''),
      es_menor         = p_es_menor
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
    correo, telefono, es_menor, es_titular
  ) values (
    v_visita, v_orden, btrim(p_nombre),
    nullif(btrim(coalesce(p_apellidos, '')), ''),
    p_tipo_documento,
    nullif(btrim(coalesce(p_documento, '')), ''),
    lower(nullif(btrim(coalesce(p_correo, '')), '')),
    nullif(btrim(coalesce(p_telefono, '')), ''),
    p_es_menor, false
  )
  returning id into v_id;

  /*
    Un menor NO se marca aqui como excepcion de terminos, aunque no pueda
    aceptarlos por si mismo.

    El primer intento lo hacia, y la base lo rechazo:
    `invitado_excepcion_con_aprobador` exige que toda excepcion diga quien la
    asume. Tiene razon. Una excepcion sin nombre no sirve de nada --es
    exactamente lo que se arreglo cuando el distintivo de "aprobado por
    anfitrion" no aparecia nunca-- y quien asume la responsabilidad legal de
    un menor tiene que hacerlo con un clic suyo, no heredarla de un valor por
    defecto que alguien puso en una funcion.

    Queda `es_menor` puesto, el paso sale pendiente, y el anfitrion lo aprueba
    desde su pantalla, donde ese boton ya existe.
  */

  return v_id;
end;
$fn$;

comment on function public.guardar_acompanante is
  'Anade o corrige a quien se aloja con el titular, desde el enlace y sin sesion. Son `invitado` de la misma estancia: pasan por lo mismo que el titular.';

-- 2. Quitar a alguien ---------------------------------------------------------

create or replace function public.quitar_acompanante(
  p_token text,
  p_acompanante_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_visita uuid;
  v_borradas int;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now()
    and v.precheckin_completado_en is null;

  if v_visita is null then
    raise exception 'Ese enlace no vale, ya vencio o el preregistro esta cerrado';
  end if;

  -- `not es_titular` importa: sin eso, quien se equivoca de boton se borra a
  -- si mismo y la estancia se queda sin la persona que reservo.
  delete from public.invitado
  where id = p_acompanante_id and visita_id = v_visita and not es_titular;

  get diagnostics v_borradas = row_count;
  if v_borradas = 0 then
    raise exception 'Ese acompanante no es de esta reserva';
  end if;
end;
$fn$;

-- 3. Leer la lista desde el enlace --------------------------------------------

create or replace function public.acompanantes_del_precheckin(p_token text)
returns table (
  id uuid,
  nombre text,
  apellidos text,
  tipo_documento tipo_documento,
  documento_numero text,
  correo text,
  telefono text,
  es_menor boolean
)
language sql
stable security definer
set search_path = public, pg_temp
as $fn$
  select i.id, i.nombre, i.apellidos, i.tipo_documento, i.documento_numero,
         i.correo, i.telefono, i.es_menor
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now()
    and not i.es_titular
  order by i.orden;
$fn$;

grant execute on function public.guardar_acompanante(
  text, text, text, tipo_documento, text, text, text, boolean, uuid)
  to anon, authenticated;
grant execute on function public.quitar_acompanante(text, uuid) to anon, authenticated;
grant execute on function public.acompanantes_del_precheckin(text) to anon, authenticated;

-- 4. Y el huesped puede ver con quien se aloja --------------------------------

-- Para la lista de acompanantes al reservar una zona comun (R-25). No se puede
-- construir desde el cliente: `membresia_unidad_lectura` deja a un huesped ver
-- solo la suya, y ademas la respuesta no es esa --quien duerme en la 102 no es
-- asunto de quien pasa cinco noches--. Lo que devuelve son **los de su misma
-- estancia**, que es otra cosa y es la correcta.
create or replace function public.mis_acompanantes()
returns table (id uuid, nombre text, apellidos text, es_menor boolean)
language sql
stable security definer
set search_path = public, pg_temp
as $fn$
  select otros.id, otros.nombre, otros.apellidos, otros.es_menor
  from public.invitado yo
  join public.invitado otros
    on otros.visita_id = yo.visita_id and otros.id <> yo.id
  where yo.usuario_id = auth.uid()
  order by otros.orden;
$fn$;

comment on function public.mis_acompanantes() is
  'Quien se aloja conmigo en MI estancia. No la gente de la vivienda: eso seria contarle a un huesped de cinco noches quien vive ahi.';

grant execute on function public.mis_acompanantes() to authenticated;

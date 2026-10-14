/*
  La fecha de expedicion del documento (14/10/2026).

  Tus Datos no consulta una cedula de extranjeria ni un PPT sin ella: lo dice
  su documentacion y lo comprobo la sesion que la integro. El preregistro no la
  pedia, asi que esos huespedes no se podian consultar nunca.

  Va en una funcion aparte y no como un parametro mas de `guardar_precheckin`,
  `guardar_acompanante` y `guardar_mi_ficha_acompanante`: anadir un argumento a
  esas tres obliga a borrarlas y recrearlas, y son las tres funciones mas
  delicadas del preregistro. Esta sirve a las tres pantallas con la misma regla.

  Solo aditiva: una columna y dos funciones.
*/

alter table public.invitado
  add column if not exists documento_fecha_expedicion date;

comment on column public.invitado.documento_fecha_expedicion is
  'Cuando se expidio el documento. Obligatoria para cedula de extranjeria y PPT: sin ella Tus Datos no los consulta.';

/*
  Quien la escribe:
  - con el enlace del titular, la de cualquier persona de su reserva (o la
    suya, si no dice de quien);
  - con el enlace de un acompanante, solo la suya.
*/
create or replace function public.guardar_fecha_expedicion(
  p_token       text,
  p_fecha       date,
  p_invitado_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
    if p_fecha > current_date then
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
$$;

comment on function public.guardar_fecha_expedicion(text, date, uuid) is
  'Guarda la fecha de expedicion del documento desde el preregistro. El titular puede poner la de cualquiera de su reserva; un acompanante solo la suya.';

/* Lo que el mismo enlace puede leer, con la misma regla. */
create or replace function public.fechas_expedicion_del_precheckin(p_token text)
returns table (invitado_id uuid, fecha date)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash   text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_visita uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = v_hash
    and v.precheckin_expira_en > now();

  if v_visita is not null then
    return query
      select i.id, i.documento_fecha_expedicion
      from public.invitado i
      where i.visita_id = v_visita;
    return;
  end if;

  return query
    select i.id, i.documento_fecha_expedicion
    from public.invitado i
    join public.visita v on v.id = i.visita_id
    where i.precheckin_token_hash = v_hash
      and v.precheckin_expira_en > now();
end;
$$;

revoke all on function public.guardar_fecha_expedicion(text, date, uuid) from public;
revoke all on function public.fechas_expedicion_del_precheckin(text) from public;
grant execute on function public.guardar_fecha_expedicion(text, date, uuid) to anon, authenticated;
grant execute on function public.fechas_expedicion_del_precheckin(text) to anon, authenticated;

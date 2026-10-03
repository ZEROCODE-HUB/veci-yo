-- ----------------------------------------------------------------------------
-- Lo que el reporte de extranjeros necesita saber
-- ----------------------------------------------------------------------------
-- SIRE no tiene API: se reporta subiendo un archivo plano al portal de
-- Migracion Colombia. El **formato** del archivo esta en un instructivo que
-- solo se descarga con cuenta en el portal, y no lo tenemos.
--
-- Lo que si esta en el ABC publico, y es lo que decide esta funcion:
--
--   · se reporta a los **extranjeros**, y solo a ellos;
--   · en **dos momentos**: cuando entran y cuando salen;
--   · con documento, nombres, apellidos, fecha de nacimiento, nacionalidad y
--     la direccion en Colombia.
--
-- O sea que a quien hay que reportar y con que datos ya se puede saber. Lo
-- unico provisional es como se ordenan las columnas del archivo.
--
-- Solo aditiva.

create or replace function public.datos_para_el_sire(p_visita_id uuid)
returns table (
  invitado_id           uuid,
  nombres               text,
  apellidos             text,
  tipo_documento        text,
  documento             text,
  fecha_nacimiento      date,
  nacionalidad          text,
  direccion_en_colombia text,
  pais_del_alojamiento  text,
  check_in              date,
  check_out             date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad uuid;
begin
  select v.unidad_id into v_unidad from public.visita v where v.id = p_visita_id;

  if v_unidad is null then
    raise exception 'Esa estancia no existe';
  end if;

  /*
    Lo mismo que con la TRA: reportar es un acto del **anfitrion**, no de la
    administracion del edificio. Quien manda el reporte esta declarando ante
    Migracion en nombre de su alojamiento.
  */
  if not public.puede_operar_unidad(v_unidad) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  return query
  select
    i.id,
    i.nombre,
    i.apellidos,
    i.tipo_documento::text,
    i.documento_numero,
    i.fecha_nacimiento,
    i.nacionalidad::text,
    -- La direccion en Colombia es la del edificio: es donde se aloja.
    c.direccion,
    c.pais::text,
    v.fecha_desde,
    v.fecha_hasta
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  join public.condominio c on c.id = v.condominio_id
  where i.visita_id = p_visita_id
  order by i.es_titular desc, i.orden;
end;
$$;

grant execute on function public.datos_para_el_sire(uuid) to authenticated;

comment on function public.datos_para_el_sire is
  'Lo que el reporte de extranjeros necesita de una estancia. Quien hay que reportar lo decide la funcion que arma el archivo, con la nacionalidad y el pais del edificio.';

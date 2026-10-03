-- ----------------------------------------------------------------------------
-- Lo que la funcion que reporta necesita saber
-- ----------------------------------------------------------------------------
-- La TRA junta datos de cinco tablas: la persona, la estancia, la vivienda, el
-- edificio y la suscripcion con su RNT. Armarlo desde la funcion serian cinco
-- viajes y cinco sitios donde equivocarse de permiso.
--
-- Sale de aqui, en una fila por huesped, y con el permiso comprobado en la
-- primera linea.

create or replace function public.datos_para_la_tra(p_visita_id uuid)
returns table (
  invitado_id            uuid,
  es_titular             boolean,
  nombres                text,
  apellidos              text,
  tipo_documento         text,
  documento              text,
  ciudad_residencia      text,
  ciudad_procedencia     text,
  numero_habitacion      text,
  check_in               date,
  check_out              date,
  motivo                 text,
  tipo_acomodacion       text,
  costo                  numeric,
  nombre_establecimiento text,
  rnt                    text,
  tiene_token            boolean
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
    Reportar a la TRA es un acto del **anfitrion**: es su RNT el que queda
    declarado y es el quien responde ante el ministerio. Por eso se pregunta por
    la vivienda y no por el condominio: la administracion del edificio no
    reporta las estancias de nadie.
  */
  if not public.puede_operar_unidad(v_unidad) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  return query
  select
    i.id,
    i.es_titular,
    i.nombre,
    i.apellidos,
    i.tipo_documento::text,
    i.documento_numero,
    i.ciudad_residencia,
    i.ciudad_procedencia,
    u.codigo,
    v.fecha_desde,
    v.fecha_hasta,
    i.motivo::text,
    /*
      El ministerio pide el tipo de alojamiento en texto libre. Sale de la
      tipologia de la vivienda cuando la hay; si no, «Apartamento», que es lo
      que es un piso de un edificio.
    */
    coalesce(t.nombre, 'Apartamento'),
    v.costo_estancia,
    c.nombre,
    s.rnt,
    s.tra_token_secret is not null
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  join public.unidad u on u.id = v.unidad_id
  join public.condominio c on c.id = v.condominio_id
  left join public.tipologia t on t.id = u.tipologia_id
  left join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  where i.visita_id = p_visita_id
  -- El titular primero: su reporte devuelve el codigo que agrupa a los demas.
  order by i.es_titular desc, i.orden;
end;
$$;

grant execute on function public.datos_para_la_tra(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- El token, en claro, solo para quien reporta
-- ----------------------------------------------------------------------------
-- Lo llama la funcion que reporta **con la clave de servicio**, despues de haber
-- comprobado el permiso con la sesion de la persona. No se expone a nadie mas:
-- `authenticated` no tiene permiso de ejecucion sobre esta.

create or replace function public.token_tra_de_visita(p_visita_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp, vault
as $$
  select ds.decrypted_secret
  from public.visita v
  join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  join vault.decrypted_secrets ds on ds.id = s.tra_token_secret
  where v.id = p_visita_id;
$$;

revoke all on function public.token_tra_de_visita(uuid) from public, anon, authenticated;

comment on function public.token_tra_de_visita is
  'El token del ministerio en claro. Solo la llama la funcion que reporta, con la clave de servicio y despues de comprobar el permiso aparte.';

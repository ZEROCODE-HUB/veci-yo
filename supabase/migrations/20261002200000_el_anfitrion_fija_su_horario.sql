-- ----------------------------------------------------------------------------
-- El anfitrion fija el horario de entrada y salida de su vivienda
-- ----------------------------------------------------------------------------
-- Pedido por el cliente el 02/10/2026: «el anfitrion configura horas maximas de
-- ingreso, salida, etc... **solo para su depto**».
--
-- Y estaba a medio construir desde el principio, que es lo interesante:
--
--   · `suscripcion_renta_corta.checkin_desde`, `checkin_hasta` y `checkin_24h`
--     existen desde la primera migracion de renta corta;
--   · el **huesped ya las ve** --`AlojamientoInfoChips` pinta la franja--;
--   · el **edificio ya las limita** --`permisos_de_unidad` devuelve
--     `corta_checkin_desde` y `corta_checkin_hasta` como techo--;
--   · y **no habia ninguna pantalla donde el anfitrion las pusiera**, porque
--     `guardar_alojamiento` no recibia los parametros.
--
-- O sea: tres capas leyendo un dato que nadie podia escribir. Es la misma forma
-- que `ocultar_contacto`, que ya aparecio una vez.
--
-- Esto solo cambia la firma de `guardar_alojamiento`. No se toca ninguna tabla.
--
-- Se borra la version anterior antes de crear la nueva: añadir parametros
-- opcionales crearia una segunda version con la misma firma corta y PostgREST
-- no sabria cual llamar.

do $limpia$
declare
  f record;
begin
  for f in
    select oid::regprocedure as firma
      from pg_proc
     where proname = 'guardar_alojamiento'
       and pronamespace = 'public'::regnamespace
  loop
    execute format('drop function %s', f.firma);
  end loop;
end
$limpia$;

create function public.guardar_alojamiento(
  p_unidad_id              uuid,
  p_descripcion            text    default null,
  p_num_habitaciones       integer default null,
  p_max_huespedes          integer default null,
  p_estacionamientos       integer default null,
  p_estancia_minima        integer default null,
  p_estancia_maxima        integer default null,
  p_permite_mascotas       boolean default null,
  p_apto_ninos             boolean default null,
  p_visitas_de_huespedes   text    default null,
  p_rnt                    text    default null,
  p_publicado_airbnb       boolean default null,
  p_publicado_booking      boolean default null,
  p_otras_plataformas      text    default null,
  p_pms                    text    default null,
  p_ical_url               text    default null,
  p_tiene_antirruido       boolean default null,
  p_tiene_no_fumar         boolean default null,
  p_tiene_sensor           boolean default null,
  p_ocultar_numero         boolean default null,
  p_ocultar_contacto       boolean default null,
  p_checkin_desde          text    default null,
  p_checkin_hasta          text    default null,
  p_checkin_24h            boolean default null,
  p_wifi_nombre            text    default null,
  p_wifi_password          text    default null,
  p_puerta_password        text    default null,
  p_instrucciones          text    default null,
  p_notas                  text    default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp, vault
as $guardar$
declare
  v_libro       public.libro_huesped;
  v_wifi_id     uuid;
  v_puerta_id   uuid;
begin
  if not public.puede_operar_unidad(p_unidad_id) then
    raise exception 'No podes configurar el alojamiento de esta vivienda';
  end if;

  update public.suscripcion_renta_corta set
    descripcion              = coalesce(p_descripcion, descripcion),
    num_habitaciones         = coalesce(p_num_habitaciones, num_habitaciones),
    max_huespedes            = coalesce(p_max_huespedes, max_huespedes),
    estacionamientos_huesped = coalesce(p_estacionamientos, estacionamientos_huesped),
    estancia_minima_noches   = coalesce(p_estancia_minima, estancia_minima_noches),
    estancia_maxima_noches   = coalesce(p_estancia_maxima, estancia_maxima_noches),
    permite_mascotas         = coalesce(p_permite_mascotas, permite_mascotas),
    apto_ninos               = coalesce(p_apto_ninos, apto_ninos),
    visitas_de_huespedes     = coalesce(
                                 p_visitas_de_huespedes::public.visitas_de_huesped,
                                 visitas_de_huespedes),
    rnt                      = coalesce(p_rnt, rnt),
    publicado_airbnb         = coalesce(p_publicado_airbnb, publicado_airbnb),
    publicado_booking        = coalesce(p_publicado_booking, publicado_booking),
    otras_plataformas        = coalesce(p_otras_plataformas, otras_plataformas),
    pms                      = coalesce(p_pms, pms),
    ical_url                 = coalesce(p_ical_url, ical_url),
    tiene_antirruido         = coalesce(p_tiene_antirruido, tiene_antirruido),
    tiene_no_fumar           = coalesce(p_tiene_no_fumar, tiene_no_fumar),
    tiene_sensor             = coalesce(p_tiene_sensor, tiene_sensor),
    ocultar_numero           = coalesce(p_ocultar_numero, ocultar_numero),
    ocultar_contacto         = coalesce(p_ocultar_contacto, ocultar_contacto),
    /*
      Una cadena vacia **si** borra aqui, al reves que las contrasenas del
      libro. «Sin hora de entrada» es un estado que el anfitrion puede querer, y
      sin esto no habria forma de volver atras despues de poner una.
    */
    checkin_desde            = case
                                 when p_checkin_desde is null then checkin_desde
                                 when btrim(p_checkin_desde) = '' then null
                                 else p_checkin_desde::time
                               end,
    checkin_hasta            = case
                                 when p_checkin_hasta is null then checkin_hasta
                                 when btrim(p_checkin_hasta) = '' then null
                                 else p_checkin_hasta::time
                               end,
    checkin_24h              = coalesce(p_checkin_24h, checkin_24h)
  where unidad_id = p_unidad_id;

  if not found then
    raise exception 'Esta vivienda no tiene una suscripcion de renta corta';
  end if;

  select * into v_libro from public.libro_huesped where unidad_id = p_unidad_id;

  if v_libro.id is null then
    insert into public.libro_huesped (unidad_id) values (p_unidad_id)
    returning * into v_libro;
  end if;

  -- Una contrasena vacia no borra la que hay: el formulario llega vacio porque
  -- no se puede releer, no porque se quiera quitar.
  if coalesce(btrim(p_wifi_password), '') <> '' then
    select id into v_wifi_id from vault.secrets
     where name = 'wifi_' || p_unidad_id::text;
    if v_wifi_id is null then
      v_wifi_id := vault.create_secret(
        p_wifi_password, 'wifi_' || p_unidad_id::text, 'Clave del wifi');
    else
      perform vault.update_secret(
        v_wifi_id, p_wifi_password, 'wifi_' || p_unidad_id::text, 'Clave del wifi');
    end if;
  end if;

  if coalesce(btrim(p_puerta_password), '') <> '' then
    select id into v_puerta_id from vault.secrets
     where name = 'puerta_' || p_unidad_id::text;
    if v_puerta_id is null then
      v_puerta_id := vault.create_secret(
        p_puerta_password, 'puerta_' || p_unidad_id::text, 'Clave de la puerta');
    else
      perform vault.update_secret(
        v_puerta_id, p_puerta_password, 'puerta_' || p_unidad_id::text,
        'Clave de la puerta');
    end if;
  end if;

  update public.libro_huesped set
    wifi_nombre            = coalesce(p_wifi_nombre, wifi_nombre),
    wifi_password_secret   = coalesce(v_wifi_id, wifi_password_secret),
    puerta_password_secret = coalesce(v_puerta_id, puerta_password_secret),
    instrucciones          = coalesce(p_instrucciones, instrucciones),
    notas                  = coalesce(p_notas, notas)
  where id = v_libro.id;
end;
$guardar$;

comment on function public.guardar_alojamiento is
  'Lo que el anfitrion configura de su alojamiento, incluido el horario de entrada. Las claves del wifi y de la puerta se cifran en el Vault; una cadena vacia no las borra.';

grant execute on function public.guardar_alojamiento(
  uuid, text, integer, integer, integer, integer, integer, boolean, boolean,
  text, text, boolean, boolean, text, text, text, boolean, boolean, boolean,
  boolean, boolean, text, text, boolean, text, text, text, text, text
) to authenticated;

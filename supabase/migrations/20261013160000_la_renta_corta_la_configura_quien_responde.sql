-- ============================================================================
-- La renta corta la configura quien responde por la vivienda, otra vez
-- ============================================================================
-- `20260929100000_quien_configura_el_alojamiento` lo dejo decidido: el
-- propietario, el inquilino lider, el coadministrador de la vivienda y la
-- administracion. La porteria no configura viviendas, y un residente
-- cualquiera tampoco.
--
-- Tres migraciones posteriores reescribieron estas funciones para añadirles
-- parametros y volvieron a poner `puede_operar_unidad`, que deja pasar a
-- **cualquier miembro de la vivienda y a todo el personal del edificio**:
--
--   · `guardar_alojamiento` (20261002200000): la clave de la puerta, el wifi,
--     el RNT, el calendario;
--   · `guardar_recordatorios_precheckin` (20261003230000);
--   · `guardar_token_tra` (20261009140000): la credencial del ministerio.
--
-- O sea que un guardia podia cambiar la clave de la puerta de un alojamiento
-- llamando a la funcion. Salio en la revision del 13/10/2026. Es «un arreglo
-- que se deshace al reescribir la funcion»: el cuerpo se copio de antes del
-- arreglo.
--
-- Los cuerpos son los que hay en la base, con esa sola linea cambiada.

CREATE OR REPLACE FUNCTION public.guardar_alojamiento(p_unidad_id uuid, p_descripcion text DEFAULT NULL::text, p_num_habitaciones integer DEFAULT NULL::integer, p_max_huespedes integer DEFAULT NULL::integer, p_estacionamientos integer DEFAULT NULL::integer, p_estancia_minima integer DEFAULT NULL::integer, p_estancia_maxima integer DEFAULT NULL::integer, p_permite_mascotas boolean DEFAULT NULL::boolean, p_apto_ninos boolean DEFAULT NULL::boolean, p_visitas_de_huespedes text DEFAULT NULL::text, p_rnt text DEFAULT NULL::text, p_publicado_airbnb boolean DEFAULT NULL::boolean, p_publicado_booking boolean DEFAULT NULL::boolean, p_otras_plataformas text DEFAULT NULL::text, p_pms text DEFAULT NULL::text, p_ical_url text DEFAULT NULL::text, p_tiene_antirruido boolean DEFAULT NULL::boolean, p_tiene_no_fumar boolean DEFAULT NULL::boolean, p_tiene_sensor boolean DEFAULT NULL::boolean, p_ocultar_numero boolean DEFAULT NULL::boolean, p_ocultar_contacto boolean DEFAULT NULL::boolean, p_checkin_desde text DEFAULT NULL::text, p_checkin_hasta text DEFAULT NULL::text, p_checkin_24h boolean DEFAULT NULL::boolean, p_wifi_nombre text DEFAULT NULL::text, p_wifi_password text DEFAULT NULL::text, p_puerta_password text DEFAULT NULL::text, p_instrucciones text DEFAULT NULL::text, p_notas text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'vault'
AS $function$
declare
  v_libro       public.libro_huesped;
  v_wifi_id     uuid;
  v_puerta_id   uuid;
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
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
$function$;

CREATE OR REPLACE FUNCTION public.guardar_recordatorios_precheckin(p_unidad_id uuid, p_al_huesped boolean, p_al_anfitrion boolean, p_dias smallint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_dias smallint[];
begin
  -- El mismo permiso que el resto de la ficha del alojamiento: quien gestiona
  -- la vivienda. No se inventa uno nuevo.
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No tenes permiso para configurar esta vivienda';
  end if;

  if not exists (select 1 from public.suscripcion_renta_corta where unidad_id = p_unidad_id) then
    raise exception 'Esta vivienda no tiene renta corta activada';
  end if;

  /*
    Ordenados de mas lejos a mas cerca y sin repetidos. Lo segundo importa: con
    `{7,7,3}` el cron mandaria dos veces el mismo dia --y la constancia lo
    impediria, pero por accidente y dejando una fila de error--. Mejor que no
    se pueda escribir.
  */
  v_dias := coalesce(
    (select array_agg(distinct d order by d desc) from unnest(p_dias) d),
    '{}'::smallint[]
  );

  if not public.dias_de_recordatorio_sensatos(v_dias) then
    raise exception 'Los avisos van de 1 a 60 dias antes de la llegada';
  end if;

  update public.suscripcion_renta_corta
  set recordatorio_al_huesped   = coalesce(p_al_huesped, recordatorio_al_huesped),
      recordatorio_al_anfitrion = coalesce(p_al_anfitrion, recordatorio_al_anfitrion),
      recordatorio_dias         = v_dias
  where unidad_id = p_unidad_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guardar_token_tra(p_unidad_id uuid, p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'extensions'
AS $function$
declare
  v_nombre text := 'tra_' || p_unidad_id::text;
  v_id     uuid;
  v_token  text := nullif(btrim(coalesce(p_token, '')), '');
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  -- Vaciarlo es desconectar la TRA: se suelta la referencia **y se desarma**.
  if v_token is null then
    update public.suscripcion_renta_corta
       set tra_token_secret = null,
           tra_armado       = false,
           tra_error        = null,
           updated_at       = now()
     where unidad_id = p_unidad_id;
    return;
  end if;

  select id into v_id from vault.secrets where name = v_nombre;

  if v_id is null then
    v_id := vault.create_secret(v_token, v_nombre, 'Token TRA del alojamiento');
  else
    perform vault.update_secret(v_id, v_token, v_nombre, 'Token TRA del alojamiento');
  end if;

  /*
    Guardar un token **no arma nada**: `tra_armado` no se toca aqui a
    proposito. Tener la credencial no es querer usarla --lo mismo que
    `ENVIO_CORREO_ACTIVO` y `TUSDATOS_ACTIVO`-- y un reporte a la TRA es una
    declaracion legal que no se deshace por API.
  */
  update public.suscripcion_renta_corta
     set tra_token_secret = v_id, tra_error = null, updated_at = now()
   where unidad_id = p_unidad_id;
end;
$function$;


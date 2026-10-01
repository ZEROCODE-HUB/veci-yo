-- ---------------------------------------------------------------------------
-- Guardar la clave de la puerta cuando el Vault ya tiene un secreto con su nombre
-- ---------------------------------------------------------------------------
-- `guardar_alojamiento` nombra los secretos de forma determinista:
-- `wifi_<unidad>` y `puerta_<unidad>`. Y decidia crear o actualizar mirando
-- **solo la fila del libro**: si `wifi_password_secret` estaba vacio, creaba
-- uno nuevo.
--
-- El nombre tiene indice unico, asi que en cuanto la fila pierde la referencia
-- --y el secreto sigue en el Vault-- `create_secret` falla con «duplicate key
-- value violates unique constraint secrets_name_idx» y **la funcion entera
-- aborta**: no se guarda ni la descripcion, ni el wifi, ni nada. El anfitrion no
-- puede volver a poner la clave de su puerta nunca mas, y lo unico que ve es un
-- error 409.
--
-- Salio recorriendo «Mi alojamiento» como huesped: el libro de la 102 tenia dos
-- secretos huerfanos del 23/09 y la fila a null. Reproducido con el RPC directo.
--
-- Ahora el secreto se busca **por su nombre** antes de decidir, que es lo que
-- corresponde con un nombre determinista: si existe se actualiza, y solo se crea
-- cuando de verdad no hay ninguno.
--
-- No se toca ninguna tabla ni ningun dato.

CREATE OR REPLACE FUNCTION public.guardar_alojamiento(p_unidad_id uuid, p_descripcion text DEFAULT NULL::text, p_num_habitaciones integer DEFAULT NULL::integer, p_max_huespedes integer DEFAULT NULL::integer, p_estacionamientos integer DEFAULT NULL::integer, p_estancia_minima integer DEFAULT NULL::integer, p_estancia_maxima integer DEFAULT NULL::integer, p_permite_mascotas boolean DEFAULT NULL::boolean, p_apto_ninos boolean DEFAULT NULL::boolean, p_visitas_de_huespedes text DEFAULT NULL::text, p_rnt text DEFAULT NULL::text, p_publicado_airbnb boolean DEFAULT NULL::boolean, p_publicado_booking boolean DEFAULT NULL::boolean, p_otras_plataformas text DEFAULT NULL::text, p_pms text DEFAULT NULL::text, p_ical_url text DEFAULT NULL::text, p_tiene_antirruido boolean DEFAULT NULL::boolean, p_tiene_no_fumar boolean DEFAULT NULL::boolean, p_tiene_sensor boolean DEFAULT NULL::boolean, p_ocultar_numero boolean DEFAULT NULL::boolean, p_ocultar_contacto boolean DEFAULT NULL::boolean, p_wifi_nombre text DEFAULT NULL::text, p_wifi_password text DEFAULT NULL::text, p_puerta_password text DEFAULT NULL::text, p_instrucciones text DEFAULT NULL::text, p_notas text DEFAULT NULL::text)
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
    ocultar_contacto         = coalesce(p_ocultar_contacto, ocultar_contacto)
  where unidad_id = p_unidad_id;
  if not found then
    raise exception 'Esta vivienda no tiene una suscripcion de renta corta';
  end if;
  select * into v_libro from public.libro_huesped where unidad_id = p_unidad_id;
  if v_libro.id is null then
    insert into public.libro_huesped (unidad_id) values (p_unidad_id)
    returning * into v_libro;
  end if;
  -- Una contrasena vacia no borra la que hay: el formulario llega vacio
  -- porque las contrasenas no se releen, no porque se quieran quitar.
  if coalesce(p_wifi_password, '') <> '' then
    v_wifi_id := v_libro.wifi_password_secret;
    if v_wifi_id is null then
      -- Puede quedar en el Vault un secreto con este nombre al que la fila ya
      -- no apunta, y el nombre es unico: intentar crear otro reventaba la
      -- funcion entera con «duplicate key value», asi que el anfitrion no podia
      -- volver a guardar la clave de su puerta nunca mas.
      select id into v_wifi_id from vault.secrets
       where name = 'wifi_' || p_unidad_id::text;
    end if;
    if v_wifi_id is null then
      v_wifi_id := vault.create_secret(
        p_wifi_password,
        'wifi_' || p_unidad_id::text,
        'Clave del wifi del alojamiento');
    else
      perform vault.update_secret(v_wifi_id, p_wifi_password);
    end if;
  else
    v_wifi_id := v_libro.wifi_password_secret;
  end if;
  if coalesce(p_puerta_password, '') <> '' then
    v_puerta_id := v_libro.puerta_password_secret;
    if v_puerta_id is null then
      select id into v_puerta_id from vault.secrets
       where name = 'puerta_' || p_unidad_id::text;
    end if;
    if v_puerta_id is null then
      v_puerta_id := vault.create_secret(
        p_puerta_password,
        'puerta_' || p_unidad_id::text,
        'Clave de la puerta del alojamiento');
    else
      perform vault.update_secret(v_puerta_id, p_puerta_password);
    end if;
  else
    v_puerta_id := v_libro.puerta_password_secret;
  end if;
  update public.libro_huesped set
    wifi_nombre            = coalesce(p_wifi_nombre, wifi_nombre),
    wifi_password_secret   = v_wifi_id,
    puerta_password_secret = v_puerta_id,
    instrucciones          = coalesce(p_instrucciones, instrucciones),
    notas                  = coalesce(p_notas, notas)
  where id = v_libro.id;
end
$function$
;

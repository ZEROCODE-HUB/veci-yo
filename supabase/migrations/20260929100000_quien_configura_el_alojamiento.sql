-- ---------------------------------------------------------------------------
-- Quien configura el alojamiento
-- ---------------------------------------------------------------------------
-- Todo lo que cuelga de la renta corta --la suscripcion, el libro del huesped
-- con las claves del wifi y de la puerta, el registro de turismo, los paquetes
-- de verificaciones, el personal del alojamiento y los antecedentes-- estaba
-- protegido con `puede_operar_unidad`, que es «ser miembro de la unidad o
-- personal del condominio». Demasiado ancho por los dos lados:
--
--   · `es_miembro_unidad` cuenta **todos** los roles de unidad menos el huesped
--     temporal, asi que un `residente` --un hijo mayor de edad al que el
--     propietario dio de alta-- podia cambiar el RNT, el maximo de huespedes y
--     las contraseñas de la puerta;
--   · `es_personal_condominio` es **cualquier** membresia del condominio,
--     incluida la **porteria**. El guardia podia reescribir las claves de
--     cualquier vivienda del edificio.
--
-- Ninguna de las dos cosas se pidio. El KT dice que el propietario es el
-- superadministrador de su unidad y que **delega** en inquilino lider o
-- coadministrador, y ni el alcance ni los mockups del prototipo dicen nada mas
-- --se busco en los dos antes de decidir--. Decision del cliente del
-- 29/09/2026: se limita a esos tres roles, y del condominio solo la
-- administracion. Punto 60 de `REVISAR-A-OJO.md`.
--
-- `puede_operar_unidad` **no se toca**: gobierna tambien registrar una visita y
-- reservar una zona, que un residente si tiene que poder hacer. Lo que se
-- estrecha es solo la configuracion.
--
-- No se borra ninguna tabla ni ningun dato: se reemplazan politicas y se ajusta
-- un `security definer`.

create or replace function public.puede_configurar_alojamiento(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      -- Quien responde por la vivienda, y a quien el propietario delega.
      and mu.rol in ('propietario', 'inquilino_lider', 'coadministrador')
  )
  -- Del condominio, solo la administracion. La porteria no configura viviendas.
  or public.es_admin_condominio(public.condominio_de_unidad(p_unidad_id));
$$;

comment on function public.puede_configurar_alojamiento is
  'Quien puede cambiar la configuracion de renta corta de una vivienda y sus credenciales: propietario, inquilino lider, coadministrador de la unidad, o la administracion del condominio. Mas estrecha que puede_operar_unidad a proposito (29/09/2026).';

revoke all on function public.puede_configurar_alojamiento from public;
grant execute on function public.puede_configurar_alojamiento to authenticated;


-- ---------------------------------------------------------------------------
-- Las politicas de todo lo que es configuracion del alojamiento
-- ---------------------------------------------------------------------------
-- De las seis tablas que tenia la lista original quedan cuatro:
-- `config_renta_corta` se consolido en `suscripcion_renta_corta`
-- (20260923140000) y `staff_alojamiento` tambien desaparecio. La primera
-- version de esta migracion las nombraba y PostgreSQL la rechazo entera
-- --«relation public.staff_alojamiento does not exist»--, que es justo lo que
-- tiene que pasar: mejor eso que crear la politica en las que si existen y dar
-- el resto por hecho.
do $politicas$
declare t text;
begin
  foreach t in array array[
    'registro_turismo',
    'suscripcion_renta_corta','paquete_verificaciones','libro_huesped'
  ] loop
    execute format('drop policy if exists %I_acceso on public.%I', t, t);
    execute format(
      'create policy %I_acceso on public.%I for all to authenticated
         using (public.puede_configurar_alojamiento(unidad_id))
         with check (public.puede_configurar_alojamiento(unidad_id))', t, t);
  end loop;
end
$politicas$;

drop policy if exists periodo_suscripcion_acceso on public.periodo_suscripcion;
create policy periodo_suscripcion_acceso on public.periodo_suscripcion
  for all to authenticated
  using (exists (select 1 from public.suscripcion_renta_corta s
                 where s.id = periodo_suscripcion.suscripcion_id
                   and public.puede_configurar_alojamiento(s.unidad_id)))
  with check (exists (select 1 from public.suscripcion_renta_corta s
                 where s.id = periodo_suscripcion.suscripcion_id
                   and public.puede_configurar_alojamiento(s.unidad_id)));

-- Los antecedentes de una persona los ve quien responde por la vivienda, no
-- cualquiera que viva en ella ni la porteria. La decision de que el huesped no
-- los vea nunca (16/07/2026) sigue igual: no es miembro de la unidad.
drop policy if exists verificacion_antecedentes_acceso on public.verificacion_antecedentes;
create policy verificacion_antecedentes_acceso on public.verificacion_antecedentes
  for all to authenticated
  using (public.puede_configurar_alojamiento(unidad_id))
  with check (public.puede_configurar_alojamiento(unidad_id));

comment on policy verificacion_antecedentes_acceso on public.verificacion_antecedentes is
  'Decision del 16/07/2026: el huesped no ve la verificacion ni sabe que existe. Desde el 29/09/2026, tampoco un residente cualquiera ni la porteria.';


-- ---------------------------------------------------------------------------
-- Y las tres funciones que deciden por su cuenta
-- ---------------------------------------------------------------------------
-- Son `security definer`, asi que las politicas de arriba no las sujetan: cada
-- una comprueba el permiso por dentro y hay que cambiarselo.
--
--   · `guardar_alojamiento` escribe la configuracion y las contraseñas;
--   · `comprar_paquete_verificaciones` gasta dinero;
--   · `credenciales_alojamiento` **entrega la clave del wifi y de la puerta**, y
--     con `puede_operar_unidad` se la daba a cualquier miembro del condominio
--     --la porteria podia leer la contraseña de la puerta de todas las
--     viviendas del edificio--. Al huesped alojado se le sigue dando, que es
--     para lo que existe.
--
-- El cuerpo es el que ya tenian, tal como lo devuelve `pg_get_functiondef`: lo
-- unico que cambia es a quien preguntan.

CREATE OR REPLACE FUNCTION public.comprar_paquete_verificaciones(p_unidad_id uuid, p_cantidad integer, p_referencia text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_condominio uuid;
  v_monto  numeric(12,2);
  v_moneda char(3);
  v_id     uuid;
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No podes comprar verificaciones para esta vivienda';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'El paquete necesita una cantidad';
  end if;

  v_condominio := public.condominio_de_unidad(p_unidad_id);

  select p.monto, p.moneda into v_monto, v_moneda
  from public.precio_del_plan('paquete_verificaciones', v_condominio) p;

  insert into public.paquete_verificaciones
    (unidad_id, cantidad, vence_en, comprado_por, monto, moneda, referencia)
  values
    (p_unidad_id, p_cantidad, current_date + 365, auth.uid(),
     case when v_monto is null then null else v_monto * p_cantidad end,
     v_moneda,
     nullif(btrim(coalesce(p_referencia, '')), ''))
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.credenciales_alojamiento(p_unidad_id uuid)
 RETURNS TABLE(wifi_password text, puerta_password text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'vault'
AS $function$

  select

    (select s.decrypted_secret from vault.decrypted_secrets s

      where s.id = l.wifi_password_secret),

    (select s.decrypted_secret from vault.decrypted_secrets s

      where s.id = l.puerta_password_secret)

  from public.libro_huesped l

  where l.unidad_id = p_unidad_id

    and (

      public.puede_configurar_alojamiento(p_unidad_id)

      or public.es_huesped_alojado(p_unidad_id)

    );

$function$
;

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

    if v_libro.wifi_password_secret is null then

      v_wifi_id := vault.create_secret(

        p_wifi_password,

        'wifi_' || p_unidad_id::text,

        'Clave del wifi del alojamiento');

    else

      v_wifi_id := v_libro.wifi_password_secret;

      perform vault.update_secret(v_wifi_id, p_wifi_password);

    end if;

  else

    v_wifi_id := v_libro.wifi_password_secret;

  end if;



  if coalesce(p_puerta_password, '') <> '' then

    if v_libro.puerta_password_secret is null then

      v_puerta_id := vault.create_secret(

        p_puerta_password,

        'puerta_' || p_unidad_id::text,

        'Clave de la puerta del alojamiento');

    else

      v_puerta_id := v_libro.puerta_password_secret;

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

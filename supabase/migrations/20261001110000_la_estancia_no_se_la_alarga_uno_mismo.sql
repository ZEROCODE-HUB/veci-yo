-- ----------------------------------------------------------------------------
-- Un huesped no se alarga su propia estancia
-- ----------------------------------------------------------------------------
-- `proteger_membresia_unidad` ya impedia que uno se cambiara a si mismo el rol,
-- `puede_acceder`, `activo` y las dos banderas de primario. Le faltaban las dos
-- fechas, y eran las mas caras de la lista.
--
-- Comprobado el 01/10/2026 con Ramiro --`huesped.pasado@veciyo.test`, estancia
-- terminada el 07/08/2026--: un solo PATCH a su propia membresia poniendo
-- `vigente_hasta` en 2030 respondio 200 y guardo la fecha. Con eso la membresia
-- vuelve a estar vigente, la sesion deja de descartarla, y la aplicacion le
-- abre la vivienda entera.
--
-- Lo grave no es el acceso a la aplicacion sino lo que hay detras:
-- `credenciales_alojamiento` --la clave del wifi y el codigo de la puerta-- las
-- protege `es_huesped_alojado`, que comprueba esa misma fecha. La condicion que
-- guardaba el secreto la podia escribir quien queria leerlo.
--
-- Es el caso del que ya habla AGENTS.md: si la afirmacion es **sobre** una
-- persona, esa persona no puede escribirla. RLS no sabe comparar el valor viejo
-- con el nuevo, asi que va en el disparador.
--
-- La funcion se reescribe entera a partir de la que habia --`pg_get_functiondef`
-- del 01/10/2026-- cambiando solo ese bloque: lo demas queda igual.

CREATE OR REPLACE FUNCTION public.proteger_membresia_unidad()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_unidad uuid;
  v_admin  boolean;
begin
  v_unidad := case when tg_op = 'DELETE' then old.unidad_id else new.unidad_id end;

  -- Sin sesion de aplicacion no hay a quien restringir: son las migraciones,
  -- la clave de servicio o la consola SQL, que ya pasan por encima de RLS de
  -- todos modos.
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- `aceptar_invitacion` crea la membresia en nombre de quien acepta, y puede
  -- ser la del propietario. Esa alta ya paso su propio control. La bandera es
  -- local a la transaccion: nadie puede encenderla desde fuera.
  if coalesce(current_setting('veciyo.alta_por_invitacion', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- `designar_primario` comprueba su propia autorizacion --quien gestiona la
  -- gente de la vivienda-- y necesita poder tocar la fila del propietario y la
  -- de uno mismo. Misma tecnica y mismo alcance: una transaccion.
  if coalesce(current_setting('veciyo.designando_primario', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_admin := public.es_admin_condominio(public.condominio_de_unidad(v_unidad));
  if v_admin then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- La propiedad de una vivienda es un hecho legal que registra la
  -- administracion. No se la pone uno, no se la quita a otro.
  if tg_op = 'DELETE' and old.rol = 'propietario' then
    raise exception 'Solo la administracion puede dar de baja al propietario de una vivienda';
  end if;
  if tg_op = 'INSERT' and new.rol = 'propietario' then
    raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
  end if;
  if tg_op = 'UPDATE'
     and new.rol = 'propietario'
     and new.rol is distinct from old.rol then
    raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
  end if;

  -- Lo que esta vedado de la membresia del propietario es **lo que la hace ser
  -- la del propietario**, no todo lo que lleva dentro.
  if tg_op = 'UPDATE' and old.rol = 'propietario' and (
       new.rol         is distinct from old.rol
    or new.usuario_id  is distinct from old.usuario_id
    or new.unidad_id   is distinct from old.unidad_id
    or new.activo      is distinct from old.activo
  ) then
    raise exception 'Solo la administracion puede modificar la membresia del propietario';
  end if;

  -- Y nadie se cambia a si mismo el rol, sus permisos ni **sus fechas**.
  --
  -- Las dos fechas faltaban, y eran las mas caras de las cinco: un huesped se
  -- ponia `vigente_hasta` en 2030 con una sola llamada y recuperaba la estancia
  -- entera. Comprobado el 01/10/2026 con Ramiro, cuya estancia termino el 7 de
  -- agosto: respuesta 200 y fecha guardada.
  --
  -- Lo que eso devuelve no es solo entrar a la aplicacion. Las credenciales de
  -- la vivienda --la clave del wifi y la de la puerta-- las protege
  -- `es_huesped_alojado`, que comprueba justamente esa fecha. O sea que la
  -- condicion que guarda el secreto la podia escribir quien queria leerlo.
  --
  -- Quien si puede moverlas sigue pudiendo: la administracion sale antes de
  -- llegar aqui, el anfitrion escribe la fila de su huesped --que no es la
  -- suya-- y el alta por invitacion viene con su bandera.
  if tg_op = 'UPDATE' and new.usuario_id = auth.uid() and (
       new.rol is distinct from old.rol
    or new.puede_acceder is distinct from old.puede_acceder
    or new.activo is distinct from old.activo
    or new.es_admin_primario is distinct from old.es_admin_primario
    or new.es_anfitrion_primario is distinct from old.es_anfitrion_primario
    or new.vigente_desde is distinct from old.vigente_desde
    or new.vigente_hasta is distinct from old.vigente_hasta
  ) then
    raise exception 'No podes cambiar tu propio rol, tus permisos ni las fechas de tu estancia';
  end if;

  -- En un disparador `before delete`, devolver `new` es devolver NULL, y eso
  -- **cancela el borrado en silencio**: ni error, ni fila, ni pista.
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$



-- El anfitrion habilita a cada huesped para registrar visitas (15/10/2026).
--
-- En la configuracion del alojamiento hay tres opciones para las visitas de
-- los huespedes. «Permitir a todos» y «Prohibir a todos» se cumplen desde
-- 20261015170000. La tercera, «Aprobar huesped por huesped», el cliente la
-- definio asi (15/10/2026, opcion recomendada): el anfitrion habilita, huesped
-- por huesped, a quien puede registrar visitas durante su estancia. Hasta que
-- lo habilite, no puede.
--
-- El permiso vive en la membresia del huesped --que es su estancia con
-- cuenta: sus fechas son las de la estancia y se mueven con ella-- y el
-- huesped no se lo puede dar a si mismo: va en la lista de lo que nadie cambia
-- de su propia fila (`proteger_membresia_unidad`).

alter table public.membresia_unidad
  add column if not exists puede_registrar_visitas boolean not null default false;

comment on column public.membresia_unidad.puede_registrar_visitas is
  'Solo para huespedes: el anfitrion lo habilita a registrar visitas cuando la vivienda esta en «aprobar huesped por huesped».';

create or replace function public.huesped_puede_registrar_visitas(p_unidad_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select case coalesce(
      (select s.visitas_de_huespedes::text
         from public.suscripcion_renta_corta s
        where s.unidad_id = p_unidad_id),
      'permitir_todos')
    when 'prohibir_todos' then false
    when 'aprobar_cada_uno' then exists (
      select 1 from public.membresia_unidad m
      where m.unidad_id = p_unidad_id
        and m.usuario_id = auth.uid()
        and m.rol = 'huesped_temporal'
        and m.activo
        and m.puede_registrar_visitas
    )
    else true
  end;
$function$;

comment on function public.huesped_puede_registrar_visitas(uuid) is
  'Si el anfitrion deja a quien llama (huesped) registrar visitas: permitir_todos si, prohibir_todos no, aprobar_cada_uno solo si lo habilito.';

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

  -- `eliminar_mi_cuenta` da de baja las membresias de quien se va, tambien la
  -- del propietario: la vivienda sigue siendo suya en los papeles, pero la
  -- cuenta deja de existir. Misma tecnica y mismo alcance: una transaccion.
  if coalesce(current_setting('veciyo.eliminando_cuenta', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_admin := public.es_admin_condominio(public.condominio_de_unidad(v_unidad));
  if v_admin then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Una membresia no se muda: ni a otra vivienda ni a otra persona. Quien la
  -- tenia podia cambiar su propio `unidad_id` y aparecer en una vivienda
  -- ajena con sus fechas intactas --y con ellas, la clave del wifi y la de la
  -- puerta de esa otra casa--. Lo que corresponde es dar de baja e invitar de
  -- nuevo (15/10/2026).
  if tg_op = 'UPDATE' and (
       new.unidad_id  is distinct from old.unidad_id
    or new.usuario_id is distinct from old.usuario_id
  ) then
    raise exception 'Una membresía no se cambia de vivienda ni de persona: se da de baja y se invita de nuevo';
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
    or new.puede_registrar_visitas is distinct from old.puede_registrar_visitas
    or new.vigente_desde is distinct from old.vigente_desde
    or new.vigente_hasta is distinct from old.vigente_hasta
  ) then
    raise exception 'No puedes cambiar tu propio rol, tus permisos ni las fechas de tu estancia';
  end if;

  -- En un disparador `before delete`, devolver `new` es devolver NULL, y eso
  -- **cancela el borrado en silencio**: ni error, ni fila, ni pista.
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

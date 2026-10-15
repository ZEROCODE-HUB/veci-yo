-- Nadie se sube de rango por detras (15/10/2026).
--
-- La revision de permisos de la base contra las pantallas encontro cuatro
-- caminos para ganar un rol que nadie te dio. Ninguno se ve desde la app: se
-- hacen llamando a la base directamente con la sesion propia.
--
--   1. Quien emitio una invitacion podia reescribirla entera --rol, vivienda,
--      ambito-- y aceptarla luego como administrador o propietario. Ahora una
--      invitacion emitida no cambia: solo se revoca. Las funciones que la
--      tocan con motivo (aceptar, reemitir, cambiar fechas) siguen pudiendo.
--   2. Un residente o huesped podia cambiar el `unidad_id` de su propia
--      membresia y mudarse a una vivienda ajena. Ahora no cambia de vivienda
--      ni de persona.
--   3. Un coadministrador con el permiso de seguridad podia escribir
--      cualquier membresia del edificio: hacerse administrador, darse
--      permisos, desactivar al administrador. Ahora con ese permiso gestiona
--      la porteria y nada mas.
--   4. Cualquier coadministrador podia invitar a un administrador. Ahora a
--      administradores y coadministradores los invita solo el administrador.
--
-- Solo cambian funciones, politicas no y datos tampoco.

-- El administrador de verdad, no un coadministrador.
create or replace function public.es_administrador_de(p_condominio_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.usuario_id = auth.uid()
      and mc.rol = 'administrador'
      and mc.activo
  );
$function$;

comment on function public.es_administrador_de(uuid) is
  'El administrador del condominio, sin contar coadministradores.';

-- 1. Una invitacion emitida no se reescribe.
--
-- Sin `security definer` a proposito: asi `current_user` es quien hizo la
-- escritura. Una llamada directa desde la app llega como `authenticated`;
-- una funcion de la base que la toca con motivo (aceptar_invitacion,
-- reemitir_acceso_huesped, cambiar_fechas_de_estancia...) corre como su
-- dueño, y esas ya comprueban su propia autorizacion.
create or replace function public.proteger_invitacion()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null or current_user <> 'authenticated' then
    return new;
  end if;

  -- Lo unico que la app cambia de una invitacion es su estado --para
  -- revocarla-- y cuando se envio.
  if (to_jsonb(new) - 'estado' - 'enviada_en' - 'updated_at')
     is distinct from (to_jsonb(old) - 'estado' - 'enviada_en' - 'updated_at') then
    raise exception 'Una invitación ya emitida no se puede modificar: revócala y emite otra';
  end if;

  if new.estado is distinct from old.estado
     and not (old.estado = 'pendiente' and new.estado = 'revocada') then
    raise exception 'Una invitación solo se puede revocar';
  end if;

  return new;
end;
$function$;

drop trigger if exists invitacion_proteger on public.invitacion;
create trigger invitacion_proteger
  before update on public.invitacion
  for each row execute function public.proteger_invitacion();

-- 2. La membresia de vivienda no se muda.
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

-- 3. Con el permiso de seguridad se gestiona la porteria, y nada mas.
--
-- Sin `security definer`, por lo mismo que la de invitaciones:
-- aceptar_invitacion y eliminar_mi_cuenta escriben aqui como dueñas de la
-- funcion y ya traen su control.
create or replace function public.proteger_membresia_condominio()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid := case when tg_op = 'DELETE' then old.condominio_id else new.condominio_id end;
begin
  if auth.uid() is null or current_user <> 'authenticated' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if public.es_administrador_de(v_condominio) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if (tg_op in ('UPDATE', 'DELETE') and old.rol <> 'guardia')
     or (tg_op in ('INSERT', 'UPDATE') and new.rol <> 'guardia') then
    raise exception 'Solo el administrador gestiona a administradores y coadministradores';
  end if;

  if tg_op = 'UPDATE' and (
       new.condominio_id is distinct from old.condominio_id
    or new.usuario_id    is distinct from old.usuario_id
  ) then
    raise exception 'Una membresía no se cambia de edificio ni de persona';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

drop trigger if exists membresia_condominio_proteger on public.membresia_condominio;
create trigger membresia_condominio_proteger
  before insert or update or delete on public.membresia_condominio
  for each row execute function public.proteger_membresia_condominio();

-- 4. A administradores y coadministradores los invita el administrador.
CREATE OR REPLACE FUNCTION public.crear_invitacion(p_condominio_id uuid, p_ambito ambito_invitacion, p_correo text, p_nombre text, p_unidad_id uuid DEFAULT NULL::uuid, p_rol_unidad rol_unidad DEFAULT NULL::rol_unidad, p_rol_condominio rol_condominio DEFAULT NULL::rol_condominio, p_vigente_desde date DEFAULT NULL::date, p_vigente_hasta date DEFAULT NULL::date, p_contacto_nombre text DEFAULT NULL::text, p_contacto_codigo text DEFAULT NULL::text, p_contacto_telefono text DEFAULT NULL::text, p_telefono text DEFAULT NULL::text, p_codigo_pais text DEFAULT NULL::text, p_permisos jsonb DEFAULT NULL::jsonb, p_porteria_id uuid DEFAULT NULL::uuid, p_documento text DEFAULT NULL::text)
 RETURNS TABLE(invitacion_id uuid, token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
  v_correo text := lower(trim(p_correo));
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;

  if p_ambito = 'unidad' then
    if not public.puede_invitar_a_unidad(p_unidad_id) then
      raise exception 'No tenes permiso para invitar a esta unidad';
    end if;

    -- La propiedad de una vivienda es un hecho legal que registra la
    -- administracion: quien gestiona la vivienda da de alta a los suyos, no a
    -- su dueño.
    --
    -- El huesped temporal NO entra aqui, aunque la misma frase del KT lo
    -- nombre. Lo que dice es que "va por otro flujo" --el precheckin--, no que
    -- solo la administracion pueda darlo de alta; y ese flujo todavia no
    -- existe (R-90). Restringirlo dejaria al anfitrion sin ninguna forma de
    -- recibir a su huesped, que es el producto entero.
    if p_rol_unidad = 'propietario'
       and not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
    end if;
  else
    if not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion del condominio puede invitar a estos roles';
    end if;

    -- Un coadministrador no nombra administradores ni otros coadministradores:
    -- eso es del administrador (decision del cliente, 15/10/2026). Y a la
    -- porteria la invita quien tiene el permiso de seguridad, no cualquiera.
    if p_rol_condominio in ('administrador', 'coadministrador')
       and not public.es_administrador_de(p_condominio_id) then
      raise exception 'Solo el administrador puede invitar a administradores y coadministradores';
    end if;
    if p_rol_condominio = 'guardia'
       and not public.puede_coadmin(p_condominio_id, 'modificarSeguridad') then
      raise exception 'No tienes permiso para invitar personal de portería';
    end if;
  end if;

  -- Un correo que no se puede escribir en un sobre no recibe invitaciones.
  -- La pantalla solo miraba que llevara una arroba: «ana@» emitia una
  -- invitacion que nadie iba a poder aceptar.
  if v_correo !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]{2,}$' then
    raise exception 'Ese correo no parece válido'
      using errcode = 'check_violation', constraint = 'invitacion_correo_valido';
  end if;

  -- La porteria y el documento son de un guardia; los permisos, de un guardia
  -- o de un coadministrador. La porteria tiene que ser de este edificio.
  if p_porteria_id is not null and not exists (
    select 1 from public.porteria po
    where po.id = p_porteria_id and po.condominio_id = p_condominio_id
  ) then
    raise exception 'Esa portería no es de este edificio';
  end if;

  if p_rol_unidad = 'huesped_temporal' and p_vigente_hasta is null then
    raise exception 'Una invitacion de huesped temporal necesita la fecha de fin de la estancia';
  end if;

  if p_vigente_hasta is not null and p_vigente_hasta < current_date then
    raise exception 'La estancia termina antes de hoy';
  end if;

  if p_vigente_desde is not null and p_vigente_hasta is not null
     and p_vigente_desde > p_vigente_hasta then
    raise exception 'La estancia termina antes de empezar';
  end if;

  -- Una sola pendiente por persona y destino: la anterior deja de valer. Si
  -- no, invitar dos veces al mismo correo dejaba dos enlaces vivos. Esta
  -- regla existia (20260921230000) y se perdio al reescribir la funcion.
  update public.invitacion i
     set estado = 'revocada', updated_at = now()
   where i.estado = 'pendiente'
     and i.condominio_id = p_condominio_id
     and i.ambito = p_ambito
     and lower(i.correo) = v_correo
     and i.unidad_id is not distinct from p_unidad_id
     and i.rol_unidad is not distinct from p_rol_unidad
     and i.rol_condominio is not distinct from p_rol_condominio;

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, rol_condominio,
    correo, nombre, token_hash, invitada_por, expira_en,
    vigente_desde, vigente_hasta,
    contacto_emergencia_nombre, contacto_emergencia_codigo,
    contacto_emergencia_telefono,
    telefono, codigo_pais,
    permisos, porteria_id, documento
  ) values (
    p_condominio_id, p_ambito, p_unidad_id, p_rol_unidad, p_rol_condominio,
    v_correo, p_nombre,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(), now() + interval '7 days',
    p_vigente_desde, p_vigente_hasta,
    nullif(btrim(coalesce(p_contacto_nombre, '')), ''),
    nullif(btrim(coalesce(p_contacto_codigo, '')), ''),
    nullif(btrim(coalesce(p_contacto_telefono, '')), ''),
    -- Solo digitos, igual que lo que manda el campo: el prefijo sale del
    -- codigo del pais y un numero no se guarda ya formateado.
    nullif(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), ''),
    nullif(upper(btrim(coalesce(p_codigo_pais, ''))), ''),
    case when p_ambito = 'condominio' then p_permisos end,
    case when p_ambito = 'condominio' then p_porteria_id end,
    case when p_ambito = 'condominio'
         then nullif(btrim(coalesce(p_documento, '')), '') end
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$function$;

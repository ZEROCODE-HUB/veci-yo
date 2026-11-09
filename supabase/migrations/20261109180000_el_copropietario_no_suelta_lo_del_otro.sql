-- El copropietario no le quita a la vivienda lo que el otro propietario ya
-- tiene (09/11/2026, revisión pedida por el cliente: «dime si todo lo de
-- invitar copropietarios funciona»).
--
-- Comprobado simulando el flujo entero en una transacción deshecha: la
-- administración asigna a Cristian como copropietario de la 101 (de Xander),
-- le aparece la invitación, la acepta y la 101 queda con los dos. Pero la
-- invitación llevaba también los estacionamientos y depósitos de la vivienda,
-- y si el copropietario rechazaba uno, `responder_espacio_de_mi_invitacion`
-- lo soltaba de la vivienda: se lo quitaba a Xander.
--
-- 1. `asignar_propietario`: los espacios van con la invitación solo cuando la
--    vivienda todavía no tiene propietario.
-- 2. `responder_espacio_de_mi_invitacion`: rechazar suelta el espacio solo si
--    no hay otro propietario activo en la vivienda.
--
-- Solo aditiva.

create or replace function public.asignar_propietario(p_unidad_id uuid, p_correo text, p_nombre text)
 RETURNS TABLE(asignado boolean, unidad text, edificio text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'auth'
AS $function$
declare
  v_condominio uuid;
  v_codigo     text;
  v_edificio   text;
  v_correo     text := lower(btrim(p_correo));
  v_nombre     text := btrim(coalesce(p_nombre, ''));
  v_tiene_cuenta boolean;
  v_invitacion uuid;
begin
  select u.condominio_id, u.codigo, c.nombre into v_condominio, v_codigo, v_edificio
    from public.unidad u join public.condominio c on c.id = u.condominio_id
   where u.id = p_unidad_id and u.deleted_at is null;
  if v_condominio is null then
    raise exception 'Esa vivienda no existe';
  end if;
  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
  end if;
  if v_correo = '' or v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no sirve';
  end if;
  if v_nombre = '' then
    raise exception 'Falta el nombre del propietario';
  end if;

  v_tiene_cuenta := exists (
    select 1 from auth.users where lower(email) = v_correo and email_confirmed_at is not null
  );

  -- Lo pendiente para esa vivienda y ese correo deja de valer: la nueva lo
  -- reemplaza.
  update public.invitacion
     set estado = 'revocada', updated_at = now()
   where unidad_id = p_unidad_id and ambito = 'unidad' and rol_unidad = 'propietario'
     and lower(correo) = v_correo and estado = 'pendiente';

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, correo, nombre,
    token_hash, invitada_por, expira_en
  ) values (
    v_condominio, 'unidad', p_unidad_id, 'propietario', v_correo, v_nombre,
    encode(extensions.digest(encode(extensions.gen_random_bytes(32), 'hex'), 'sha256'), 'hex'),
    auth.uid(), now() + interval '1 year'
  ) returning id into v_invitacion;

  -- Los espacios que la vivienda tiene ahora van con la invitación. Solo
  -- al primer propietario: un copropietario no decide sobre lo que el otro
  -- ya aceptó (09/11/2026).
  if not exists (
    select 1 from public.membresia_unidad m
     where m.unidad_id = p_unidad_id and m.rol = 'propietario' and m.activo
  ) then
    insert into public.invitacion_espacio (invitacion_id, estacionamiento_id)
    select v_invitacion, e.id from public.estacionamiento e
     where e.unidad_id = p_unidad_id;
    insert into public.invitacion_espacio (invitacion_id, deposito_id)
    select v_invitacion, d.id from public.deposito d
     where d.unidad_id = p_unidad_id;
  end if;

  update public.unidad set estado = 'invitado', updated_at = now()
   where id = p_unidad_id and estado = 'disponible';
  return query select v_tiene_cuenta, v_codigo, v_edificio;
end;
$function$;

create or replace function public.responder_espacio_de_mi_invitacion(p_espacio_id uuid, p_acepta boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_esp record;
  v_unidad uuid;
begin
  select ie.*, i.unidad_id as la_unidad into v_esp
    from public.invitacion_espacio ie
    join public.invitacion i on i.id = ie.invitacion_id
   where ie.id = p_espacio_id and ie.estado = 'pendiente'
     and i.estado = 'aceptada' and i.aceptada_por = auth.uid()
   for update of ie;
  if v_esp.id is null then
    raise exception 'Ese espacio ya no está pendiente';
  end if;
  v_unidad := v_esp.la_unidad;

  update public.invitacion_espacio
     set estado = case when p_acepta then 'aceptada'::public.estado_invitacion
                       else 'rechazada'::public.estado_invitacion end,
         resuelto_en = now()
   where id = v_esp.id;

  -- Lo que no acepta se suelta de la vivienda, salvo que la vivienda tenga
  -- otro propietario: entonces el espacio es también suyo y se queda
  -- (09/11/2026).
  if not p_acepta and not exists (
    select 1 from public.membresia_unidad m
     where m.unidad_id = v_unidad and m.rol = 'propietario' and m.activo
       and m.usuario_id <> auth.uid()
  ) then
    if v_esp.estacionamiento_id is not null then
      update public.estacionamiento set unidad_id = null, updated_at = now()
       where id = v_esp.estacionamiento_id and unidad_id = v_unidad;
    else
      update public.deposito set unidad_id = null, updated_at = now()
       where id = v_esp.deposito_id and unidad_id = v_unidad;
    end if;
  end if;
end;
$function$;

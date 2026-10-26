-- Invitar a la vivienda según el rol, en los dos sentidos (hueco 9).
--
-- `crear_invitacion` solo dejaba invitar al propietario y al inquilino líder
-- (`puede_invitar_a_unidad`). Con los permisos por rol, el administrador de la
-- app puede dejar invitar también al residente, al corresidente o al
-- coadministrador de vivienda; y quitárselo al inquilino líder lo hace el
-- disparador `invitacion_segun_el_rol`, que ahora no toca a los huéspedes
-- temporales (eso es de la renta corta).
--
-- Solo aditiva: el cuerpo de dos funciones.

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
    -- Quien gestiona la vivienda, o un rol al que el administrador de la app
    -- le permite invitar (hueco 9, 26/10/2026). A un huésped temporal lo
    -- invita solo quien gestiona la vivienda: es la renta corta.
    if not (public.puede_invitar_a_unidad(p_unidad_id)
            or (p_rol_unidad is distinct from 'huesped_temporal'
                and public.puedo_en_la_vivienda(p_unidad_id, 'invitar_a_la_vivienda'))) then
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

  if p_vigente_hasta is not null and p_vigente_hasta < public.hoy_en_el_edificio(p_condominio_id) then
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
    auth.uid(), now() + make_interval(days => public.parametro_entero('invitacion_dias_validez')),
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


create or replace function public.invitacion_segun_el_rol()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null or new.unidad_id is null or new.rol_unidad = 'huesped_temporal' then
    return new;
  end if;
  if public.es_admin_condominio(new.condominio_id) then
    return new;
  end if;
  if exists (select 1 from public.membresia_unidad m
              where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                and m.activo and m.rol <> 'huesped_temporal')
     and not public.puedo_en_la_vivienda(new.unidad_id, 'invitar_a_la_vivienda') then
    raise exception 'Tu rol en esta vivienda no puede invitar a nadie. Lo decide el administrador de la app.';
  end if;
  return new;
end;
$$;

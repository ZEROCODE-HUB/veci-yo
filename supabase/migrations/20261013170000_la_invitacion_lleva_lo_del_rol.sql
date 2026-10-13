-- ============================================================================
-- La invitacion lleva lo del rol: permisos, porteria y documento
-- ============================================================================
-- Revision del 13/10/2026, decidido con el cliente el mismo dia.
--
--   · **Un guardia no se podia dar de alta de ninguna forma.** El formulario
--     pedia todo y terminaba en «invitalo desde Coadministradores», donde solo
--     se invita a coadministradores. El alta es una invitacion, como la de un
--     coadministrador, y lleva su porteria, su documento y sus dos permisos.
--   · **Un coadministrador invitado con permisos apagados entraba con todos.**
--     Los permisos no viajaban con la invitacion, la membresia nacia sin
--     ellos, y para un coadministrador «clave ausente» es «permitido».
--   · **Invitar dos veces al mismo correo dejaba dos enlaces validos**, y
--     «ana@» pasaba por correo.
--
-- Solo se añaden columnas. `crear_invitacion` gana tres parametros, asi que la
-- firma vieja se retira: un `create or replace` con otra lista de argumentos
-- deja las dos vivas, y PostgREST no sabe a cual llamar.

alter table public.invitacion
  add column if not exists permisos jsonb,
  add column if not exists porteria_id uuid references public.porteria(id) on delete set null,
  add column if not exists documento text;

comment on column public.invitacion.permisos is
  'Los permisos con los que nace la membresia del condominio al aceptar. Para un coadministrador van las ocho claves escritas: ausente significa permitido.';
comment on column public.invitacion.porteria_id is
  'La porteria del guardia invitado. Se copia a su membresia al aceptar.';
comment on column public.invitacion.documento is
  'El documento del guardia invitado. Se copia a su membresia al aceptar.';

create index if not exists invitacion_porteria_idx
  on public.invitacion (porteria_id) where porteria_id is not null;

drop function if exists public.crear_invitacion(
  uuid, ambito_invitacion, text, text, uuid, rol_unidad, rol_condominio,
  date, date, text, text, text, text, text);

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

CREATE OR REPLACE FUNCTION public.aceptar_invitacion(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'auth'
AS $function$
declare
  v_inv public.invitacion%rowtype;
  v_correo_usuario text;
  v_membresia_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada para aceptar la invitacion';
  end if;

  select * into v_inv
  from public.invitacion
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'La invitacion no existe';
  end if;

  if v_inv.estado <> 'pendiente' then
    raise exception 'Esta invitacion ya no esta disponible';
  end if;

  if v_inv.expira_en <= now() then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La invitacion vencio';
  end if;

  select lower(email) into v_correo_usuario from auth.users where id = auth.uid();
  if v_correo_usuario is distinct from lower(v_inv.correo) then
    raise exception 'Esta invitacion fue emitida para otro correo';
  end if;

  if v_inv.vigente_hasta is not null and v_inv.vigente_hasta < current_date then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La estancia de esta invitacion ya termino';
  end if;

  if v_inv.ambito = 'unidad' then
    -- Local a la transaccion: se apaga sola al terminar.
    perform set_config('veciyo.alta_por_invitacion', 'on', true);

    insert into public.membresia_unidad (
      unidad_id, usuario_id, nombre, rol, vigente_desde, vigente_hasta,
      telefono, codigo_pais
    )
    values (
      v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad,
      v_inv.vigente_desde, v_inv.vigente_hasta,
      v_inv.telefono, v_inv.codigo_pais
    )
    returning id into v_membresia_id;

    perform set_config('veciyo.alta_por_invitacion', 'off', true);

    update public.unidad
       set estado = 'aceptado', updated_at = now()
     where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
  else
    /*
      El `nombre` es lo que faltaba. Sin el, la administracion escribia «Rosa
      Delgado» al invitar y la lista de coadministradores enseñaba «Sin
      nombre» en cuanto Rosa aceptaba.

      En el `do update` va tambien, pero **sin pisar lo que haya**: ese camino
      es para quien ya fue miembro y vuelve, y lo que tenga puesto la
      administracion vale mas que lo que decia una invitacion vieja.
    */
    insert into public.membresia_condominio (
      condominio_id, usuario_id, rol, nombre, telefono, codigo_pais,
      permisos, porteria_id, documento
    )
    values (
      v_inv.condominio_id, auth.uid(), v_inv.rol_condominio,
      v_inv.nombre, v_inv.telefono, v_inv.codigo_pais,
      coalesce(v_inv.permisos, '{}'::jsonb), v_inv.porteria_id, v_inv.documento
    )
    on conflict (condominio_id, usuario_id, rol) do update set
      activo = true,
      nombre = coalesce(public.membresia_condominio.nombre, excluded.nombre),
      telefono = coalesce(public.membresia_condominio.telefono, excluded.telefono),
      codigo_pais = coalesce(public.membresia_condominio.codigo_pais, excluded.codigo_pais),
      -- Quien vuelve entra con lo que dice **esta** invitacion: los permisos
      -- de una membresia dada de baja no resucitan solos.
      permisos = excluded.permisos,
      porteria_id = coalesce(excluded.porteria_id, public.membresia_condominio.porteria_id),
      documento = coalesce(excluded.documento, public.membresia_condominio.documento)
    returning id into v_membresia_id;
  end if;

  update public.invitacion
     set estado = 'aceptada',
         aceptada_por = auth.uid(),
         aceptada_en = now(),
         updated_at = now()
   where id = v_inv.id;

  return v_membresia_id;
end;
$function$;

grant execute on function public.crear_invitacion(
  uuid, ambito_invitacion, text, text, uuid, rol_unidad, rol_condominio,
  date, date, text, text, text, text, text, jsonb, uuid, text) to authenticated;

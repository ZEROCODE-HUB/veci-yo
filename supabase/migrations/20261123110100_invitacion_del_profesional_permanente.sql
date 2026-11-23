-- ============================================================================
-- La invitación del profesional permanente, como las demás (23/11/2026) · 2/2
-- ============================================================================
-- Hasta hoy el profesional con cuenta recibía un correo propio, sin código
-- («descarga la app y entra con este correo»), así que al registrarse tenía
-- que escribir todo de cero. Ahora recibe la invitación de siempre: con su
-- código, el registro sale con lo que escribió quien lo registró
-- (`datos_para_registrarse`), y al aceptarla (`aceptar_invitacion`) su ficha
-- de `trabajador_de_la_vivienda` queda con su cuenta. Sigue sin ser miembro de
-- la vivienda.
--
-- El correo viejo (`correo_de_acceso_de_trabajador`) se apaga: si no, le
-- llegarían dos. La tarjeta de Inicio sigue sirviendo y marca la invitación.

alter table public.invitacion
  add column if not exists trabajador_id uuid
  references public.trabajador_de_la_vivienda(id) on delete cascade;
comment on column public.invitacion.trabajador_id is
  'Solo en las de ámbito «trabajador»: la ficha del profesional permanente que se invita a la app.';

alter table public.invitacion drop constraint invitacion_ambito_coherente;
alter table public.invitacion add constraint invitacion_ambito_coherente check (
  (ambito = 'unidad' and unidad_id is not null and rol_unidad is not null and rol_condominio is null)
  or (ambito = 'condominio' and unidad_id is null and rol_condominio is not null and rol_unidad is null)
  or (ambito = 'trabajador' and unidad_id is not null and trabajador_id is not null
      and rol_unidad is null and rol_condominio is null)
) not valid;
alter table public.invitacion validate constraint invitacion_ambito_coherente;

-- Emitirla: la pide quien registró al profesional, desde la app, y luego la
-- manda por correo como cualquier otra (`enviarInvitacion`).
create or replace function public.invitar_trabajador(p_trabajador_id uuid)
returns table (invitacion_id uuid, token text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_t public.trabajador_de_la_vivienda%rowtype;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_id uuid;
begin
  select * into v_t from public.trabajador_de_la_vivienda
   where id = p_trabajador_id and deleted_at is null;
  if v_t.id is null or not public.gestiona_trabajadores_de(v_t.unidad_id) then
    raise exception 'No tienes permiso para invitar a ese profesional';
  end if;
  if not v_t.con_app or v_t.correo_invitado is null then
    raise exception 'Ese profesional no tiene cuenta en la app';
  end if;
  if v_t.usuario_id is not null then
    raise exception 'Ese profesional ya entra con su cuenta';
  end if;

  -- Una sola vigente: la anterior deja de valer.
  update public.invitacion set estado = 'revocada', updated_at = now()
   where trabajador_id = v_t.id and estado = 'pendiente';

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, trabajador_id, correo, nombre,
    token_hash, invitada_por, expira_en, telefono, codigo_pais, invitado_id
  ) values (
    public.condominio_de_unidad(v_t.unidad_id), 'trabajador', v_t.unidad_id, v_t.id,
    lower(btrim(v_t.correo_invitado)), v_t.nombre,
    encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid(),
    now() + make_interval(days => public.parametro_entero('invitacion_dias_validez')),
    nullif(regexp_replace(coalesce(v_t.telefono, ''), '\D', '', 'g'), ''),
    v_t.codigo_pais,
    -- Su ficha de la visita: de ahí salen el apellido y el documento para el
    -- registro (`datos_para_registrarse`).
    (select g.id from public.invitado g
      where g.visita_id = v_t.visita_id
      order by g.es_titular desc, g.orden limit 1)
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$$;
comment on function public.invitar_trabajador(uuid) is
  'Emite la invitación a la app de un profesional permanente con cuenta (la misma de los demás roles, con su código). Solo quien gestiona la vivienda.';
revoke execute on function public.invitar_trabajador(uuid) from public, anon;
grant execute on function public.invitar_trabajador(uuid) to authenticated, service_role;

-- El correo viejo, apagado: ahora sale la invitación normal.
create or replace function public.correo_de_acceso_de_trabajador(p_trabajador_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Desde el 23/11/2026 el acceso le llega con la invitación de siempre
  -- (`invitar_trabajador` + el correo «invitacion»). Se deja la función para
  -- no tocar `agregar_trabajador_de_la_vivienda`, que la llama.
  return;
end;
$$;
comment on function public.correo_de_acceso_de_trabajador(uuid) is
  'Apagada el 23/11/2026: el profesional permanente recibe la invitación normal (invitar_trabajador).';

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

  if v_inv.vigente_hasta is not null and v_inv.vigente_hasta < public.hoy_en_el_edificio(v_inv.condominio_id) then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La estancia de esta invitacion ya termino';
  end if;

  if v_inv.ambito = 'trabajador' then
    -- El profesional permanente (23/11/2026): no es miembro de la vivienda;
    -- aceptar le da la cuenta a su ficha, con los permisos que le pusieron.
    update public.trabajador_de_la_vivienda
       set usuario_id = auth.uid(), aceptado_en = now()
     where id = v_inv.trabajador_id
       and deleted_at is null and con_app and usuario_id is null
    returning id into v_membresia_id;
    if v_membresia_id is null then
      raise exception 'Esta invitacion ya no esta disponible';
    end if;
  elsif v_inv.ambito = 'unidad' then
    -- Local a la transaccion: se apaga sola al terminar.
    perform set_config('veciyo.alta_por_invitacion', 'on', true);

    -- Darle la app a quien ya vivía sin ella (17/11/2026): la misma fila.
    if v_inv.membresia_unidad_id is not null then
      update public.membresia_unidad
         set usuario_id = auth.uid(), puede_acceder = true, updated_at = now()
       where id = v_inv.membresia_unidad_id
         and unidad_id = v_inv.unidad_id
         and usuario_id is null and activo and not es_menor
      returning id into v_membresia_id;
    end if;

    if v_membresia_id is null then
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
    end if;

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

CREATE OR REPLACE FUNCTION public.rechazar_invitacion(p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_correo_usuario text;
  v_inv public.invitacion%rowtype;
begin
  select * into v_inv from public.invitacion
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;

  if not found or v_inv.estado <> 'pendiente' then
    return;
  end if;

  select lower(email) into v_correo_usuario from auth.users where id = auth.uid();
  if v_correo_usuario is distinct from lower(v_inv.correo) then
    raise exception 'Esta invitacion fue emitida para otro correo';
  end if;

  update public.invitacion
     set estado = 'rechazada', updated_at = now()
   where id = v_inv.id;

  -- El profesional que no quiere la app sigue en el directorio, sin app
  -- (lo mismo que al rechazarla desde Inicio).
  if v_inv.ambito = 'trabajador' then
    update public.trabajador_de_la_vivienda
       set con_app = false, correo_invitado = null
     where id = v_inv.trabajador_id and usuario_id is null;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consultar_invitacion(p_token text)
 RETURNS TABLE(condominio text, unidad text, rol text, correo text, nombre text, expira_en timestamp with time zone, vigente boolean, vigente_desde date, vigente_hasta date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    c.nombre,
    u.codigo,
    coalesce(i.rol_unidad::text, i.rol_condominio::text, case when i.ambito = 'trabajador' then 'trabajador' end),
    i.correo,
    i.nombre,
    i.expira_en,
    (i.estado = 'pendiente' and i.expira_en > now()),
    i.vigente_desde,
    i.vigente_hasta
  from public.invitacion i
  join public.condominio c on c.id = i.condominio_id
  left join public.unidad u on u.id = i.unidad_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$function$;

CREATE OR REPLACE FUNCTION public.responder_mi_invitacion_de_trabajador(p_id uuid, p_acepta boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_t public.trabajador_de_la_vivienda%rowtype;
  v_correo text;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;

  select * into v_t from public.trabajador_de_la_vivienda
   where id = p_id for update;
  if v_t.id is null or v_t.deleted_at is not null or not v_t.con_app
     or v_t.usuario_id is not null or v_correo is null
     or lower(v_t.correo_invitado) <> v_correo then
    raise exception 'Esa invitación ya no está disponible';
  end if;

  if coalesce(p_acepta, false) then
    if exists (select 1 from public.trabajador_de_la_vivienda t
                where t.unidad_id = v_t.unidad_id and t.usuario_id = auth.uid()
                  and t.deleted_at is null) then
      raise exception 'Ya eres trabajador de esa vivienda';
    end if;
    update public.trabajador_de_la_vivienda
       set usuario_id = auth.uid(), aceptado_en = now()
     where id = v_t.id;
    -- Y su invitación queda aceptada: el enlace del correo deja de valer.
    update public.invitacion
       set estado = 'aceptada', aceptada_por = auth.uid(), aceptada_en = now(), updated_at = now()
     where trabajador_id = v_t.id and estado = 'pendiente';
  else
    -- Rechazar la app no lo saca de la vivienda: sigue en el directorio, sin app.
    update public.trabajador_de_la_vivienda
       set con_app = false, correo_invitado = null
     where id = v_t.id;
    update public.invitacion
       set estado = 'rechazada', updated_at = now()
     where trabajador_id = v_t.id and estado = 'pendiente';
  end if;
end;
$function$;

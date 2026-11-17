-- Una sola forma de invitar, igual para todos los roles (16/11/2026).
--
-- El cliente: «para Admin de edificio llega el correo pero luego le lleva a la
-- web a crear contraseña.. para el guardia le lleva a la app a mostrarle la
-- invitación e indicarle si debe iniciar sesión o crear cuenta.. y para otros
-- roles es diferente.. lo mejor es que se detecte si el usuario tiene o no
-- cuenta». Había cuatro caminos; queda uno, el de la portería:
--
--   correo con «Ver la invitación» -> la app la enseña -> un solo botón,
--   «Iniciar sesión» o «Crear cuenta» según el correo ya tenga cuenta ->
--   aceptar. Y toda invitación pendiente sale en Inicio, se pulse o no el
--   enlace.
--
-- Solo aditiva: funciones nuevas. Las viejas se quedan porque las versiones de
-- la app que ya están instaladas las llaman.

-- ----------------------------------------------------------------------------
-- 1. ¿Ese correo ya tiene cuenta? Solo para quien trae el enlace.
-- ----------------------------------------------------------------------------
-- Preguntar «¿este correo tiene cuenta?» a secas diría a cualquiera quién está
-- registrado (`cuenta_por_correo` es interna por eso mismo). Aquí la pregunta
-- va atada a un token: responde solo sobre el correo de **esa** invitación, y
-- el token llegó a ese correo. Quien lo tiene es la persona invitada, y lo que
-- se le dice es si ella misma tiene cuenta.
--
-- Nulo si el token no existe o la invitación ya no está pendiente: no hay
-- nada que decidir.

create or replace function public.la_invitacion_tiene_cuenta(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp, auth
as $$
  select exists (select 1 from auth.users u where lower(u.email) = lower(i.correo))
    from public.invitacion i
   where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and i.estado = 'pendiente'
     and i.expira_en > now();
$$;

revoke execute on function public.la_invitacion_tiene_cuenta(text) from public;
grant execute on function public.la_invitacion_tiene_cuenta(text) to anon, authenticated, service_role;
comment on function public.la_invitacion_tiene_cuenta(text) is
  'Si el correo de la invitación de este enlace ya tiene cuenta, para que la app ofrezca «Iniciar sesión» o «Crear cuenta» (16/11/2026). Solo responde a quien trae el token.';

-- ----------------------------------------------------------------------------
-- 2. Las invitaciones a una vivienda que no son de propietario ni de huésped
-- ----------------------------------------------------------------------------
-- Inquilino líder, residente, corresidente y coadministración de la vivienda
-- solo se aceptaban abriendo el enlace del correo: quien se registraba en la
-- app sin pulsarlo no las veía nunca. El propietario (con sus términos y sus
-- espacios) y el huésped (con su reserva) ya tienen las suyas.

create or replace function public.mis_invitaciones_de_la_vivienda()
returns table (id uuid, condominio text, torre integer, unidad text, rol text, invitada_por text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.id, c.nombre, t.numero::int, u.codigo, i.rol_unidad::text,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), '')
    from public.invitacion i
    join auth.users yo on yo.id = auth.uid() and yo.email_confirmed_at is not null
    join public.unidad u on u.id = i.unidad_id and u.deleted_at is null
    join public.torre t on t.id = u.torre_id
    join public.condominio c on c.id = i.condominio_id
    left join public.perfil p on p.id = i.invitada_por
   where lower(i.correo) = lower(yo.email)
     and i.ambito = 'unidad'
     and i.rol_unidad not in ('propietario', 'huesped_temporal')
     and i.estado = 'pendiente'
     and i.expira_en > now()
   order by i.created_at;
$$;

revoke execute on function public.mis_invitaciones_de_la_vivienda() from public, anon;
grant execute on function public.mis_invitaciones_de_la_vivienda() to authenticated, service_role;
comment on function public.mis_invitaciones_de_la_vivienda() is
  'Las invitaciones a una vivienda (inquilino líder, residente, corresidente, coadministración) pendientes para mi correo confirmado (16/11/2026).';

create or replace function public.responder_mi_invitacion_de_la_vivienda(p_invitacion_id uuid, p_acepta boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv public.invitacion%rowtype;
  v_correo text;
begin
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if v_correo is null then
    raise exception 'Confirma tu correo antes de responder la invitación';
  end if;

  select i.* into v_inv from public.invitacion i
   where i.id = p_invitacion_id and lower(i.correo) = v_correo
     and i.ambito = 'unidad'
     and i.rol_unidad not in ('propietario', 'huesped_temporal')
     and i.estado = 'pendiente' and i.expira_en > now()
   for update;
  if v_inv.id is null then
    raise exception 'Esa invitación ya no está pendiente';
  end if;

  if not p_acepta then
    update public.invitacion set estado = 'rechazada', updated_at = now() where id = v_inv.id;
    return;
  end if;

  if v_inv.vigente_hasta is not null and v_inv.vigente_hasta < public.hoy_en_el_edificio(v_inv.condominio_id) then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'El tiempo de esta invitación ya terminó';
  end if;

  -- El mismo alta que `aceptar_invitacion` cuando se abre el enlace del correo.
  perform set_config('veciyo.alta_por_invitacion', 'on', true);
  insert into public.membresia_unidad (
    unidad_id, usuario_id, nombre, rol, vigente_desde, vigente_hasta,
    telefono, codigo_pais
  )
  values (
    v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad,
    v_inv.vigente_desde, v_inv.vigente_hasta,
    v_inv.telefono, v_inv.codigo_pais
  );
  perform set_config('veciyo.alta_por_invitacion', 'off', true);

  update public.unidad
     set estado = 'aceptado', updated_at = now()
   where id = v_inv.unidad_id and estado in ('disponible', 'invitado');

  update public.invitacion
     set estado = 'aceptada', aceptada_por = auth.uid(), aceptada_en = now(), updated_at = now()
   where id = v_inv.id;
end;
$$;

revoke execute on function public.responder_mi_invitacion_de_la_vivienda(uuid, boolean) from public, anon;
grant execute on function public.responder_mi_invitacion_de_la_vivienda(uuid, boolean) to authenticated, service_role;
comment on function public.responder_mi_invitacion_de_la_vivienda(uuid, boolean) is
  'Acepta o rechaza, desde Inicio, una invitación a una vivienda dirigida a mi correo confirmado (16/11/2026).';

-- ----------------------------------------------------------------------------
-- 3. Un enlace nuevo para una invitación que ya existe
-- ----------------------------------------------------------------------------
-- `asignar_propietario` guarda el hash de un token que nadie recibe: su correo
-- solo decía «abre la app». Para que lleve la invitación como los demás, quien
-- la emitió pide un enlace nuevo: se genera otro token, se guarda su hash (el
-- anterior deja de valer) y se devuelve una sola vez, como `crear_invitacion`.
--
-- Lo puede pedir la administración del edificio o quien la emitió, y solo
-- mientras está pendiente.

create or replace function public.enlace_nuevo_de_invitacion(p_invitacion_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv public.invitacion%rowtype;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into v_inv from public.invitacion where id = p_invitacion_id for update;
  if v_inv.id is null then
    raise exception 'Esa invitación no existe';
  end if;
  if not (public.es_admin_condominio(v_inv.condominio_id) or v_inv.invitada_por = auth.uid()) then
    raise exception 'Solo quien la emitió o la administración puede reenviar esta invitación';
  end if;
  if v_inv.estado <> 'pendiente' or v_inv.expira_en <= now() then
    raise exception 'Esa invitación ya no está pendiente';
  end if;

  update public.invitacion
     set token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'), updated_at = now()
   where id = v_inv.id;
  return v_token;
end;
$$;

revoke execute on function public.enlace_nuevo_de_invitacion(uuid) from public, anon;
grant execute on function public.enlace_nuevo_de_invitacion(uuid) to authenticated, service_role;
comment on function public.enlace_nuevo_de_invitacion(uuid) is
  'Genera otro enlace para una invitación pendiente (el anterior deja de valer) y lo devuelve una sola vez (16/11/2026).';

-- ----------------------------------------------------------------------------
-- 4. El panel ve qué edificios esperan a que su administración acepte
-- ----------------------------------------------------------------------------
-- Desde hoy la administración de un edificio también es una invitación: hasta
-- que se acepta, el edificio no tiene a nadie, y el panel lo tiene que decir
-- en vez de ofrecer otra vez «Asignar». Correo y fechas de la invitación,
-- nada de los vecinos.

create or replace function public.panel_administraciones_pendientes()
returns table (condominio_id uuid, nombre text, correo text, enviada_en timestamptz, expira_en timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  return query
  select distinct on (i.condominio_id)
         i.condominio_id, i.nombre, i.correo, coalesce(i.enviada_en, i.created_at), i.expira_en
    from public.invitacion i
   where i.ambito = 'condominio' and i.rol_condominio = 'administrador'
     and i.estado = 'pendiente' and i.expira_en > now()
   order by i.condominio_id, i.created_at desc;
end;
$$;

revoke execute on function public.panel_administraciones_pendientes() from public, anon;
grant execute on function public.panel_administraciones_pendientes() to authenticated, service_role;
comment on function public.panel_administraciones_pendientes() is
  'Los edificios con una invitación de administración sin aceptar, para el panel de la plataforma (16/11/2026).';

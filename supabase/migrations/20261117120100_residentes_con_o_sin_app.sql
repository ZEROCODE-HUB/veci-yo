-- Quién vive en cada vivienda, más claro (17/11/2026, plan aprobado por el
-- cliente). Solo aditiva:
--
--   · el «corresidente» era lo mismo que un residente: los que hay pasan a
--     `residente`. El valor del enum se queda --lo usan las versiones
--     instaladas de la app--;
--   · un residente puede no usar la app (un niño, un abuelo): se anota con su
--     nombre y, si se quiere, su documento, sin correo ni cuenta
--     (`agregar_persona_sin_app`);
--   · después se le puede dar acceso (`dar_acceso_a_la_app`): la invitación
--     lleva la membresía que ya existe y, al aceptarla, se le une esa misma
--     fila en vez de crear otra.
--
-- El «anfitrión» (antes «coadministrador de la vivienda») no necesita nada de
-- la base: es el mismo valor `coadministrador`, que la regla de la renta
-- corta ya deja pasar y `puede_configurar_alojamiento` ya admite.

-- ─── 1. Sin corresidentes ────────────────────────────────────────────────────

update public.membresia_unidad
   set rol = 'residente', updated_at = now()
 where rol = 'corresidente' and activo;

update public.invitacion
   set rol_unidad = 'residente', updated_at = now()
 where rol_unidad = 'corresidente' and estado = 'pendiente';

-- ─── 2. Columnas nuevas ──────────────────────────────────────────────────────

alter table public.membresia_unidad
  add column if not exists tipo_documento public.tipo_documento,
  add column if not exists documento text;

comment on column public.membresia_unidad.tipo_documento is
  'El tipo de documento de quien vive en la vivienda sin usar la app (un niño, un abuelo). Opcional; quien tiene cuenta lo lleva en su perfil.';
comment on column public.membresia_unidad.documento is
  'El número de documento de quien vive en la vivienda sin usar la app. Opcional; va junto a tipo_documento.';

alter table public.invitacion
  add column if not exists membresia_unidad_id uuid
    references public.membresia_unidad(id) on delete set null;

comment on column public.invitacion.membresia_unidad_id is
  'Si la invitación es para darle la app a alguien que ya vive en la vivienda sin ella: su membresía. Al aceptarla se le une esa fila en vez de crear otra.';

-- ─── 3. Anotar a alguien sin app ─────────────────────────────────────────────

/*
  Quién puede: lo mismo que para invitar a la vivienda --`crear_invitacion`--:
  quien gestiona la vivienda (`puede_invitar_a_unidad`: propietario,
  inquilino líder, administración con el permiso de residentes) o un rol al
  que el administrador de la app le deja invitar (`puedo_en_la_vivienda`).
  Y la administración del edificio.

  La regla de la renta corta no se repite aquí: la pone el disparador
  `no_se_vive_donde_se_alquila` con su propio mensaje, el mismo para todos
  los caminos.
*/
create or replace function public.agregar_persona_sin_app(
  p_unidad_id uuid,
  p_nombre text,
  p_tipo_documento public.tipo_documento default null,
  p_documento text default null,
  p_es_menor boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_documento text := nullif(btrim(coalesce(p_documento, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;

  if not (public.puede_invitar_a_unidad(p_unidad_id)
          or public.puedo_en_la_vivienda(p_unidad_id, 'invitar_a_la_vivienda')
          or public.es_admin_condominio(public.condominio_de_unidad(p_unidad_id))) then
    raise exception 'No tienes permiso para agregar personas a esta vivienda';
  end if;

  if v_nombre is null then
    raise exception 'Falta el nombre';
  end if;

  -- El documento va entero o no va: un número sin tipo no se puede leer.
  if (p_tipo_documento is null) <> (v_documento is null) then
    raise exception 'El documento necesita el tipo y el número';
  end if;

  insert into public.membresia_unidad
    (unidad_id, usuario_id, nombre, rol, es_menor, puede_acceder, es_residente,
     tipo_documento, documento)
  values
    (p_unidad_id, null, v_nombre, 'residente', coalesce(p_es_menor, false), false, true,
     p_tipo_documento, v_documento)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.agregar_persona_sin_app(uuid, text, public.tipo_documento, text, boolean) from public, anon;
grant execute on function public.agregar_persona_sin_app(uuid, text, public.tipo_documento, text, boolean) to authenticated, service_role;

-- ─── 4. Darle la app después ─────────────────────────────────────────────────

/*
  Emite la invitación de siempre --`crear_invitacion`, con sus permisos y su
  correo-- y le apunta la membresía que ya existe. Un menor no: la base no le
  deja tener cuenta (`membresia_unidad_menor_sin_acceso`).
*/
create or replace function public.dar_acceso_a_la_app(
  p_membresia_id uuid,
  p_correo text
)
returns table(invitacion_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_m public.membresia_unidad%rowtype;
  v_inv_id uuid;
  v_token text;
begin
  select * into v_m from public.membresia_unidad where id = p_membresia_id;
  if v_m.id is null or not v_m.activo then
    raise exception 'Esa persona ya no está en la vivienda';
  end if;
  if v_m.usuario_id is not null then
    raise exception 'Esa persona ya usa la app';
  end if;
  if v_m.es_menor then
    raise exception 'Un menor de edad no puede tener cuenta en la app';
  end if;

  -- `crear_invitacion` comprueba quién invita, igual que desde el formulario.
  select c.invitacion_id, c.token into v_inv_id, v_token
    from public.crear_invitacion(
      public.condominio_de_unidad(v_m.unidad_id), 'unidad', p_correo, v_m.nombre,
      v_m.unidad_id, v_m.rol
    ) c;

  update public.invitacion
     set membresia_unidad_id = v_m.id, updated_at = now()
   where id = v_inv_id;

  return query select v_inv_id, v_token;
end;
$$;

revoke execute on function public.dar_acceso_a_la_app(uuid, text) from public, anon;
grant execute on function public.dar_acceso_a_la_app(uuid, text) to authenticated, service_role;

-- ─── 5. Al aceptar, se une a la fila que ya existe ───────────────────────────

/*
  `aceptar_invitacion` con su cuerpo entero (el último,
  20261005270000_lo_que_se_escribe_al_invitar_no_se_tira.sql). Lo único
  nuevo: si la invitación trae `membresia_unidad_id` y esa fila sigue siendo
  de alguien sin cuenta en esa vivienda, se le pone la cuenta en vez de crear
  otra. Si ya no está (la dieron de baja), se crea como siempre.
*/
create or replace function public.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp, auth
as $$
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

  if v_inv.ambito = 'unidad' then
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
$$;

/*
  `responder_mi_invitacion_de_la_vivienda` con su cuerpo entero (el último,
  20261116120000_una_sola_forma_de_invitar.sql) y el mismo cambio.
*/
create or replace function public.responder_mi_invitacion_de_la_vivienda(p_invitacion_id uuid, p_acepta boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv public.invitacion%rowtype;
  v_correo text;
  v_unida uuid;
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

  -- Darle la app a quien ya vivía sin ella (17/11/2026): la misma fila.
  if v_inv.membresia_unidad_id is not null then
    update public.membresia_unidad
       set usuario_id = auth.uid(), puede_acceder = true, updated_at = now()
     where id = v_inv.membresia_unidad_id
       and unidad_id = v_inv.unidad_id
       and usuario_id is null and activo and not es_menor
    returning id into v_unida;
  end if;

  if v_unida is null then
    insert into public.membresia_unidad (
      unidad_id, usuario_id, nombre, rol, vigente_desde, vigente_hasta,
      telefono, codigo_pais
    )
    values (
      v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad,
      v_inv.vigente_desde, v_inv.vigente_hasta,
      v_inv.telefono, v_inv.codigo_pais
    );
  end if;
  perform set_config('veciyo.alta_por_invitacion', 'off', true);

  update public.unidad
     set estado = 'aceptado', updated_at = now()
   where id = v_inv.unidad_id and estado in ('disponible', 'invitado');

  update public.invitacion
     set estado = 'aceptada', aceptada_por = auth.uid(), aceptada_en = now(), updated_at = now()
   where id = v_inv.id;
end;
$$;

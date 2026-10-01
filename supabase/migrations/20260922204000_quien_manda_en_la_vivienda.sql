-- ----------------------------------------------------------------------------
-- Dos políticas demasiado anchas
-- ----------------------------------------------------------------------------
-- Al barrer las políticas de escritura de las 55 tablas aparecieron dos con la
-- misma forma: `for all` con un predicado que responde "¿tenés algo que ver
-- con esta fila?" en vez de "¿podés hacer **esto** con esta fila?". Las dos se
-- comprobaron con sesiones reales antes de tocar nada.
--
-- **1. Cualquier miembro de una vivienda podía reescribir quién pertenece a
-- ella.** `membresia_unidad_escritura` era `es_miembro_unidad(unidad_id) OR
-- es_admin_condominio(...)`. Con una sola llamada a la API, Laura —inquilina
-- líder de la 205— se ascendió a **propietaria** y **borró la membresía del
-- propietario real**. No hacía falta ninguna astucia: es un PATCH y un DELETE.
--
-- **2. Quien pide una reserva podía aprobársela.** `reserva_zona_escritura`
-- era `puede_operar_unidad`, y `estado` es una columna más. Un residente
-- reservó el salón de eventos —zona marcada `requiere_aprobacion`— y lo pasó a
-- `aprobada` él mismo. La casilla no sujetaba nada.
--
-- En los dos casos el dato sensible es una columna concreta —`rol`, `estado`—
-- y RLS no puede comparar el valor viejo con el nuevo: `using` ve la fila
-- anterior y `with check` la nueva, pero ninguna las dos a la vez. Por eso la
-- parte que depende del cambio va en un disparador y la que depende de la fila,
-- en la política.


-- ----------------------------------------------------------------------------
-- Quién pertenece a una vivienda
-- ----------------------------------------------------------------------------

drop policy if exists membresia_unidad_escritura on public.membresia_unidad;
drop policy if exists membresia_unidad_alta on public.membresia_unidad;
drop policy if exists membresia_unidad_cambio on public.membresia_unidad;
drop policy if exists membresia_unidad_baja on public.membresia_unidad;

-- Dar de alta a alguien: quien gestiona la vivienda. Es el mismo criterio que
-- para invitar, y no por casualidad: son la misma decisión.
create policy membresia_unidad_alta on public.membresia_unidad
  for insert to authenticated
  with check (public.puede_invitar_a_unidad(unidad_id));

-- Modificar: quien gestiona la vivienda, y cada quien su propia fila —el
-- nombre y el teléfono que se muestran—. Lo que NO se puede cambiar de la
-- propia fila lo decide el disparador.
create policy membresia_unidad_cambio on public.membresia_unidad
  for update to authenticated
  using (
    public.puede_invitar_a_unidad(unidad_id)
    or usuario_id = auth.uid()
  )
  with check (
    public.puede_invitar_a_unidad(unidad_id)
    or usuario_id = auth.uid()
  );

-- Dar de baja: quien gestiona la vivienda, o uno mismo al marcharse.
create policy membresia_unidad_baja on public.membresia_unidad
  for delete to authenticated
  using (
    public.puede_invitar_a_unidad(unidad_id)
    or usuario_id = auth.uid()
  );


create or replace function public.proteger_membresia_unidad()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad uuid;
  v_admin boolean;
begin
  v_unidad := case when tg_op = 'DELETE' then old.unidad_id else new.unidad_id end;

  -- Sin sesión de aplicación no hay a quién restringir: son las migraciones,
  -- la clave de servicio o la consola SQL, que ya pasan por encima de RLS de
  -- todos modos. Sin esta salida, el disparador impediría reparar los datos
  -- desde fuera de la app, que es justamente cuando hace falta.
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- `aceptar_invitacion` crea la membresía en nombre de quien acepta, y puede
  -- ser la del propietario. Esa alta ya pasó su propio control —invitación
  -- válida, vigente y emitida para ese correo—, así que se deja pasar. La
  -- bandera es local a la transacción: nadie puede encenderla desde fuera.
  if coalesce(current_setting('veciyo.alta_por_invitacion', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_admin := public.es_admin_condominio(public.condominio_de_unidad(v_unidad));
  if v_admin then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- La propiedad de una vivienda es un hecho legal que registra la
  -- administración. No se la pone uno, no se la quita a otro.
  if tg_op = 'DELETE' and old.rol = 'propietario' then
    raise exception 'Solo la administracion puede dar de baja al propietario de una vivienda';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.rol = 'propietario' then
    raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
  end if;
  if tg_op = 'UPDATE' and old.rol = 'propietario' then
    raise exception 'Solo la administracion puede modificar la membresia del propietario';
  end if;

  -- Y nadie se cambia a si mismo el rol ni sus propios permisos.
  if tg_op = 'UPDATE' and new.usuario_id = auth.uid() and (
       new.rol is distinct from old.rol
    or new.puede_acceder is distinct from old.puede_acceder
    or new.activo is distinct from old.activo
    or new.es_admin_primario is distinct from old.es_admin_primario
    or new.es_anfitrion_primario is distinct from old.es_anfitrion_primario
  ) then
    raise exception 'No podes cambiar tu propio rol ni tus propios permisos';
  end if;

  -- En un disparador `before delete`, devolver `new` es devolver NULL, y eso
  -- **cancela el borrado en silencio**: ni error, ni fila, ni pista. Hay que
  -- devolver `old`.
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists membresia_unidad_proteger on public.membresia_unidad;

create trigger membresia_unidad_proteger
  before insert or update or delete on public.membresia_unidad
  for each row execute function public.proteger_membresia_unidad();


-- `aceptar_invitacion` enciende la bandera para su propio `insert`.
create or replace function public.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
      unidad_id, usuario_id, nombre, rol, vigente_desde, vigente_hasta
    )
    values (
      v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad,
      v_inv.vigente_desde, v_inv.vigente_hasta
    )
    returning id into v_membresia_id;

    perform set_config('veciyo.alta_por_invitacion', 'off', true);

    update public.unidad
       set estado = 'aceptado', updated_at = now()
     where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
  else
    insert into public.membresia_condominio (condominio_id, usuario_id, rol)
    values (v_inv.condominio_id, auth.uid(), v_inv.rol_condominio)
    on conflict (condominio_id, usuario_id, rol) do update set activo = true
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


-- ----------------------------------------------------------------------------
-- Quién aprueba una reserva
-- ----------------------------------------------------------------------------
-- Cancelar lo propio sigue siendo de uno. Decidir, no.

create or replace function public.proteger_resolucion_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;

  if new.estado not in ('aprobada', 'rechazada') then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  select z.condominio_id into v_condominio
  from public.zona_comun z where z.id = new.zona_id;

  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion aprueba o rechaza una reserva';
  end if;

  return new;
end;
$$;

drop trigger if exists reserva_zona_proteger_resolucion on public.reserva_zona;

-- Antes del disparador que notifica, para que no se avise de una aprobacion
-- que se va a rechazar.
create trigger reserva_zona_proteger_resolucion
  before update on public.reserva_zona
  for each row execute function public.proteger_resolucion_reserva();

comment on function public.proteger_resolucion_reserva() is
  'Aprobar o rechazar es de la administracion. Sin esto, quien pedia la reserva la aprobaba el mismo y `requiere_aprobacion` no sujetaba nada.';

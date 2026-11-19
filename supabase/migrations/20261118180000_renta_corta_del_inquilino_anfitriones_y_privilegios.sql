-- ============================================================================
-- Roles de la vivienda: renta corta del inquilino, anfitriones y privilegios
-- por persona (18/11/2026, pedido del cliente)
-- ============================================================================
--   · El propietario puede darle la renta corta al inquilino líder
--     (`puede_renta_corta`), y solo si este no vive ahí (decisión del
--     cliente: se mantiene «no se vive donde se alquila por noches»). Al
--     dársela, el inquilino líder queda como no residente.
--   · Con la renta corta en marcha, todos los de la vivienda (menos el
--     huésped) configuran el alojamiento: «todos son anfitriones».
--   · Privilegios por persona sobre lo que el rol permite: registrar visitas
--     (`persona_registra_visitas`) y reservar zonas (`persona_reserva_zonas`).
--     Los cambia quien gestiona la vivienda, nunca uno mismo.
--   · El residente vuelve a poder registrar visitas: estaba apagado en el
--     panel (permiso_de_rol), y el cliente dice que sí debe poder.
--
-- Solo aditiva: tres columnas, dos funciones nuevas y siete con su cuerpo de
-- hoy más estas reglas.

alter table public.membresia_unidad
  add column if not exists puede_renta_corta boolean not null default false,
  add column if not exists persona_registra_visitas boolean not null default true,
  add column if not exists persona_reserva_zonas boolean not null default true;

comment on column public.membresia_unidad.puede_renta_corta is
  'Solo del inquilino líder: el propietario le dio la renta corta (18/11/2026). Exige que no viva ahí.';
comment on column public.membresia_unidad.persona_registra_visitas is
  'Si esta persona registra visitas, además de lo que permita su rol (18/11/2026). Lo cambia quien gestiona la vivienda.';
comment on column public.membresia_unidad.persona_reserva_zonas is
  'Si esta persona reserva zonas comunes, además de lo que permita su rol (18/11/2026). Lo cambia quien gestiona la vivienda.';

-- El disparador de «no se vive donde se alquila» mira también el permiso.
drop trigger if exists membresia_unidad_no_se_vive_donde_se_alquila on public.membresia_unidad;
create trigger membresia_unidad_no_se_vive_donde_se_alquila
  before insert or update of es_residente, rol, activo, puede_renta_corta on public.membresia_unidad
  for each row execute function public.no_se_vive_donde_se_alquila();

-- El residente registra visitas (la regla general, sin excepción por edificio).
update public.permiso_de_rol set permitido = true, updated_at = now()
where rol = 'residente' and accion = 'registrar_visitas' and condominio_id is null and not permitido;

-- ─── Darle la renta corta al inquilino líder ──────────────────────────────

create or replace function public.dar_renta_corta_al_inquilino(p_membresia_id uuid, p_dar boolean)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_m public.membresia_unidad%rowtype;
begin
  select * into v_m from public.membresia_unidad where id = p_membresia_id and activo;
  if v_m.id is null or v_m.rol <> 'inquilino_lider' then
    raise exception 'Solo se le da la renta corta a un inquilino líder de la vivienda';
  end if;
  if not (public.es_propietario_de(v_m.unidad_id)
          or public.es_admin_condominio(public.condominio_de_unidad(v_m.unidad_id))) then
    raise exception 'La renta corta al inquilino líder la da el propietario de la vivienda';
  end if;
  if coalesce(p_dar, false) and not coalesce(public.autorizacion_renta_corta(v_m.unidad_id), false) then
    raise exception 'El edificio no permite la renta corta en esta vivienda';
  end if;

  if coalesce(p_dar, false) then
    -- Solo si no vive ahí: al dársela queda como no residente.
    update public.membresia_unidad
       set puede_renta_corta = true, es_residente = false
     where id = p_membresia_id;
  else
    if public.renta_corta_en_marcha(v_m.unidad_id) then
      raise exception 'La renta corta está en marcha: primero se da de baja.';
    end if;
    update public.membresia_unidad set puede_renta_corta = false where id = p_membresia_id;
  end if;
end;
$$;
comment on function public.dar_renta_corta_al_inquilino(uuid, boolean) is
  'El propietario (o la administración) le da o le quita la renta corta al inquilino líder (18/11/2026). Al dársela queda como no residente.';
revoke execute on function public.dar_renta_corta_al_inquilino(uuid, boolean) from public, anon;
grant execute on function public.dar_renta_corta_al_inquilino(uuid, boolean) to authenticated, service_role;

-- ─── Privilegios por persona ──────────────────────────────────────────────

create or replace function public.cambiar_privilegios_de_persona(
  p_membresia_id uuid, p_registra_visitas boolean, p_reserva_zonas boolean)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_m public.membresia_unidad%rowtype;
begin
  select * into v_m from public.membresia_unidad where id = p_membresia_id and activo;
  if v_m.id is null or not public.puede_invitar_a_unidad(v_m.unidad_id) then
    raise exception 'No tienes permiso para cambiar los privilegios de esa persona';
  end if;
  if v_m.usuario_id = auth.uid() then
    raise exception 'No puedes cambiar tus propios privilegios';
  end if;
  if v_m.rol in ('propietario', 'huesped_temporal') then
    raise exception 'Los privilegios del propietario y del huésped no se cambian aquí';
  end if;
  update public.membresia_unidad
     set persona_registra_visitas = coalesce(p_registra_visitas, persona_registra_visitas),
         persona_reserva_zonas = coalesce(p_reserva_zonas, persona_reserva_zonas)
   where id = p_membresia_id;
end;
$$;
comment on function public.cambiar_privilegios_de_persona(uuid, boolean, boolean) is
  'Quien gestiona la vivienda le da o le quita a una persona registrar visitas y reservar zonas (18/11/2026). No a sí mismo, ni al propietario ni al huésped.';
revoke execute on function public.cambiar_privilegios_de_persona(uuid, boolean, boolean) from public, anon;
grant execute on function public.cambiar_privilegios_de_persona(uuid, boolean, boolean) to authenticated, service_role;

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
    -- 18/11/2026: los privilegios por persona y la renta corta del inquilino.
    or new.persona_registra_visitas is distinct from old.persona_registra_visitas
    or new.persona_reserva_zonas is distinct from old.persona_reserva_zonas
    or new.puede_renta_corta is distinct from old.puede_renta_corta
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

CREATE OR REPLACE FUNCTION public.vive_alguien_en(p_unidad_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select string_agg(mu.nombre, ', ' order by mu.nombre)
    from public.membresia_unidad mu
   where mu.unidad_id = p_unidad_id
     and mu.activo
     and mu.rol not in ('huesped_temporal', 'coadministrador')
     and (mu.es_residente or mu.rol in ('inquilino_lider', 'residente', 'corresidente'))
     -- El inquilino líder al que el propietario le dio la renta corta y que
     -- no vive ahí (18/11/2026): administra el alquiler, no lo ocupa.
     and not (mu.rol = 'inquilino_lider' and mu.puede_renta_corta and not mu.es_residente);
$function$;

CREATE OR REPLACE FUNCTION public.no_se_vive_donde_se_alquila()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not coalesce(new.activo, false) or new.rol in ('huesped_temporal', 'coadministrador') then
    return new;
  end if;
  if not public.vivienda_en_alquiler(new.unidad_id) then
    return new;
  end if;

  -- El inquilino líder con la renta corta y sin vivir ahí (18/11/2026).
  if new.rol = 'inquilino_lider' and new.puede_renta_corta then
    if new.es_residente then
      raise exception 'Mientras la vivienda se alquila por noches nadie puede vivir en ella: el inquilino líder que la administra figura como no residente.';
    end if;
    return new;
  end if;

  if new.rol in ('inquilino_lider', 'residente', 'corresidente') then
    if tg_op = 'INSERT' or old.rol is distinct from new.rol or not coalesce(old.activo, false) then
      raise exception 'Esta vivienda se alquila por noches: no puede tener inquilino líder ni residentes. Primero se da de baja la renta corta y terminan sus reservas.';
    end if;
    return new;
  end if;

  if new.rol = 'propietario' and new.es_residente then
    if tg_op = 'INSERT' then
      -- Un propietario que se registra en una vivienda alquilada no vive en ella.
      new.es_residente := false;
    elsif not coalesce(old.es_residente, false) then
      raise exception 'Mientras la vivienda se alquila por noches no puedes ser residente. Da de baja la renta corta y espera a que terminen sus reservas.';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.activar_suscripcion_renta_corta(p_unidad_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not (
    exists (select 1 from public.membresia_unidad mu
             where mu.unidad_id = p_unidad_id and mu.usuario_id = auth.uid()
               and mu.activo
               and (mu.rol = 'propietario'
                    -- El inquilino líder al que el propietario se la dio (18/11/2026).
                    or (mu.rol = 'inquilino_lider' and mu.puede_renta_corta)))
    or public.es_admin_condominio(public.condominio_de_unidad(p_unidad_id))
  ) then
    raise exception 'La renta corta solo la activa el propietario de la vivienda (y no puede vivir en ella)'
      using errcode = '42501';
  end if;

  insert into public.suscripcion_renta_corta (unidad_id, estado, cancelada_en)
  values (p_unidad_id, 'activa', null)
  on conflict (unidad_id) do update
    set estado = 'activa', cancelada_en = null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.puede_configurar_alojamiento(p_unidad_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

  select exists (

    select 1 from public.membresia_unidad mu

    where mu.unidad_id = p_unidad_id

      and mu.usuario_id = auth.uid()

      and mu.activo

      -- Quien responde por la vivienda, y a quien el propietario delega.

      -- Desde el 18/11/2026 el inquilino líder solo si el propietario le dio
      -- la renta corta, y con la renta corta en marcha todos los de la
      -- vivienda hacen de anfitrión (pedido del cliente), menos el huésped.
      and (mu.rol in ('propietario', 'coadministrador')
           or (mu.rol = 'inquilino_lider' and mu.puede_renta_corta)
           or (mu.rol <> 'huesped_temporal' and public.renta_corta_en_marcha(p_unidad_id)))

  )

  -- Del condominio, solo la administracion. La porteria no configura viviendas.

  or public.es_admin_condominio(public.condominio_de_unidad(p_unidad_id));

$function$;

CREATE OR REPLACE FUNCTION public.visita_segun_el_rol()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- Sin sesión (la clave de servicio, el calendario) o una estancia de
  -- huésped: no es esta regla.
  if auth.uid() is null or new.tipo = 'huesped_temporal' or new.unidad_id is null then
    return new;
  end if;
  if public.es_administrador_principal(new.condominio_id) or public.es_guardia_activo(new.condominio_id) then
    return new;
  end if;

  if exists (select 1 from public.membresia_unidad m
              where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                and m.activo and m.rol <> 'huesped_temporal') then
    if not public.puedo_en_la_vivienda(new.unidad_id, 'registrar_visitas') then
      raise exception 'Tu rol en esta vivienda no puede registrar visitas. Lo decide el administrador de la app.';
    end if;
    -- Y la persona: quien gestiona la vivienda se lo puede quitar (18/11/2026).
    if exists (select 1 from public.membresia_unidad m
                where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                  and m.activo and m.rol <> 'huesped_temporal'
                  and not m.persona_registra_visitas) then
      raise exception 'Quien gestiona tu vivienda te quitó el permiso de registrar visitas.';
    end if;
  elsif public.es_coadministrador_de_edificio(new.condominio_id)
        and not public.rol_puede(new.condominio_id, 'coadministrador_edificio', 'registrar_visitas') then
    raise exception 'Como coadministrador del edificio no puedes registrar visitas. Lo decide el administrador de la app.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reserva_segun_el_rol()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_condominio uuid;
begin
  if auth.uid() is null or new.unidad_id is null then
    return new;
  end if;
  select z.condominio_id into v_condominio from public.zona_comun z where z.id = new.zona_id;
  if public.es_admin_condominio(v_condominio) or public.es_guardia_activo(v_condominio) then
    return new;
  end if;
  if exists (select 1 from public.membresia_unidad m
              where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                and m.activo and m.rol <> 'huesped_temporal')
     and not public.puedo_en_la_vivienda(new.unidad_id, 'reservar_zonas') then
    raise exception 'Tu rol en esta vivienda no puede reservar zonas comunes. Lo decide el administrador de la app.';
  end if;
  -- Y la persona (18/11/2026).
  if exists (select 1 from public.membresia_unidad m
              where m.unidad_id = new.unidad_id and m.usuario_id = auth.uid()
                and m.activo and m.rol <> 'huesped_temporal'
                and not m.persona_reserva_zonas) then
    raise exception 'Quien gestiona tu vivienda te quitó el permiso de reservar zonas comunes.';
  end if;
  return new;
end;
$function$;

-- ─── El contacto de emergencia lo ponen el propietario o el inquilino líder ─

/*
  Pedido del cliente (18/11/2026): «Solo inquilino líder o propietario deben
  poder configurar un contacto de emergencia». La política de cambio deja a
  cada uno tocar su propia fila, así que va en un disparador: RLS no sabe
  comparar el valor viejo con el nuevo.
*/
create or replace function public.contacto_de_emergencia_lo_pone_quien_gestiona()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.contacto_emergencia_nombre is distinct from old.contacto_emergencia_nombre
      or new.contacto_emergencia_codigo is distinct from old.contacto_emergencia_codigo
      or new.contacto_emergencia_telefono is distinct from old.contacto_emergencia_telefono)
     and not exists (
       select 1 from public.membresia_unidad yo
       where yo.unidad_id = new.unidad_id and yo.usuario_id = auth.uid() and yo.activo
         and yo.rol in ('propietario', 'inquilino_lider'))
     and not public.es_admin_condominio(public.condominio_de_unidad(new.unidad_id)) then
    raise exception 'El contacto de emergencia lo ponen el propietario o el inquilino líder de la vivienda'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke execute on function public.contacto_de_emergencia_lo_pone_quien_gestiona() from public, anon, authenticated;

drop trigger if exists membresia_unidad_contacto_de_emergencia on public.membresia_unidad;
create trigger membresia_unidad_contacto_de_emergencia
  before update of contacto_emergencia_nombre, contacto_emergencia_codigo, contacto_emergencia_telefono
  on public.membresia_unidad
  for each row execute function public.contacto_de_emergencia_lo_pone_quien_gestiona();

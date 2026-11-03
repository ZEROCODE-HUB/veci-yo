-- El estacionamiento o depósito rechazado se suelta y se ve al momento
-- (Para Claude 209 y T-385, 03/11/2026).
--
-- Al rechazar un espacio, `responder_espacio_de_mi_invitacion` ya lo soltaba
-- de la vivienda: comprobado en la base, el Dep-105 de la prueba del cliente
-- quedó sin vivienda. Lo que fallaba era la pantalla de Arquitectura de la
-- administración, que no se enteraba hasta recargar. Se añaden las dos
-- tablas a la publicación de cambios en vivo, y la pantalla las escucha.
--
-- Y un hueco al lado: rechazar la vivienda entera marcaba sus espacios como
-- rechazados pero no los soltaba. Se recrea `responder_mi_invitacion` igual
-- que estaba, soltándolos. Solo aditiva.

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'estacionamiento') then
    alter publication supabase_realtime add table public.estacionamiento;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'deposito') then
    alter publication supabase_realtime add table public.deposito;
  end if;
end $$;

create or replace function public.responder_mi_invitacion(p_invitacion_id uuid, p_acepta boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp', 'auth'
as $function$
declare
  v_inv record;
  v_correo text;
begin
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if v_correo is null then
    raise exception 'Confirma tu correo antes de responder la invitación';
  end if;

  select i.* into v_inv from public.invitacion i
   where i.id = p_invitacion_id and lower(i.correo) = v_correo
     and i.ambito = 'unidad' and i.rol_unidad = 'propietario'
     and i.estado = 'pendiente' and i.expira_en > now()
   for update;
  if v_inv.id is null then
    raise exception 'Esa invitación ya no está pendiente';
  end if;

  if not p_acepta then
    update public.invitacion set estado = 'rechazada', updated_at = now() where id = v_inv.id;
    -- Y sus espacios se sueltan de la vivienda, como al rechazar uno solo
    -- (Para Claude 209, 03/11/2026): antes se marcaban rechazados y seguían
    -- asignados.
    update public.estacionamiento e set unidad_id = null, updated_at = now()
      from public.invitacion_espacio ie
     where ie.invitacion_id = v_inv.id and ie.estado = 'pendiente'
       and e.id = ie.estacionamiento_id and e.unidad_id = v_inv.unidad_id;
    update public.deposito d set unidad_id = null, updated_at = now()
      from public.invitacion_espacio ie
     where ie.invitacion_id = v_inv.id and ie.estado = 'pendiente'
       and d.id = ie.deposito_id and d.unidad_id = v_inv.unidad_id;
    update public.invitacion_espacio set estado = 'rechazada', resuelto_en = now()
     where invitacion_id = v_inv.id and estado = 'pendiente';
    return;
  end if;

  perform set_config('veciyo.alta_por_invitacion', 'on', true);
  if not exists (select 1 from public.membresia_unidad
                 where unidad_id = v_inv.unidad_id and usuario_id = auth.uid()
                   and rol = 'propietario' and activo) then
    insert into public.membresia_unidad (unidad_id, usuario_id, nombre, rol)
    values (v_inv.unidad_id, auth.uid(), v_inv.nombre, 'propietario');
  end if;
  perform set_config('veciyo.alta_por_invitacion', 'off', true);

  update public.unidad set estado = 'aceptado', updated_at = now()
   where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
  update public.invitacion
     set estado = 'aceptada', aceptada_por = auth.uid(), aceptada_en = now(), updated_at = now()
   where id = v_inv.id;
end;
$function$;

-- Una vivienda eliminada no deja asignaciones vivas (29/10/2026, Para Claude 160).
--
-- Se asignó un propietario (sin cuenta todavía), se eliminó el departamento y,
-- al crear la cuenta, `reclamar_asignaciones` le dio igualmente la vivienda
-- eliminada, que ya no se podía quitar desde ningún sitio. Ahora:
--   · al eliminar una vivienda (borrado lógico) se revocan sus invitaciones
--     pendientes y se dan de baja sus membresías (no se borra nada);
--   · `reclamar_asignaciones` ignora las viviendas eliminadas;
--   · se da de baja la que ya se coló.
-- Solo aditiva.

create or replace function public.vivienda_eliminada_suelta_lo_pendiente()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.invitacion
       set estado = 'revocada', updated_at = now()
     where unidad_id = new.id and estado = 'pendiente';
    perform set_config('veciyo.alta_por_invitacion', 'on', true);
    update public.membresia_unidad set activo = false where unidad_id = new.id and activo;
    perform set_config('veciyo.alta_por_invitacion', 'off', true);
  end if;
  return new;
end;
$$;
comment on function public.vivienda_eliminada_suelta_lo_pendiente() is
  'Al eliminar una vivienda se revocan sus invitaciones/asignaciones pendientes y se dan de baja sus membresías (29/10/2026).';
drop trigger if exists unidad_eliminada_suelta_lo_pendiente on public.unidad;
create trigger unidad_eliminada_suelta_lo_pendiente after update of deleted_at on public.unidad
  for each row execute function public.vivienda_eliminada_suelta_lo_pendiente();

create or replace function public.reclamar_asignaciones()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp', 'auth'
as $$
declare
  v_correo text;
  v_inv    record;
  v_n      integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if v_correo is null then
    return 0;
  end if;

  for v_inv in
    select i.* from public.invitacion i
      join public.unidad u on u.id = i.unidad_id and u.deleted_at is null
     where lower(i.correo) = v_correo and i.estado = 'pendiente'
       and i.ambito = 'unidad' and i.rol_unidad = 'propietario'
       and i.expira_en > now()
     for update of i
  loop
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
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Lo que ya se coló: membresías vivas en viviendas eliminadas.
update public.membresia_unidad mu set activo = false
  from public.unidad u
 where u.id = mu.unidad_id and u.deleted_at is not null and mu.activo;
update public.invitacion i set estado = 'revocada', updated_at = now()
  from public.unidad u
 where u.id = i.unidad_id and u.deleted_at is not null and i.estado = 'pendiente';

-- Terminar una estancia que todavía no empezó apaga el acceso del huésped.
--
-- `20261023130000` acortaba el acceso a hoy al terminar la estancia. Si la
-- estancia aún no había empezado, el fin quedaba antes del inicio,
-- `membresia_unidad_vigencia_coherente` lo rechazaba y con él fallaba el cambio
-- de estado entero. Lo encontró su propia prueba. Ahora el fin nunca queda
-- antes del inicio, y si no había empezado el acceso se apaga.

create or replace function public.cerrar_enlaces_de_reserva_terminada()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_hoy date;
begin
  if (new.deleted_at is not null and old.deleted_at is null)
     or (new.estado = 'cancelada' and old.estado is distinct from 'cancelada') then
    if new.precheckin_expira_en is null or new.precheckin_expira_en > now() then
      new.precheckin_expira_en := now();
    end if;

    if new.tipo = 'huesped_temporal' then
      update public.membresia_unidad m
         set activo = false
        from public.invitado i
       where i.visita_id = new.id
         and i.usuario_id = m.usuario_id
         and m.unidad_id = new.unidad_id
         and m.rol = 'huesped_temporal'
         and m.vigente_desde is not distinct from new.fecha_desde
         and m.activo;
    end if;

  -- Terminada antes de su fecha: el acceso dura como mucho hasta hoy.
  elsif new.tipo = 'huesped_temporal'
        and new.estado = 'finalizada' and old.estado is distinct from 'finalizada' then
    v_hoy := (now() at time zone public.zona_horaria_del_condominio(new.condominio_id))::date;
    update public.membresia_unidad m
       set vigente_hasta = greatest(coalesce(m.vigente_desde, v_hoy), v_hoy),
           -- Si todavía no había empezado, no queda nada que dejarle.
           activo = case when m.vigente_desde > v_hoy then false else m.activo end
      from public.invitado i
     where i.visita_id = new.id
       and i.usuario_id = m.usuario_id
       and m.unidad_id = new.unidad_id
       and m.rol = 'huesped_temporal'
       and m.vigente_desde is not distinct from new.fecha_desde
       and (m.vigente_hasta is null or m.vigente_hasta > v_hoy);
  end if;
  return new;
end;
$$;

comment on function public.cerrar_enlaces_de_reserva_terminada() is
  'Al borrar o cancelar una reserva, vence su enlace de preregistro (y con él '
  'los de sus acompañantes) y desactiva el acceso del huésped con cuenta. Al '
  'terminarla antes de su fecha, el acceso dura como mucho hasta hoy.';

revoke all on function public.cerrar_enlaces_de_reserva_terminada() from public, anon, authenticated;

-- Borrar o cancelar una reserva cierra también el acceso del huésped.
--
-- QA 23/10/2026: Tomás seguía entrando a «Mi alojamiento» de la 102 por dos
-- estancias que ya estaban borradas. La membresía del huésped con cuenta nace
-- con las fechas de la estancia (`aceptar_invitacion`) y solo la movía
-- `cambiar_fechas_de_estancia`; borrar o cancelar la reserva no la tocaba.
--
-- Se casa igual que en `cambiar_fechas_de_estancia`: invitado de la reserva con
-- cuenta, misma vivienda, rol de huésped y misma fecha de entrada.
--
-- `security definer`: quien borra es el anfitrión, y la membresía del huésped
-- no es suya; la política no le dejaría tocarla.

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
       set vigente_hasta = v_hoy
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

-- Las que ya estaban borradas o canceladas con el huésped dentro de la app.
update public.membresia_unidad m
   set activo = false
  from public.invitado i
  join public.visita v on v.id = i.visita_id
 where i.usuario_id = m.usuario_id
   and m.unidad_id = v.unidad_id
   and m.rol = 'huesped_temporal'
   and m.vigente_desde is not distinct from v.fecha_desde
   and v.tipo = 'huesped_temporal'
   and (v.deleted_at is not null or v.estado = 'cancelada')
   and m.activo
   -- Si la misma persona tiene otra estancia vigente que empieza ese día, no.
   and not exists (
     select 1 from public.invitado i2
     join public.visita v2 on v2.id = i2.visita_id
     where i2.usuario_id = m.usuario_id
       and v2.unidad_id = m.unidad_id
       and v2.fecha_desde is not distinct from m.vigente_desde
       and v2.deleted_at is null and v2.estado <> 'cancelada'
   );

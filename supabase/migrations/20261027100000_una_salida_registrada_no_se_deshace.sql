-- ----------------------------------------------------------------------------
-- Una salida registrada no se deshace (27/10/2026)
-- ----------------------------------------------------------------------------
-- Hueco 31 del GSheet. La portería registraba la salida con un interruptor que
-- se podía volver a apagar, y al apagarlo la visita volvía a `ingresada` con el
-- estacionamiento ya soltado: el cupo figuraba libre con el coche dentro. El
-- cliente decidió el 27/10/2026: «que no exista la opción de deshacer la
-- salida de una visita», y que la pantalla pida confirmar antes de registrarla.
--
-- La regla:
--   · solo visitas corrientes --amigos, temporal--. En una estancia de huésped
--     salir y volver a entrar es lo normal en una semana, y el profesional
--     permanente ya cierra su jornada solo (`jornada_del_permanente` le borra
--     la salida en el mismo paso, así que aquí nunca llega una salida puesta);
--   · cubre los dos caminos de deshacerla: borrar `salida_en` y desmarcar la
--     llegada, que la arrastra (`sin_entrada_no_hay_salida`);
--   · corregir la hora de la salida sigue permitido;
--   · la clave de servicio (`auth.uid()` nulo) pasa: siembra y limpia.
-- Solo aditiva.

create or replace function public.una_salida_registrada_no_se_deshace()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_tipo public.tipo_visita;
begin
  if old.salida_en is null or auth.uid() is null then
    return new;
  end if;

  if new.salida_en is not null
     and (coalesce(new.llego, false) or new.ingreso_en is not null) then
    return new;
  end if;

  select v.tipo into v_tipo from public.visita v where v.id = new.visita_id;
  if v_tipo in ('huesped_temporal', 'permanente') then
    return new;
  end if;

  raise exception 'La salida ya quedó registrada y no se deshace.'
    using errcode = '42501';
end;
$function$;

comment on function public.una_salida_registrada_no_se_deshace() is
  'En una visita corriente, una salida registrada no se borra ni se deshace desmarcando la llegada; corregir su hora sí. Las estancias de huésped y el permanente quedan fuera. Hueco 31, 27/10/2026.';

drop trigger if exists invitado_salida_no_se_deshace on public.invitado;
create trigger invitado_salida_no_se_deshace
  before update of salida_en, llego, ingreso_en on public.invitado
  for each row execute function public.una_salida_registrada_no_se_deshace();

revoke execute on function public.una_salida_registrada_no_se_deshace() from public, anon, authenticated;

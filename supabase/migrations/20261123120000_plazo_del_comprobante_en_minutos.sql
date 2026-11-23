-- ============================================================================
-- El plazo del comprobante, en horas y minutos (23/11/2026)
-- ============================================================================
-- El cliente: «en el input de Horas para adjuntar el comprobante, mejor que se
-- seleccione horas y minutos». `plazo_adjunto_horas` era un entero de horas;
-- 30 minutos no se podía.
--
-- Aditivo: `plazo_adjunto_minutos` con el plazo entero en minutos, y la
-- cancelación automática lo prefiere. `plazo_adjunto_horas` sigue (la app lo
-- escribe redondeado hacia arriba) para lo que aún lo lea.

alter table public.zona_comun
  add column if not exists plazo_adjunto_minutos integer;
alter table public.zona_comun
  add constraint zona_plazo_adjunto_minutos_positivo
  check (plazo_adjunto_minutos is null or plazo_adjunto_minutos >= 1) not valid;
update public.zona_comun
   set plazo_adjunto_minutos = plazo_adjunto_horas * 60
 where plazo_adjunto_horas is not null and plazo_adjunto_minutos is null;
alter table public.zona_comun validate constraint zona_plazo_adjunto_minutos_positivo;
comment on column public.zona_comun.plazo_adjunto_minutos is
  'Cuánto tiene quien reserva para adjuntar el comprobante de pago, en minutos. Pasado el plazo, la reserva se cancela sola. Vacío: sin plazo. Manda sobre plazo_adjunto_horas.';

create or replace function public.reservas_por_cancelar()
returns table (reserva_id uuid, motivo text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select r.id,
         case when coalesce(z.plazo_adjunto_minutos, z.plazo_adjunto_horas * 60) is not null
                   and (z.costo_reserva > 0 or z.monto_garantia > 0)
                   and r.comprobante_path is null
                   and r.created_at + make_interval(mins => coalesce(z.plazo_adjunto_minutos, z.plazo_adjunto_horas * 60)) <= now()
              then 'sin_adjunto' else 'sin_respuesta' end
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
   where r.estado = 'pendiente'
     and (
       (coalesce(z.plazo_adjunto_minutos, z.plazo_adjunto_horas * 60) is not null
        and (z.costo_reserva > 0 or z.monto_garantia > 0)
        and r.comprobante_path is null
        and r.created_at + make_interval(mins => coalesce(z.plazo_adjunto_minutos, z.plazo_adjunto_horas * 60)) <= now())
       or ((r.fecha + r.hora_inicio) at time zone public.zona_horaria_del_condominio(z.condominio_id)) <= now()
     );
$function$;

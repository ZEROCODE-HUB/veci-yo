-- Lo que le queda a una prórroga lo cuenta la base (Para Claude 217,
-- 04/11/2026).
--
-- Una prórroga aprobada hasta las 15:30 seguía diciendo «quedan 36 minutos» a
-- las 15:55. La base la guardaba bien (15:30 en America/Bogota); la app restaba
-- `hasta` menos el reloj del teléfono, y ese teléfono va una hora atrasado en
-- tiempo real --tiene la zona corrida una hora y la hora de pared puesta a
-- mano, el mismo del 214--. Ahora `mi_prorroga` devuelve los segundos que
-- faltan contados con `now()` del servidor, y la app cuenta desde ahí.
--
-- Solo aditiva: misma función con las columnas de antes y una nueva al final
-- (cambiar las columnas de salida obliga a borrarla antes, como en
-- 20261103150000).

drop function if exists public.mi_prorroga(uuid);
create function public.mi_prorroga(p_condominio_id uuid)
 returns table(id uuid, hasta timestamp with time zone, estado public.estado_prorroga,
               motivo text, hasta_hora text, segundos_restantes integer)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  select pr.id, pr.hasta, pr.estado, pr.motivo,
         to_char(pr.hasta at time zone c.zona_horaria, 'HH24:MI'),
         greatest(0, floor(extract(epoch from pr.hasta - now())))::integer
  from public.prorroga_turno pr
  join public.condominio c on c.id = pr.condominio_id
  where pr.condominio_id = p_condominio_id and pr.solicitada_por = auth.uid()
    and pr.created_at > now() - interval '1 day'
    and (pr.estado = 'pendiente' or pr.hasta > now())
  order by pr.created_at desc
  limit 1;
$$;

comment on function public.mi_prorroga(uuid) is
  'La última prórroga del guardia en el edificio. segundos_restantes se cuenta con el reloj del servidor, no del teléfono (Para Claude 217).';

grant execute on function public.mi_prorroga(uuid) to authenticated;

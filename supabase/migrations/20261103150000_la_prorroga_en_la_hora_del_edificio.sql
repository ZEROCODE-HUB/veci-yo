-- La prórroga de turno, con la hora del edificio (Para Claude 213, 214 y 215,
-- 03/11/2026).
--
-- 214: el guardia pidió hasta las 12:30 y el detalle decía 13:30. La base lo
-- guardaba bien (12:30 en America/Bogota); la pantalla pintaba la hora con la
-- zona del teléfono, que estaba una hora por delante. Ahora la base devuelve
-- la hora ya escrita en la zona del edificio y la app pinta ese texto.
--
-- 213: las horas que se ofrecen salen de la hora actual **del edificio**, que
-- da `hora_en_el_edificio`.
--
-- 215: el Inicio del guardia enseña el motivo de su prórroga al abrir «Ver»,
-- así que `mi_prorroga` lo devuelve.
--
-- Solo aditiva: una función nueva y dos recreadas con las mismas columnas de
-- antes y otras nuevas al final (cambiar las columnas de salida obliga a
-- borrarlas antes, como en 20261029140000).

create or replace function public.hora_en_el_edificio(p_condominio_id uuid)
 returns text
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  select to_char(now() at time zone coalesce(c.zona_horaria, 'America/Bogota'), 'HH24:MI')
  from public.condominio c
  where c.id = p_condominio_id;
$$;

comment on function public.hora_en_el_edificio(uuid) is
  'La hora actual del edificio en HH:MM, para no depender del reloj del teléfono (Para Claude 213).';

drop function if exists public.mi_prorroga(uuid);
create function public.mi_prorroga(p_condominio_id uuid)
 returns table(id uuid, hasta timestamp with time zone, estado public.estado_prorroga,
               motivo text, hasta_hora text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  select pr.id, pr.hasta, pr.estado, pr.motivo,
         to_char(pr.hasta at time zone c.zona_horaria, 'HH24:MI')
  from public.prorroga_turno pr
  join public.condominio c on c.id = pr.condominio_id
  where pr.condominio_id = p_condominio_id and pr.solicitada_por = auth.uid()
    and pr.created_at > now() - interval '1 day'
    and (pr.estado = 'pendiente' or pr.hasta > now())
  order by pr.created_at desc
  limit 1;
$$;

drop function if exists public.detalle_de_prorroga(uuid);
create function public.detalle_de_prorroga(p_id uuid)
 returns table(id uuid, guardia text, hasta timestamp with time zone, motivo text,
               estado public.estado_prorroga, pedida_en timestamp with time zone,
               hasta_hora text, hasta_fecha text, pedida_hora text, pedida_fecha text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  select pr.id,
         coalesce(nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), m.nombre, 'Guardia'),
         pr.hasta, pr.motivo, pr.estado, pr.created_at,
         to_char(pr.hasta at time zone c.zona_horaria, 'HH24:MI'),
         to_char(pr.hasta at time zone c.zona_horaria, 'DD/MM/YYYY'),
         to_char(pr.created_at at time zone c.zona_horaria, 'HH24:MI'),
         to_char(pr.created_at at time zone c.zona_horaria, 'DD/MM/YYYY')
  from public.prorroga_turno pr
  join public.condominio c on c.id = pr.condominio_id
  join public.membresia_condominio m on m.id = pr.membresia_id
  left join public.perfil p on p.id = pr.solicitada_por
  where pr.id = p_id
    and (pr.solicitada_por = auth.uid() or public.es_admin_condominio(pr.condominio_id));
$$;

grant execute on function public.hora_en_el_edificio(uuid) to authenticated;
grant execute on function public.mi_prorroga(uuid) to authenticated;
grant execute on function public.detalle_de_prorroga(uuid) to authenticated;

-- «Portería» solo se ofrece para llamar si el edificio la tiene (13/11/2026,
-- cliente: «no entiendo por qué sale el guardia, si ese edificio no tiene
-- aún»). Hasta hoy la app la ofrecía siempre, aunque no hubiera ni una
-- portería registrada ni un guardia. Esta función responde si hay alguna de
-- las dos cosas, solo a quien es del edificio. Solo aditiva: función nueva.

create or replace function public.el_edificio_tiene_porteria(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (public.es_miembro_condominio(p_condominio_id) or public.es_personal_condominio(p_condominio_id))
     and (
       exists (select 1 from public.porteria p
                where p.condominio_id = p_condominio_id and p.deleted_at is null)
       or exists (select 1 from public.membresia_condominio mc
                   where mc.condominio_id = p_condominio_id and mc.rol = 'guardia' and mc.activo)
     );
$$;

revoke execute on function public.el_edificio_tiene_porteria(uuid) from public, anon;
grant execute on function public.el_edificio_tiene_porteria(uuid) to authenticated, service_role;
comment on function public.el_edificio_tiene_porteria(uuid) is
  'Si el edificio tiene una portería registrada o algún guardia activo: para ofrecer «Portería» al llamar (13/11/2026).';

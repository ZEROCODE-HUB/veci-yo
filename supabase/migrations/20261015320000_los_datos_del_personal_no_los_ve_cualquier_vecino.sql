-- Los datos del personal no los ve cualquier vecino (15/10/2026, hueco 33).
--
-- `membresia_condominio_lectura` dejaba leer la tabla a cualquiera que viva en
-- el edificio, y ahí están el documento y el teléfono de cada guardia, de la
-- administración y de los coadministradores. La pantalla de un vecino solo
-- necesita una cosa: el **nombre** de los guardias de turno, que sale en el
-- chat con portería. La lista entera la usa la pantalla de Seguridad de la
-- administración.
--
-- Ahora la tabla la leen la propia persona y el personal del edificio
-- (administración, coadministradores y portería), que es lo que ya pedían las
-- políticas de turnos. Los vecinos y el huésped alojado reciben los nombres de
-- los de turno con `nombres_de_guardias_de_turno`, sin nada más.

drop policy if exists membresia_condominio_lectura on public.membresia_condominio;
create policy membresia_condominio_lectura on public.membresia_condominio
  for select to authenticated
  using (usuario_id = auth.uid() or public.es_personal_condominio(condominio_id));

create or replace function public.nombres_de_guardias_de_turno(p_condominio_id uuid)
returns table (nombre text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.nombre
  from public.guardias_de_turno(p_condominio_id) g
  join public.membresia_condominio m on m.id = g.membresia_id
  where m.nombre is not null
    and (public.es_miembro_condominio(p_condominio_id)
         or public.es_huesped_alojado_en_condominio(p_condominio_id)
         or public.es_personal_condominio(p_condominio_id));
$$;

comment on function public.nombres_de_guardias_de_turno(uuid) is
  'Solo el nombre de los guardias de turno, para el chat con portería. Sin documento ni teléfono (hueco 33).';

revoke all on function public.nombres_de_guardias_de_turno(uuid) from public, anon;
grant execute on function public.nombres_de_guardias_de_turno(uuid) to authenticated;

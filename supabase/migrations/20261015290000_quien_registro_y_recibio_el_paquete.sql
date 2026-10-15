-- Quién registró y quién recibió un paquete (15/10/2026, hueco 20).
--
-- El nombre salía del perfil, y el perfil de la portería no lo ve un vecino
-- --ni el de un guardia lo ve otro guardia--: la ficha decía «registrado por»
-- y «recibido por» sin nombre. Abrir el perfil del personal no es la salida:
-- trae su teléfono (hueco 33). Esto devuelve solo el nombre, en lote, y solo
-- de paquetes que quien pregunta ya puede ver: la misma condición que
-- `correspondencia_lectura`.

create or replace function public.nombres_de_correspondencia(p_ids uuid[])
returns table (correspondencia_id uuid, registrada_por text, recibida_por text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    nullif(btrim(coalesce(pr.nombre, '') || ' ' || coalesce(pr.apellido, '')), ''),
    nullif(btrim(coalesce(pc.nombre, '') || ' ' || coalesce(pc.apellido, '')), '')
  from public.correspondencia c
  left join public.perfil pr on pr.id = c.registrada_por
  left join public.perfil pc on pc.id = c.recibida_por
  where c.id = any(p_ids)
    and (
      public.es_miembro_unidad(c.unidad_id)
      or public.es_guardia_de_condominio(public.condominio_de_unidad(c.unidad_id))
      or public.puede_coadmin(public.condominio_de_unidad(c.unidad_id), 'visualizarCorrespondencia')
    );
$$;

comment on function public.nombres_de_correspondencia(uuid[]) is
  'Nombre de quien registró y de quien recibió cada paquete, solo de los que quien pregunta puede ver. Sin teléfono ni documento.';

revoke all on function public.nombres_de_correspondencia(uuid[]) from public, anon;
grant execute on function public.nombres_de_correspondencia(uuid[]) to authenticated;

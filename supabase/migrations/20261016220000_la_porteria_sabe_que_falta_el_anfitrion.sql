-- ============================================================================
-- La portería sabe que falta el anfitrión, sin saber por qué
-- ============================================================================
-- La responsable de producto (16/10/2026): «falta revisión y aprobación manual
-- del anfitrión: eso sucede cuando hay un hallazgo, pero no se le indica al
-- guardia». El guardia tiene que ver «Falta aprobación del anfitrión» y nada
-- más (KT: la verificación de antecedentes no la ve la portería).
--
-- La portería no puede leer `verificacion_antecedentes`, y está bien que no
-- pueda. Así que la base le responde una sola cosa por estancia: si alguien
-- espera la decisión del anfitrión. Solo de las estancias que ya puede ver.
-- Visto en el recorrido: con las dos consultas falladas, el guardia leía
-- «Preregistro completo».

create or replace function public.estancias_que_esperan_al_anfitrion(p_visitas uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct i.visita_id
  from public.invitado i
  where i.visita_id = any (p_visitas)
    and public.puede_ver_visita(i.visita_id)
    and i.revision_anfitrion is null
    and public.requiere_revision_manual(i.id);
$$;

comment on function public.estancias_que_esperan_al_anfitrion(uuid[]) is
  'De esas estancias, las que tienen a alguien esperando la decision del '
  'anfitrion. Sin el motivo: es lo que la porteria puede saber.';

revoke all on function public.estancias_que_esperan_al_anfitrion(uuid[]) from public;
grant execute on function public.estancias_que_esperan_al_anfitrion(uuid[]) to authenticated;

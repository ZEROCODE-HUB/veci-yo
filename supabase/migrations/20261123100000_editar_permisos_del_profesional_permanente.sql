-- ============================================================================
-- Editar los permisos del profesional permanente (23/11/2026)
-- ============================================================================
-- El cliente, probando la 142: «no hay forma de editar permisos de un
-- profesional permanente, solo los días». Los dos permisos --crear visitas y
-- contestar el citófono-- se elegían al registrarlo y no se podían cambiar.
--
-- Aditivo: dos funciones nuevas. `trabajadores_de_la_vivienda` no se toca
-- (cambiarle lo que devuelve obliga a borrarla); los permisos se leen aparte,
-- y solo los ve quien los puede cambiar.

create or replace function public.permisos_de_trabajadores(p_unidad_id uuid)
returns table (
  id uuid,
  puede_crear_visitas boolean,
  puede_contestar_citofono boolean
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.gestiona_trabajadores_de(p_unidad_id) then
    raise exception 'Solo quien gestiona la vivienda ve los permisos de sus profesionales permanentes';
  end if;
  return query
  select t.id, t.puede_crear_visitas, t.puede_contestar_citofono
    from public.trabajador_de_la_vivienda t
   where t.unidad_id = p_unidad_id and t.deleted_at is null;
end;
$$;
comment on function public.permisos_de_trabajadores(uuid) is
  'Los permisos (crear visitas, contestar el citófono) de los profesionales permanentes de una vivienda. Solo quien los gestiona (gestiona_trabajadores_de).';
revoke execute on function public.permisos_de_trabajadores(uuid) from public, anon;
grant execute on function public.permisos_de_trabajadores(uuid) to authenticated, service_role;

create or replace function public.cambiar_permisos_de_trabajador(
  p_id uuid,
  p_puede_crear_visitas boolean,
  p_puede_contestar_citofono boolean
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_unidad uuid;
begin
  select t.unidad_id into v_unidad
    from public.trabajador_de_la_vivienda t
   where t.id = p_id and t.deleted_at is null;
  -- Uno que no existe y uno de otra vivienda responden lo mismo.
  if v_unidad is null or not public.gestiona_trabajadores_de(v_unidad) then
    raise exception 'No tienes permiso para cambiar los permisos de ese profesional';
  end if;
  update public.trabajador_de_la_vivienda
     set puede_crear_visitas = coalesce(p_puede_crear_visitas, puede_crear_visitas),
         puede_contestar_citofono = coalesce(p_puede_contestar_citofono, puede_contestar_citofono)
   where id = p_id;
end;
$$;
comment on function public.cambiar_permisos_de_trabajador(uuid, boolean, boolean) is
  'Cambia si el profesional permanente puede crear visitas y contestar el citófono de la vivienda. Solo quien gestiona la vivienda (gestiona_trabajadores_de).';
revoke execute on function public.cambiar_permisos_de_trabajador(uuid, boolean, boolean) from public, anon;
grant execute on function public.cambiar_permisos_de_trabajador(uuid, boolean, boolean) to authenticated, service_role;

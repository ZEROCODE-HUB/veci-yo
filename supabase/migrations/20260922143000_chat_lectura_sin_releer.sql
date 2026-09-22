-- ----------------------------------------------------------------------------
-- La politica de lectura de `conversacion` no puede releer `conversacion`
-- ----------------------------------------------------------------------------
-- `conversacion_lectura` llamaba a `puede_ver_conversacion(id)`, que busca la
-- fila en la propia tabla. Al insertar con RETURNING -- que es lo que hace
-- PostgREST con `Prefer: return=representation` -- la politica de SELECT se
-- evalua sobre la fila nueva, pero la funcion es `stable` y su snapshot no
-- incluye la fila que el mismo comando esta insertando: `exists(...)` daba
-- falso y el alta se rechazaba con "new row violates row-level security
-- policy", aunque el WITH CHECK del INSERT se cumplia.
--
-- La regla no cambia; se evalua sobre las columnas de la fila en vez de volver
-- a buscarla. `puede_ver_conversacion(id)` se mantiene para `mensaje` y
-- `participante_conversacion`, donde la tabla consultada es otra y el problema
-- no existe.

create or replace function public.puede_ver_conversacion_fila(
  p_tipo           public.tipo_conversacion,
  p_area           public.area_conversacion,
  p_ambito         public.ambito_grupo,
  p_unidad_id      uuid,
  p_condominio_id  uuid,
  p_conversacion_id uuid
)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case p_tipo
    when 'directa' then exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = p_conversacion_id and p.usuario_id = auth.uid()
    )
    when 'area' then
      public.es_miembro_unidad(p_unidad_id)
      or (p_area = 'seguridad'      and public.es_personal_condominio(p_condominio_id))
      or (p_area = 'administracion' and public.es_admin_condominio(p_condominio_id))
    when 'grupo' then
      case p_ambito
        when 'residentes' then exists (
          select 1 from public.membresia_unidad m
          join public.unidad u on u.id = m.unidad_id
          where m.usuario_id = auth.uid() and m.activo and m.es_residente
            and u.condominio_id = p_condominio_id
        )
        when 'propietarios' then exists (
          select 1 from public.membresia_unidad m
          join public.unidad u on u.id = m.unidad_id
          where m.usuario_id = auth.uid() and m.activo and m.rol = 'propietario'
            and u.condominio_id = p_condominio_id
        )
        else false
      end
    else false
  end;
$$;

drop policy if exists conversacion_lectura on public.conversacion;

create policy conversacion_lectura on public.conversacion
  for select to authenticated
  using (
    public.puede_ver_conversacion_fila(tipo, area, ambito, unidad_id, condominio_id, id)
  );

-- La de un solo argumento pasa a apoyarse en la nueva, para que la regla viva
-- en un solo sitio.
create or replace function public.puede_ver_conversacion(p_conversacion_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce((
    select public.puede_ver_conversacion_fila(
      c.tipo, c.area, c.ambito, c.unidad_id, c.condominio_id, c.id)
    from public.conversacion c
    where c.id = p_conversacion_id
  ), false);
$$;

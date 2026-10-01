-- ============================================================================
-- 0001 · Extensiones y utilidades transversales
-- ============================================================================
-- Base para todo el schema: generación de uuid, y el disparador de `updated_at`
-- que exige la regla 2 de AGENTS.md (toda entidad con identidad y trazabilidad).
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------
-- Se aplica como trigger en cada tabla; evita depender de que la app recuerde
-- actualizar la columna.

create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.tocar_updated_at is
  'Trigger BEFORE UPDATE: mantiene updated_at sin intervención de la app.';


-- ----------------------------------------------------------------------------
-- Identidad del usuario autenticado
-- ----------------------------------------------------------------------------
-- Azúcar sobre auth.uid() para que las políticas RLS se lean mejor.

create or replace function public.usuario_actual()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

comment on function public.usuario_actual is
  'uuid del usuario autenticado, o null si la petición es anónima.';

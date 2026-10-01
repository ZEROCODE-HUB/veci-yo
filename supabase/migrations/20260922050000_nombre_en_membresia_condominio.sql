-- ============================================================================
-- 0019 · Nombre visible en la membresia de condominio
-- ============================================================================
-- La pantalla de Seguridad necesita mostrar el nombre del guardia, pero no
-- podia obtenerlo:
--
--   1. `membresia_condominio.usuario_id` referencia `auth.users`, no `perfil`,
--      asi que PostgREST no puede embeber el perfil (PGRST200).
--   2. Y aunque pudiera, `perfil` es privado por RLS: cada quien ve solo el
--      suyo. Eso es deliberado, porque ahi vive el documento de identidad.
--
-- Se resuelve como ya lo hacia `membresia_unidad`: el nombre visible viaja en
-- la membresia. Asi el administrador ve a quien gestiona sin que el documento
-- de nadie deje de ser privado.
-- ============================================================================

alter table public.membresia_condominio
  add column nombre text;

comment on column public.membresia_condominio.nombre is
  'Nombre visible dentro del condominio. Los datos de identidad siguen en perfil, que es privado.';

-- Completa los que ya existen con el nombre de su perfil.
update public.membresia_condominio mc
   set nombre = trim(p.nombre || ' ' || coalesce(p.apellido, ''))
  from public.perfil p
 where p.id = mc.usuario_id
   and mc.nombre is null;

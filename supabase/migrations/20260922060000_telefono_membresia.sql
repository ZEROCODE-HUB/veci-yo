-- ============================================================================
-- 0020 · Telefono de contacto en la membresia de condominio
-- ============================================================================
-- La pantalla de Coadministradores registra un celular de contacto. Va en la
-- membresia por el mismo motivo que el nombre: `perfil` es privado y guarda
-- datos de identidad que la administracion no tiene por que ver.
-- ============================================================================

alter table public.membresia_condominio
  add column telefono text;

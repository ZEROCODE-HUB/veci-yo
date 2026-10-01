-- ----------------------------------------------------------------------------
-- Nombre de quien abre la PQRS
-- ----------------------------------------------------------------------------
-- La lista de PQRS de la administración muestra y busca por el nombre de quien
-- la abrió, pero `creado_por` apunta a `auth.users` y el nombre está en
-- `perfil`, que es privado: el administrador no puede leerlo. Mismo caso que
-- `membresia_condominio.nombre`, y se resuelve igual — el nombre viaja en la
-- fila, congelado al momento de crearla.

alter table public.reclamo
  add column creado_por_nombre text;

comment on column public.reclamo.creado_por_nombre is
  'Nombre de quien la abrió, al momento de abrirla. `perfil` es privado y la administración no puede leerlo.';

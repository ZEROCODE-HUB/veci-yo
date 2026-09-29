-- ---------------------------------------------------------------------------
-- El edificio decide si la porteria verifica el documento
-- ---------------------------------------------------------------------------
-- `visita.instruccion_documento` la decidia el formulario **por el tipo de
-- visita, a fuego**: `amigos` siempre `no_verificar`, el resto `verificar`. Y a
-- la vez la pantalla le pedia al residente el tipo y el numero de documento de
-- su invitado y le decia «recuerda indicarle que debe presentarlo en porteria».
--
-- O sea que la aplicacion prometia una comprobacion que nadie hacia, y esos dos
-- campos no servian para nada en las visitas de amigos --que son la mayoria--.
-- Punto 66 de `REVISAR-A-OJO.md`.
--
-- Decision del cliente del 29/09/2026: **se verifica siempre, y lo decide el
-- edificio para todas sus visitas**. Asi que la bandera vive en `condominio`, no
-- en la visita ni en `permiso_vivienda`:
--
--   · en la visita seria una copia por fila de algo que no elige quien invita;
--   · en `permiso_vivienda` seria por vivienda, que no es lo que se pidio --y
--     ademas esa tabla es la que `permisos_de_unidad` devuelve como tipo, asi
--     que anadirle una columna rompe la funcion hasta que se la reescribe--.
--
-- Arranca en `true`, que es lo que el cliente quiere de entrada.
--
-- Solo se anade una columna. No se toca ninguna fila ni ninguna otra tabla.

alter table public.condominio
  add column if not exists verificar_documento_visitas boolean not null default true;

comment on column public.condominio.verificar_documento_visitas is
  'Si la porteria tiene que comparar el documento del invitado al entrar. Lo decide el edificio para todas sus visitas (29/09/2026); antes lo decidia el tipo de visita, a fuego en el formulario.';

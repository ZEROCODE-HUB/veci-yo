-- ----------------------------------------------------------------------------
-- El reverso del documento tiene dónde guardarse
-- ----------------------------------------------------------------------------
-- `verificacion_documento` tiene `documento_original_path` --la foto que sube
-- quien hace el preregistro-- y `documento_tomado_path` --la que toma la
-- porteria al comparar--. Son dos momentos distintos, y esta bien que lo sean.
--
-- Lo que no hay es sitio para el **reverso**, y la pantalla del preregistro
-- pide las dos caras: «Foto del frente del documento» y «Foto del reverso del
-- documento», porque una cedula tiene datos por detras y un pasaporte no.
--
-- Al conectar la subida (REVISAR-A-OJO 31) habia dos salidas: guardar solo el
-- frente --y entonces el reverso seguiria siendo un campo que se rellena y se
-- tira, que es justo la familia de defectos que se esta cerrando-- o darle
-- sitio. Se le da sitio.
--
-- Aditiva: una columna que arranca nula. Lo que ya existe no se toca.

alter table public.verificacion_documento
  add column if not exists documento_reverso_path text;

comment on column public.verificacion_documento.documento_reverso_path is
  'Foto del reverso del documento, subida en el preregistro. Nula en un pasaporte, que no tiene reverso con datos.';

comment on column public.verificacion_documento.documento_original_path is
  'Foto del frente del documento, subida en el preregistro por quien todavia no tiene cuenta. La sube la funcion `subir-documento-precheckin`, que comprueba el enlace: no hay sesion a la que darle permiso.';

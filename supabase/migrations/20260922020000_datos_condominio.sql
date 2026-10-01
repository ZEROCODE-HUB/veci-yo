-- ============================================================================
-- 0016 · Datos de contacto y fiscales del condominio
-- ============================================================================
-- La pantalla de Administracion > Ubicacion edita el nombre, la direccion, la
-- ciudad, el pais y ademas identificacion fiscal, telefono y correo, que la
-- tabla no contemplaba.
--
-- El identificador fiscal se llama distinto en cada pais (RUC en Peru, NIT en
-- Colombia), asi que la columna es neutra y la etiqueta la pone la interfaz
-- segun `pais`.
-- ============================================================================

alter table public.condominio
  add column identificacion_fiscal  text,
  add column telefono               text,
  add column email                  text;

comment on column public.condominio.identificacion_fiscal is
  'RUC en Peru, NIT en Colombia. La etiqueta visible depende de `pais`.';

-- ----------------------------------------------------------------------------
-- La tabla de errores de la app explica sus columnas (26/10/2026)
-- ----------------------------------------------------------------------------
-- `error_de_la_app` nació esta mañana (20261026230000) sin descripción en sus
-- columnas, y `los-parametros-se-explican-solos` lo detectó en la suite
-- completa: toda columna de la base dice para qué sirve, en español simple.
-- Solo comentarios.

comment on column public.error_de_la_app.id is 'Identificador del registro.';
comment on column public.error_de_la_app.created_at is 'Cuándo lo anotó la app.';
comment on column public.error_de_la_app.updated_at is 'Última modificación (no se espera ninguna: es un registro).';
comment on column public.error_de_la_app.usuario_id is 'Quién usaba la app cuando pasó. Solo puede anotar a su propio nombre.';
comment on column public.error_de_la_app.tipo is 'error: algo falló; rastro: un paso anotado para saber hasta dónde llegó la app antes de cerrarse.';
comment on column public.error_de_la_app.mensaje is 'Qué pasó, en una línea.';
comment on column public.error_de_la_app.detalle is 'Lo técnico: la pila del error o los datos del paso.';
comment on column public.error_de_la_app.plataforma is 'android, ios o web.';
comment on column public.error_de_la_app.version is 'La versión de la app y la actualización que llevaba el celular.';

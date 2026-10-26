-- Las columnas de permiso_de_rol que se quedaron sin descripción (lo exige
-- los-parametros-se-explican-solos: ninguna columna sin decir para qué sirve).
-- Solo comentarios.

comment on column public.permiso_de_rol.id is 'Identificador del permiso.';
comment on column public.permiso_de_rol.rol is 'El rol al que se le permite o no la acción (rol_con_permisos).';
comment on column public.permiso_de_rol.accion is 'La acción que se permite o no (accion_de_rol).';
comment on column public.permiso_de_rol.created_at is 'Cuándo se creó la fila.';
comment on column public.permiso_de_rol.updated_at is 'Cuándo se cambió por última vez.';

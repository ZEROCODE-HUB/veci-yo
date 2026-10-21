-- El nombre de cada lista de opciones (18/10/2026). Aditiva: un tipo nuevo, en su propio archivo.

do $$ begin
  create type public.nombre_catalogo as enum (
    'motivos_de_viaje', 'responsables_de_menor', 'tipos_de_vehiculo', 'plataformas_de_reserva', 'oficios_de_profesionales', 'empresas_de_mensajeria', 'cargos_equipo_admin', 'areas_de_pqrs', 'tipos_de_pqrs', 'categorias_de_anuncio', 'rotacion_tipos', 'turnos_franjas', 'motivos_eliminar_cuenta', 'horarios_de_entrada', 'equipamiento_obligatorio', 'torre_opciones', 'archivo_formatos', 'canales_iniciales', 'antecedentes_fuentes_obligatorias', 'campos_obligatorios_preregistro', 'palabras_de_bloqueo_ical', 'tipos_de_documento', 'nacionalidades'
  );
exception when duplicate_object then null; end $$;

comment on type public.nombre_catalogo is
  'Qué lista de opciones es una fila de catalogo_opcion (motivos de viaje, tipos de vehículo, ...). '
  'Una lista nueva se agrega aquí con alter type ... add value, en su propia migración.';

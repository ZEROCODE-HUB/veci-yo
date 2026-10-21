-- Países, monedas y listas de opciones viven en la base (18/10/2026).
--
-- Aditiva: tres tablas nuevas y sus filas. No se cambia ninguna función todavía.
--
-- Fase 3 de «nada fijo en el código». Hasta hoy la lista de países con su
-- prefijo, moneda, policía y zona horaria estaba escrita dos veces (app y web)
-- y otra vez, más corta, en la base; los tipos de documento, en tres sitios con
-- tres listas distintas; los motivos de viaje, vehículos, mensajerías, oficios,
-- cargos y demás, en cada pantalla. Se siembran tal cual estaban; donde dos
-- sitios discrepaban se eligió el valor que se ve al usuario y se anotó.
--
-- Inactivas desde el principio (sembradas para no perder el dato, pero no se
-- ofrecen): el PEP (ya no vigente), «Otra persona» como responsable de un menor,
-- «Otra plataforma» y el tipo de PQRS «Consulta», que ningún sitio ofrecía.
-- El área de PQRS que decía «Constructora TyC» (una empresa concreta) dice
-- ahora «Constructora».

-- ============================================================================
-- Monedas
-- ============================================================================

create table if not exists public.moneda (
  codigo     char(3) primary key,
  nombre     text not null,
  decimales  smallint not null check (decimales between 0 and 4),
  activa     boolean not null default true,
  orden      smallint not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.moneda is 'Las monedas que puede usar un edificio para cuotas, zonas y costos.';
comment on column public.moneda.codigo is 'Código ISO 4217 de la moneda (COP, PEN, USD...).';
comment on column public.moneda.nombre is 'Nombre de la moneda como se muestra (Peso colombiano).';
comment on column public.moneda.decimales is 'Cuántos decimales se muestran (0 para pesos colombianos, 2 para dólares).';
comment on column public.moneda.activa is 'Si se ofrece al elegir la moneda de un edificio. Falso = existe pero no se ofrece.';
comment on column public.moneda.orden is 'Orden en la lista (más bajo, más arriba).';
comment on column public.moneda.created_at is 'Cuándo se creó la fila.';
comment on column public.moneda.updated_at is 'Cuándo se cambió por última vez.';

-- ============================================================================
-- Países
-- ============================================================================

create table if not exists public.pais (
  codigo          char(2) primary key,
  nombre          text not null,
  prefijo         text,
  moneda          char(3) references public.moneda(codigo),
  zona_horaria    text,
  policia         text,
  etiqueta_fiscal text not null default 'NIT',
  mayoria_de_edad smallint not null default 18 check (mayoria_de_edad between 14 and 25),
  reporta_sire    boolean not null default false,
  alta_de_edificio boolean not null default false,
  activo          boolean not null default true,
  orden           smallint not null default 99,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.pais is
  'Lo que depende del país: prefijo telefónico, moneda y zona horaria que se sugieren, número de la '
  'policía, mayoría de edad y reglas legales. Agregar un país es agregar una fila.';
comment on column public.pais.codigo is 'Código ISO de dos letras (CO, PE...).';
comment on column public.pais.nombre is 'Nombre del país como se muestra.';
comment on column public.pais.prefijo is 'Prefijo telefónico sin el signo + (57 para Colombia).';
comment on column public.pais.moneda is 'Moneda que se sugiere al crear un edificio en este país. Vacía = no se sugiere ninguna.';
comment on column public.pais.zona_horaria is 'Zona horaria que se sugiere para un edificio en este país (America/Bogota). Vacía = la de tareas_zona_horaria.';
comment on column public.pais.policia is 'Número de la policía que se sugiere al configurar un edificio. Vacío = no se sugiere.';
comment on column public.pais.etiqueta_fiscal is 'Cómo se llama ahí la identificación fiscal del edificio (NIT, RUC...).';
comment on column public.pais.mayoria_de_edad is 'Edad desde la que una persona es adulta (se le pide documento, puede ser titular). Legal: avisar antes de cambiarla.';
comment on column public.pais.reporta_sire is 'Si los huéspedes extranjeros de un alojamiento en este país se reportan a Migración (SIRE, Colombia).';
comment on column public.pais.alta_de_edificio is 'Si la plataforma deja crear edificios en este país desde su panel.';
comment on column public.pais.activo is 'Si se ofrece en las listas de países. Falso = existe pero no se ofrece.';
comment on column public.pais.orden is 'Orden en la lista (más bajo, más arriba).';
comment on column public.pais.created_at is 'Cuándo se creó la fila.';
comment on column public.pais.updated_at is 'Cuándo se cambió por última vez.';

-- ============================================================================
-- Listas de opciones
-- ============================================================================

create table if not exists public.catalogo_opcion (
  id         uuid primary key default gen_random_uuid(),
  catalogo   public.nombre_catalogo not null,
  codigo     text not null,
  etiqueta   text not null,
  orden      smallint not null default 99,
  activo     boolean not null default true,
  pais       char(2) references public.pais(codigo),
  extra      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (catalogo, codigo, pais)
);
comment on table public.catalogo_opcion is
  'Las listas cerradas de opciones de la app (motivos de viaje, vehículos, mensajerías, tipos de documento...). '
  'Una fila por opción. Para quitar una opción se pone activo = falso (no se borra: puede haber datos que la usan).';
comment on column public.catalogo_opcion.id is 'Identificador de la fila.';
comment on column public.catalogo_opcion.catalogo is 'A qué lista pertenece la opción.';
comment on column public.catalogo_opcion.codigo is
  'Lo que se guarda en los datos al elegirla. Si la columna que la usa es un enum de la base, tiene que coincidir con él. No se cambia.';
comment on column public.catalogo_opcion.etiqueta is 'Lo que ve la persona en la pantalla. Se puede cambiar.';
comment on column public.catalogo_opcion.orden is 'Orden en la lista (más bajo, más arriba).';
comment on column public.catalogo_opcion.activo is 'Si se ofrece. Falso = existe pero ya no se ofrece.';
comment on column public.catalogo_opcion.pais is 'Si la opción es solo de un país. Vacío = de todos.';
comment on column public.catalogo_opcion.extra is
  'Datos propios de cada lista (por ejemplo, de un tipo de documento: si tiene una sola cara, sus siglas para la TRA, '
  'su largo). Se documentan en el comentario de la migración que crea la lista.';
comment on column public.catalogo_opcion.created_at is 'Cuándo se creó la fila.';
comment on column public.catalogo_opcion.updated_at is 'Cuándo se cambió por última vez.';

create index if not exists catalogo_opcion_por_lista on public.catalogo_opcion (catalogo, orden) where activo;

-- ============================================================================
-- Quién los lee y quién los cambia
-- ============================================================================

alter table public.moneda enable row level security;
alter table public.pais enable row level security;
alter table public.catalogo_opcion enable row level security;

/* Los lee cualquiera (también el huésped sin cuenta en la web): no son datos de nadie.
   Nadie los escribe desde la app: se cambian en el panel de Supabase. */
drop policy if exists moneda_lectura on public.moneda;
create policy moneda_lectura on public.moneda for select using (true);
drop policy if exists pais_lectura on public.pais;
create policy pais_lectura on public.pais for select using (true);
drop policy if exists catalogo_opcion_lectura on public.catalogo_opcion;
create policy catalogo_opcion_lectura on public.catalogo_opcion for select using (true);

grant select on public.moneda, public.pais, public.catalogo_opcion to anon, authenticated;

drop trigger if exists moneda_tocar_updated_at on public.moneda;
create trigger moneda_tocar_updated_at before update on public.moneda for each row execute function public.tocar_updated_at();
drop trigger if exists pais_tocar_updated_at on public.pais;
create trigger pais_tocar_updated_at before update on public.pais for each row execute function public.tocar_updated_at();
drop trigger if exists catalogo_opcion_tocar_updated_at on public.catalogo_opcion;
create trigger catalogo_opcion_tocar_updated_at before update on public.catalogo_opcion for each row execute function public.tocar_updated_at();

-- ============================================================================
-- Lo que hoy estaba escrito en el código
-- ============================================================================

insert into public.moneda (codigo, nombre, decimales, activa, orden) values
  ('COP', 'Peso colombiano', 0, true, 1),
  ('PEN', 'Sol peruano', 2, true, 2),
  ('USD', 'Dólar', 2, true, 3),
  ('EUR', 'Euro', 2, true, 4),
  ('MXN', 'Peso mexicano', 2, true, 5),
  ('ARS', 'Peso argentino', 2, true, 6),
  ('CLP', 'Peso chileno', 0, true, 7),
  ('PYG', 'PYG', 0, false, 99),
  ('JPY', 'JPY', 0, false, 99),
  ('KRW', 'KRW', 0, false, 99),
  ('ISK', 'ISK', 0, false, 99),
  ('VND', 'VND', 0, false, 99)
on conflict (codigo) do nothing;

insert into public.pais (codigo, nombre, prefijo, moneda, zona_horaria, policia, etiqueta_fiscal, mayoria_de_edad, reporta_sire, alta_de_edificio, orden) values
  ('CO', 'Colombia', '57', 'COP', 'America/Bogota', '123', 'NIT', 18, true, true, 1),
  ('PE', 'Perú', '51', 'PEN', 'America/Lima', '105', 'RUC', 18, false, true, 2),
  ('AR', 'Argentina', '54', 'ARS', 'America/Argentina/Buenos_Aires', '911', 'NIT', 18, false, false, 3),
  ('BO', 'Bolivia', '591', null, 'America/La_Paz', '110', 'NIT', 18, false, false, 4),
  ('BR', 'Brasil', '55', null, null, null, 'NIT', 18, false, false, 5),
  ('CA', 'Canadá', '1', null, null, null, 'NIT', 18, false, false, 6),
  ('CL', 'Chile', '56', 'CLP', 'America/Santiago', '133', 'NIT', 18, false, false, 7),
  ('CR', 'Costa Rica', '506', null, 'America/Costa_Rica', '911', 'NIT', 18, false, false, 8),
  ('CU', 'Cuba', '53', null, null, null, 'NIT', 18, false, false, 9),
  ('EC', 'Ecuador', '593', 'USD', 'America/Guayaquil', '911', 'NIT', 18, false, false, 10),
  ('SV', 'El Salvador', '503', null, null, null, 'NIT', 18, false, false, 11),
  ('ES', 'España', '34', 'EUR', 'Europe/Madrid', '091', 'NIT', 18, false, false, 12),
  ('US', 'Estados Unidos', '1', 'USD', 'America/New_York', '911', 'NIT', 18, false, false, 13),
  ('FR', 'Francia', '33', null, null, null, 'NIT', 18, false, false, 14),
  ('GT', 'Guatemala', '502', null, 'America/Guatemala', '110', 'NIT', 18, false, false, 15),
  ('HN', 'Honduras', '504', null, null, null, 'NIT', 18, false, false, 16),
  ('IT', 'Italia', '39', null, null, null, 'NIT', 18, false, false, 17),
  ('MX', 'México', '52', 'MXN', 'America/Mexico_City', '911', 'NIT', 18, false, false, 18),
  ('NI', 'Nicaragua', '505', null, null, null, 'NIT', 18, false, false, 19),
  ('PA', 'Panamá', '507', 'USD', 'America/Panama', '104', 'NIT', 18, false, false, 20),
  ('PY', 'Paraguay', '595', null, 'America/Asuncion', '911', 'NIT', 18, false, false, 21),
  ('PT', 'Portugal', '351', null, null, null, 'NIT', 18, false, false, 22),
  ('PR', 'Puerto Rico', '1', null, null, null, 'NIT', 18, false, false, 23),
  ('DO', 'República Dominicana', '1', null, 'America/Santo_Domingo', '911', 'NIT', 18, false, false, 24),
  ('GB', 'Reino Unido', '44', null, null, null, 'NIT', 18, false, false, 25),
  ('DE', 'Alemania', '49', null, null, null, 'NIT', 18, false, false, 26),
  ('UY', 'Uruguay', '598', null, 'America/Montevideo', '911', 'NIT', 18, false, false, 27),
  ('VE', 'Venezuela', '58', null, 'America/Caracas', '911', 'NIT', 18, false, false, 28)
on conflict (codigo) do nothing;

insert into public.catalogo_opcion (catalogo, codigo, etiqueta, orden, activo, pais, extra) values
  ('motivos_de_viaje', 'turismo', 'Turismo', 1, true, null, '{"tra": "Turismo", "por_defecto_tra": true}'::jsonb),
  ('motivos_de_viaje', 'negocios', 'Negocios', 2, true, null, '{"tra": "Negocios"}'::jsonb),
  ('motivos_de_viaje', 'trabajo', 'Trabajo', 3, true, null, '{"tra": "Trabajo"}'::jsonb),
  ('motivos_de_viaje', 'estudios', 'Estudios', 4, true, null, '{"tra": "Estudios"}'::jsonb),
  ('motivos_de_viaje', 'transito', 'Tránsito', 5, true, null, '{"tra": "Transito"}'::jsonb),
  ('responsables_de_menor', 'madre', 'Su madre', 1, true, null, '{}'::jsonb),
  ('responsables_de_menor', 'padre', 'Su padre', 2, true, null, '{}'::jsonb),
  ('responsables_de_menor', 'tutor_legal', 'Su tutor legal', 3, true, null, '{}'::jsonb),
  ('responsables_de_menor', 'otro', 'Otra persona', 4, false, null, '{"activo": false, "nota": "quitado el 16/10/2026; existe en el enum parentesco y en PARENTESCO de la app para leer fichas antiguas"}'::jsonb),
  ('tipos_de_vehiculo', 'auto', 'Automóvil', 1, true, null, '{"etiqueta_en_porteria_y_editar_estancia": "Carro"}'::jsonb),
  ('tipos_de_vehiculo', 'camioneta', 'Camioneta', 2, true, null, '{}'::jsonb),
  ('tipos_de_vehiculo', 'moto', 'Moto', 3, true, null, '{}'::jsonb),
  ('tipos_de_vehiculo', 'bus', 'Bus', 4, true, null, '{}'::jsonb),
  ('tipos_de_vehiculo', 'van', 'Van', 5, true, null, '{}'::jsonb),
  ('plataformas_de_reserva', 'airbnb', 'Airbnb', 1, true, null, '{}'::jsonb),
  ('plataformas_de_reserva', 'booking', 'Booking', 2, true, null, '{}'::jsonb),
  ('plataformas_de_reserva', 'directo', 'Directo', 3, true, null, '{}'::jsonb),
  ('plataformas_de_reserva', 'otra', 'Otra plataforma', 4, false, null, '{"se_ofrece_al_crear": false}'::jsonb),
  ('oficios_de_profesionales', 'permanente_cuidado_de_menores', 'Cuidado de menores', 1, true, null, '{"tipo": "permanente"}'::jsonb),
  ('oficios_de_profesionales', 'permanente_profesional_de_la_salud', 'Profesional de la salud', 2, true, null, '{"tipo": "permanente"}'::jsonb),
  ('oficios_de_profesionales', 'permanente_limpieza_y_servicios_generales', 'Limpieza y servicios generales', 3, true, null, '{"tipo": "permanente"}'::jsonb),
  ('oficios_de_profesionales', 'permanente_atencion_a_mascotas', 'Atención a mascotas', 4, true, null, '{"tipo": "permanente"}'::jsonb),
  ('oficios_de_profesionales', 'permanente_conductor', 'Conductor', 5, true, null, '{"tipo": "permanente"}'::jsonb),
  ('oficios_de_profesionales', 'permanente_jardinero', 'Jardinero', 6, true, null, '{"tipo": "permanente"}'::jsonb),
  ('oficios_de_profesionales', 'permanente_otros', 'Otros', 7, true, null, '{"tipo": "permanente"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_domiciliario', 'Domiciliario', 1, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_pintor', 'Pintor', 2, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_carpintero', 'Carpintero', 3, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_electricista', 'Electricista', 4, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_profesional_de_la_salud', 'Profesional de la salud', 5, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_limpieza_y_servicios_generales', 'Limpieza y servicios generales', 6, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_atencion_a_mascotas', 'Atención a mascotas', 7, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_cuidado_de_menores', 'Cuidado de menores', 8, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_peluquero_o_maquillador', 'Peluquero o maquillador', 9, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_fontanero', 'Fontanero', 10, true, null, '{"tipo": "temporal"}'::jsonb),
  ('oficios_de_profesionales', 'temporal_otros', 'Otros', 11, true, null, '{"tipo": "temporal"}'::jsonb),
  ('empresas_de_mensajeria', 'rappi', 'Rappi', 1, true, null, '{}'::jsonb),
  ('empresas_de_mensajeria', 'dhl', 'DHL', 2, true, null, '{}'::jsonb),
  ('empresas_de_mensajeria', 'fedex', 'Fedex', 3, true, null, '{}'::jsonb),
  ('empresas_de_mensajeria', 'expreso_el_pajaro', 'Expreso el pájaro', 4, true, null, '{}'::jsonb),
  ('empresas_de_mensajeria', 'otro', 'Otro', 5, true, null, '{}'::jsonb),
  ('cargos_equipo_admin', 'administrador', 'Administrador', 1, true, null, '{}'::jsonb),
  ('cargos_equipo_admin', 'co_administrador', 'Co-Administrador', 2, true, null, '{}'::jsonb),
  ('cargos_equipo_admin', 'secretaria', 'Secretaria', 3, true, null, '{}'::jsonb),
  ('cargos_equipo_admin', 'presidente_junta', 'Presidente Junta', 4, true, null, '{}'::jsonb),
  ('cargos_equipo_admin', 'miembro_consejo', 'Miembro Consejo', 5, true, null, '{}'::jsonb),
  ('cargos_equipo_admin', 'otro', 'Otro', 6, true, null, '{}'::jsonb),
  ('areas_de_pqrs', 'condominio', 'Condominio', 1, true, null, '{"tipos": ["pregunta", "queja", "reclamo", "sugerencia"]}'::jsonb),
  ('areas_de_pqrs', 'aplicacion', 'Aplicación Veciyo', 2, true, null, '{"tipos": ["idea", "soporte"]}'::jsonb),
  ('areas_de_pqrs', 'constructora', 'Constructora', 3, true, null, '{"tipos": [], "nombre_de_empresa_concreta": true, "nota": "«Constructora TyC» es el nombre de una empresa concreta y lo ven todos los edificios"}'::jsonb),
  ('areas_de_pqrs', 'documentos_antiguos', 'Documentos antiguos', 4, true, null, '{"tipos": []}'::jsonb),
  ('tipos_de_pqrs', 'pregunta', 'Pregunta', 1, true, null, '{}'::jsonb),
  ('tipos_de_pqrs', 'queja', 'Queja', 2, true, null, '{}'::jsonb),
  ('tipos_de_pqrs', 'reclamo', 'Reclamo', 3, true, null, '{}'::jsonb),
  ('tipos_de_pqrs', 'sugerencia', 'Sugerencia', 4, true, null, '{}'::jsonb),
  ('tipos_de_pqrs', 'consulta', 'Consulta', 5, false, null, '{"no_lo_ofrece_ningun_area": true}'::jsonb),
  ('tipos_de_pqrs', 'idea', 'Idea', 6, true, null, '{}'::jsonb),
  ('tipos_de_pqrs', 'soporte', 'Soporte', 7, true, null, '{}'::jsonb),
  ('categorias_de_anuncio', 'servicios', 'Servicios', 1, true, null, '{}'::jsonb),
  ('categorias_de_anuncio', 'eventos', 'Eventos', 2, true, null, '{}'::jsonb),
  ('categorias_de_anuncio', 'mantenimiento', 'Mantenimiento', 3, true, null, '{}'::jsonb),
  ('categorias_de_anuncio', 'seguridad', 'Seguridad', 4, true, null, '{}'::jsonb),
  ('categorias_de_anuncio', 'administracion', 'Administración', 5, true, null, '{}'::jsonb),
  ('rotacion_tipos', 'semanal', 'semanal', 1, true, null, '{}'::jsonb),
  ('rotacion_tipos', 'quincenal', 'quincenal', 2, true, null, '{}'::jsonb),
  ('rotacion_tipos', 'mensual', 'mensual', 3, true, null, '{}'::jsonb),
  ('turnos_franjas', '00_06', '00:00 a 06:00', 1, true, null, '{"grupo": "franja_filtro", "hora_inicio": "00:00", "hora_fin": "06:00"}'::jsonb),
  ('turnos_franjas', '06_12', '06:00 a 12:00', 2, true, null, '{"grupo": "franja_filtro", "hora_inicio": "06:00", "hora_fin": "12:00"}'::jsonb),
  ('turnos_franjas', '12_18', '12:00 a 18:00', 3, true, null, '{"grupo": "franja_filtro", "hora_inicio": "12:00", "hora_fin": "18:00"}'::jsonb),
  ('turnos_franjas', '18_24', '18:00 a 24:00', 4, true, null, '{"grupo": "franja_filtro", "hora_inicio": "18:00", "hora_fin": "24:00"}'::jsonb),
  ('turnos_franjas', 'manana', 'Mañana', 1, true, null, '{"grupo": "nombre_turno", "desde": "06:00", "hasta": "12:00"}'::jsonb),
  ('turnos_franjas', 'tarde', 'Tarde', 2, true, null, '{"grupo": "nombre_turno", "desde": "12:00", "hasta": "18:00"}'::jsonb),
  ('turnos_franjas', 'noche', 'Noche', 3, true, null, '{"grupo": "nombre_turno", "desde": "18:00", "hasta": "06:00", "nota": "es «el resto» (también si la hora no se entiende)"}'::jsonb),
  ('motivos_eliminar_cuenta', 'ya_no_resido_en_este_condominio', 'Ya no resido en este condominio', 1, true, null, '{}'::jsonb),
  ('motivos_eliminar_cuenta', 'cambio_de_condominio', 'Cambio de condominio', 2, true, null, '{}'::jsonb),
  ('motivos_eliminar_cuenta', 'no_uso_la_aplicacion', 'No uso la aplicación', 3, true, null, '{}'::jsonb),
  ('motivos_eliminar_cuenta', 'problemas_con_la_aplicacion', 'Problemas con la aplicación', 4, true, null, '{}'::jsonb),
  ('motivos_eliminar_cuenta', 'otro', 'Otro', 5, true, null, '{}'::jsonb),
  ('horarios_de_entrada', '08_30_a_13_30', '08:30 a 13:30', 1, true, null, '{"desde": "08:30", "hasta": "13:30"}'::jsonb),
  ('horarios_de_entrada', '14_00_a_20_00', '14:00 a 20:00', 2, true, null, '{"desde": "14:00", "hasta": "20:00"}'::jsonb),
  ('horarios_de_entrada', '24_horas', '24 horas', 3, true, null, '{"desde": "00:00", "hasta": "23:59"}'::jsonb),
  ('equipamiento_obligatorio', 'antirruido', 'Dispositivo antirruido', 1, true, null, '{"icono": "🔇", "clave_en_codigo": "antirruido"}'::jsonb),
  ('equipamiento_obligatorio', 'no_fumar', 'Señalética de no fumar', 2, true, null, '{"icono": "🚭", "clave_en_codigo": "noFumar"}'::jsonb),
  ('equipamiento_obligatorio', 'sensor', 'Sensor de incendio/gas/CO2', 3, true, null, '{"icono": "🔥", "clave_en_codigo": "sensor"}'::jsonb),
  ('torre_opciones', 'pisos', 'Número de pisos', 1, true, null, '{"campo": "pisos", "opciones": ["1", "2", "3", "4", "5", "6", "8", "10"]}'::jsonb),
  ('torre_opciones', 'sotanos', 'Número de sótanos', 2, true, null, '{"campo": "sotanos", "opciones": ["0", "1", "2", "3", "4"]}'::jsonb),
  ('torre_opciones', 'almacenes', 'Almacén privados', 3, true, null, '{"campo": "almacenPrivados", "opciones": ["0", "1", "2", "3", "4", "5"]}'::jsonb),
  ('torre_opciones', 'entradas_peatonales', 'Entradas peatonales', 4, true, null, '{"campo": "entradasPeatonales", "opciones": ["1", "2", "3", "4"]}'::jsonb),
  ('torre_opciones', 'entradas_vehiculares', 'Entradas vehiculares', 5, true, null, '{"campo": "entradasVehiculares", "opciones": ["1", "2", "3", "4"]}'::jsonb),
  ('archivo_formatos', 'foto_condominio', 'Foto del edificio', 1, true, null, '{"tipos_mime": ["image/jpeg", "image/png", "image/webp"], "extensiones": "JPG, PNG o WEBP", "tope_mb": 5, "bucket": "condominios", "bucket_tipos_mime": null, "bucket_tope_bytes": null}'::jsonb),
  ('archivo_formatos', 'foto_zona', 'Foto de zona común', 2, true, null, '{"tipos_mime": ["image/jpeg", "image/png", "image/webp"], "extensiones": "JPG, PNG o WEBP", "tope_mb": 5, "bucket": "zonas", "bucket_tipos_mime": ["image/jpeg", "image/png", "image/webp"], "bucket_tope_bytes": 5242880}'::jsonb),
  ('archivo_formatos', 'reglamento', 'Reglamento', 3, true, null, '{"tipos_mime": ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], "extensiones": "PDF, DOC, DOCX", "bucket": "reglamentos", "bucket_tipos_mime": ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], "bucket_tope_bytes": 10485760}'::jsonb),
  ('archivo_formatos', 'documento_huesped', 'Foto del documento del huésped y de sus menores', 4, true, null, '{"tipos_mime": ["image/jpeg", "image/png", "image/webp"], "tope_bytes": 8388608, "bucket": "visitas", "bucket_tipos_mime": ["image/png", "image/webp", "image/heic", "image/jpeg", "application/pdf"], "bucket_tope_bytes": 10485760}'::jsonb),
  ('archivo_formatos', 'autorizacion_menor', 'Autorización o tutela de un menor y documentos adicionales', 5, true, null, '{"tipos_mime": ["image/jpeg", "image/png", "image/webp", "application/pdf"], "tope_bytes": 8388608, "bucket": "visitas", "bucket_tipos_mime": ["image/png", "image/webp", "image/heic", "image/jpeg", "application/pdf"], "bucket_tope_bytes": 10485760}'::jsonb),
  ('canales_iniciales', 'residentes', 'Residentes', 1, true, null, '{"roles": ["propietario", "inquilino_lider", "residente", "corresidente"]}'::jsonb),
  ('canales_iniciales', 'propietarios', 'Propietarios', 2, true, null, '{"roles": ["propietario"]}'::jsonb),
  ('antecedentes_fuentes_obligatorias', 'policia', 'policia', 1, true, 'CO', '{}'::jsonb),
  ('antecedentes_fuentes_obligatorias', 'procuraduria', 'procuraduria', 2, true, 'CO', '{}'::jsonb),
  ('antecedentes_fuentes_obligatorias', 'inpec', 'inpec', 3, true, 'CO', '{}'::jsonb),
  ('antecedentes_fuentes_obligatorias', 'delitos_sexuales', 'delitos_sexuales', 4, true, 'CO', '{}'::jsonb),
  ('antecedentes_fuentes_obligatorias', 'interpol', 'interpol', 5, true, 'CO', '{}'::jsonb),
  ('antecedentes_fuentes_obligatorias', 'ofac', 'ofac', 6, true, 'CO', '{}'::jsonb),
  ('antecedentes_fuentes_obligatorias', 'lista_onu', 'lista_onu', 7, true, 'CO', '{}'::jsonb),
  ('campos_obligatorios_preregistro', 'nombre', 'tus nombres', 1, true, null, '{"titular": true, "acompanante": true}'::jsonb),
  ('campos_obligatorios_preregistro', 'apellidos', 'tus apellidos', 2, true, null, '{"titular": true, "acompanante": true}'::jsonb),
  ('campos_obligatorios_preregistro', 'tipo_documento', 'el tipo de documento', 3, true, null, '{"titular": true, "acompanante": true}'::jsonb),
  ('campos_obligatorios_preregistro', 'documento', 'el número de identificación', 4, true, null, '{"titular": true, "acompanante": true}'::jsonb),
  ('campos_obligatorios_preregistro', 'correo', 'un correo válido', 5, true, null, '{"titular": true, "acompanante": false, "nota": "al acompañante solo se le valida si lo escribe"}'::jsonb),
  ('campos_obligatorios_preregistro', 'fecha_nacimiento', 'la fecha de nacimiento', 6, true, null, '{"titular": true, "acompanante": true, "nota": "año >= 1900"}'::jsonb),
  ('campos_obligatorios_preregistro', 'fecha_expedicion', 'la fecha de expedición del documento', 7, true, null, '{"titular": true, "acompanante": true, "solo_si": "cedula_extranjeria o ppt"}'::jsonb),
  ('campos_obligatorios_preregistro', 'nacionalidad', 'la nacionalidad', 8, true, null, '{"titular": true, "acompanante": true}'::jsonb),
  ('campos_obligatorios_preregistro', 'ciudad_residencia', 'la ciudad donde vives', 9, true, null, '{"titular": true, "acompanante": false}'::jsonb),
  ('campos_obligatorios_preregistro', 'ciudad_procedencia', 'la ciudad desde la que viajas', 10, true, null, '{"titular": true, "acompanante": false}'::jsonb),
  ('campos_obligatorios_preregistro', 'costo', 'lo que pagaste por la estancia', 11, true, null, '{"titular": true, "acompanante": false, "nota": "máximo 2 decimales"}'::jsonb),
  ('palabras_de_bloqueo_ical', 'not_available', 'not available', 1, true, null, '{}'::jsonb),
  ('palabras_de_bloqueo_ical', 'unavailable', 'unavailable', 2, true, null, '{}'::jsonb),
  ('palabras_de_bloqueo_ical', 'blocked', 'blocked', 3, true, null, '{}'::jsonb),
  ('palabras_de_bloqueo_ical', 'no_disponible', 'no disponible', 4, true, null, '{}'::jsonb),
  ('tipos_de_documento', 'cedula_ciudadania', 'Cédula de ciudadanía', 1, true, null, '{"donde_se_ofrece": ["registro", "visita", "preregistro"], "una_cara": false, "pide_expedicion": false, "siglas_tra": "C.C", "codigo_tusdatos": "CC", "largo_min": 5, "largo_max": 12, "solo_numeros": true}'::jsonb),
  ('tipos_de_documento', 'cedula_extranjeria', 'Cédula de extranjería', 2, true, null, '{"donde_se_ofrece": ["visita", "preregistro"], "una_cara": false, "pide_expedicion": true, "siglas_tra": "C.E", "codigo_tusdatos": "CE", "largo_min": 5, "largo_max": 12, "solo_numeros": true}'::jsonb),
  ('tipos_de_documento', 'dni', 'DNI', 3, true, null, '{"donde_se_ofrece": ["registro", "visita", "preregistro"], "una_cara": false, "pide_expedicion": false, "siglas_tra": "Pasaporte", "codigo_tusdatos": null, "largo_min": 5, "largo_max": 12, "solo_numeros": true}'::jsonb),
  ('tipos_de_documento', 'carne_extranjeria', 'Carné de extranjería', 4, true, null, '{"donde_se_ofrece": ["visita", "preregistro"], "una_cara": false, "pide_expedicion": false, "siglas_tra": "Pasaporte", "codigo_tusdatos": null, "largo_min": 4, "largo_max": 20, "solo_numeros": false}'::jsonb),
  ('tipos_de_documento', 'pep', 'PEP (ya no vigente)', 5, false, null, '{"donde_se_ofrece": ["preregistro"], "una_cara": false, "pide_expedicion": false, "siglas_tra": "Pasaporte", "codigo_tusdatos": null, "largo_min": 4, "largo_max": 20, "solo_numeros": false}'::jsonb),
  ('tipos_de_documento', 'pasaporte', 'Pasaporte', 6, true, null, '{"donde_se_ofrece": ["registro", "visita", "preregistro"], "una_cara": true, "pide_expedicion": false, "siglas_tra": "Pasaporte", "codigo_tusdatos": "PP", "largo_min": 4, "largo_max": 20, "solo_numeros": false}'::jsonb),
  ('tipos_de_documento', 'ppt', 'PPT (Permiso por Protección Temporal)', 7, true, null, '{"donde_se_ofrece": ["visita", "preregistro"], "una_cara": false, "pide_expedicion": true, "siglas_tra": null, "codigo_tusdatos": "PPT", "largo_min": 4, "largo_max": 20, "solo_numeros": false}'::jsonb),
  ('tipos_de_documento', 'registro_civil', 'Registro civil de nacimiento', 8, true, null, '{"donde_se_ofrece": ["visita", "preregistro"], "una_cara": true, "pide_expedicion": false, "siglas_tra": "R.C", "codigo_tusdatos": null, "largo_min": 4, "largo_max": 20, "solo_numeros": false}'::jsonb),
  ('tipos_de_documento', 'tarjeta_identidad', 'Tarjeta de identidad', 9, true, null, '{"donde_se_ofrece": ["visita", "preregistro"], "una_cara": false, "pide_expedicion": false, "siglas_tra": "T.I", "codigo_tusdatos": null, "largo_min": 5, "largo_max": 12, "solo_numeros": true}'::jsonb),
  ('nacionalidades', 'AF', 'Afganistán', 1, true, null, '{}'::jsonb),
  ('nacionalidades', 'AL', 'Albania', 2, true, null, '{}'::jsonb),
  ('nacionalidades', 'DE', 'Alemania', 3, true, null, '{}'::jsonb),
  ('nacionalidades', 'AD', 'Andorra', 4, true, null, '{}'::jsonb),
  ('nacionalidades', 'AO', 'Angola', 5, true, null, '{}'::jsonb),
  ('nacionalidades', 'AG', 'Antigua y Barbuda', 6, true, null, '{}'::jsonb),
  ('nacionalidades', 'SA', 'Arabia Saudí', 7, true, null, '{}'::jsonb),
  ('nacionalidades', 'DZ', 'Argelia', 8, true, null, '{}'::jsonb),
  ('nacionalidades', 'AR', 'Argentina', 9, true, null, '{}'::jsonb),
  ('nacionalidades', 'AM', 'Armenia', 10, true, null, '{}'::jsonb),
  ('nacionalidades', 'AU', 'Australia', 11, true, null, '{}'::jsonb),
  ('nacionalidades', 'AT', 'Austria', 12, true, null, '{}'::jsonb),
  ('nacionalidades', 'AZ', 'Azerbaiyán', 13, true, null, '{}'::jsonb),
  ('nacionalidades', 'BS', 'Bahamas', 14, true, null, '{}'::jsonb),
  ('nacionalidades', 'BD', 'Bangladés', 15, true, null, '{}'::jsonb),
  ('nacionalidades', 'BB', 'Barbados', 16, true, null, '{}'::jsonb),
  ('nacionalidades', 'BH', 'Baréin', 17, true, null, '{}'::jsonb),
  ('nacionalidades', 'BE', 'Bélgica', 18, true, null, '{}'::jsonb),
  ('nacionalidades', 'BZ', 'Belice', 19, true, null, '{}'::jsonb),
  ('nacionalidades', 'BJ', 'Benín', 20, true, null, '{}'::jsonb),
  ('nacionalidades', 'BY', 'Bielorrusia', 21, true, null, '{}'::jsonb),
  ('nacionalidades', 'BO', 'Bolivia', 22, true, null, '{}'::jsonb),
  ('nacionalidades', 'BA', 'Bosnia y Herzegovina', 23, true, null, '{}'::jsonb),
  ('nacionalidades', 'BW', 'Botsuana', 24, true, null, '{}'::jsonb),
  ('nacionalidades', 'BR', 'Brasil', 25, true, null, '{}'::jsonb),
  ('nacionalidades', 'BN', 'Brunéi', 26, true, null, '{}'::jsonb),
  ('nacionalidades', 'BG', 'Bulgaria', 27, true, null, '{}'::jsonb),
  ('nacionalidades', 'BF', 'Burkina Faso', 28, true, null, '{}'::jsonb),
  ('nacionalidades', 'BI', 'Burundi', 29, true, null, '{}'::jsonb),
  ('nacionalidades', 'BT', 'Bután', 30, true, null, '{}'::jsonb),
  ('nacionalidades', 'CV', 'Cabo Verde', 31, true, null, '{}'::jsonb),
  ('nacionalidades', 'KH', 'Camboya', 32, true, null, '{}'::jsonb),
  ('nacionalidades', 'CM', 'Camerún', 33, true, null, '{}'::jsonb),
  ('nacionalidades', 'CA', 'Canadá', 34, true, null, '{}'::jsonb),
  ('nacionalidades', 'QA', 'Catar', 35, true, null, '{}'::jsonb),
  ('nacionalidades', 'TD', 'Chad', 36, true, null, '{}'::jsonb),
  ('nacionalidades', 'CZ', 'Chequia', 37, true, null, '{}'::jsonb),
  ('nacionalidades', 'CL', 'Chile', 38, true, null, '{}'::jsonb),
  ('nacionalidades', 'CN', 'China', 39, true, null, '{}'::jsonb),
  ('nacionalidades', 'CY', 'Chipre', 40, true, null, '{}'::jsonb),
  ('nacionalidades', 'VA', 'Ciudad del Vaticano', 41, true, null, '{}'::jsonb),
  ('nacionalidades', 'CO', 'Colombia', 42, true, null, '{}'::jsonb),
  ('nacionalidades', 'KM', 'Comoras', 43, true, null, '{}'::jsonb),
  ('nacionalidades', 'CG', 'Congo', 44, true, null, '{}'::jsonb),
  ('nacionalidades', 'KP', 'Corea del Norte', 45, true, null, '{}'::jsonb),
  ('nacionalidades', 'KR', 'Corea del Sur', 46, true, null, '{}'::jsonb),
  ('nacionalidades', 'CR', 'Costa Rica', 47, true, null, '{}'::jsonb),
  ('nacionalidades', 'CI', 'Côte d’Ivoire', 48, true, null, '{}'::jsonb),
  ('nacionalidades', 'HR', 'Croacia', 49, true, null, '{}'::jsonb),
  ('nacionalidades', 'CU', 'Cuba', 50, true, null, '{}'::jsonb),
  ('nacionalidades', 'DK', 'Dinamarca', 51, true, null, '{}'::jsonb),
  ('nacionalidades', 'DM', 'Dominica', 52, true, null, '{}'::jsonb),
  ('nacionalidades', 'EC', 'Ecuador', 53, true, null, '{}'::jsonb),
  ('nacionalidades', 'EG', 'Egipto', 54, true, null, '{}'::jsonb),
  ('nacionalidades', 'SV', 'El Salvador', 55, true, null, '{}'::jsonb),
  ('nacionalidades', 'AE', 'Emiratos Árabes Unidos', 56, true, null, '{}'::jsonb),
  ('nacionalidades', 'ER', 'Eritrea', 57, true, null, '{}'::jsonb),
  ('nacionalidades', 'SK', 'Eslovaquia', 58, true, null, '{}'::jsonb),
  ('nacionalidades', 'SI', 'Eslovenia', 59, true, null, '{}'::jsonb),
  ('nacionalidades', 'ES', 'España', 60, true, null, '{}'::jsonb),
  ('nacionalidades', 'US', 'Estados Unidos', 61, true, null, '{}'::jsonb),
  ('nacionalidades', 'EE', 'Estonia', 62, true, null, '{}'::jsonb),
  ('nacionalidades', 'SZ', 'Esuatini', 63, true, null, '{}'::jsonb),
  ('nacionalidades', 'ET', 'Etiopía', 64, true, null, '{}'::jsonb),
  ('nacionalidades', 'PH', 'Filipinas', 65, true, null, '{}'::jsonb),
  ('nacionalidades', 'FI', 'Finlandia', 66, true, null, '{}'::jsonb),
  ('nacionalidades', 'FJ', 'Fiyi', 67, true, null, '{}'::jsonb),
  ('nacionalidades', 'FR', 'Francia', 68, true, null, '{}'::jsonb),
  ('nacionalidades', 'GA', 'Gabón', 69, true, null, '{}'::jsonb),
  ('nacionalidades', 'GM', 'Gambia', 70, true, null, '{}'::jsonb),
  ('nacionalidades', 'GE', 'Georgia', 71, true, null, '{}'::jsonb),
  ('nacionalidades', 'GH', 'Ghana', 72, true, null, '{}'::jsonb),
  ('nacionalidades', 'GD', 'Granada', 73, true, null, '{}'::jsonb),
  ('nacionalidades', 'GR', 'Grecia', 74, true, null, '{}'::jsonb),
  ('nacionalidades', 'GT', 'Guatemala', 75, true, null, '{}'::jsonb),
  ('nacionalidades', 'GN', 'Guinea', 76, true, null, '{}'::jsonb),
  ('nacionalidades', 'GQ', 'Guinea Ecuatorial', 77, true, null, '{}'::jsonb),
  ('nacionalidades', 'GW', 'Guinea-Bisáu', 78, true, null, '{}'::jsonb),
  ('nacionalidades', 'GY', 'Guyana', 79, true, null, '{}'::jsonb),
  ('nacionalidades', 'HT', 'Haití', 80, true, null, '{}'::jsonb),
  ('nacionalidades', 'HN', 'Honduras', 81, true, null, '{}'::jsonb),
  ('nacionalidades', 'HU', 'Hungría', 82, true, null, '{}'::jsonb),
  ('nacionalidades', 'IN', 'India', 83, true, null, '{}'::jsonb),
  ('nacionalidades', 'ID', 'Indonesia', 84, true, null, '{}'::jsonb),
  ('nacionalidades', 'IQ', 'Irak', 85, true, null, '{}'::jsonb),
  ('nacionalidades', 'IR', 'Irán', 86, true, null, '{}'::jsonb),
  ('nacionalidades', 'IE', 'Irlanda', 87, true, null, '{}'::jsonb),
  ('nacionalidades', 'IS', 'Islandia', 88, true, null, '{}'::jsonb),
  ('nacionalidades', 'MH', 'Islas Marshall', 89, true, null, '{}'::jsonb),
  ('nacionalidades', 'SB', 'Islas Salomón', 90, true, null, '{}'::jsonb),
  ('nacionalidades', 'IL', 'Israel', 91, true, null, '{}'::jsonb),
  ('nacionalidades', 'IT', 'Italia', 92, true, null, '{}'::jsonb),
  ('nacionalidades', 'JM', 'Jamaica', 93, true, null, '{}'::jsonb),
  ('nacionalidades', 'JP', 'Japón', 94, true, null, '{}'::jsonb),
  ('nacionalidades', 'JO', 'Jordania', 95, true, null, '{}'::jsonb),
  ('nacionalidades', 'KZ', 'Kazajistán', 96, true, null, '{}'::jsonb),
  ('nacionalidades', 'KE', 'Kenia', 97, true, null, '{}'::jsonb),
  ('nacionalidades', 'KG', 'Kirguistán', 98, true, null, '{}'::jsonb),
  ('nacionalidades', 'KI', 'Kiribati', 99, true, null, '{}'::jsonb),
  ('nacionalidades', 'KW', 'Kuwait', 100, true, null, '{}'::jsonb),
  ('nacionalidades', 'LA', 'Laos', 101, true, null, '{}'::jsonb),
  ('nacionalidades', 'LS', 'Lesoto', 102, true, null, '{}'::jsonb),
  ('nacionalidades', 'LV', 'Letonia', 103, true, null, '{}'::jsonb),
  ('nacionalidades', 'LB', 'Líbano', 104, true, null, '{}'::jsonb),
  ('nacionalidades', 'LR', 'Liberia', 105, true, null, '{}'::jsonb),
  ('nacionalidades', 'LY', 'Libia', 106, true, null, '{}'::jsonb),
  ('nacionalidades', 'LI', 'Liechtenstein', 107, true, null, '{}'::jsonb),
  ('nacionalidades', 'LT', 'Lituania', 108, true, null, '{}'::jsonb),
  ('nacionalidades', 'LU', 'Luxemburgo', 109, true, null, '{}'::jsonb),
  ('nacionalidades', 'MK', 'Macedonia del Norte', 110, true, null, '{}'::jsonb),
  ('nacionalidades', 'MG', 'Madagascar', 111, true, null, '{}'::jsonb),
  ('nacionalidades', 'MY', 'Malasia', 112, true, null, '{}'::jsonb),
  ('nacionalidades', 'MW', 'Malaui', 113, true, null, '{}'::jsonb),
  ('nacionalidades', 'MV', 'Maldivas', 114, true, null, '{}'::jsonb),
  ('nacionalidades', 'ML', 'Mali', 115, true, null, '{}'::jsonb),
  ('nacionalidades', 'MT', 'Malta', 116, true, null, '{}'::jsonb),
  ('nacionalidades', 'MA', 'Marruecos', 117, true, null, '{}'::jsonb),
  ('nacionalidades', 'MU', 'Mauricio', 118, true, null, '{}'::jsonb),
  ('nacionalidades', 'MR', 'Mauritania', 119, true, null, '{}'::jsonb),
  ('nacionalidades', 'MX', 'México', 120, true, null, '{}'::jsonb),
  ('nacionalidades', 'FM', 'Micronesia', 121, true, null, '{}'::jsonb),
  ('nacionalidades', 'MD', 'Moldavia', 122, true, null, '{}'::jsonb),
  ('nacionalidades', 'MC', 'Mónaco', 123, true, null, '{}'::jsonb),
  ('nacionalidades', 'MN', 'Mongolia', 124, true, null, '{}'::jsonb),
  ('nacionalidades', 'ME', 'Montenegro', 125, true, null, '{}'::jsonb),
  ('nacionalidades', 'MZ', 'Mozambique', 126, true, null, '{}'::jsonb),
  ('nacionalidades', 'MM', 'Myanmar (Birmania)', 127, true, null, '{}'::jsonb),
  ('nacionalidades', 'NA', 'Namibia', 128, true, null, '{}'::jsonb),
  ('nacionalidades', 'NR', 'Nauru', 129, true, null, '{}'::jsonb),
  ('nacionalidades', 'NP', 'Nepal', 130, true, null, '{}'::jsonb),
  ('nacionalidades', 'NI', 'Nicaragua', 131, true, null, '{}'::jsonb),
  ('nacionalidades', 'NE', 'Níger', 132, true, null, '{}'::jsonb),
  ('nacionalidades', 'NG', 'Nigeria', 133, true, null, '{}'::jsonb),
  ('nacionalidades', 'NO', 'Noruega', 134, true, null, '{}'::jsonb),
  ('nacionalidades', 'NZ', 'Nueva Zelanda', 135, true, null, '{}'::jsonb),
  ('nacionalidades', 'OM', 'Omán', 136, true, null, '{}'::jsonb),
  ('nacionalidades', 'NL', 'Países Bajos', 137, true, null, '{}'::jsonb),
  ('nacionalidades', 'PK', 'Pakistán', 138, true, null, '{}'::jsonb),
  ('nacionalidades', 'PW', 'Palaos', 139, true, null, '{}'::jsonb),
  ('nacionalidades', 'PA', 'Panamá', 140, true, null, '{}'::jsonb),
  ('nacionalidades', 'PG', 'Papúa Nueva Guinea', 141, true, null, '{}'::jsonb),
  ('nacionalidades', 'PY', 'Paraguay', 142, true, null, '{}'::jsonb),
  ('nacionalidades', 'PE', 'Perú', 143, true, null, '{}'::jsonb),
  ('nacionalidades', 'PL', 'Polonia', 144, true, null, '{}'::jsonb),
  ('nacionalidades', 'PT', 'Portugal', 145, true, null, '{}'::jsonb),
  ('nacionalidades', 'PR', 'Puerto Rico', 146, true, null, '{}'::jsonb),
  ('nacionalidades', 'GB', 'Reino Unido', 147, true, null, '{}'::jsonb),
  ('nacionalidades', 'CF', 'República Centroafricana', 148, true, null, '{}'::jsonb),
  ('nacionalidades', 'CD', 'República Democrática del Congo', 149, true, null, '{}'::jsonb),
  ('nacionalidades', 'DO', 'República Dominicana', 150, true, null, '{}'::jsonb),
  ('nacionalidades', 'RW', 'Ruanda', 151, true, null, '{}'::jsonb),
  ('nacionalidades', 'RO', 'Rumanía', 152, true, null, '{}'::jsonb),
  ('nacionalidades', 'RU', 'Rusia', 153, true, null, '{}'::jsonb),
  ('nacionalidades', 'WS', 'Samoa', 154, true, null, '{}'::jsonb),
  ('nacionalidades', 'KN', 'San Cristóbal y Nieves', 155, true, null, '{}'::jsonb),
  ('nacionalidades', 'SM', 'San Marino', 156, true, null, '{}'::jsonb),
  ('nacionalidades', 'VC', 'San Vicente y las Granadinas', 157, true, null, '{}'::jsonb),
  ('nacionalidades', 'LC', 'Santa Lucía', 158, true, null, '{}'::jsonb),
  ('nacionalidades', 'ST', 'Santo Tomé y Príncipe', 159, true, null, '{}'::jsonb),
  ('nacionalidades', 'SN', 'Senegal', 160, true, null, '{}'::jsonb),
  ('nacionalidades', 'RS', 'Serbia', 161, true, null, '{}'::jsonb),
  ('nacionalidades', 'SC', 'Seychelles', 162, true, null, '{}'::jsonb),
  ('nacionalidades', 'SL', 'Sierra Leona', 163, true, null, '{}'::jsonb),
  ('nacionalidades', 'SG', 'Singapur', 164, true, null, '{}'::jsonb),
  ('nacionalidades', 'SY', 'Siria', 165, true, null, '{}'::jsonb),
  ('nacionalidades', 'SO', 'Somalia', 166, true, null, '{}'::jsonb),
  ('nacionalidades', 'LK', 'Sri Lanka', 167, true, null, '{}'::jsonb),
  ('nacionalidades', 'ZA', 'Sudáfrica', 168, true, null, '{}'::jsonb),
  ('nacionalidades', 'SD', 'Sudán', 169, true, null, '{}'::jsonb),
  ('nacionalidades', 'SS', 'Sudán del Sur', 170, true, null, '{}'::jsonb),
  ('nacionalidades', 'SE', 'Suecia', 171, true, null, '{}'::jsonb),
  ('nacionalidades', 'CH', 'Suiza', 172, true, null, '{}'::jsonb),
  ('nacionalidades', 'SR', 'Surinam', 173, true, null, '{}'::jsonb),
  ('nacionalidades', 'TH', 'Tailandia', 174, true, null, '{}'::jsonb),
  ('nacionalidades', 'TW', 'Taiwán', 175, true, null, '{}'::jsonb),
  ('nacionalidades', 'TZ', 'Tanzania', 176, true, null, '{}'::jsonb),
  ('nacionalidades', 'TJ', 'Tayikistán', 177, true, null, '{}'::jsonb),
  ('nacionalidades', 'PS', 'Territorios Palestinos', 178, true, null, '{}'::jsonb),
  ('nacionalidades', 'TL', 'Timor-Leste', 179, true, null, '{}'::jsonb),
  ('nacionalidades', 'TG', 'Togo', 180, true, null, '{}'::jsonb),
  ('nacionalidades', 'TO', 'Tonga', 181, true, null, '{}'::jsonb),
  ('nacionalidades', 'TT', 'Trinidad y Tobago', 182, true, null, '{}'::jsonb),
  ('nacionalidades', 'TN', 'Túnez', 183, true, null, '{}'::jsonb),
  ('nacionalidades', 'TM', 'Turkmenistán', 184, true, null, '{}'::jsonb),
  ('nacionalidades', 'TR', 'Turquía', 185, true, null, '{}'::jsonb),
  ('nacionalidades', 'TV', 'Tuvalu', 186, true, null, '{}'::jsonb),
  ('nacionalidades', 'UA', 'Ucrania', 187, true, null, '{}'::jsonb),
  ('nacionalidades', 'UG', 'Uganda', 188, true, null, '{}'::jsonb),
  ('nacionalidades', 'UY', 'Uruguay', 189, true, null, '{}'::jsonb),
  ('nacionalidades', 'UZ', 'Uzbekistán', 190, true, null, '{}'::jsonb),
  ('nacionalidades', 'VU', 'Vanuatu', 191, true, null, '{}'::jsonb),
  ('nacionalidades', 'VE', 'Venezuela', 192, true, null, '{}'::jsonb),
  ('nacionalidades', 'VN', 'Vietnam', 193, true, null, '{}'::jsonb),
  ('nacionalidades', 'YE', 'Yemen', 194, true, null, '{}'::jsonb),
  ('nacionalidades', 'DJ', 'Yibuti', 195, true, null, '{}'::jsonb),
  ('nacionalidades', 'ZM', 'Zambia', 196, true, null, '{}'::jsonb),
  ('nacionalidades', 'ZW', 'Zimbabue', 197, true, null, '{}'::jsonb)
on conflict do nothing;

-- El país que viene elegido por defecto (antes «CO» escrito en app, web y base).
insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, ambito, categoria, riesgo, es_publico, descripcion)
values
  ('pais_por_defecto', 'CO', 'CO', 'texto', 'plataforma', 'edificio', 'bajo', true,
   'País que viene elegido por defecto en los formularios (prefijo telefónico, alta de edificio). Código de la tabla pais.')
on conflict (clave) do nothing;

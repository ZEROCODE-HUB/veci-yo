-- Todos los parámetros, con el valor que se usa hoy (18/10/2026).
--
-- Aditiva: una columna nueva y filas nuevas. No se borra nada ni cambia ningún
-- comportamiento: cada fila guarda el valor que hoy está escrito en el código o
-- en una función. Las migraciones siguientes cambian el código para leerlo de
-- aquí, área por área. Inventario completo en la pestaña Parametrización del
-- GSheet del cliente.
--
-- Donde el mismo dato valía distinto en dos sitios (un defecto), se eligió el
-- que de verdad se aplicaba; se cambia después desde el panel si hace falta.

alter table public.configuracion_plataforma
  add column if not exists valores_permitidos text[];

comment on column public.configuracion_plataforma.valores_permitidos is
  'Para parámetros de texto que solo admiten ciertas palabras: la lista de las válidas. Vacío = cualquier texto.';

create or replace function public.validar_valores_permitidos()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_permitidos text[];
begin
  if tg_table_name = 'configuracion_plataforma' then
    v_permitidos := new.valores_permitidos;
  else
    select valores_permitidos into v_permitidos from public.configuracion_plataforma where clave = new.clave;
  end if;
  if v_permitidos is not null and not (new.valor = any (v_permitidos)) then
    raise exception 'El parámetro "%" solo acepta: %.', new.clave, array_to_string(v_permitidos, ', ');
  end if;
  return new;
end;
$$;

comment on function public.validar_valores_permitidos() is
  'Disparador: un parámetro con valores_permitidos solo acepta uno de ellos (también en el valor por edificio).';

drop trigger if exists configuracion_plataforma_permitidos on public.configuracion_plataforma;
create trigger configuracion_plataforma_permitidos
  before insert or update on public.configuracion_plataforma
  for each row execute function public.validar_valores_permitidos();

drop trigger if exists parametro_condominio_permitidos on public.parametro_condominio;
create trigger parametro_condominio_permitidos
  before insert or update on public.parametro_condominio
  for each row execute function public.validar_valores_permitidos();

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, valores_permitidos, descripcion)
values
  ('invitacion_dias_validez', '7', '7', 'dias', 'días', 1, 90, 'plataforma', 'cuentas', 'medio', true, null,
   'Días que vale una invitación a una vivienda antes de vencer. El correo de invitación dice este mismo número.'),
  ('invitacion_admin_dias_validez', '14', '14', 'dias', 'días', 1, 90, 'plataforma', 'cuentas', 'medio', true, null,
   'Días que vale la invitación al primer administrador de un edificio nuevo.'),
  ('contrasena_largo_minimo', '8', '8', 'entero', 'caracteres', 6, 72, 'plataforma', 'cuentas', 'alto', true, null,
   'Largo mínimo de la contraseña al registrarse, entrar y cambiarla. Debe coincidir con el mínimo de Authentication › Policies en el panel de Supabase.'),
  ('nombre_largo_minimo', '2', '2', 'entero', 'caracteres', 1, 20, 'plataforma', 'cuentas', 'bajo', true, null,
   'Largo mínimo del nombre y del apellido al registrarse.'),
  ('nombre_largo_maximo', '80', '80', 'entero', 'caracteres', 20, 200, 'plataforma', 'cuentas', 'bajo', true, null,
   'Largo máximo del nombre y del apellido al registrarse.'),
  ('apodo_largo_maximo', '40', '40', 'entero', 'caracteres', 10, 200, 'plataforma', 'cuentas', 'bajo', true, null,
   'Largo máximo del apodo que alguien le pone a su vivienda.'),
  ('preregistro_enlace_dias_sin_salida', '30', '30', 'dias', 'días', 1, 365, 'plataforma', 'preregistro', 'bajo', false, null,
   'Días que vale el enlace de preregistro cuando la estancia no tiene fecha de salida. Si la tiene, vale hasta el día siguiente a la salida.'),
  ('preregistro_codigo_intentos', '5', '5', 'entero', 'intentos', 1, 20, 'plataforma', 'preregistro', 'medio', false, null,
   'Intentos fallidos permitidos al abrir el preregistro con el código de la reserva y los últimos dígitos del teléfono, antes de bloquear.'),
  ('preregistro_codigo_bloqueo_minutos', '60', '60', 'minutos', 'minutos', 1, 1440, 'plataforma', 'preregistro', 'medio', false, null,
   'Minutos que el preregistro queda bloqueado después de agotar los intentos.'),
  ('preregistro_codigo_digitos_telefono', '4', '4', 'entero', 'dígitos', 3, 8, 'plataforma', 'preregistro', 'bajo', true, null,
   'Cuántos dígitos finales del teléfono pide el preregistro para abrirse con el código de la reserva.'),
  ('preregistro_alerta_dias', '3', '3', 'dias', 'días', 0, 30, 'edificio', 'preregistro', 'bajo', true, null,
   'Con cuántos días de anticipación a la llegada se avisa al anfitrión de un preregistro sin terminar, y sale la alerta en su Inicio.'),
  ('preregistro_recordatorio_dias_por_defecto', '[7, 3, 1]', '[7, 3, 1]', 'lista', null, null, null, 'plataforma', 'preregistro', 'bajo', true, null,
   'Días antes de la llegada en que se recuerda al huésped terminar el preregistro, cuando el anfitrión no eligió otros.'),
  ('preregistro_recordatorio_dias_opciones', '[14, 7, 3, 2, 1]', '[14, 7, 3, 2, 1]', 'lista', null, null, null, 'plataforma', 'preregistro', 'bajo', true, null,
   'Días que el anfitrión puede elegir para los recordatorios del preregistro.'),
  ('preregistro_recordatorio_dias_maximo', '60', '60', 'dias', 'días', 1, 365, 'plataforma', 'preregistro', 'bajo', false, null,
   'Lo más lejos de la llegada que se puede programar un recordatorio del preregistro.'),
  ('preregistro_recordatorio_encendido', 'true', 'true', 'booleano', null, null, null, 'plataforma', 'preregistro', 'bajo', true, null,
   'Si los recordatorios del preregistro arrancan encendidos en una vivienda nueva.'),
  ('anio_nacimiento_minimo', '1900', '1900', 'entero', 'año', 1850, 2000, 'plataforma', 'preregistro', 'bajo', true, null,
   'Año de nacimiento más antiguo que se acepta en una ficha.'),
  ('telefono_largo_minimo', '7', '7', 'entero', 'cifras', 4, 15, 'plataforma', 'preregistro', 'bajo', true, null,
   'Cifras mínimas de un número de teléfono (sin el prefijo del país).'),
  ('telefono_largo_maximo', '15', '15', 'entero', 'cifras', 7, 20, 'plataforma', 'preregistro', 'bajo', true, null,
   'Cifras máximas de un número de teléfono (sin el prefijo del país).'),
  ('titular_provisional_nombre', 'Huésped por confirmar', 'Huésped por confirmar', 'texto', null, null, null, 'plataforma', 'preregistro', 'bajo', true, null,
   'Nombre que se le pone al titular de una reserva que llega del calendario de Airbnb, hasta que llena su ficha.'),
  ('verificaciones_incluidas', '20', '20', 'entero', 'verificaciones', 0, 1000, 'plataforma', 'antecedentes', 'alto', false, null,
   'Verificaciones de antecedentes incluidas por mes en una suscripción de renta corta nueva. Toca el cobro.'),
  ('verificaciones_paquete_tamano', '10', '10', 'entero', 'verificaciones', 1, 1000, 'plataforma', 'antecedentes', 'alto', true, null,
   'Verificaciones que trae cada paquete extra que compra el anfitrión. Toca el cobro.'),
  ('verificaciones_paquete_dias', '180', '180', 'dias', 'días', 1, 730, 'plataforma', 'antecedentes', 'alto', false, null,
   'Días que duran las verificaciones de un paquete extra antes de vencer. Los ya comprados conservan su fecha.'),
  ('verificaciones_aviso_quedan', '5', '5', 'entero', 'verificaciones', 0, 100, 'plataforma', 'antecedentes', 'bajo', true, null,
   'Desde cuántas verificaciones restantes se le ofrece al anfitrión comprar un paquete.'),
  ('antecedentes_nivel_que_pide_revision', 'alto', 'alto', 'texto', null, null, null, 'edificio', 'antecedentes', 'alto', false, array['alto', 'medio', 'bajo']::text[],
   'Desde qué nivel de hallazgo la verificación pide la aprobación manual del anfitrión (alto = solo los graves).'),
  ('antecedentes_resultado_si_apagado', 'error_proveedor', 'error_proveedor', 'texto', null, null, null, 'plataforma', 'antecedentes', 'alto', false, array['error_proveedor', 'aprobada']::text[],
   'Qué se anota si la consulta de antecedentes está apagada o sin credenciales. error_proveedor = «no se pudo consultar» y decide el anfitrión; aprobada = se da por buena (solo para pruebas).'),
  ('antecedentes_consulta_intentos', '8', '8', 'entero', 'intentos', 1, 30, 'plataforma', 'antecedentes', 'bajo', false, null,
   'Cuántas veces se pregunta a Tus Datos por el resultado antes de dejar la consulta como pendiente. Preguntar no cuesta dinero.'),
  ('antecedentes_consulta_espera_segundos', '5', '5', 'segundos', 'segundos', 1, 60, 'plataforma', 'antecedentes', 'bajo', false, null,
   'Segundos entre cada pregunta a Tus Datos por el resultado (Tus Datos pide al menos 5).'),
  ('antecedentes_informe_intentos', '3', '3', 'entero', 'intentos', 1, 10, 'plataforma', 'antecedentes', 'bajo', false, null,
   'Cuántas veces se espera el PDF de Tus Datos antes de armar el informe propio.'),
  ('antecedentes_informe_espera_segundos', '10', '10', 'segundos', 'segundos', 1, 60, 'plataforma', 'antecedentes', 'bajo', false, null,
   'Segundos entre cada espera del PDF de Tus Datos.'),
  ('antecedentes_espera_respuesta_segundos', '60', '60', 'segundos', 'segundos', 5, 300, 'plataforma', 'antecedentes', 'bajo', false, null,
   'Segundos que se espera a Tus Datos en cada llamada antes de darla por fallida.'),
  ('antecedentes_reintento_tras_minutos', '2', '2', 'minutos', 'minutos', 1, 60, 'plataforma', 'antecedentes', 'bajo', false, null,
   'Una consulta pendiente se vuelve a preguntar si lleva al menos estos minutos.'),
  ('antecedentes_abandonar_tras_horas', '2', '2', 'horas', 'horas', 1, 72, 'plataforma', 'antecedentes', 'medio', false, null,
   'Una consulta pendiente se deja de reintentar después de estas horas.'),
  ('antecedentes_pendientes_por_pasada', '50', '50', 'entero', 'consultas', 1, 500, 'plataforma', 'antecedentes', 'bajo', false, null,
   'Cuántas consultas pendientes se recogen como mucho en cada pasada automática.'),
  ('antecedentes_informe_enlace_segundos', '300', '300', 'segundos', 'segundos', 30, 86400, 'plataforma', 'antecedentes', 'medio', false, null,
   'Segundos que vale el enlace para abrir el informe de antecedentes que ve el anfitrión.'),
  ('gratitud_dias_espera', '30', '30', 'dias', 'días', 1, 365, 'edificio', 'cuotas', 'bajo', true, null,
   'Días que tiene que esperar un residente para dar otro reconocimiento de Gratitud.'),
  ('cuotas_meses_historial', '12', '12', 'entero', 'meses', 1, 60, 'edificio', 'cuotas', 'medio', false, null,
   'Meses de cuotas que mira el Cuadro de Honor para decir quién está al día.'),
  ('cuotas_meses_adelanto', '1', '1', 'entero', 'meses', 0, 12, 'plataforma', 'cuotas', 'bajo', false, null,
   'Meses por adelantado que la administración puede crear el cobro de la cuota.'),
  ('cuota_dia_vencimiento_maximo', '28', '28', 'entero', 'día del mes', 1, 31, 'plataforma', 'cuotas', 'bajo', true, null,
   'Último día del mes que se puede elegir para el vencimiento de la cuota (28 para que exista en todos los meses).'),
  ('servicio_dia_aviso_maximo', '31', '31', 'entero', 'día del mes', 1, 31, 'plataforma', 'cuotas', 'bajo', true, null,
   'Último día del mes que se puede elegir para los avisos de pago de un servicio de la vivienda.'),
  ('honor_umbral_verde', '80', '80', 'decimal', '%', 0, 100, 'edificio', 'cuotas', 'bajo', true, null,
   'Porcentaje de viviendas al día desde el que el Cuadro de Honor se pinta en verde.'),
  ('honor_umbral_amarillo', '50', '50', 'decimal', '%', 0, 100, 'edificio', 'cuotas', 'bajo', true, null,
   'Porcentaje de viviendas al día desde el que el Cuadro de Honor se pinta en amarillo (por debajo, rojo).'),
  ('zona_duracion_maxima_por_defecto', '240', '240', 'minutos', 'minutos', 15, 1440, 'edificio', 'zonas', 'bajo', true, null,
   'Duración máxima de una reserva con que nace una zona nueva, y la que se usa si una zona no tiene ninguna.'),
  ('zona_duracion_minima_por_defecto', '60', '60', 'minutos', 'minutos', 1, 1440, 'edificio', 'zonas', 'bajo', true, null,
   'Duración mínima de una reserva con que nace una zona nueva.'),
  ('zona_duracion_rango_maximo', '1440', '1440', 'minutos', 'minutos', 60, 10080, 'plataforma', 'zonas', 'bajo', true, null,
   'Lo más largo que se puede configurar como duración de una reserva de zona.'),
  ('zona_franja_minutos', '30', '30', 'minutos', 'minutos', 5, 120, 'edificio', 'zonas', 'medio', true, null,
   'Cada cuántos minutos se ofrece una hora de inicio al reservar una zona (30 = 8:00, 8:30, 9:00…).'),
  ('zona_dias_adelanto', '14', '14', 'dias', 'días', 1, 365, 'edificio', 'zonas', 'medio', true, null,
   'Con cuántos días de adelanto se puede reservar una zona común.'),
  ('zona_apertura_por_defecto', '08:00', '08:00', 'hora_del_dia', null, null, null, 'edificio', 'zonas', 'bajo', true, null,
   'Hora de apertura con que nace una zona nueva.'),
  ('zona_cierre_por_defecto', '22:00', '22:00', 'hora_del_dia', null, null, null, 'edificio', 'zonas', 'bajo', true, null,
   'Hora de cierre con que nace una zona nueva.'),
  ('zona_tiempo_entre_reservas_por_defecto', '30', '30', 'minutos', 'minutos', 0, 240, 'edificio', 'zonas', 'bajo', true, null,
   'Minutos libres entre dos reservas con que nace una zona nueva.'),
  ('zona_cupos_por_defecto', '1', '1', 'entero', 'reservas a la vez', 1, 100, 'edificio', 'zonas', 'bajo', true, null,
   'Reservas a la misma hora con que nace una zona nueva, y las que se suponen si una zona no tiene el dato.'),
  ('permitir_si_no_configurado', 'true', 'true', 'booleano', null, null, null, 'plataforma', 'renta_corta', 'alto', true, null,
   'Qué pasa con renta corta, mascotas, niños y visitas en un edificio que aún no configuró sus permisos: true = se permiten, false = no.'),
  ('estancia_sin_noches_es_corta', 'true', 'true', 'booleano', null, null, null, 'plataforma', 'renta_corta', 'medio', false, null,
   'Si una estancia sin noches conocidas, o en un edificio sin umbral entre corta y larga, se trata como corta.'),
  ('estancia_minima_por_defecto', '1', '1', 'entero', 'noches', 1, 365, 'edificio', 'renta_corta', 'bajo', true, null,
   'Estancia mínima con que nacen los permisos de una vivienda.'),
  ('renta_corta_estancia_maxima_noches', '365', '365', 'entero', 'noches', 1, 3650, 'plataforma', 'renta_corta', 'bajo', true, null,
   'Lo más alto que el anfitrión puede poner como estancia mínima de su alojamiento.'),
  ('renta_corta_capacidad_maxima', '50', '50', 'entero', 'personas', 1, 500, 'plataforma', 'renta_corta', 'bajo', true, null,
   'Lo más alto que el anfitrión puede poner como capacidad de su alojamiento.'),
  ('renta_corta_estacionamientos_por_defecto', '0', '0', 'entero', 'estacionamientos', 0, 50, 'edificio', 'renta_corta', 'bajo', false, null,
   'Estacionamientos para huéspedes con que nace la renta corta de una vivienda.'),
  ('visitas_de_huespedes_por_defecto', 'permitir_todos', 'permitir_todos', 'texto', null, null, null, 'edificio', 'renta_corta', 'medio', true, array['permitir_todos', 'prohibir_todos', 'aprobar_cada_uno']::text[],
   'Qué pasa con las visitas de los huéspedes si el anfitrión no decidió.'),
  ('personas_vehiculos_tope', '99', '99', 'entero', 'personas', 1, 999, 'edificio', 'renta_corta', 'bajo', true, null,
   'Tope de personas y de vehículos que se pueden anunciar en una visita.'),
  ('porteria_dias_a_la_vista', '2', '2', 'dias', 'días', 1, 14, 'plataforma', 'porteria', 'bajo', true, null,
   'Cuántos días ven la portería y el anfitrión en su lista de llegadas (2 = hoy y mañana).'),
  ('codigo_estancia_largo_minimo', '6', '6', 'entero', 'caracteres', 4, 20, 'plataforma', 'porteria', 'bajo', true, null,
   'Caracteres mínimos para buscar una estancia por su código en portería.'),
  ('llamada_segundos_sin_contestar', '60', '60', 'segundos', 'segundos', 15, 600, 'plataforma', 'porteria', 'bajo', true, null,
   'Segundos que suena una llamada del intercomunicador antes de quedar como perdida.'),
  ('llamada_permiso_horas', '2', '2', 'horas', 'horas', 1, 24, 'plataforma', 'porteria', 'bajo', false, null,
   'Horas que vale el permiso para estar en una llamada de voz (en la práctica, lo más que dura una llamada).'),
  ('profesional_dias_por_defecto', '[1, 2, 3, 4, 5]', '[1, 2, 3, 4, 5]', 'lista', null, null, null, 'edificio', 'porteria', 'bajo', true, null,
   'Días de la semana que vienen marcados al registrar a un profesional permanente (1 = lunes … 7 = domingo).'),
  ('porteria_verifica_documento_por_defecto', 'true', 'true', 'booleano', null, null, null, 'edificio', 'porteria', 'medio', false, null,
   'Si la portería verifica el documento de las visitas en un edificio nuevo.'),
  ('porteria_aviso_de_visita_por_defecto', 'solo_notificar', 'solo_notificar', 'texto', null, null, null, 'edificio', 'porteria', 'bajo', false, array['solo_notificar', 'notificar_y_anunciar']::text[],
   'Qué hace la portería al llegar una visita en un edificio nuevo: solo avisar, o avisar y anunciar.'),
  ('archivo_tamano_maximo_mb', '8', '8', 'megabytes', 'MB', 1, 50, 'plataforma', 'archivos', 'bajo', true, null,
   'Tamaño máximo de un archivo o una foto que se sube (documentos, fotos de portería, autorizaciones de menores).'),
  ('foto_lado_maximo_px', '1600', '1600', 'entero', 'píxeles', 640, 4000, 'plataforma', 'archivos', 'bajo', false, null,
   'Lado más largo al que se achica la foto del documento que toma la portería.'),
  ('foto_calidad_jpeg', '82', '82', 'entero', '%', 40, 100, 'plataforma', 'archivos', 'bajo', false, null,
   'Calidad con que se guarda la foto del documento de portería (más alto = más nítida y más pesada).'),
  ('archivo_enlace_segundos', '3600', '3600', 'segundos', 'segundos', 60, 86400, 'plataforma', 'archivos', 'medio', true, null,
   'Segundos que vale el enlace temporal para ver una foto o un archivo guardado.'),
  ('tareas_zona_horaria', 'America/Bogota', 'America/Bogota', 'texto', null, null, null, 'plataforma', 'tareas', 'bajo', false, null,
   'Zona horaria en que se leen las horas de las tareas automáticas.'),
  ('tarea_hora_cuotas', '06:20', '06:20', 'hora_del_dia', null, null, null, 'plataforma', 'tareas', 'bajo', false, null,
   'Hora del día en que se crean solas las cuotas del mes.'),
  ('tarea_hora_publicaciones', '07:05', '07:05', 'hora_del_dia', null, null, null, 'plataforma', 'tareas', 'bajo', false, null,
   'Hora del día en que se avisa de las publicaciones programadas que llegaron a su fecha.'),
  ('tarea_hora_preregistro_incompleto', '08:00', '08:00', 'hora_del_dia', null, null, null, 'plataforma', 'tareas', 'bajo', false, null,
   'Hora del día en que se avisa a los anfitriones de huéspedes que llegan pronto sin preregistro.'),
  ('tarea_hora_recordatorios', '09:00', '09:00', 'hora_del_dia', null, null, null, 'plataforma', 'tareas', 'bajo', false, null,
   'Hora del día en que salen los recordatorios del preregistro.'),
  ('tarea_antecedentes_cada_minutos', '5', '5', 'minutos', 'minutos', 1, 60, 'plataforma', 'tareas', 'bajo', false, null,
   'Cada cuántos minutos se revisan las consultas de antecedentes pendientes.'),
  ('calendario_espera_segundos', '20', '20', 'segundos', 'segundos', 5, 120, 'plataforma', 'calendario', 'bajo', false, null,
   'Segundos que se espera a Airbnb/Booking al leer un calendario antes de darlo por fallido.'),
  ('avisos_app_por_defecto', 'true', 'true', 'booleano', null, null, null, 'plataforma', 'avisos', 'bajo', false, null,
   'Si los avisos llegan a la app a quien nunca tocó sus preferencias.'),
  ('avisos_correo_por_defecto', 'false', 'false', 'booleano', null, null, null, 'plataforma', 'avisos', 'bajo', false, null,
   'Si los avisos llegan por correo a quien nunca tocó sus preferencias.'),
  ('avisos_whatsapp_por_defecto', 'false', 'false', 'booleano', null, null, null, 'plataforma', 'avisos', 'bajo', false, null,
   'Si los avisos llegan por WhatsApp a quien nunca tocó sus preferencias.'),
  ('aviso_texto_largo', '140', '140', 'entero', 'caracteres', 40, 1000, 'plataforma', 'avisos', 'bajo', false, null,
   'Cuántos caracteres del mensaje se muestran en un aviso (chat, paquete, PQRS, S.O.S.).'),
  ('persona_contactable_por_defecto', 'true', 'true', 'booleano', null, null, null, 'edificio', 'avisos', 'medio', false, null,
   'Si una persona nueva de una vivienda aparece como contactable para sus vecinos.'),
  ('persona_datos_visibles_por_defecto', 'true', 'true', 'booleano', null, null, null, 'edificio', 'avisos', 'medio', false, null,
   'Si los datos de una persona nueva se muestran a los demás de su vivienda.'),
  ('publicacion_avisar_por_defecto', 'true', 'true', 'booleano', null, null, null, 'edificio', 'avisos', 'bajo', false, null,
   'Si una publicación nueva avisa a su audiencia al publicarse.'),
  ('cuota_automatica_por_defecto', 'false', 'false', 'booleano', null, null, null, 'edificio', 'cuotas', 'bajo', false, null,
   'Si la cuota mensual se crea sola en un edificio nuevo.'),
  ('cuota_visibilidad_por_defecto', 'porcentaje', 'porcentaje', 'texto', null, null, null, 'edificio', 'cuotas', 'medio', false, array['porcentaje', 'quien_pago', 'quien_debe']::text[],
   'Qué se publica de las cuotas en un edificio nuevo: solo el porcentaje, quién pagó o también quién debe.'),
  ('plan_periodicidad_por_defecto', 'mensual', 'mensual', 'texto', null, null, null, 'plataforma', 'cuotas', 'medio', false, array['mensual', 'anual']::text[],
   'Periodicidad con que nace un plan de suscripción nuevo.'),
  ('numero_digitos_contrato', '5', '5', 'entero', 'dígitos', 3, 10, 'plataforma', 'edificio', 'bajo', false, null,
   'Dígitos del número visible de un contrato (00042).'),
  ('numero_digitos_pqrs', '4', '4', 'entero', 'dígitos', 3, 10, 'plataforma', 'edificio', 'bajo', false, null,
   'Dígitos del número visible de una PQRS (0042).'),
  ('numero_digitos_reserva', '6', '6', 'entero', 'dígitos', 3, 10, 'plataforma', 'edificio', 'bajo', false, null,
   'Dígitos del número visible de una reserva de zona (000042).'),
  ('torre_viviendas_maximo', '500', '500', 'entero', 'viviendas', 10, 5000, 'plataforma', 'edificio', 'bajo', true, null,
   'Cuántas viviendas se pueden generar de una vez al crear una torre.'),
  ('torre_divisor_piso', '100', '100', 'entero', null, 10, 1000, 'edificio', 'edificio', 'bajo', true, null,
   'Cómo se saca el piso del número de vivienda al generar una torre: número dividido entre esto (503 / 100 = piso 5).'),
  ('anuncio_titulo_largo_maximo', '120', '120', 'entero', 'caracteres', 20, 500, 'plataforma', 'avisos', 'bajo', true, null,
   'Largo máximo del título de un anuncio o encuesta.'),
  ('anuncio_descripcion_largo_maximo', '4000', '4000', 'entero', 'caracteres', 200, 20000, 'plataforma', 'avisos', 'bajo', true, null,
   'Largo máximo de la descripción de un anuncio o encuesta.'),
  ('encuesta_opciones_minimas', '2', '2', 'entero', 'opciones', 2, 10, 'plataforma', 'avisos', 'bajo', true, null,
   'Opciones mínimas de una encuesta.'),
  ('pqrs_titulo_largo_maximo', '120', '120', 'entero', 'caracteres', 20, 500, 'plataforma', 'edificio', 'bajo', true, null,
   'Largo máximo del título de una PQRS.'),
  ('horario_atencion_largo_maximo', '200', '200', 'entero', 'caracteres', 20, 1000, 'plataforma', 'edificio', 'bajo', true, null,
   'Largo máximo del horario de atención del edificio.')
on conflict (clave) do nothing;

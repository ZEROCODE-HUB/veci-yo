-- ============================================================================
-- Interruptores, direcciones y reglas legales, desde el panel (28/10/2026)
-- ============================================================================
--
-- El cliente: lo legal y los interruptores técnicos también se cambian desde
-- la app del administrador de la app, «obvio pidiendo confirmación».
--
-- Hasta hoy eran variables de entorno (`EXPO_PUBLIC_INVITACIONES_EMAIL`,
-- `EXPO_PUBLIC_TRA_ACTIVO`, `EXPO_PUBLIC_WEB_URL`,
-- `EXPO_PUBLIC_URL_PAGO_SUSCRIPCION`, los secretos `TRA_ACTIVO`,
-- `TUSDATOS_ACTIVO`, `TUSDATOS_URL`, `VECIYO_URL_WEB`) o constantes del
-- código (las direcciones de la TRA, el largo del número de emergencias, la
-- duración de un contrato). Pasan a `configuracion_plataforma`, que ya tiene
-- pantalla (Panel › Ajustes) e historial.
--
-- Lo que **no** se mueve: las credenciales (usuario y clave de Tus Datos, la
-- clave de Resend, el token de la TRA). Siguen siendo secretos del servidor.
--
-- Los valores iniciales son los de hoy en producción, comprobados el
-- 28/10/2026 por la huella de cada secreto: Tus Datos encendido contra el
-- ambiente de pruebas, la TRA simulada, el correo de invitaciones encendido.
--
-- Aditiva.
-- ============================================================================

alter type public.categoria_parametro add value if not exists 'legal';

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, valores_permitidos, descripcion)
values
  -- Interruptores
  ('invitaciones_por_correo', 'true', 'true', 'booleano', null, null, null, 'plataforma', 'integraciones', 'alto', true, null,
   'Si las invitaciones y el enlace del preregistro salen por correo. Apagado: no sale ningún correo y la app enseña el enlace para copiarlo a mano.'),
  ('tra_envio_real', 'false', 'false', 'booleano', null, null, null, 'plataforma', 'integraciones', 'alto', true, null,
   'Si la Tarjeta de Registro de Alojamiento se manda de verdad al ministerio. Apagado: se arma y se guarda, pero no sale (simulación). Encenderlo presenta declaraciones legales reales.'),
  ('tusdatos_activo', 'true', 'false', 'booleano', null, null, null, 'plataforma', 'integraciones', 'alto', false, null,
   'Si se consultan antecedentes en Tus Datos. Apagado: ninguna consulta sale. Cada consulta en el ambiente de producción cuesta dinero.'),
  ('tusdatos_ambiente', 'pruebas', 'pruebas', 'texto', null, null, null, 'plataforma', 'integraciones', 'alto', false, array['pruebas', 'produccion'],
   'Contra qué ambiente de Tus Datos se consulta. «pruebas» es gratis y responde siempre lo mismo; «produccion» cobra cada consulta y necesita las credenciales del plan contratado.'),
  ('tusdatos_url_pruebas', 'https://docs.tusdatos.co', 'https://docs.tusdatos.co', 'texto', null, null, null, 'plataforma', 'integraciones', 'alto', false, null,
   'Dirección del ambiente de pruebas de Tus Datos.'),
  ('tusdatos_url_produccion', 'https://dash-board.tusdatos.co', 'https://dash-board.tusdatos.co', 'texto', null, null, null, 'plataforma', 'integraciones', 'alto', false, null,
   'Dirección del ambiente de producción de Tus Datos.'),
  -- Direcciones
  ('url_web', 'https://veciyo-web-seven.vercel.app', 'https://veciyo-web-seven.vercel.app', 'texto', null, null, null, 'plataforma', 'integraciones', 'alto', true, null,
   'La web de Veciyo: los enlaces de los correos (invitación, preregistro, poner contraseña) llevan aquí. Si se cambia mal, ningún enlace funciona.'),
  ('url_pago_suscripcion', '', '', 'texto', null, null, null, 'plataforma', 'integraciones', 'medio', true, null,
   'Página de pago de la suscripción de renta corta. Vacía: no hay pasarela y la app ofrece el pago simulado, marcado como tal.'),
  ('correo_privacidad', 'privacidad@veciyo.com', 'privacidad@veciyo.com', 'texto', null, null, null, 'plataforma', 'soporte', 'medio', true, null,
   'Correo para ejercer los derechos de protección de datos. Sale en la política de privacidad.'),
  ('correo_contacto', 'hola@veciyo.com', 'hola@veciyo.com', 'texto', null, null, null, 'plataforma', 'soporte', 'bajo', true, null,
   'Correo de contacto general. Sale en los términos y en la web.'),
  -- Legal
  ('tra_url_principal', 'https://pms.mincit.gov.co/one/', 'https://pms.mincit.gov.co/one/', 'texto', null, null, null, 'plataforma', 'legal', 'alto', false, null,
   'Dirección del ministerio (MinCIT) a la que va el huésped principal en la TRA (Resolución 409 de 2022).'),
  ('tra_url_acompanante', 'https://pms.mincit.gov.co/two/', 'https://pms.mincit.gov.co/two/', 'texto', null, null, null, 'plataforma', 'legal', 'alto', false, null,
   'Dirección del ministerio a la que va cada acompañante en la TRA.'),
  ('tra_documento_sin_equivalente', 'Pasaporte', 'Pasaporte', 'texto', null, null, null, 'plataforma', 'legal', 'alto', false, null,
   'Cómo se declara en la TRA un documento sin siglas propias del ministerio (DNI, carné de extranjería…). Las siglas de cada documento están en Panel › Más › Listas.'),
  ('sire_separador', '|', '|', 'texto', null, null, null, 'plataforma', 'legal', 'alto', true, array['|', ';', ','],
   'Separador de columnas del archivo que se sube al SIRE de Migración Colombia.'),
  ('contrato_meses_minimo', '1', '1', 'entero', 'meses', 1, 12, 'plataforma', 'legal', 'medio', true, null,
   'Duración mínima de un contrato de arrendamiento, en meses.'),
  ('contrato_meses_maximo', '600', '600', 'entero', 'meses', 12, 1200, 'plataforma', 'legal', 'medio', true, null,
   'Duración máxima de un contrato de arrendamiento, en meses (vacío en la pantalla = sin fin).'),
  ('emergencias_largo_minimo', '3', '3', 'entero', 'cifras', 2, 6, 'plataforma', 'legal', 'bajo', true, null,
   'Cifras mínimas del número de emergencias (policía) de un edificio.'),
  ('emergencias_largo_maximo', '6', '6', 'entero', 'cifras', 3, 12, 'plataforma', 'legal', 'bajo', true, null,
   'Cifras máximas del número de emergencias (policía) de un edificio.')
on conflict (clave) do nothing;

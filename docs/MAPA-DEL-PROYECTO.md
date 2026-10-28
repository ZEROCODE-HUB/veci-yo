# Mapa del proyecto: qué pantallas hay, quién llega a cada una y dónde se configura cada cosa

Escrito el 16/10/2026. **Se mira antes de crear, mover o quitar una pantalla, y
antes de añadir un parámetro.** Se actualiza en el mismo commit que cambia lo que
describe; si no coincide con el código, manda el código y este archivo se corrige.

Las otras fuentes, y para qué es cada una:

| Qué | Dónde |
|---|---|
| Reglas de negocio (quién puede qué) | `../docs/VeciYo_KT_Roles_y_Conocimiento.md` (KT). Manda sobre todo lo demás |
| Cómo se ve cada pantalla | Maqueta: `../_prototipo-web/src/` (rutas en `App.jsx`) e imágenes en `../_prototipo-web/design/` |
| Reglas de ingeniería y lecciones | `AGENTS.md` |
| Qué tiene que funcionar y su estado | `docs/RECORRIDOS.md` |
| Decisiones pendientes y visuales | `docs/REVISAR-A-OJO.md` |
| Lo que ve el cliente (Status con el alcance, Tests, Huecos, Decisiones, Parametrización, Para Claude) | GSheet del cliente; desde el 18/10/2026 Alcance está dentro de Status |

---

## 1. Cómo decide la aplicación qué ve cada rol

- `src/navigation/RootNavigator.tsx` elige el árbol de pantallas:
  - sin sesión → `Auth` (Login, Registro, TerminosLegales);
  - con varios roles y ninguno elegido → `SeleccionRol`;
  - rol plataforma → `Plataforma`;
  - cualquier otro rol → `App`.
  - `AceptarInvitacion` (enlace `/invitacion`) está montada siempre.
- `src/navigation/AppTabs.tsx` tiene tres pestañas: **Inicio**, **Viviendas** y **Perfil**.
  - Para el guardia, Viviendas se llama «Portería».
  - El huésped temporal no tiene Inicio.
- Los roles de la base se traducen al rol de la app en `src/shared/services/sesion.ts`:
  - coadministrador de condominio → `administrador`, con las opciones recortadas por `opcionesDeAdministracion.ts`;
  - residente, corresidente y coadministrador de unidad → `inquilino-lider`;
  - propietario que no vive en la vivienda → `propietario-no-residente`.
- **Las rutas compartidas** (`src/navigation/config/sharedScreens.tsx`) existen en los tres stacks. Desde cualquier pestaña se puede ir a cualquiera de ellas. Que un rol no llegue a una pantalla depende de que **no tenga un botón** que lleve allí, no de la navegación.
  - El límite de seguridad lo pone la base (RLS), no la navegación.

---

## 2. Qué ve cada rol en cada pestaña

### Inicio (`features/home/components/InquilinoLiderHome.tsx`, el mismo componente para todos)

| Rol | Qué hay → a dónde lleva |
|---|---|
| Administración (admin y coadmin) | Gráfico de tráfico · «Reglamentos y renta corta» → `Reglas` · «Directorio de Propiedades» → `DirectorioPropiedades` · «Asignación de guardias» → `AdministradorSeguridad` · Ingresos y salidas: «Ver detalle» → `Visitas`, «Registrar» → `VisitasNuevo` |
| Guardia | Buscador (`BuscarEnPorteria`: por nombre, depto o QR) → `Visitas` · Tráfico · «Reglamentos y renta corta» → `Reglas` · `Correspondencia` · `DirectorioPropiedades` · Estacionamientos de visita (modal; solo la portería los ve, 16/10/2026) · `Visitas` · `VisitasNuevo` |
| Propietario, inquilino líder, residente | Mis viviendas · Recordatorios de preregistro · Avisos de mis huéspedes → `Notificaciones` · Reputación → `Reputacion` · Gratitud → `CuadroHonor` (solo residentes, y solo cuando puede dar uno: vuelve 30 días después del último) · Bloque «Hoy» (reconocimiento → `CuadroHonor`, **tabla de ingresos y salidas de sus viviendas, hoy y mañana, con filtros** — `HoyDeMisViviendas` —, mis reservas). Sin el botón de renta corta desde el 16/10/2026 |
| Propietario no residente | Mis viviendas, recordatorios, avisos · «Hoy» de sus viviendas (`HoyDeMisViviendas`) · `Notificaciones` · «Ver Ranking» → `CuadroHonor` |
| Huésped temporal | No tiene Inicio |

Arriba, en todas: la barra (`shared/layouts/TopBar.tsx`), que dice el rol delante de la vivienda («Propietario · …», desde el 16/10/2026), lleva a `InquilinoLiderUbicacion` (cambiar de vivienda) y a `Notificaciones`. El botón flotante (`CommsFab`) es el del prototipo: «Llamar» (`Llamada`) y «Chat», con sus dibujos; al guardia solo le aparece si tiene esos permisos. No hay intercomunicador aparte (23/10/2026). En `Llamada` hay dos botones: «Llamar por la app» (por internet) y «Llamar por teléfono» (con el número a la vista). Por la app, desde el 28/10/2026: una vivienda a la portería o a la administración, la portería a una vivienda o a la administración, la administración a una vivienda o a la portería (`helpers/llamadaPorInternet.ts`, `llamar_por_internet`). Solo si al otro lado alguien recibe llamadas por la app: «Recibir llamadas por la app» en Perfil › Configuración (`perfil.recibe_llamadas_app`, `se_puede_llamar_por_la_app`). Con la app cerrada (28/10/2026): la base pide a `avisar-llamada` un push al empezar y al dejar de sonar. En Android con el APK 5 es una llamada sobre el bloqueo (`plugins/llamada-entrante`, Kotlin: `LlamadaActivity`, tono en bucle, Contestar abre `veciyo://llamada?id=…&accion=contestar`); con APK anterior y en iPhone, un aviso. iPhone con CallKit/PushKit escrito en `modules/veciyo-llamadas` y sin compilar: falta la cuenta de Apple (`dispositivo_voip`, secretos `APNS_*`). APK 6: «Rechazar» sin la app abierta avisa al servidor con la firma del push (`rechazar-llamada`, secreto `LLAMADA_FIRMA_SECRETO`); `AvisoDePermisosDeLlamada` (al entrar, una vez) y Perfil › Configuración › Llamadas dicen si faltan la pantalla completa o quitar el ahorro de batería y abren el ajuste (módulo `VeciyoLlamadas` de Android).

### Viviendas / Portería

| Rol | Qué hay |
|---|---|
| Administración | `ViviendaResumen` (con el nombre del edificio encima de la vivienda, para todos). «Configuración» despliega el menú del edificio (ver §3). Tarjetas: Correspondencia, Visitas, **Zonas Comunes → `GestionZonas`** (la de la administración, no la del vecino), Anuncios, Cuadro de Honor, Reglas |
| Propietario residente / inquilino líder | «Configuración» → `PropietarioConfiguracion`. Tarjetas: `Correspondencia`, `Visitas`, `ZonasComunes`, `Anuncios`, `CuadroHonor`, `Reglas` |
| Propietario no residente | Igual, sin Correspondencia ni Zonas Comunes (`helpers/noResidente.ts`) |
| Huésped temporal | Sin «Configuración». Tarjetas sin Cuadro de Honor (`MODULOS_VEDADOS_AL_HUESPED`), más «Mi alojamiento» → `MiAlojamiento` |
| Guardia | `PorteriaResumen`: `Visitas`, `Correspondencia`, `ZonasComunes`, Estacionamientos (modal), `HistorialSos`, `Anuncios`, `DirectorioPropiedades`, `Chat` y `Llamada` (con permiso; «Llamar a una vivienda» llama por internet) |

Las tarjetas salen de `MODULOS_CONFIG` (`features/home/constants.ts`) y la lógica de qué se muestra está en `features/home/hooks/useViviendaResumen.ts`.

### Perfil (`features/perfil/screens/PerfilScreen.tsx`, igual para todos)

- «Configuración» → `Configuracion`: avisos y contacto alternativo. Tarjeta «Notificaciones push» (22/10/2026): interruptor general «Recibir notificaciones en el celular» (`perfil.avisos_push`, encendido por defecto) y, debajo, el estado de este celular (permiso, registro) con «Activar» y «Enviarme un aviso de prueba». El permiso se pide solo al entrar o registrarse. La lista «Avisos: de qué y por dónde» está oculta (parámetro `avisos_por_motivo`); los avisos no salen por correo ni por WhatsApp.
- `Seguridad`, `SOS` y «Ver el historial de S.O.S.» → `HistorialSos`.
- «Cambiar de rol»: solo aparece con más de un rol.
- `Soporte` lleva a:
  - `PreguntasFrecuentes` (la administración las escribe ahí mismo);
  - `Reclamos`;
  - `ContactoSoporte` (título «Contactos del edificio»), con los datos y el horario del edificio y, debajo, el equipo administrativo y las empresas de seguridad y limpieza (los ven los miembros del edificio, no el huésped; 16/10/2026).
- Diferencias por rol:
  - el guardia ve su turno y no ve el alias;
  - el huésped ve el alias sin la opción del Cuadro de Honor.

### Plataforma (quien opera Veciyo)

`PlataformaStack` tiene sus propias pestañas (desde el 23/10/2026, «Administrador de la app»):
- Edificios: `PlataformaResumen` → `PlataformaEdificioNuevo`. La invitación al primer administrador sale por correo (`enviar-correo`, tipo `invitacion-administracion`, 24/10/2026) y el enlace se enseña igual por si no llega.
- Usuarios: `PlataformaUsuarios`. Lista de cuentas por páginas de 20, de la más nueva a la más antigua, con un buscador que la filtra por correo o nombre (`panel_listar_usuarios`, 24/10/2026): nombre, alta, último ingreso, si confirmó el correo, si está bloqueada, y edificios con su rol. El dueño puede enviar el correo de contraseña, confirmar el correo, suspender con motivo (correo con el motivo, `suspension_cuenta`, sesiones cerradas) y reactivar (función `panel-usuarios`). Quien está suspendido ve `CuentaSuspendidaScreen` al entrar (24/10/2026). Soporte solo busca.
- Ajustes: `PlataformaAjustes` + `EditarAjuste`. Los parámetros de `configuracion_plataforma` por categoría, con buscador, rango, «volver al valor por defecto» e historial con quién lo cambió. Los de riesgo alto piden confirmar. Escribe solo el dueño (`panel_cambiar_parametro`).
- Soporte: `PlataformaSoporte` → `PlataformaSoporteDetalle`.
- Más: `PlataformaMas` → `PlataformaPrecios` (precio vigente por plan; uno nuevo vale desde hoy), `PlataformaPaises` → `PlataformaPais` (la lista enseña solo los países con alta de edificios o con edificios, hoy Colombia y Perú, 26/10/2026; 25/10/2026: datos del país —nombre, prefijo, moneda, zona horaria, mayoría de edad, policía, identificación fiscal, SIRE, alta de edificios, activo— con `DatosDelPais`, y los documentos que se piden en él con `DocumentoDelPaisCard`: si se pide, a adultos o menores, solo cifras, largo, dos caras, fecha de expedición; `panel_paises`, `panel_cambiar_pais`, `panel_guardar_documento_del_pais`, solo el dueño), `PlataformaPermisos` (26/10/2026, huecos 9 y 14: qué puede cada rol —inquilino líder, residente, corresidente y coadministrador de vivienda: registrar visitas, reservar zonas, invitar; coadministrador del edificio: crear zonas, anuncios, registrar visitas— en la regla general o con excepción por edificio; `permiso_de_rol`, `panel_permisos_de_rol`, `panel_cambiar_permiso_de_rol`, solo el dueño; la base lo aplica con un disparador por acción y la app no ofrece lo que no se puede), `PlataformaDescuentos` (códigos de la suscripción de renta corta; crear y activar, solo el dueño), `PlataformaTextosLegales` (términos de la app, privacidad, tratamiento de datos y autorización de antecedentes; publicar deja versión nueva), `PlataformaEquipo`, `PlataformaBitacora`.

No comparte ninguna pantalla con los edificios: ver la memoria «Alcance del rol de plataforma».

---

## 3. Configuración del administrador (menú de Viviendas › Configuración)

Ninguna sección interna es una ruta: son pestañas, vistas o modales dentro de la pantalla.

| Opción del menú | Pantalla | Qué se configura dentro |
|---|---|---|
| ARQUITECTURA | `AdministradorArquitecturaScreen` | **Condominio**: nombre, dirección, país, NIT/RUC, moneda, zona horaria, teléfono, correo, horario de atención, número de la policía; **foto del condominio** (hueco: falta decidir dónde se enseña); **equipo administrativo** y **empresas de seguridad y limpieza** (`contacto_condominio`); **tipologías de vivienda**. **Torres**: torres y su ficha (pisos, cocheras, dónde aparcan las visitas…); dentro de cada torre, departamentos (con estado y tipología), estacionamientos y depósitos. **Porterías** |
| PERMISOS | `AdministradorPermisosScreen` | Para todo el edificio o una vivienda: verificación de documento, entrega directa, renta corta (con **límites del edificio**: noches mínimas y personas máximas), estancia corta/larga y hasta cuántas noches es corta, reglas por tipo de estancia, cuota de administración, qué se publica de las cuotas, **si el Cuadro de Honor cuenta el mes en curso** (27/10/2026, hueco 53; `guardar_cuadro_honor_mes_en_curso`), reglamentos (→ `ReglaDetalle`), **términos y condiciones del edificio**. La excepción de una vivienda guarda solo lo que difiere del edificio y tiene «Volver a la regla del edificio» (17/10/2026) |
| SEGURIDAD | `AdministradorSeguridadScreen` | Guardias (datos, portería, días y horas, permisos de chat y llamadas), turnos y rotación, invitación |
| COADMINISTRADORES | `CoadministradoresScreen` | Coadministradores y sus 8 permisos. Solo la ve el administrador |
| CANALES DEL CHAT | `AdministradorCanalesScreen` | Canales y qué roles participan. No está en la maqueta: lo pidió el cliente |
| REPORTES | `AdministradorReportesScreen` | Visitantes y vehículos, correspondencia, áreas comunes; a Excel. «Envío automático mensual»: encendido y día del mes (`condominio.reportes_mensuales_*`, hueco 7) |
| CENTRO DE ATENCIÓN | `Reclamos` | PQRS del edificio |
| (tarjeta Zonas Comunes) | `GestionZonas` → `GestionZonaForm` → `GestionZonaReservas` | Cada zona: horario, días, fechas especiales, duración, tiempo entre reservas, **capacidad y reservas a la misma hora**, costos, aprobación, estancia corta/larga, reglamento. No está en el menú: se llega por la tarjeta. Cada zona de la lista tiene a la vista «Ver reservas» y «Editar» (desde el 20/10; antes «Ver reservas» iba en un menú ⋯) |

---

## 4. Dónde se configura cada parámetro

Es la pestaña Parametrización del GSheet, con lo que hay hoy. Si se añade un parámetro, va aquí y allí.

**Desde el 18/10/2026, ningún valor de negocio va escrito en el código** (decisión del cliente). Lo que antes era un número o una lista fija vive en la base y se cambia desde el panel de Supabase:

- `configuracion_plataforma`: un parámetro por fila (tipo, unidad, mínimo, máximo, valor de fábrica, descripción, ámbito). Un valor fuera de sus límites se rechaza. Si el ámbito es «edificio», cada edificio puede tener el suyo en `parametro_condominio`. Cada cambio queda en `configuracion_historial`.
- Se lee con `parametro(clave, condominio)` en la base, `useParametrosDeLaBase()` en la app, `lib/parametros.ts` en la web y `_compartido/parametros.ts` en las funciones de servidor. **Sin valores de respaldo**: si falta un parámetro, revienta.
- `pais`, `moneda` y `catalogo_opcion`: lo que depende del país y las listas de opciones. La base ya los usa (mayoría de edad, moneda, zona horaria, canales iniciales). Los países se editan desde el panel (Más › Países, 25/10/2026).
- `documento_del_pais` (25/10/2026): qué documentos se piden en cada país y cómo es su número. Lo leen el registro (`documentos_para_registrarse`), las visitas de la app (`documentos_del_edificio`, hook `useDocumentosDelEdificio`) y el preregistro de la web (`documentos_del_enlace`, `lib/documentos.ts`). La base lo hace cumplir al guardar un invitado (`invitado_documento_del_pais`). La app y la web ya no tienen lista propia.
- **«Hoy» es el día del edificio** (25/10/2026): en la base, `hoy_en_el_edificio`, `hoy_en_la_unidad`, `hoy_en_el_pais` y `hoy_en_la_plataforma`, nunca `current_date` (que es el día de Londres). Lo vigila `npm run dias`.
- Un parámetro nuevo se añade en la misma migración que lo usa, con su descripción; toda columna nueva lleva `comment on column` (una prueba lo exige).

| Parámetro | Dónde | Quién |
|---|---|---|
| Datos del edificio, moneda, zona horaria, horario de atención, policía | Arquitectura › Condominio | Administración |
| Foto del edificio, equipo administrativo, empresas de seguridad y limpieza | Arquitectura › Condominio (se guardan al momento) | Administración |
| Tipologías de vivienda | Arquitectura › Condominio (lista) y Torres › departamento (cuál tiene cada uno) | Administración |
| Torres, departamentos, estacionamientos, depósitos, porterías, dónde aparcan las visitas | Arquitectura › Torres / Porterías | Administración |
| Verificación de documento, entrega directa, renta corta, estancias, cuotas, qué se publica de las cuotas (incluido si salen los morosos), reglamentos, términos del edificio | Permisos | Administración |
| Límites de renta corta del edificio | Permisos › Huéspedes temporales (solo «todo el edificio») | Administración. El anfitrión los ve como aviso |
| Guardias, turnos, rotación | Seguridad | Administración |
| Coadministradores | Coadministradores | Administrador |
| Canales del chat | Canales del chat | Administración |
| Zonas comunes (incluidos capacidad y reservas a la misma hora) | Tarjeta Zonas Comunes › zona | Administración |
| Preguntas frecuentes | Perfil › Soporte › Preguntas frecuentes (botones solo para la administración) | Administración |
| Anuncios y encuestas (audiencia, incluida la portería) | Anuncios › Crear | Administración |
| Vivienda: quién vive, invitaciones, qué ve cada uno | Viviendas › Configuración (propietario) | Propietario / inquilino líder |
| Renta corta de la vivienda: suscripción, noches y personas, estacionamientos para huéspedes (vacío = sin límite, 0 = ningún vehículo, un número = máximo de vehículos en la reserva y en el preregistro; hueco 17, 25/10/2026), mascotas, niños, plataformas, calendarios iCal (uno por plataforma: Airbnb, Booking u otra; tabla `calendario_vivienda` desde el 21/10/2026), horario de entrada, recordatorios, visitas de huéspedes, RNT y su vencimiento, TRA, confianza, libro del huésped | Configuración › Huéspedes temporales | Anfitrión. El RNT solo lo cambia el dueño. «Ocultar número / teléfono» se quitaron el 16/10/2026: la lista de renta corta ya solo la ven portería y administración |
| De cada reserva: plataforma (Airbnb, Booking, Directo), clave de la puerta | Al crearla (plataforma) y en su ficha (clave) | Anfitrión. La clave la ve solo el huésped de esa reserva, desde su día de llegada |
| Servicios de la vivienda (con el día del primer y segundo aviso de pago: llegan a la campana desde el 25/10/2026, tarea `servicios-de-vivienda` a la hora de `tarea_hora_servicios`) | Configuración › Servicios contratados | Anfitrión |
| Notificaciones push (interruptor general), recibir llamadas por la app (28/10/2026), contacto alternativo, alias. La lista aviso por aviso solo con `avisos_por_motivo` | Perfil › Configuración | Cada persona |
| Push al celular de toda la plataforma: `push_activo`, `avisos_push_por_defecto`, `onesignal_app_id`, `push_espera_segundos`, `aviso_prueba_espera_segundos`, `avisar_actualizaciones` (aviso «Veciyo se actualizó (actualización N)» a todos al publicar con `npm run ota`), `avisos_por_motivo` y `avisos_whatsapp_visible` (apagados: lista aviso por aviso y WhatsApp ocultos). Los avisos no salen por correo (decisión del 22/10/2026; `envio_correo` quedó sin uso) | Panel de Supabase (`configuracion_plataforma`). La clave para enviar es el secreto `ONESIGNAL_REST_API_KEY` de las funciones | Plataforma. Cada envío queda en `envio_push` (salió, sin celular, apagado, error; y cuándo llegó) |

**Fijo en código o en la base, sin pantalla (a propósito o pendiente):**

- **De la plataforma, fuera del alcance de un edificio:**
  - parámetros por edificio (`parametro_condominio`) y el catálogo de monedas: siguen en Supabase;
  - verificaciones incluidas (20 al mes);
  - cada cuánto se lee el iCal (60 min);
  - horas de las tareas automáticas (en hora universal).
- **Fijos en código:**
  - vigencia de las invitaciones (7 días, 14 el primer administrador);
  - vigencia del enlace de preregistro;
  - tamaño máximo de fotos (8 MB);
  - cuándo una verificación pide aprobación manual (hallazgo «alto»).

---

## 5. Todas las rutas y desde dónde se llega

| Ruta | Pantalla (`src/features/…/screens/`) | Se llega desde |
|---|---|---|
| Login · Registro · TerminosLegales | onboarding | Arranque sin sesión · Login → Registro → Términos |
| SeleccionRol | onboarding | Automático, con más de un rol |
| AceptarInvitacion | onboarding | Enlace `/invitacion` |
| Home · Vivienda · Perfil | home / `ViviendaStack` / perfil | Pestañas |
| Seguridad · SOS · Soporte | perfil | Perfil |
| PreguntasFrecuentes · ContactoSoporte | perfil | Soporte |
| Notificaciones | home | Campana · avisos del Inicio |
| Configuracion | perfil | Perfil |
| PropietarioConfiguracion | propietario | Viviendas › Configuración (propietario, inquilino líder) |
| InvitarAUnidad · CrearRol · HistorialContrato · HuespedesTemporales · AgregarServicio | propietario | PropietarioConfiguracion (HuespedesTemporales también desde Visitas) |
| Correspondencia · CorrespondenciaAgregar | correspondencia | Tarjeta · Inicio del guardia · Portería · avisos |
| Visitas · VisitasNuevo | visitas | Tarjeta · Inicio (admin y guardia) · Portería · buscador del guardia · avisos |
| ZonasComunes · ZonaDetalles · ZonaReservar | zonas | Tarjeta (vecinos, huésped, guardia) · avisos · reservas de la administración. Una zona inactiva no sale en la lista (salvo a la administración) ni se puede reservar (17/10/2026). Una zona sin horario no ofrece franjas y lo dice. «Mis reservas» tiene «Cancelar» en cada reserva propia (23/10/2026); antes solo se cancelaba tocando la reserva en la grilla del día |
| GestionZonas · GestionZonaForm · GestionZonaReservas | administrador | Tarjeta Zonas Comunes de la administración |
| Reglas · ReglaDetalle | reglas | Tarjeta · Inicio · Permisos › Reglamentos |
| Anuncios · AnuncioDetalle | anuncios | Tarjeta · Portería · avisos |
| AdministradorArquitectura · Permisos · Seguridad · Canales · Reportes · Coadministradores | administrador | Menú Configuración del edificio (Seguridad también desde Inicio) |
| Reclamos · ReclamoNuevo · ReclamoDetalle | perfil | Centro de atención · Soporte · Reglas · Visitas · HistorialSos · avisos |
| HistorialSos | perfil | Perfil · Portería |
| Chat · ChatConversacion · ChatNuevo · Llamada | home | Botón flotante · Portería · avisos. El chat admite adjuntar una foto o un PDF (bucket `chat`, 26/10/2026, hueco 8). El vecino firma con su alias y su depto (hueco 21) |
| CuadroHonor · Reputacion | inquilino-lider | Tarjeta · Inicio · avisos |
| InquilinoLiderUbicacion | inquilino-lider | Barra superior |
| MiAlojamiento | huesped | Tarjeta del huésped |
| DirectorioPropiedades | directorio | Inicio (admin y guardia) · Portería. El detalle de una vivienda trae «A quién contactar» (`ContactosDeLaVivienda`, RPC `contactos_de_la_vivienda`, 26/10/2026): por persona, Llamar, WhatsApp y Chat si lo aceptó, su contacto de emergencia y su contacto alternativo (huecos 11 y 20) |
| AdministradorUbicacion | administrador | Solo desde el Cuadro de Honor bloqueado: es el mismo formulario que Arquitectura › Condominio |
| Plataforma* | plataforma | Pestañas de su panel |

`npm run pantallas` comprueba que toda pantalla esté registrada. Este mapa añade **desde dónde se llega**, que el guarda no puede saber.

---

## 6. Maqueta frente a la app

- Casi todas las `*Page.jsx` de la maqueta tienen su `*Screen.tsx` con el mismo nombre.
- Lo que la maqueta tiene y la app no:
  - `ComunidadPage` (ofertas, venta de garaje, páginas amarillas): la pantalla existe y está marcada «NO ESTA EN USO»;
  - `PropietarioAceptacionPage`: aceptar una invitación con renta corta, mascotas y niños; hoy se configura en Huéspedes temporales;
  - los marcadores `/pagos`, `/ranking`, `/integracion-externa`;
  - `DemoRolePage`, que se retiró a propósito.
- Lo que la app tiene y la maqueta no:
  - Canales del chat;
  - la portada de Portería;
  - el historial de S.O.S.;
  - el panel de Plataforma;
  - la edición de preguntas frecuentes;
  - términos del edificio y límites de renta corta (16/10/2026).
- La lista de tipologías estaba dibujada en la maqueta (`TipologiasTab`) pero sin enlazar. En la app va dentro de Condominio.

---

## 7. Cabos sueltos conocidos

Encontrados al hacer este mapa. Ninguno rompe un flujo en uso.

- `Verificacion` (fotos del documento y selfie que no se guardaban) se quitó el 28/10/2026 (hueco 55).
- `AdministradorUbicacion` duplica Arquitectura › Condominio y solo se llega desde el Cuadro de Honor bloqueado.
- `AceptarInvitacionScreen` navega a `Auth` y hace `reset` a `App`. Con sesión, o con el rol plataforma, esas rutas no están montadas.
- `propietario-sin-propiedades` no cuenta como propietario, así que su «Configuración» lleva a `Configuracion` (Perfil).
- En Torres, los departamentos dicen «Sin propietario» aunque lo tengan: esa línea lee un dato que solo se rellena en memoria.
- En `shared/types/navigation.ts` sobran tipos de rutas que ya no existen: `AdministradorZonas`, `Comunidad`, `AdminStackParamList` y `PropietarioStackParamList`.

## 8. Lo que cambió el 16/10/2026 (correcciones de la responsable de producto)

Detalle en `docs/archivo/CORRECCIONES-16.10.md`. Pantallas y piezas nuevas:

- Ficha de una reserva del anfitrión (`ReservaPropietarioDetail`): distintivo de plataforma con «Fuente · Ingreso», **Clave de la puerta** (`ClaveDePuertaDeLaReserva`), **Historial del alojamiento** con «Registrar PQRS de esta estancia» (`HistorialDeLaEstancia` → `ReclamoNuevo` con la vivienda y la estancia). Con alguien dentro, **«Terminar estancia»** (`TerminarEstancia`, RPC `terminar_estancia`): desde el 23/10/2026 la estancia no se cierra cuando salen todos, sino en su día de salida (tarea `estancias-vencidas`, cada hora) o cuando el anfitrión la termina. «Reportar al ministerio (TRA)» y el «Reportar TRA» de cada persona abren antes **`ConfirmarTra`** (26/10/2026): lo que se va a declarar, con el costo en pesos colombianos, el motivo y las ciudades editables; lo corregido se guarda (RPC `ajustar_datos_de_la_tra`, el costo queda en COP) y `reportar-tra` rechaza un costo en otra moneda.
- Portería: la tarjeta de una estancia dice el estado en palabras (`EstadoPorteria`), no el paso a paso; el registro de entrada (`EntradaDelHuesped`, el mismo desde la tarjeta y desde «Ver detalles») pregunta primero si es la misma persona con el documento guardado (con marca de agua: nombre del guardia, fecha y hora; `MarcaDeAgua`), luego escanea el documento físico: el celular lee su texto (ML Kit con `expo-text-extractor`; Tesseract en la web) y lo compara con lo registrado (`helpers/compararDocumento.ts`: número, o nombre y apellidos). Si coincide queda verificado; si no, el número a mano. Nada se guarda ni se sube. Lo anotado sobre un menor se puede cambiar mientras no haya entrado; el botón de estacionamiento no sale con la estancia terminada. La ficha de la estancia también lleva el historial.
- `Reclamos`: el «+» también para la administración.
- `Reglas`: la lista de renta corta solo para portería y administración.
- Web del preregistro: tres opciones al inicio (`ComoEntrar`), «Aún no sé» en las horas (`CampoHora`), fotos obligatorias, el acompañante con los mismos campos y opciones, pantalla final con tiendas, y `/qr/:codigo` (el QR del correo de ingreso aprobado).

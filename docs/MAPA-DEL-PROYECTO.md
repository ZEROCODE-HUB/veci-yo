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
| Lo que ve el cliente (Alcance, Status, Parametrización) | GSheet del cliente, pestañas Alcance, Status y Parametrización |

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
| Administración (admin y coadmin) | Gráfico de tráfico · «Reglamentos y renta corta» → `Reglas` · «Directorio de Propiedades» → `DirectorioPropiedades` · Estacionamientos de visita (modal) · «Asignación de guardias» → `AdministradorSeguridad` · Ingresos y salidas: «Ver detalle» → `Visitas`, «Registrar» → `VisitasNuevo` |
| Guardia | Buscador (`BuscarEnPorteria`: por nombre, depto o QR) → `Visitas` · Tráfico · `Reglas` · `Correspondencia` · `DirectorioPropiedades` · Estacionamientos (modal) · `Visitas` · `VisitasNuevo` |
| Propietario, inquilino líder, residente | Mis viviendas · Recordatorios de preregistro · Avisos de mis huéspedes → `Notificaciones` · Reputación → `Reputacion` · Gratitud → `CuadroHonor` · Renta corta → `Reglas` · Bloque «Hoy» (reconocimiento → `CuadroHonor`, agenda, mis reservas) |
| Propietario no residente | Mis viviendas, recordatorios, avisos · `Notificaciones` · «Ver Ranking» → `CuadroHonor` · Renta corta → `Reglas` |
| Huésped temporal | No tiene Inicio |

Arriba, en todas: la barra (`shared/layouts/TopBar.tsx`) lleva a `InquilinoLiderUbicacion` (cambiar de vivienda) y a `Notificaciones`. El botón flotante (`CommsFab`) lleva a `Chat` y `Llamada`; al guardia solo le aparece si tiene esos permisos.

### Viviendas / Portería

| Rol | Qué hay |
|---|---|
| Administración | `ViviendaResumen`. «Configuración» despliega el menú del edificio (ver §3). Tarjetas: Correspondencia, Visitas, **Zonas Comunes → `GestionZonas`** (la de la administración, no la del vecino), Anuncios, Cuadro de Honor, Reglas |
| Propietario residente / inquilino líder | «Configuración» → `PropietarioConfiguracion`. Tarjetas: `Correspondencia`, `Visitas`, `ZonasComunes`, `Anuncios`, `CuadroHonor`, `Reglas` |
| Propietario no residente | Igual, sin Correspondencia ni Zonas Comunes (`helpers/noResidente.ts`) |
| Huésped temporal | Sin «Configuración». Tarjetas sin Cuadro de Honor (`MODULOS_VEDADOS_AL_HUESPED`), más «Mi alojamiento» → `MiAlojamiento` |
| Guardia | `PorteriaResumen`: `Visitas`, `Correspondencia`, `ZonasComunes`, Estacionamientos (modal), `HistorialSos`, `Anuncios`, `DirectorioPropiedades`, `Chat` y `Llamada` (con permiso), Intercomunicador (modal) |

Las tarjetas salen de `MODULOS_CONFIG` (`features/home/constants.ts`) y la lógica de qué se muestra está en `features/home/hooks/useViviendaResumen.ts`.

### Perfil (`features/perfil/screens/PerfilScreen.tsx`, igual para todos)

- «Configuración» → `Configuracion`: avisos y contacto alternativo.
- `Seguridad`, `SOS` y «Ver el historial de S.O.S.» → `HistorialSos`.
- «Cambiar de rol»: solo aparece con más de un rol.
- `Soporte` lleva a:
  - `PreguntasFrecuentes` (la administración las escribe ahí mismo);
  - `Reclamos`;
  - `ContactoSoporte`, con los datos y el horario del edificio.
- Diferencias por rol:
  - el guardia ve su turno y no ve el alias;
  - el huésped ve el alias sin la opción del Cuadro de Honor.

### Plataforma (quien opera Veciyo)

`PlataformaStack` tiene sus propias pestañas:
- Edificios: `PlataformaResumen` → `PlataformaEdificioNuevo`.
- Soporte: `PlataformaSoporte` → `PlataformaSoporteDetalle`.
- Equipo.
- Bitácora.

No comparte ninguna pantalla con los edificios: ver la memoria «Alcance del rol de plataforma».

---

## 3. Configuración del administrador (menú de Viviendas › Configuración)

Ninguna sección interna es una ruta: son pestañas, vistas o modales dentro de la pantalla.

| Opción del menú | Pantalla | Qué se configura dentro |
|---|---|---|
| ARQUITECTURA | `AdministradorArquitecturaScreen` | **Condominio**: nombre, dirección, país, NIT/RUC, moneda, zona horaria, teléfono, correo, horario de atención, número de la policía; **tipologías de vivienda**. **Torres**: torres y su ficha (pisos, cocheras, dónde aparcan las visitas…); dentro de cada torre, departamentos (con estado y tipología), estacionamientos y depósitos. **Porterías** |
| PERMISOS | `AdministradorPermisosScreen` | Para todo el edificio o una vivienda: verificación de documento, entrega directa, renta corta (con **límites del edificio**: noches mínimas y personas máximas), estancia corta/larga y hasta cuántas noches es corta, reglas por tipo de estancia, cuota de administración, qué se publica de las cuotas, reglamentos (→ `ReglaDetalle`), **términos y condiciones del edificio** |
| SEGURIDAD | `AdministradorSeguridadScreen` | Guardias (datos, portería, días y horas, permisos de chat y llamadas), turnos y rotación, invitación |
| COADMINISTRADORES | `CoadministradoresScreen` | Coadministradores y sus 8 permisos. Solo la ve el administrador |
| CANALES DEL CHAT | `AdministradorCanalesScreen` | Canales y qué roles participan. No está en la maqueta: lo pidió el cliente |
| REPORTES | `AdministradorReportesScreen` | Visitantes y vehículos, correspondencia, áreas comunes; a Excel |
| CENTRO DE ATENCIÓN | `Reclamos` | PQRS del edificio |
| (tarjeta Zonas Comunes) | `GestionZonas` → `GestionZonaForm` → `GestionZonaReservas` | Cada zona: horario, días, fechas especiales, duración, tiempo entre reservas, **capacidad y reservas a la misma hora**, costos, aprobación, estancia corta/larga, reglamento. No está en el menú: se llega por la tarjeta |

---

## 4. Dónde se configura cada parámetro

Es la pestaña Parametrización del GSheet, con lo que hay hoy. Si se añade un parámetro, va aquí y allí.

| Parámetro | Dónde | Quién |
|---|---|---|
| Datos del edificio, moneda, zona horaria, horario de atención, policía | Arquitectura › Condominio | Administración |
| Tipologías de vivienda | Arquitectura › Condominio (lista) y Torres › departamento (cuál tiene cada uno) | Administración |
| Torres, departamentos, estacionamientos, depósitos, porterías, dónde aparcan las visitas | Arquitectura › Torres / Porterías | Administración |
| Verificación de documento, entrega directa, renta corta, estancias, cuotas, reglamentos, términos del edificio | Permisos | Administración |
| Límites de renta corta del edificio | Permisos › Huéspedes temporales (solo «todo el edificio») | Administración. El anfitrión los ve como aviso |
| Guardias, turnos, rotación | Seguridad | Administración |
| Coadministradores | Coadministradores | Administrador |
| Canales del chat | Canales del chat | Administración |
| Zonas comunes (incluidos capacidad y reservas a la misma hora) | Tarjeta Zonas Comunes › zona | Administración |
| Preguntas frecuentes | Perfil › Soporte › Preguntas frecuentes (botones solo para la administración) | Administración |
| Anuncios y encuestas (audiencia, incluida la portería) | Anuncios › Crear | Administración |
| Vivienda: quién vive, invitaciones, qué ve cada uno | Viviendas › Configuración (propietario) | Propietario / inquilino líder |
| Renta corta de la vivienda: suscripción, noches y personas, mascotas, niños, plataformas, iCal, horario de entrada, recordatorios, visitas de huéspedes, RNT y su vencimiento, TRA, confianza, libro del huésped | Configuración › Huéspedes temporales | Anfitrión. El RNT solo lo cambia el dueño |
| Servicios de la vivienda | Configuración › Servicios contratados | Anfitrión |
| Avisos (de qué y por dónde), contacto alternativo, alias | Perfil | Cada persona |

**Fijo en código o en la base, sin pantalla (a propósito o pendiente):**

- **De la plataforma, fuera del alcance de un edificio:**
  - planes y precios;
  - verificaciones incluidas (20 al mes);
  - cada cuánto se lee el iCal (60 min);
  - horas de las tareas automáticas (en hora universal).
- **Fijos en código:**
  - vigencia de las invitaciones (7 días, 14 el primer administrador);
  - vigencia del enlace de preregistro;
  - mayoría de edad (18);
  - tamaño máximo de fotos (8 MB);
  - cuándo una verificación pide aprobación manual (hallazgo «alto»).

---

## 5. Todas las rutas y desde dónde se llega

| Ruta | Pantalla (`src/features/…/screens/`) | Se llega desde |
|---|---|---|
| Login · Registro · TerminosLegales | onboarding | Arranque sin sesión · Login → Registro → Términos |
| SeleccionRol | onboarding | Automático, con más de un rol |
| AceptarInvitacion | onboarding | Enlace `/invitacion` |
| Verificacion (Inicio) | onboarding | Modal de bienvenida en Home |
| Home · Vivienda · Perfil | home / `ViviendaStack` / perfil | Pestañas |
| Seguridad · SOS · Soporte | perfil | Perfil |
| PreguntasFrecuentes · ContactoSoporte | perfil | Soporte |
| Notificaciones | home | Campana · avisos del Inicio |
| Configuracion | perfil | Perfil |
| PropietarioConfiguracion | propietario | Viviendas › Configuración (propietario, inquilino líder) |
| InvitarAUnidad · CrearRol · HistorialContrato · HuespedesTemporales · AgregarServicio | propietario | PropietarioConfiguracion (HuespedesTemporales también desde Visitas) |
| Correspondencia · CorrespondenciaAgregar | correspondencia | Tarjeta · Inicio del guardia · Portería · avisos |
| Visitas · VisitasNuevo | visitas | Tarjeta · Inicio (admin y guardia) · Portería · buscador del guardia · avisos |
| ZonasComunes · ZonaDetalles · ZonaReservar | zonas | Tarjeta (vecinos, huésped, guardia) · avisos · reservas de la administración |
| GestionZonas · GestionZonaForm · GestionZonaReservas | administrador | Tarjeta Zonas Comunes de la administración |
| Reglas · ReglaDetalle | reglas | Tarjeta · Inicio · Permisos › Reglamentos |
| Anuncios · AnuncioDetalle | anuncios | Tarjeta · Portería · avisos |
| AdministradorArquitectura · Permisos · Seguridad · Canales · Reportes · Coadministradores | administrador | Menú Configuración del edificio (Seguridad también desde Inicio) |
| Reclamos · ReclamoNuevo · ReclamoDetalle | perfil | Centro de atención · Soporte · Reglas · Visitas · HistorialSos · avisos |
| HistorialSos | perfil | Perfil · Portería |
| Chat · ChatConversacion · ChatNuevo · Llamada | home | Botón flotante · Portería · avisos |
| CuadroHonor · Reputacion | inquilino-lider | Tarjeta · Inicio · avisos |
| InquilinoLiderUbicacion | inquilino-lider | Barra superior |
| MiAlojamiento | huesped | Tarjeta del huésped |
| DirectorioPropiedades | directorio | Inicio (admin y guardia) · Portería |
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

- `Verificacion` del stack de autenticación está registrada y **no la abre nadie**.
- `AdministradorUbicacion` duplica Arquitectura › Condominio y solo se llega desde el Cuadro de Honor bloqueado.
- `AceptarInvitacionScreen` navega a `Auth` y hace `reset` a `App`. Con sesión, o con el rol plataforma, esas rutas no están montadas.
- `propietario-sin-propiedades` no cuenta como propietario, así que su «Configuración» lleva a `Configuracion` (Perfil).
- En Torres, los departamentos dicen «Sin propietario» aunque lo tengan: esa línea lee un dato que solo se rellena en memoria.
- En `shared/types/navigation.ts` sobran tipos de rutas que ya no existen: `AdministradorZonas`, `Comunidad`, `AdminStackParamList` y `PropietarioStackParamList`.
